"""Tests for AI personalization session initialization."""

import json
import shutil
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from database import Base
from jwt_utils import get_current_user_id
from main import app
from models import Dish, User


@pytest.fixture
def personalization_test_db(monkeypatch):
    temp_root = Path(__file__).parent / "_tmp_profile" / uuid.uuid4().hex
    temp_root.mkdir(parents=True, exist_ok=True)
    db_file = temp_root / "personalization-test.db"
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

    import profile_service as profile_service_module
    import routes.ai as ai_module
    import routes.auth as auth_module
    import routes.reviews as reviews_module

    monkeypatch.setattr(ai_module, "SessionLocal", testing_session_local)
    monkeypatch.setattr(auth_module, "SessionLocal", testing_session_local)
    monkeypatch.setattr(reviews_module, "SessionLocal", testing_session_local)
    monkeypatch.setattr(profile_service_module, "SessionLocal", testing_session_local)

    db = testing_session_local()
    db.add(User(id=1, email="u1@nju.edu.cn", nickname="测试用户"))
    db.add_all([
        Dish(
            id="dish-1",
            name="清汤面",
            price=12,
            canteen="二食堂",
            window="面食窗口",
            rating=4.7,
            review_count=18,
            tags='["清淡","面食","快"]',
            heat_status="正常",
            emoji="🍜",
            cuisine="面食",
            spice_level="不辣",
            ingredient="面",
        ),
        Dish(
            id="dish-2",
            name="麻辣香锅",
            price=22,
            canteen="一食堂",
            window="川菜窗口",
            rating=4.6,
            review_count=28,
            tags='["辣","重口","下饭"]',
            heat_status="正常",
            emoji="🌶️",
            cuisine="川菜",
            spice_level="重辣",
            ingredient="混合",
        ),
        Dish(
            id="dish-3",
            name="鸡胸沙拉",
            price=16,
            canteen="三食堂",
            window="轻食窗口",
            rating=4.5,
            review_count=15,
            tags='["清淡","轻食","健康"]',
            heat_status="正常",
            emoji="🥗",
            cuisine="轻食",
            spice_level="不辣",
            ingredient="鸡胸肉",
        ),
    ])
    db.commit()
    db.close()

    try:
        yield testing_session_local
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


@pytest.mark.asyncio
async def test_ai_session_init_without_profile_returns_cold_start(personalization_test_db):
    del personalization_test_db
    app.dependency_overrides[get_current_user_id] = lambda: 1
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/ai/session/init")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["profileStatus"] == "empty"
    assert len(data["recommendedDishes"]) == 3
    assert "慢慢记住" in data["introMessage"]


@pytest.mark.asyncio
async def test_ai_session_init_with_profile_returns_personalized_top_choices(personalization_test_db):
    db = personalization_test_db()
    db.execute(
        text(
            "INSERT INTO user_profiles "
            "(user_id, profile_summary, liked_cuisines, disliked_ingredients, allergies, dietary_rules, spice_preference, "
            "budget_preference, preferred_canteens, avoid_canteens, favorite_tags, avoid_tags, profile_status) "
            "VALUES (1, :summary, :liked, :disliked, '[]', '[]', 'low', 'low', :preferred, '[]', :fav_tags, '[]', 'ready')"
        ),
        {
            "summary": "偏爱清淡、预算敏感，常去二食堂。",
            "liked": json.dumps(["面食", "轻食"], ensure_ascii=False),
            "disliked": json.dumps(["香菜"], ensure_ascii=False),
            "preferred": json.dumps(["二食堂"], ensure_ascii=False),
            "fav_tags": json.dumps(["清淡", "快"], ensure_ascii=False),
        },
    )
    db.commit()
    db.close()

    app.dependency_overrides[get_current_user_id] = lambda: 1
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/ai/session/init")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["profileStatus"] == "ready"
    assert data["recommendedDishes"][0]["name"] == "清汤面"
    assert "按你的口味" in data["introMessage"]


