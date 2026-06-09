# Phase 4: User System - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

用户注册/登录系统 + JWT 认证 + 食堂实时客流数据抓取。通过南大 CAS 统一身份认证实现登录（标准 CAS 客户端协议），登录成功后签发 JWT，所有 API 端点均需认证访问。同时利用用户 CAS session 抓取 E-Mobile 平台的食堂实时人流量数据，并建立定时刷新机制。

</domain>

<decisions>
## Implementation Decisions

### CAS 登录流程
- **D-01:** 标准 CAS 客户端接入（非代理登录、非自建账号系统）
- **D-02:** CAS 回调到前端：CAS 登录成功后跳转到前端路由（如 `/auth/callback?ticket=xxx`），前端提取 ticket 后调后端接口换 JWT
- **D-03:** 后端接口接收 ticket → 向 CAS 服务器验证 ticket → 提取用户信息（学号） → 首次登录自动创建用户记录 → 签发 JWT 返回
- **D-04:** CAS 服务器地址：`https://authserver.nju.edu.cn/authserver`

### Token 策略
- **D-05:** JWT 存储在前端 localStorage
- **D-06:** 请求通过 `Authorization: Bearer <token>` 头传递
- **D-07:** JWT 过期时间由 Claude 决定（合理默认值即可）

### 认证保护范围
- **D-08:** 所有 API 端点均需登录才能访问（全局认证）
- **D-09:** 前端打开后若无有效 JWT，直接跳转到 CAS 登录页
- **D-10:** 现有 6 个数据读取端点 + AI 代理端点全部加认证中间件

### 用户模型
- **D-11:** User 表字段：学号（CAS 返回的 uid，作为主键或唯一标识）、姓名、昵称（可空）、头像 URL（可空）、创建时间
- **D-12:** 首次 CAS 登录自动创建用户，学号和姓名来自 CAS 响应
- **D-13:** 昵称和头像留空，后续 Phase 5 或更后面让用户自行设置

### 食堂实时客流数据
- **D-14:** 用户登录时，后端利用 CAS session 调 E-Mobile API 抓取食堂实时客流数据，更新到数据库
- **D-15:** 建立定时刷新机制：用最近一次登录用户的 CAS session 定期（每 N 分钟）拉取最新数据
- **D-16:** 抓取逻辑参考 `canteen_flow.py`：先获取 sessionKey → 再调 NListAction 获取食堂列表数据
- **D-17:** 客流数据覆盖/更新 canteen 表的 status 字段（空闲/正常/拥挤）

### Claude's Discretion
- JWT 过期时间（建议 7 天）
- CAS ticket 验证的具体 HTTP 请求实现细节
- 定时刷新间隔（建议 10-15 分钟）
- CAS session 存储格式和过期清理策略
- User 模型主键选择（字符串学号 vs 自增 ID + 学号唯一）
- 认证中间件的具体实现方式（FastAPI Depends 依赖注入）
- Canteen 模型是否新增客流相关字段（当前人数、拥挤百分比等）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### CAS 认证参考
- `canteen_flow.py` — 完整的南大 CAS 登录流程实现（Playwright 版），含 CAS 服务器地址、E-Mobile API 调用方式、sessionKey 获取、食堂数据解析格式

### 已有后端代码
- `what_to_eat_today_web/backend/main.py` — FastAPI app 实例、lifespan 管理、CORS 配置、路由注册模式
- `what_to_eat_today_web/backend/models.py` — 现有 ORM 模型（Canteen, Dish），了解字段风格和 Base 类
- `what_to_eat_today_web/backend/database.py` — SQLAlchemy engine + session 配置
- `what_to_eat_today_web/backend/schemas.py` — Pydantic 响应模型和 camelCase alias 模式

### 前端认证集成
- `what_to_eat_today_web/frontend/src/App.tsx` — React 路由配置，需新增 `/auth/callback` 路由
- `what_to_eat_today_web/frontend/src/services/aiService.ts` — 当前请求方式参考，后续所有请求需加 Authorization 头

### 项目规划
- `.planning/ROADMAP.md` — Phase 4 目标和依赖关系
- `.planning/REQUIREMENTS.md` — 需求追踪

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `canteen_flow.py` — E-Mobile API 的完整调用逻辑（sessionKey 获取 + NListAction 数据拉取），可直接移植到后端
- 已有 `models.py` 中的 `Base`（DeclarativeBase）— 新 User 模型直接继承
- `main.py` 中的 lifespan — 可扩展用于初始化定时任务
- APIRouter 模式已在 5 个路由文件中建立 — 新 auth 路由照搬

### Established Patterns
- 字符串主键（`"c1"`, `"d1"`）— User 可用学号字符串作 PK
- Sync SQLAlchemy（同步操作）— 所有 DB 路由保持同步
- python-dotenv + os.environ 管理配置 — JWT secret 也走 .env
- Pydantic BaseModel 做响应模型 + camelCase alias

### Integration Points
- `main.py` 需新增认证中间件或依赖注入
- `main.py` 路由注册需加 auth router
- 现有路由文件（canteens.py, dishes.py 等）需加 JWT 验证依赖
- Canteen 模型可能需新增字段存储实时客流数据
- `.env` 需新增 `JWT_SECRET` 配置

</code_context>

<specifics>
## Specific Ideas

- CAS 回调到前端路由 `/auth/callback`，前端从 URL 参数提取 ticket 后调 `POST /api/auth/login` 换 JWT
- 食堂客流数据格式参考 `canteen_flow.py` 中的字段：`canteenname`（食堂名）、`ttl`（当前人数）、`bl`（拥挤度百分比）
- 需要建立食堂名称映射：E-Mobile 返回的食堂名 → 数据库中已有的 canteen 记录

</specifics>

<deferred>
## Deferred Ideas

- 用户资料编辑（昵称、头像设置）— Phase 5 或更后面
- SSE 流式推送客流变化 — 当前定时拉取够用
- CAS session 持久化到 Redis — 当前用户量小，内存/文件存储够用
- 多用户 session 池轮询 — 避免单一 session 过期导致数据断更

</deferred>

---

*Phase: 4-User System*
*Context gathered: 2026-06-09*
