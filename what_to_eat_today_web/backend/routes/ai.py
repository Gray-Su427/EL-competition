"""AI chat proxy endpoints with lightweight personalization."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncGenerator

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, model_validator

from database import SessionLocal
from jwt_utils import JWT_ALGORITHM, JWT_SECRET, get_current_user_id
from profile_service import (
    apply_profile_patch,
    build_intro_message,
    build_profile_prompt,
    evaluate_profile_status,
    get_or_create_context_state,
    get_or_create_profile,
    rank_dishes_for_user,
)
from schemas import AiSessionInitOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

MIMO_API_URL = "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
MIMO_MODEL = "mimo-v2.5-pro"
API_UNAVAILABLE_MESSAGE = "AI 服务暂时不可用"
API_NOT_CONFIGURED_MESSAGE = "AI 服务未配置"

SYSTEM_PROMPT = """你是“吃什么小助手”，一位服务南京大学鼓楼校区同学的校园餐饮顾问。

你的职责：
1. 根据用户口味、忌口、预算、距离、当下状态推荐更适合的菜品和食堂。
2. 回答简洁、亲切、有校园感，像一个靠谱的学长学姐。
3. 推荐时尽量给出理由，比如更清淡、出餐更快、评价更高、离得更近。
4. 回复控制在 150 字以内，适合手机阅读。
5. 如果信息不足，优先用一句自然的话引导用户补充，而不是连续追问。
"""


class ChatRequest(BaseModel):
    """Request body for AI chat endpoint."""

    messages: list[dict[str, Any]] | None = None
    message: str | None = None

    @model_validator(mode="after")
    def validate_input(self) -> "ChatRequest":
        if self.messages is None and self.message is None:
            raise ValueError("Either 'messages' or 'message' must be provided")
        return self


class ChatResponse(BaseModel):
    """Response body for AI chat endpoint."""

    reply: str


def _normalize_messages(body: ChatRequest) -> list[dict[str, str]]:
    if body.message is not None:
        return [{"role": "user", "content": body.message}]
    return [
        {
            "role": str(message.get("role", "")),
            "content": str(message.get("content", "")),
        }
        for message in (body.messages or [])
        if message.get("content")
    ]


def _filter_frontend_system_messages(
    messages: list[dict[str, str]],
) -> list[dict[str, str]]:
    return [message for message in messages if message.get("role") != "system"]


def _extract_latest_user_message(messages: list[dict[str, str]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return message.get("content", "")
    return ""


def _resolve_optional_user_id(request: Request) -> int | None:
    override = request.app.dependency_overrides.get(get_current_user_id)
    if override is not None:
        try:
            return int(override())
        except Exception:
            return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        return None

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError, ValueError):
        return None


async def _extract_profile_patch(user_message: str) -> dict[str, Any]:
    """Infer simple profile/context updates from the latest user message."""
    patch: dict[str, Any] = {
        "long_term_updates": {},
        "context_updates": {},
        "summary_patch": "",
        "confidence": 0.0,
    }
    if not user_message.strip():
        return patch

    long_term: dict[str, Any] = {}
    context_updates: dict[str, Any] = {}
    summary_bits: list[str] = []
    confidence = 0.0

    if "不吃香菜" in user_message:
        long_term["disliked_ingredients"] = ["香菜"]
        summary_bits.append("不吃香菜")
        confidence = max(confidence, 0.95)
    if "不吃辣" in user_message or "不能吃辣" in user_message:
        long_term["spice_preference"] = "avoid_spicy"
        summary_bits.append("长期不吃辣")
        confidence = max(confidence, 0.92)
    if "爱吃辣" in user_message or "喜欢吃辣" in user_message:
        long_term["spice_preference"] = "love_spicy"
        summary_bits.append("喜欢吃辣")
        confidence = max(confidence, 0.88)
    if "预算" in user_message and any(keyword in user_message for keyword in ["低", "便宜", "省", "学生"]):
        long_term["budget_preference"] = "low"
        summary_bits.append("预算偏敏感")
        confidence = max(confidence, 0.8)

    if "今天" in user_message and "清淡" in user_message:
        context_updates["current_lightness_need"] = "light"
        confidence = max(confidence, 0.85)
    if any(keyword in user_message for keyword in ["快一点", "赶时间", "快点", "来不及"]):
        context_updates["current_speed_need"] = "fast"
        confidence = max(confidence, 0.85)
    if any(keyword in user_message for keyword in ["辣一点", "想吃辣", "重口"]):
        context_updates["current_spice_need"] = "spicy"
        confidence = max(confidence, 0.82)

    patch["long_term_updates"] = long_term
    patch["context_updates"] = context_updates
    patch["summary_patch"] = "；".join(summary_bits)
    patch["confidence"] = confidence
    return patch


def _build_full_messages(
    filtered_messages: list[dict[str, str]],
    profile_prompt: str | None = None,
) -> list[dict[str, str]]:
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if profile_prompt:
        full_messages.append({"role": "system", "content": profile_prompt})
    full_messages.extend(filtered_messages)
    return full_messages


def _load_personalization_context(user_id: int | None) -> tuple[Any | None, Any | None, list[Any]]:
    if user_id is None:
        return None, None, []

    db = SessionLocal()
    try:
        profile = get_or_create_profile(db, user_id)
        context_state = get_or_create_context_state(db, user_id)
        profile.profile_status = evaluate_profile_status(profile)
        candidate_dishes = [
            {
                "name": dish.name,
                "canteen": dish.canteen,
                "window": dish.window,
            }
            for dish in rank_dishes_for_user(db, profile, context_state, limit=3)
        ]
        db.commit()
        db.refresh(profile)
        db.refresh(context_state)
        return profile, context_state, candidate_dishes
    finally:
        db.close()


def _persist_profile_patch(user_id: int | None, patch: dict[str, Any]) -> None:
    if user_id is None:
        return
    db = SessionLocal()
    try:
        apply_profile_patch(db, user_id, patch)
    finally:
        db.close()


@router.get("/session/init", response_model=AiSessionInitOut)
def init_ai_session(user_id: int = Depends(get_current_user_id)) -> AiSessionInitOut:
    """Return profile status, intro copy, and three recommended dishes."""
    db = SessionLocal()
    try:
        profile = get_or_create_profile(db, user_id)
        context_state = get_or_create_context_state(db, user_id)
        profile.profile_status = evaluate_profile_status(profile)
        db.commit()
        ranked_dishes = rank_dishes_for_user(db, profile, context_state, limit=3)
        return AiSessionInitOut(
            profile_status=profile.profile_status,
            profile_summary=profile.profile_summary,
            intro_message=build_intro_message(profile.profile_status),
            recommended_dishes=ranked_dishes,
        )
    finally:
        db.close()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest) -> ChatResponse:
    """Proxy user conversation to MiMo API with optional profile-aware prompt injection."""
    mimo_api_key = os.environ.get("MIMO_API_KEY")
    if not mimo_api_key:
        raise HTTPException(status_code=500, detail=API_NOT_CONFIGURED_MESSAGE)

    user_messages = _normalize_messages(body)
    filtered_messages = _filter_frontend_system_messages(user_messages)
    latest_user_message = _extract_latest_user_message(filtered_messages)
    user_id = _resolve_optional_user_id(request)

    profile_prompt = None
    if user_id is not None:
        profile, context_state, candidate_dishes = _load_personalization_context(user_id)
        if profile and context_state:
            profile_prompt = build_profile_prompt(profile, context_state, candidate_dishes)

    full_messages = _build_full_messages(filtered_messages, profile_prompt)
    http_client = request.app.state.http_client

    try:
        mimo_response = await http_client.post(
            MIMO_API_URL,
            json={
                "model": MIMO_MODEL,
                "messages": full_messages,
                "max_completion_tokens": 512,
                "temperature": 0.7,
            },
            headers={
                "Content-Type": "application/json",
                "api-key": mimo_api_key,
            },
        )
    except Exception:
        logger.exception("MiMo API request failed")
        raise HTTPException(status_code=500, detail=API_UNAVAILABLE_MESSAGE)

    if mimo_response.status_code != 200:
        logger.warning("MiMo API returned status %d", mimo_response.status_code)
        raise HTTPException(status_code=500, detail=API_UNAVAILABLE_MESSAGE)

    try:
        data = mimo_response.json()
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        logger.warning("MiMo API returned malformed response")
        raise HTTPException(status_code=500, detail=API_UNAVAILABLE_MESSAGE)

    if user_id is not None:
        patch = await _extract_profile_patch(latest_user_message)
        _persist_profile_patch(user_id, patch)

    return ChatResponse(reply=content)


@router.post("/chat/stream")
async def chat_stream(request: Request, body: ChatRequest):
    """Stream AI response via SSE (Server-Sent Events)."""
    mimo_api_key = os.environ.get("MIMO_API_KEY")
    if not mimo_api_key:
        raise HTTPException(status_code=500, detail=API_NOT_CONFIGURED_MESSAGE)

    user_messages = _normalize_messages(body)
    filtered_messages = _filter_frontend_system_messages(user_messages)
    latest_user_message = _extract_latest_user_message(filtered_messages)
    user_id = _resolve_optional_user_id(request)

    profile_prompt = None
    if user_id is not None:
        profile, context_state, candidate_dishes = _load_personalization_context(user_id)
        if profile and context_state:
            profile_prompt = build_profile_prompt(profile, context_state, candidate_dishes)
        patch = await _extract_profile_patch(latest_user_message)
        _persist_profile_patch(user_id, patch)

    full_messages = _build_full_messages(filtered_messages, profile_prompt)
    http_client = request.app.state.http_client

    async def generate() -> AsyncGenerator[str, None]:
        try:
            async with http_client.stream(
                "POST",
                MIMO_API_URL,
                json={
                    "model": MIMO_MODEL,
                    "messages": full_messages,
                    "max_completion_tokens": 512,
                    "temperature": 0.7,
                    "stream": True,
                },
                headers={
                    "Content-Type": "application/json",
                    "api-key": mimo_api_key,
                },
            ) as response:
                if response.status_code != 200:
                    logger.warning(
                        "MiMo API stream returned status %d",
                        response.status_code,
                    )
                    yield f"data: {json.dumps({'error': API_UNAVAILABLE_MESSAGE})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:]
                    if payload == "[DONE]":
                        yield "data: [DONE]\n\n"
                        return
                    try:
                        chunk = json.loads(payload)
                        choices = chunk.get("choices", [])
                        if not choices:
                            continue
                        delta = choices[0].get("delta", {})
                        content = delta.get("content")
                        if content:
                            yield f"data: {json.dumps({'content': content})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except Exception:
            logger.exception("MiMo API stream failed")
            yield f"data: {json.dumps({'error': API_UNAVAILABLE_MESSAGE})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
