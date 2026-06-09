"""AI chat proxy endpoint — forwards conversations to MiMo API."""

import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, model_validator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

MIMO_API_URL = "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
MIMO_MODEL = "mimo-v2.5-pro"

SYSTEM_PROMPT = """你是"吃什么小助手"，一个专为南京大学仙林校区学生服务的 AI 餐饮顾问。

你的职责：
1. 根据学生的口味偏好、忌口、饥饿程度、当前状态（如赶时间、想放松、想吃辣等）推荐合适的菜品和食堂。
2. 了解南京大学仙林校区的食堂分布：一食堂（川菜窗口、小吃窗口）、二食堂（面食窗口、家常菜窗口）、三食堂（快餐窗口、轻食窗口）。
3. 根据就餐高峰期给出建议（如避开拥挤食堂）。
4. 回答要简洁、亲切、有校园感，像一个热心的学长/学姐。
5. 每次推荐要给出具体理由（如距离近、评分高、今天不拥挤等）。
6. 回复控制在 150 字以内，适合手机阅读。

当前食堂信息：
- 一食堂：距离 200m，开放时间 6:30-20:00，包含川菜窗口、小吃窗口
- 二食堂：距离 350m，开放时间 6:30-20:30，包含面食窗口、家常菜窗口
- 三食堂：距离 500m，开放时间 7:00-21:00，包含快餐窗口、轻食窗口"""


class ChatRequest(BaseModel):
    """Request body for AI chat endpoint.

    Accepts either:
    - messages: list of {role, content} dicts (full conversation history)
    - message: single string (shorthand, auto-wrapped as user message)
    """

    messages: Optional[list[dict]] = None
    message: Optional[str] = None

    @model_validator(mode="after")
    def validate_input(self) -> "ChatRequest":
        """Ensure at least one input format is provided."""
        if self.messages is None and self.message is None:
            raise ValueError(
                "Either 'messages' or 'message' must be provided"
            )
        return self


class ChatResponse(BaseModel):
    """Response body for AI chat endpoint."""

    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest) -> ChatResponse:
    """Proxy user conversation to MiMo API.

    - Injects server-side system prompt (D-05)
    - Strips any client-supplied system messages (D-06)
    - Returns AI reply or appropriate error
    """
    # D-09: Check API key availability
    mimo_api_key = os.environ.get("MIMO_API_KEY")
    if not mimo_api_key:
        raise HTTPException(status_code=500, detail="AI 服务未配置")

    # Normalize input: message string -> messages array
    if body.message is not None:
        user_messages = [{"role": "user", "content": body.message}]
    else:
        user_messages = body.messages or []

    # D-06: Strip any system messages from frontend input
    filtered_messages = [
        msg for msg in user_messages if msg.get("role") != "system"
    ]

    # D-05: Prepend backend system prompt
    full_messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *filtered_messages,
    ]

    # D-10/D-11/D-12: Call MiMo API
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
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")

    # D-08: Handle non-200 responses
    if mimo_response.status_code != 200:
        logger.warning("MiMo API returned status %d", mimo_response.status_code)
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")

    # Extract reply content from MiMo response
    try:
        data = mimo_response.json()
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        logger.warning("MiMo API returned malformed response")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用")

    return ChatResponse(reply=content)
