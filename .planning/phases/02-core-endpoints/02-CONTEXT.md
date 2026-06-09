# Phase 2: Core Endpoints - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

前端 6 个数据读取 API 端点全部实现，响应格式与前端 TypeScript types 完全匹配。本阶段交付可工作的 REST 端点，让前端从 mock 数据切换到真实后端成为可能。不含 AI 代理端点（那是 Phase 3）。

</domain>

<decisions>
## Implementation Decisions

### 今日推荐逻辑
- **D-01:** 推荐文案硬编码 5 条（与前端 mock 一致），通过菜品 ID 关联到数据库
- **D-02:** 每次请求随机选一条文案，使用关联的菜品 ID 从数据库查询最新的完整 Dish 对象返回
- **D-03:** 响应格式为 `{ text: string, highlightDish: DishOut }`（highlightDish 是完整嵌套对象，非 ID）

### 搜索匹配策略
- **D-04:** 搜索使用 SQL LIKE '%keyword%' 匹配 4 个字段：name、canteen、window、tags
- **D-05:** 不做优先级排序，匹配到的菜品直接返回（和前端 mock 的 includes() 行为一致）
- **D-06:** 空关键词返回空数组 []

### 路由文件组织
- **D-07:** 按资源拆 4 个路由文件：
  - `routes/canteens.py` → GET /api/canteens
  - `routes/dishes.py` → GET /api/dishes/recommended + GET /api/dishes/search
  - `routes/search.py` → GET /api/search/hot-keywords + GET /api/search/suggestions
  - `routes/suggestion.py` → GET /api/suggestion/today
- **D-08:** 每个路由文件使用 FastAPI APIRouter，在 main.py 中 include

### 热门关键词数据源
- **D-09:** 从数据库菜品 tags 字段动态提取，去重后按出现频率排序取前 10 个
- **D-10:** 不硬编码关键词列表，加新菜品时热搜自动更新

### 已锁定决策（来自 Phase 1）
- **D-11:** Sync SQLAlchemy 用于所有 DB 路由
- **D-12:** 字符串主键（"c1", "d1"）
- **D-13:** camelCase 通过 alias_generator = to_camel 在 schemas.py 中锁定
- **D-14:** CanteenOut 和 DishOut schema 已完成，from_attributes=True 支持 ORM 直转
- **D-15:** tags 存为 JSON Text，DishOut 有 field_validator 自动反序列化

### Claude's Discretion
- TodaySuggestion Pydantic schema 的具体实现方式
- 路由文件中的具体导入组织
- APIRouter prefix 和 tags 配置
- 搜索建议（suggestions）端点的具体实现细节（与 hot-keywords 类似逻辑）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 前端数据契约
- `what_to_eat_today_web/frontend/src/types.ts` — TypeScript 接口定义（Canteen, Dish, TodaySuggestion），后端响应必须 1:1 匹配
- `what_to_eat_today_web/frontend/src/mock/mockApi.ts` — 6 个 API 函数的行为定义、搜索逻辑参考、今日推荐文案来源

### 已有后端代码
- `what_to_eat_today_web/backend/main.py` — FastAPI app 实例 + lifespan + CORS，路由需 include 到这里
- `what_to_eat_today_web/backend/models.py` — ORM 模型（Canteen, Dish），路由查询目标
- `what_to_eat_today_web/backend/schemas.py` — CanteenOut, DishOut 响应 schema（已有 camelCase + from_attributes）
- `what_to_eat_today_web/backend/database.py` — SessionLocal 和 engine，路由需从这里获取 session

### 项目规划
- `.planning/ROADMAP.md` — Phase 2 成功标准（5 个 curl 验证命令）
- `.planning/REQUIREMENTS.md` — API-01~API-06 需求详情

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `schemas.py` 中 CanteenOut 和 DishOut 已完成，路由直接用 `response_model=list[CanteenOut]` 即可
- `database.py` 中 SessionLocal 可用于 FastAPI Depends 注入
- `seed.py` 中的种子数据包含完整的文案文本，今日推荐的 5 条文案可从 mockApi.ts 复制

### Established Patterns
- FastAPI lifespan 管理启动/关闭（已实现）
- Pydantic from_attributes=True 支持 ORM 对象直接转 response
- tags 字段存为 JSON Text，DishOut.parse_tags validator 自动处理反序列化
- SQLite 同步访问模式（非 async）

### Integration Points
- `main.py` 需要 `app.include_router()` 引入 4 个路由模块
- 路由中需要 `from database import SessionLocal` 获取 session
- 需新增 TodaySuggestionOut schema 到 schemas.py（含 text + highlightDish 嵌套）

</code_context>

<specifics>
## Specific Ideas

- 用户希望热门关键词能像外卖平台的标签筛选一样有实际意义，所以选择动态提取而非硬编码
- 今日推荐选择关联数据库是为了"以后加数据时不怕忘记同步更新"

</specifics>

<deferred>
## Deferred Ideas

- 基于真实搜索量统计的热门关键词（需要先有搜索日志功能和用户量）
- 分类标签系统（如"甜品"、"面食"、"简餐"独立品类概念）— 目前菜品无 category 字段
- 搜索结果按匹配优先级排序（数据量大了再考虑）

</deferred>

---

*Phase: 2-Core Endpoints*
*Context gathered: 2026-06-09*
