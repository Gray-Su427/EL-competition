"""Review routes: create reviews with image upload, list reviews, and edit existing reviews."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from database import SessionLocal
from jwt_utils import get_current_user_id
from models import Dish, Review, User
from profile_service import update_profile_from_review
from schemas import ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

UPLOAD_DIR = Path(__file__).parent.parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGES = 3
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def _parse_json_list(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return [item for item in parsed if isinstance(item, str)]


def _resolve_upload_path(public_path: str) -> Path:
    return UPLOAD_DIR / Path(public_path).name


def _delete_removed_images(old_images: list[str], kept_images: list[str]) -> None:
    for old_image in old_images:
        if old_image in kept_images:
            continue
        file_path = _resolve_upload_path(old_image)
        if file_path.exists():
            file_path.unlink()


def _ensure_review_schema(db) -> None:
    columns = {
        row[1]
        for row in db.execute(text("PRAGMA table_info(reviews)")).fetchall()
    }
    if "updated_at" not in columns:
        db.execute(text("ALTER TABLE reviews ADD COLUMN updated_at DATETIME"))
        db.commit()

    _dedupe_reviews_for_unique_constraint(db)
    db.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_dish_idx "
            "ON reviews (user_id, dish_id)"
        )
    )
    db.commit()


def _dedupe_reviews_for_unique_constraint(db) -> None:
    reviews = (
        db.query(Review)
        .order_by(Review.user_id, Review.dish_id, Review.created_at.desc(), Review.id.desc())
        .all()
    )
    seen: set[tuple[int, str]] = set()
    for review in reviews:
        key = (review.user_id, review.dish_id)
        if key in seen:
            db.delete(review)
            continue
        seen.add(key)
    db.commit()


async def _save_uploaded_images(images: list[UploadFile]) -> list[str]:
    if len(images) > MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"最多上传 {MAX_IMAGES} 张图片",
        )

    image_paths: list[str] = []
    for image in images:
        if not image.filename:
            continue

        ext = Path(image.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的图片格式: {ext}",
            )

        content_bytes = await image.read()
        if len(content_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="单张图片大小不能超过 5MB",
            )

        filename = f"{uuid.uuid4().hex}{ext}"
        file_path = UPLOAD_DIR / filename
        file_path.write_bytes(content_bytes)
        image_paths.append(f"/static/uploads/{filename}")

    return image_paths


def _build_review_out(review: Review, db) -> ReviewOut:
    """Build ReviewOut with joined dish and user info."""
    user = db.query(User).filter(User.id == review.user_id).first()
    dish = db.query(Dish).filter(Dish.id == review.dish_id).first()
    return ReviewOut(
        id=review.id,
        user_id=review.user_id,
        dish_id=review.dish_id,
        dish_name=dish.name if dish else "",
        dish_emoji=dish.emoji if dish else "",
        nickname=user.nickname or "匿名用户" if user else "匿名用户",
        rating=review.rating,
        content=review.content,
        tags=review.tags,
        images=review.images,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    dish_id: str = Form(...),
    rating: int = Form(..., ge=1, le=5),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    images: list[UploadFile] = File(default=[]),
    user_id: int = Depends(get_current_user_id),
):
    """Create a new review with optional image uploads."""
    db = SessionLocal()
    try:
        _ensure_review_schema(db)

        dish = db.query(Dish).filter(Dish.id == dish_id).first()
        if not dish:
            raise HTTPException(status_code=404, detail="菜品不存在")

        existing = (
            db.query(Review)
            .filter(Review.user_id == user_id, Review.dish_id == dish_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="你已经评价过这道菜，请修改之前的评价",
            )

        parsed_tags = _parse_json_list(tags)
        image_paths = await _save_uploaded_images(images)

        review = Review(
            user_id=user_id,
            dish_id=dish_id,
            rating=rating,
            content=content,
            tags=json.dumps(parsed_tags, ensure_ascii=False),
            images=json.dumps(image_paths),
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        update_profile_from_review(db, user_id, content, parsed_tags, rating)
        return _build_review_out(review, db)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="你已经评价过这道菜，请修改之前的评价",
        ) from exc
    finally:
        db.close()


@router.put("/{review_id}", response_model=ReviewOut)
async def update_review(
    review_id: int,
    rating: int = Form(..., ge=1, le=5),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    keep_images: Optional[str] = Form("[]"),
    images: list[UploadFile] = File(default=[]),
    user_id: int = Depends(get_current_user_id),
):
    """Update an existing review created by the current user."""
    db = SessionLocal()
    try:
        _ensure_review_schema(db)

        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="评价不存在")
        if review.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权修改这条评价")

        existing_images = _parse_json_list(review.images)
        kept_images = _parse_json_list(keep_images)
        if any(path not in existing_images for path in kept_images):
            raise HTTPException(status_code=400, detail="保留图片列表不合法")

        new_image_paths = await _save_uploaded_images(images)
        final_images = kept_images + new_image_paths
        if len(final_images) > MAX_IMAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"最多上传 {MAX_IMAGES} 张图片",
            )

        review.rating = rating
        review.content = content
        review.tags = json.dumps(_parse_json_list(tags), ensure_ascii=False)
        review.images = json.dumps(final_images)
        review.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        db.commit()
        db.refresh(review)
        parsed_tags = _parse_json_list(tags)
        update_profile_from_review(db, user_id, content, parsed_tags, rating)

        _delete_removed_images(existing_images, kept_images)
        return _build_review_out(review, db)
    finally:
        db.close()


@router.get("", response_model=list[ReviewOut])
def list_reviews(dish_id: Optional[str] = Query(None)):
    """List reviews, optionally filtered by dish_id. Ordered by newest first."""
    db = SessionLocal()
    try:
        _ensure_review_schema(db)
        query = db.query(Review).order_by(Review.created_at.desc())
        if dish_id:
            query = query.filter(Review.dish_id == dish_id)
        reviews = query.limit(50).all()
        return [_build_review_out(review, db) for review in reviews]
    finally:
        db.close()


@router.get("/recent", response_model=list[ReviewOut])
def recent_reviews():
    """Get the 20 most recent reviews for the comments page."""
    db = SessionLocal()
    try:
        _ensure_review_schema(db)
        reviews = db.query(Review).order_by(Review.created_at.desc()).limit(20).all()
        return [_build_review_out(review, db) for review in reviews]
    finally:
        db.close()


@router.get("/mine", response_model=list[ReviewOut])
def my_reviews(user_id: int = Depends(get_current_user_id)):
    """Get reviews created by the current user."""
    db = SessionLocal()
    try:
        _ensure_review_schema(db)
        reviews = (
            db.query(Review)
            .filter(Review.user_id == user_id)
            .order_by(Review.created_at.desc())
            .all()
        )
        return [_build_review_out(review, db) for review in reviews]
    finally:
        db.close()
