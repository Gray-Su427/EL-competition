# Roadmap: 今天吃什么 — 后端

**Created:** 2026-06-08
**Phases:** 5
**Requirements:** 18 mapped (v1) + D-01~D-17 (Phase 4)

## Phases

- [x] **Phase 1: Foundation** — 数据库模型、Pydantic 契约、种子数据、基础设施配置 *(completed 2026-06-08)*
- [x] **Phase 2: Core Endpoints** — 全部 6 个数据读取 API 端点实现 *(completed 2026-06-09)*
- [x] **Phase 3: AI Proxy** — MiMo API 代理端点实现 *(completed 2026-06-09)*
- [ ] **Phase 4: User System** — CAS 登录、JWT 认证、食堂实时客流
- [ ] **Phase 5: Reviews & Favorites** — 菜品评价、收藏、点赞功能

## Phase Details

### Phase 1: Foundation
**Goal:** 后端可启动，数据库初始化完成，Pydantic camelCase 契约锁定，种子数据已插入
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** DB-01, DB-02, DB-03, DB-04, SCHEMA-01, SCHEMA-02, SCHEMA-03, INFRA-01, INFRA-02, INFRA-03, INFRA-04
**Success Criteria:**
1. `uvicorn backend.main:app --port 8000` 启动成功，无报错，控制台打印 "Application startup complete"
2. `canteen.db` 文件生成，`SELECT COUNT(*) FROM canteens` 返回 3，`SELECT COUNT(*) FROM dishes` 返回 7
3. `curl http://localhost:8000/docs` 返回 200，Swagger UI 中 `/api/canteens` 端点可见
4. Python shell 中 `session.execute(select(Dish)).scalars().first()` 返回对象，`.id` 为字符串 `"d1"`
5. Pydantic 序列化验证：`CanteenOut.model_validate(canteen_obj).model_dump(by_alias=True)` 输出含 `openTime` 键（camelCase）
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Data Layer: ORM models + Pydantic contract + seed data
- [x] 01-02-PLAN.md — FastAPI app infrastructure: main.py + .env + requirements.txt

### Phase 2: Core Endpoints
**Goal:** 前端 6 个数据读取端点全部可用，响应格式与前端 TypeScript types 完全匹配
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** API-01, API-02, API-03, API-04, API-05, API-06
**Success Criteria:**
1. `curl http://localhost:8000/api/canteens` 返回 JSON 数组，包含 3 个食堂，每个对象含 `id`（字符串）、`name`、`openTime` 字段
2. `curl http://localhost:8000/api/dishes/recommended` 返回 Dish 数组，每个对象含 `tags`（字符串数组）、`heatStatus`、`price` 字段
3. `curl "http://localhost:8000/api/dishes/search?keyword=米饭"` 返回含匹配菜品的数组；`?keyword=` 空值返回空数组 `[]`
4. `curl http://localhost:8000/api/suggestion/today` 返回含 `text` 字符串和 `highlightDish` 完整 Dish 对象的响应（非 ID，是完整嵌套对象）
5. `curl http://localhost:8000/api/search/hot-keywords` 返回包含 10 个字符串的数组；`curl "http://localhost:8000/api/search/suggestions?keyword=面"` 返回最多 8 个联想词
**Plans:** 1 plan

Plans:
- [x] 02-01-PLAN.md — All 6 data endpoints: canteens, dishes, suggestion, search

### Phase 3: AI Proxy
**Goal:** POST /api/ai/chat 端点可用，MiMo API Key 不暴露在前端
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** AI-01
**Success Criteria:**
1. `curl -X POST http://localhost:8000/api/ai/chat -H "Content-Type: application/json" -d '{"message":"今天吃什么"}' ` 返回含 `reply` 字段的 JSON，内容来自 MiMo 响应
2. `.env` 中 `MIMO_API_KEY` 缺失时，端点返回 500 并附带明确错误信息，不泄露 key 值
3. 请求日志中不出现 API Key 明文；MiMo 实际请求通过服务端 httpx client 发出，浏览器 Network 面板不可见 key
**Plans:** 1 plan

Plans:
- [x] 03-01-PLAN.md — AI chat proxy: POST /api/ai/chat with MiMo forwarding

### Phase 4: User System
**Goal:** 用户通过南大 CAS 登录获取 JWT，所有端点需认证，食堂客流实时更新
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17
**Success Criteria:**
1. `POST /api/auth/login` 接收 CAS ticket，验证后返回 JWT token + 用户信息
2. 无效 ticket 返回 401；无 Authorization header 访问数据端点返回 401/403
3. 携带有效 JWT 的请求正常访问所有数据端点
4. 首次登录自动创建 User 记录（users 表）
5. 前端无 JWT 时自动跳转 CAS 登录页；/auth/callback 可提取 ticket 换 JWT
6. 定时任务启动且 session.json 存在时可更新 canteen status 字段
**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md — CAS 登录 + JWT 签发：用户可登录拿到 Token
- [ ] 04-02-PLAN.md — 全局认证保护：所有端点要求登录
- [ ] 04-03-PLAN.md — 食堂实时客流数据：E-Mobile 抓取 + 定时刷新

### Phase 5: Reviews & Favorites
**Goal:** 用户可评价菜品、收藏菜品、点赞菜品
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** TBD
**Success Criteria:** TBD (discuss-phase will define)
**Plans:** TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-06-08 |
| 2. Core Endpoints | 1/1 | Complete | 2026-06-09 |
| 3. AI Proxy | 1/1 | Complete | 2026-06-09 |
| 4. User System | 0/3 | In Progress | - |
| 5. Reviews & Favorites | 0/0 | Not Started | - |
