"""Tests for review create/update constraints."""

import json
import shutil
import uuid
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from jwt_utils import get_current_user_id
from main import app
from models import Dish, Review, User


@pytest.fixture
def review_test_db(monkeypatch):
    temp_root = Path(__file__).parent / "_tmp" / uuid.uuid4().hex
    temp_root.mkdir(parents=True, exist_ok=True)
    db_file = temp_root / "reviews-test.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    testing_session_local = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
    Base.metadata.create_all(bind=engine)

    import routes.auth as auth_module
    import routes.reviews as reviews_module

    monkeypatch.setattr(reviews_module, "SessionLocal", testing_session_local)
    monkeypatch.setattr(auth_module, "SessionLocal", testing_session_local)
    monkeypatch.setattr(reviews_module, "UPLOAD_DIR", temp_root / "uploads")
    reviews_module.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    db = testing_session_local()
    db.add(User(id=1, email="u1@nju.edu.cn", nickname="测试用户"))
    db.add(User(id=2, email="u2@nju.edu.cn", nickname="另一个用户"))
    db.add(
        Dish(
            id="dish-1",
            name="拌牛肉",
            price=16,
            canteen="一食堂",
            window="6号",
            rating=5.0,
            review_count=1,
            tags='["推荐"]',
            heat_status="正常",
            emoji="🥗",
        )
    )
    db.commit()
    db.close()

    try:
        yield testing_session_local
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


@pytest_asyncio.fixture
async def review_client(review_test_db):
    del review_test_db
    app.dependency_overrides[get_current_user_id] = lambda: 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_duplicate_review_create_returns_409(review_client):
    first = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "第一次"},
    )
    assert first.status_code == 201

    second = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "4", "content": "第二次"},
    )
    assert second.status_code == 409
    assert "已经评价过" in second.json()["detail"]


@pytest.mark.asyncio
async def test_updated_review_returns_updated_at(review_client):
    created = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "原评价"},
    )
    review_id = created.json()["id"]

    updated = await review_client.put(
        f"/api/reviews/{review_id}",
        data={
            "rating": "3",
            "content": "改过了",
            "tags": '["偏贵"]',
            "keep_images": "[]",
        },
    )

    assert updated.status_code == 200
    body = updated.json()
    assert body["content"] == "改过了"
    assert body["updatedAt"] is not None


@pytest.mark.asyncio
async def test_review_author_can_keep_old_images_and_add_new_one(
    review_test_db,
    review_client,
):
    created = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "原评价"},
    )
    review_id = created.json()["id"]

    db = review_test_db()
    review = db.query(Review).filter(Review.id == review_id).first()
    review.images = json.dumps(["/static/uploads/old.jpg"])
    db.commit()
    db.close()

    updated = await review_client.put(
        f"/api/reviews/{review_id}",
        data={
            "rating": "4",
            "content": "保留旧图并加新图",
            "tags": '["推荐"]',
            "keep_images": '["/static/uploads/old.jpg"]',
        },
        files={"images": ("new.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert updated.status_code == 200
    body = updated.json()
    assert body["images"][0] == "/static/uploads/old.jpg"
    assert len(body["images"]) == 2


@pytest.mark.asyncio
async def test_review_update_forbidden_for_other_user(review_client):
    created = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "原评价"},
    )
    review_id = created.json()["id"]

    app.dependency_overrides[get_current_user_id] = lambda: 2
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        forbidden = await client.put(
            f"/api/reviews/{review_id}",
            data={"rating": "2", "keep_images": "[]"},
        )

    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_removed_old_image_file_is_deleted(review_test_db, review_client):
    created = await review_client.post(
        "/api/reviews",
        data={"dish_id": "dish-1", "rating": "5", "content": "原评价"},
    )
    review_id = created.json()["id"]

    import routes.reviews as reviews_module

    old_file = Path(reviews_module.UPLOAD_DIR) / "old-delete.jpg"
    old_file.write_bytes(b"old-image")

    db = review_test_db()
    review = db.query(Review).filter(Review.id == review_id).first()
    review.images = json.dumps(["/static/uploads/old-delete.jpg"])
    db.commit()
    db.close()

    updated = await review_client.put(
        f"/api/reviews/{review_id}",
        data={
            "rating": "4",
            "content": "删掉旧图",
            "tags": '["推荐"]',
            "keep_images": "[]",
        },
    )

    assert updated.status_code == 200
    assert not old_file.exists()
