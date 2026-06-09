---
phase: 03-ai-proxy
plan: 01
subsystem: ai-proxy
tags: [ai, proxy, httpx, mimo, fastapi]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [ai-chat-endpoint]
  affects: [frontend-ai-integration]
tech_stack:
  added: [pytest-asyncio]
  patterns: [async-proxy, system-prompt-injection, pydantic-validation]
key_files:
  created:
    - what_to_eat_today_web/backend/routes/ai.py
    - what_to_eat_today_web/backend/tests/__init__.py
    - what_to_eat_today_web/backend/tests/test_ai.py
  modified:
    - what_to_eat_today_web/backend/main.py
decisions:
  - "MagicMock (非 AsyncMock) 模拟 httpx Response，因为 .json() 是同步方法"
  - "Task 1 和 Task 2 合并为一个 feat commit，因为路由注册是测试通过的前提"
metrics:
  duration: 726s
  completed: "2026-06-09T07:38:20Z"
  tasks_total: 2
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 3 Plan 1: AI Chat Proxy Summary

POST /api/ai/chat 代理端点实现 — httpx 转发 MiMo API，后端注入 system prompt，支持 messages 数组和 message 字符串双格式

## One-liner

通过后端 httpx 代理 MiMo AI 对话，服务端注入 system prompt 并屏蔽前端 system 消息，API Key 不暴露

## What Was Built

### routes/ai.py

- `ChatRequest` Pydantic 模型：接受 `messages` (list) 或 `message` (str)
- `ChatResponse` Pydantic 模型：返回 `reply` 字段
- `POST /chat` 端点挂载在 `APIRouter(prefix="/api/ai", tags=["ai"])`
- Handler 逻辑：
  1. 检查 MIMO_API_KEY 环境变量（缺失 -> 500 "AI 服务未配置"）
  2. 过滤前端传入的 role=system 消息
  3. 注入完整 system prompt（与 aiService.ts 一致）
  4. 通过 app.state.http_client 调用 MiMo API
  5. 提取 choices[0].message.content 返回为 reply
  6. 异常和非 200 响应 -> 500 "AI 服务暂时不可用"

### main.py 变更

- 新增 `from routes.ai import router as ai_router`
- 新增 `app.include_router(ai_router)`

### 测试覆盖

6 个 pytest 测试用例全部通过：
1. messages 数组格式正常返回 reply
2. message 字符串快捷格式正常返回 reply
3. MIMO_API_KEY 缺失返回 500 + 正确错误信息
4. MiMo API 非 200 状态返回 500
5. MiMo 返回畸形 JSON 返回 500
6. 前端 system 消息被过滤，仅后端 prompt 生效

## Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| 1 (RED) | 4022737 | test | 添加 AI chat 端点 6 个失败测试用例 |
| 1+2 (GREEN) | 16053f0 | feat | 实现 POST /api/ai/chat 代理端点 + 注册路由 |

## TDD Gate Compliance

- RED gate: `test(03-01)` commit 4022737 - 6 tests failing (404)
- GREEN gate: `feat(03-01)` commit 16053f0 - 6 tests passing
- REFACTOR gate: skipped (code already clean, no refactoring needed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pytest-asyncio 版本兼容问题**
- **Found during:** Task 1 RED phase
- **Issue:** async fixture 在 pytest-asyncio 1.4.0 + pytest 9.x 下不被支持
- **Fix:** 改用内联 AsyncClient 模式替代 async fixture
- **Files modified:** tests/test_ai.py

**2. [Rule 3 - Blocking] AsyncMock.json() 返回协程而非值**
- **Found during:** Task 1 GREEN phase
- **Issue:** httpx Response.json() 是同步方法，但 AsyncMock 让它返回协程
- **Fix:** 改用 MagicMock 模拟 httpx Response 对象
- **Files modified:** tests/test_ai.py

**3. [Structural] Task 1 和 Task 2 合并**
- **Reason:** 路由注册（Task 2）是测试能找到端点的前提，TDD 流程要求 GREEN phase 通过全部测试
- **Impact:** Task 2 内容包含在 Task 1 的 GREEN commit 中，无需额外 commit

## Verification Results

| Check | Result |
|-------|--------|
| pytest tests/test_ai.py (6 tests) | PASSED |
| /api/ai/chat in app.routes | PASSED |
| No hardcoded key (grep tp-cn64j8) | PASSED (0 matches) |
| os.environ used in routes/ai.py | PASSED (1 match) |
| Server starts without errors | PASSED |
| Swagger /docs shows endpoint | PASSED |

## Security Verification

- MIMO_API_KEY accessed via `os.environ.get()` only
- Error messages use generic text, never expose key or internal details
- Frontend system messages are stripped (prevents prompt injection)
- httpx timeout = 30s prevents hanging connections

## Self-Check: PASSED

- [x] what_to_eat_today_web/backend/routes/ai.py exists
- [x] what_to_eat_today_web/backend/tests/__init__.py exists
- [x] what_to_eat_today_web/backend/tests/test_ai.py exists
- [x] Commit 4022737 exists in git log
- [x] Commit 16053f0 exists in git log
