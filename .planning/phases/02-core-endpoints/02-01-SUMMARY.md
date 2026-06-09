---
phase: 02-core-endpoints
plan: 01
subsystem: backend-api
tags: [fastapi, routes, rest-api, crud-read]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [data-api-endpoints]
  affects: [frontend-integration, ai-proxy]
tech_stack:
  added: []
  patterns: [apiRouter-per-resource, sessionLocal-try-finally, response_model-orm-auto-convert]
key_files:
  created:
    - what_to_eat_today_web/backend/routes/__init__.py
    - what_to_eat_today_web/backend/routes/canteens.py
    - what_to_eat_today_web/backend/routes/dishes.py
    - what_to_eat_today_web/backend/routes/suggestion.py
    - what_to_eat_today_web/backend/routes/search.py
  modified:
    - what_to_eat_today_web/backend/schemas.py
    - what_to_eat_today_web/backend/main.py
decisions:
  - "APIRouter prefix 包含完整资源路径（/api/dishes 而非仅 /dishes）"
  - "SessionLocal 使用 try/finally 手动关闭（非 FastAPI Depends，保持简单）"
  - "hot-keywords 使用 collections.Counter 动态聚合标签频率"
  - "suggestions 端点使用 Python set 去重后切片至 max 8"
metrics:
  duration: 356s
  completed: "2026-06-09T04:57:44Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 2
---

# Phase 2 Plan 01: Core Data Endpoints Summary

实现全部 6 个数据 API 端点，使用 APIRouter 按资源拆分 4 个路由文件，响应格式 camelCase 与前端 TypeScript types 完全匹配。

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7de003e | TodaySuggestionOut schema + routes 包 + canteens 路由 |
| 2 | 0093a90 | dishes 路由（推荐+搜索）+ suggestion 路由 |
| 3 | c77fc7d | search 路由 + 全部路由接入 main.py + e2e 验证 |

## Endpoints Delivered

| Endpoint | Response Shape | Verified |
|----------|---------------|----------|
| GET /api/canteens | `[{id, name, status, distance, openTime}]` (3 items) | Yes |
| GET /api/dishes/recommended | `[{id, name, price, ..., tags: [...], heatStatus, emoji}]` (7 items) | Yes |
| GET /api/dishes/search?keyword=X | Same as recommended, filtered by keyword | Yes |
| GET /api/suggestion/today | `{text, highlightDish: {...}}` nested full Dish | Yes |
| GET /api/search/hot-keywords | `["tag1", "tag2", ...]` (up to 10) | Yes |
| GET /api/search/suggestions?keyword=X | `["suggestion1", ...]` (up to 8, deduplicated) | Yes |

## Key Implementation Details

- TodaySuggestionOut schema 使用 DishOut 嵌套，alias_generator 自动生成 highlightDish
- 搜索使用 SQLAlchemy or_ + contains() 实现参数化查询（防注入）
- 今日推荐 5 条文案硬编码 dish_id 映射，每次请求 random.choice 后查 DB 获取完整 Dish
- hot-keywords 从全量菜品 tags JSON 动态聚合，Counter.most_common(10) 排序
- 空 keyword 搜索和建议端点均短路返回 []，不触发数据库查询

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

Server started on port 8000, all 6 endpoints curled successfully:
- camelCase keys confirmed (openTime, reviewCount, heatStatus, highlightDish)
- tags returned as string arrays (not JSON string)
- Empty keyword returns [] for both search and suggestions
- Suggestion returns full nested Dish object (not just ID)

## Self-Check: PASSED
