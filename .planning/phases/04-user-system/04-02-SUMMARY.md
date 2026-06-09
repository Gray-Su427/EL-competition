---
phase: 4
plan: "04-02"
subsystem: "auth-protection"
tags: [jwt, auth-guard, fastapi-dependencies, react-router]
dependency_graph:
  requires: ["04-01"]
  provides: ["global-auth-enforcement", "frontend-auth-guard"]
  affects: ["canteens-route", "dishes-route", "suggestion-route", "search-route", "ai-route", "app-routing"]
tech_stack:
  added: []
  patterns: ["APIRouter dependencies for route-level auth", "React AuthGuard wrapper pattern"]
key_files:
  created:
    - what_to_eat_today_web/frontend/src/components/AuthGuard.tsx
  modified:
    - what_to_eat_today_web/backend/routes/canteens.py
    - what_to_eat_today_web/backend/routes/dishes.py
    - what_to_eat_today_web/backend/routes/suggestion.py
    - what_to_eat_today_web/backend/routes/search.py
    - what_to_eat_today_web/backend/routes/ai.py
    - what_to_eat_today_web/frontend/src/App.tsx
decisions:
  - "路由级 dependencies 而非 app 全局中间件：保持 auth 路由公开"
  - "AuthGuard 用 useEffect+state 模式，checking 状态返回 null 避免闪烁"
  - "/auth/callback 路由放在 AuthGuard 外确保 CAS 回调可达"
metrics:
  duration: "3m24s"
  completed: "2026-06-09T09:59:37Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 7
---

# Phase 4 Plan 02: 全局认证保护 Summary

**后端 5 个数据路由全部添加 JWT 依赖 + 前端 AuthGuard 拦截未登录用户跳转 CAS**

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | 后端 5 个路由文件添加 JWT 认证依赖 | ddad667 | canteens/dishes/suggestion/search/ai 全部加 `dependencies=[Depends(get_current_user)]` |
| 2 | 前端认证守卫 AuthGuard + 路由重构 | dc8a5ea | 新建 AuthGuard.tsx + App.tsx 拆分为 protected/public 路由 |

## Implementation Details

### Task 1: Backend Route-Level Auth

每个数据路由的 `APIRouter` 构造函数中添加 `dependencies=[Depends(get_current_user)]`。这意味着该路由器下所有端点在执行前都会先验证 JWT。

- `auth.py` 中 `get_current_user` 使用 `HTTPBearer` scheme，无 Authorization header 返回 403
- 无效/过期 token 返回 401
- `routes/auth.py`（login 端点）不添加此依赖，保持公开

### Task 2: Frontend AuthGuard

- `AuthGuard.tsx`: 挂载时调用 `isTokenValid()`，有效则渲染子组件，无效调用 `redirectToCAS()` 跳转
- `App.tsx` 路由结构重构为两层：
  - 外层 Routes: `/auth/callback` 不受保护（CAS 回调需要可达）
  - `/*` 匹配所有其他路径，包裹在 `<AuthGuard>` 中
  - 内层 `ProtectedRoutes`: `/`, `/search`, `/ai`, `*` fallback

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

- [x] 5 个路由文件语法验证通过（ast.parse）
- [x] TypeScript 类型检查通过（tsc --noEmit 零错误）
- [x] auth/login 路由不受认证保护
- [x] /auth/callback 前端路由不在 AuthGuard 内

## Self-Check: PASSED
