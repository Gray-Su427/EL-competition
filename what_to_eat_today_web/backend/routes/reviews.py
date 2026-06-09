"""Review routes: create reviews with image upload, list reviews."""

import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from database import SessionLocal
from jwt_utils import get_current_user_id
from models import Dish, Review, User
from schemas import ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

UPLOAD_DIR = Path(__file__).parent.parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGES = 3
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


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
    )


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    dish_id: str = Form(...),
    rating: int = Form(..., ge=1, le=5),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # JSON array string
    images: list[UploadFile] = File(default=[]),
    user_id: int = Depends(get_current_user_id),
):
    """Create a new review with optional image uploads."""
    if len(images) > MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"最多上传 {MAX_IMAGES} 张图片",
        )

    db = SessionLocal()
    try:
        # Validate dish exists
        dish = db.query(Dish).filter(Dish.id == dish_id).first()
        if not dish:
            raise HTTPException(status_code=404, detail="菜品不存在")

        # Process uploaded images
        image_paths: list[str] = []
        for img in images:
            if not img.filename:
                continue

            ext = Path(img.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"不支持的图片格式: {ext}",
                )

            content_bytes = await img.read()
            if len(content_bytes) > MAX_IMAGE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="单张图片大小不能超过 5MB",
                )

            filename = f"{uuid.uuid4().hex}{ext}"
            file_path = UPLOAD_DIR / filename
            file_path.write_bytes(content_bytes)
            image_paths.append(f"/static/uploads/{filename}")

        # Parse tags
        parsed_tags: list[str] = []
        if tags:
            try:
                parsed_tags = json.loads(tags)
            except json.JSONDecodeError:
                parsed_tags = []

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

        return _build_review_out(review, db)
    finally:
        db.close()


@router.get("", response_model=list[ReviewOut])
def list_reviews(dish_id: Optional[str] = Query(None)):
    """List reviews, optionally filtered by dish_id. Ordered by newest first."""
    db = SessionLocal()
    try:
        query = db.query(Review).order_by(Review.created_at.desc())
        if dish_id:
            query = query.filter(Review.dish_id == dish_id)
        reviews = query.limit(50).all()
        return [_build_review_out(r, db) for r in reviews]
    finally:
        db.close()


@router.get("/recent", response_model=list[ReviewOut])
def recent_reviews():
    """Get the 20 most recent reviews for the comments page."""
    db = SessionLocal()
    try:
        reviews = (
            db.query(Review).order_by(Review.created_at.desc()).limit(20).all()
        )
        return [_build_review_out(r, db) for r in reviews]
    finally:
        db.close()


@router.get("/mine", response_model=list[ReviewOut])
def my_reviews(user_id: int = Depends(get_current_user_id)):
    """Get reviews created by the current user."""
    db = SessionLocal()
    try:
        reviews = (
            db.query(Review)
            .filter(Review.user_id == user_id)
            .order_by(Review.created_at.desc())
            .all()
        )
        return [_build_review_out(r, db) for r in reviews]
    finally:
        db.close()
