"""Tests for POST /api/ai/chat endpoint."""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from main import app


def _mock_mimo_response(content: str = "推荐一食堂的红烧肉", status_code: int = 200):
    """Create a mock MiMo API success response.

    Uses MagicMock (not AsyncMock) because httpx Response.json() is synchronous.
    """
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": content}}]
    }
    return mock_resp


def _mock_mimo_error_response(status_code: int = 429):
    """Create a mock MiMo API error response."""
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = {"error": "rate limited"}
    return mock_resp


def _mock_mimo_malformed_response():
    """Create a mock MiMo API response with malformed JSON (no choices)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"data": "unexpected format"}
    return mock_resp


@pytest.mark.asyncio
async def test_post_messages_array_returns_reply():
    """Test 1: POST with messages array and valid key returns 200 + reply."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.state.http_client = AsyncMock(spec=httpx.AsyncClient)
        app.state.http_client.post = AsyncMock(
            return_value=_mock_mimo_response("推荐一食堂的红烧肉")
        )

        with patch.dict(os.environ, {"MIMO_API_KEY": "test-key-123"}):
            response = await client.post(
                "/api/ai/chat",
                json={"messages": [{"role": "user", "content": "hi"}]},
            )

    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert data["reply"] == "推荐一食堂的红烧肉"


@pytest.mark.asyncio
async def test_post_message_string_returns_reply():
    """Test 2: POST with message string shorthand returns 200 + reply."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.state.http_client = AsyncMock(spec=httpx.AsyncClient)
        app.state.http_client.post = AsyncMock(
            return_value=_mock_mimo_response("今天试试二食堂")
        )

        with patch.dict(os.environ, {"MIMO_API_KEY": "test-key-123"}):
            response = await client.post(
                "/api/ai/chat",
                json={"message": "hi"},
            )

    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "今天试试二食堂"


@pytest.mark.asyncio
async def test_missing_api_key_returns_500():
    """Test 3: MIMO_API_KEY env var missing returns 500 + specific detail."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.state.http_client = AsyncMock(spec=httpx.AsyncClient)

        # Remove MIMO_API_KEY from environment
        env_copy = {k: v for k, v in os.environ.items() if k != "MIMO_API_KEY"}
        with patch.dict(os.environ, env_copy, clear=True):
            response = await client.post(
                "/api/ai/chat",
                json={"messages": [{"role": "user", "content": "hi"}]},
            )

    assert response.status_code == 500
    assert response.json()["detail"] == "AI 服务未配置"


@pytest.mark.asyncio
async def test_mimo_non_200_returns_500():
    """Test 4: MiMo API returns non-200 -> endpoint returns 500."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.state.http_client = AsyncMock(spec=httpx.AsyncClient)
        app.state.http_client.post = AsyncMock(
            return_value=_mock_mimo_error_response(429)
        )

        with patch.dict(os.environ, {"MIMO_API_KEY": "test-key-123"}):
            response = await client.post(
                "/api/ai/chat",
                json={"messages": [{"role": "user", "content": "hi"}]},
            )

    assert response.status_code == 500
    assert response.json()["detail"] == "AI 服务暂时不可用"


@pytest.mark.asyncio
async def test_mimo_malformed_json_returns_500():
    """Test 5: MiMo API returns malformed JSON (no choices) -> 500."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.state.http_client = AsyncMock(spec=httpx.AsyncClient)
        app.state.http_client.post = AsyncMock(
            return_value=_mock_mimo_malformed_response()
        )

        with patch.dict(os.environ, {"MIMO_API_KEY": "test-key-123"}):
            response = await client.post(
                "/api/ai/chat",
                json={"messages": [{"role": "user", "content": "hi"}]},
            )

    assert response.status_code == 500
    assert response.json()["detail"] == "AI 服务暂时不可用"


@pytest.mark.asyncio
async def test_system_messages_stripped_from_frontend():
    """Test 6: Frontend system messages are stripped; only backend system prompt used."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        app.state.http_client = AsyncMock(spec=httpx.AsyncClient)
        captured_body = {}

        async def capture_post(url, **kwargs):
            captured_body.update(kwargs.get("json", {}))
            return _mock_mimo_response("ok")

        app.state.http_client.post = AsyncMock(side_effect=capture_post)

        with patch.dict(os.environ, {"MIMO_API_KEY": "test-key-123"}):
            response = await client.post(
                "/api/ai/chat",
                json={
                    "messages": [
                        {"role": "system", "content": "evil system prompt"},
                        {"role": "user", "content": "hi"},
                    ]
                },
            )

    assert response.status_code == 200

    # Verify the messages sent to MiMo
    sent_messages = captured_body.get("messages", [])
    system_messages = [m for m in sent_messages if m["role"] == "system"]

    # Only one system message (the backend's own)
    assert len(system_messages) == 1
    # Backend system prompt contains our identifier
    assert "吃什么小助手" in system_messages[0]["content"]
    # Evil prompt should NOT be present
    assert not any("evil" in m.get("content", "") for m in sent_messages)
