---
phase: 4
plan: "04-01"
subsystem: auth
tags: [CAS, JWT, login, user-model, frontend-callback]
dependency_graph:
  requires: [01-01, 01-02, 03-01]
  provides: [auth-infrastructure, user-model, jwt-utils, cas-validation]
  affects: [all-protected-endpoints, frontend-routing]
tech_stack:
  added: [PyJWT]
  patterns: [HTTPBearer-dependency-injection, CAS-XML-parsing, localStorage-token]
key_files:
  created:
    - what_to_eat_today_web/backend/auth.py
    - what_to_eat_today_web/backend/routes/auth.py
    - what_to_eat_today_web/frontend/src/services/authService.ts
    - what_to_eat_today_web/frontend/src/components/AuthCallback.tsx
  modified:
    - what_to_eat_today_web/backend/models.py
    - what_to_eat_today_web/backend/schemas.py
    - what_to_eat_today_web/backend/main.py
    - what_to_eat_today_web/backend/requirements.txt
    - what_to_eat_today_web/backend/.env.example
    - what_to_eat_today_web/frontend/src/App.tsx
    - what_to_eat_today_web/frontend/src/services/aiService.ts
decisions:
  - "auth.py 自行调用 load_dotenv() 确保独立可导入"
  - "HTTPBearer 返回 401（非 403）给缺失凭证的请求"
metrics:
  duration_seconds: 388
  completed: "2026-06-09T09:52:28Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 01: CAS 登录 + JWT 签发 Summary

CAS ticket 服务端验证 + PyJWT 签发 + 前端回调页面完整链路，用户可通过南大统一身份认证登录拿到 Token。

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | 后端认证基础设施 | 61fb623 | auth.py, routes/auth.py, models.py, schemas.py |
| 2 | 前端 CAS 回调 + Token 管理 | 4ccbfd2 | authService.ts, AuthCallback.tsx, App.tsx, aiService.ts |

## What Was Built

### Backend (auth.py + routes/auth.py)
- `create_access_token(student_id, name)` — HS256 JWT 签发，7 天过期
- `get_current_user()` — FastAPI Depends 依赖，验证 Bearer token
- `validate_cas_ticket(ticket, http_client)` — 异步 CAS XML 解析，提取学号和姓名
- `POST /api/auth/login` — 接收 ticket，验证后返回 JWT + UserOut
- `GET /api/auth/me` — 返回当前用户信息

### Frontend (authService.ts + AuthCallback.tsx)
- 7 个导出函数：getToken, setToken, removeToken, isTokenValid, redirectToCAS, loginWithTicket, getAuthHeaders
- AuthCallback 组件：提取 URL ticket 参数，调后端换 JWT，成功跳首页
- aiService.ts 所有请求自动携带 Authorization header

### Data Model (User)
- `users` 表：id (auto PK), student_id (unique index), name, nickname, avatar_url, created_at
- Pydantic schemas：LoginRequest, LoginResponse, UserOut（camelCase alias）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] auth.py 独立导入失败**
- **Found during:** Task 1 acceptance criteria验证
- **Issue:** auth.py 模块级读取 os.environ["JWT_SECRET"]，但 load_dotenv() 仅在 main.py 调用；独立 import auth 时环境变量未加载
- **Fix:** auth.py 顶部追加 `from dotenv import load_dotenv; load_dotenv()`
- **Files modified:** what_to_eat_today_web/backend/auth.py
- **Commit:** 61fb623

## Verification Results

- `python -c "from models import User; ..."` — OK
- `create_access_token('220001', '张三')` — 返回 token 长度 > 50: True
- `User.__tablename__` — "users"
- 后端启动无报错，POST /api/auth/login with fake ticket 返回 401
- GET /api/auth/me 无 token 返回 401
- 前端 `npx tsc --noEmit` 无类型错误

## Self-Check: PASSED

- [x] what_to_eat_today_web/backend/auth.py exists
- [x] what_to_eat_today_web/backend/routes/auth.py exists
- [x] what_to_eat_today_web/frontend/src/services/authService.ts exists
- [x] what_to_eat_today_web/frontend/src/components/AuthCallback.tsx exists
- [x] Commit 61fb623 exists
- [x] Commit 4ccbfd2 exists