@pytest.mark.asyncio
async def test_ai_session_init_returns_non_repetitive_intro_for_ready_profile(personalization_test_db):
    db = personalization_test_db()
    db.execute(
        text(
            "INSERT INTO user_profiles "
            "(user_id, profile_summary, liked_cuisines, disliked_ingredients, allergies, dietary_rules, spice_preference, "
            "budget_preference, preferred_canteens, avoid_canteens, favorite_tags, avoid_tags, profile_status) "
            "VALUES (1, '偏好清淡和面食。', '[\"面食\"]', '[]', '[]', '[]', 'low', 'low', '[\"二食堂\"]', '[]', '[\"清淡\"]', '[]', 'ready')"
        )
    )
    db.commit()
    db.close()

    app.dependency_overrides[get_current_user_id] = lambda: 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/ai/session/init")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert "按你的口味" in body["introMessage"]
    assert "3 个" in body["introMessage"]


def _mock_mimo_response(content: str = "按你的口味推荐清汤面。", status_code: int = 200):
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": content}}],
    }
    return mock_resp


@pytest.mark.asyncio
async def test_chat_updates_long_term_profile_only_on_explicit_preference(
    personalization_test_db,
    monkeypatch,
):
    import routes.ai as ai_module

    app.state.http_client = AsyncMock()
    app.state.http_client.post = AsyncMock(
        return_value=_mock_mimo_response("收到，我记住你不吃香菜。")
    )
    monkeypatch.setattr(
        ai_module,
        "_extract_profile_patch",
        AsyncMock(
            return_value={
                "long_term_updates": {"disliked_ingredients": ["香菜"]},
                "context_updates": {},
                "summary_patch": "不吃香菜。",
                "confidence": 0.95,
            }
        ),
    )

    app.dependency_overrides[get_current_user_id] = lambda: 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/ai/chat",
            json={"messages": [{"role": "user", "content": "我不吃香菜"}]},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 200
    db = personalization_test_db()
    row = db.execute(
        text(
            "SELECT disliked_ingredients, profile_status "
            "FROM user_profiles WHERE user_id = 1"
        )
    ).fetchone()
    db.close()
    assert "香菜" in json.loads(row[0])
    assert row[1] in {"partial", "ready"}


@pytest.mark.asyncio
async def test_chat_keeps_temporary_need_out_of_long_term_profile(
    personalization_test_db,
    monkeypatch,
):
    import routes.ai as ai_module

    app.state.http_client = AsyncMock()
    app.state.http_client.post = AsyncMock(
        return_value=_mock_mimo_response("今天给你找点清淡快手的。")
    )
    monkeypatch.setattr(
        ai_module,
        "_extract_profile_patch",
        AsyncMock(
            return_value={
                "long_term_updates": {},
                "context_updates": {
                    "current_lightness_need": "light",
                    "current_speed_need": "fast",
                },
                "summary_patch": "",
                "confidence": 0.9,
            }
        ),
    )

    app.dependency_overrides[get_current_user_id] = lambda: 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/ai/chat",
            json={"messages": [{"role": "user", "content": "今天想吃清淡点，快一点"}]},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 200
    db = personalization_test_db()
    profile = db.execute(
        text("SELECT liked_cuisines FROM user_profiles WHERE user_id = 1")
    ).fetchone()
    context_row = db.execute(
        text(
            "SELECT current_lightness_need, current_speed_need "
            "FROM user_context_state WHERE user_id = 1"
        )
    ).fetchone()
    db.close()
    assert json.loads(profile[0]) == []
    assert context_row[0] == "light"
    assert context_row[1] == "fast"


@pytest.mark.asyncio
async def test_review_submission_enriches_profile_tags(personalization_test_db):
    app.dependency_overrides[get_current_user_id] = lambda: 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/reviews",
            data={
                "dish_id": "dish-1",
                "rating": "5",
                "content": "清淡而且上菜快，我喜欢这种",
                "tags": '["清淡","推荐"]',
            },
        )
    app.dependency_overrides.clear()

    assert response.status_code == 201
    db = personalization_test_db()
    row = db.execute(
        text(
            "SELECT favorite_tags, profile_status "
            "FROM user_profiles WHERE user_id = 1"
        )
    ).fetchone()
    db.close()
    tags = json.loads(row[0])
    assert "清淡" in tags
    assert row[1] in {"partial", "ready"}
