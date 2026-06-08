# Requirements: 今天吃什么 — 后端

**Defined:** 2026-06-08
**Core Value:** 为前端 SPA 提供准确可用的食堂和菜品数据 API

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### 数据库基础

- [ ] **DB-01**: SQLAlchemy ORM 定义 Canteen 模型（字符串 ID、名称、位置、窗口列表、营业时间、热度状态）
- [ ] **DB-02**: SQLAlchemy ORM 定义 Dish 模型（字符串 ID、名称、食堂引用、价格、评分、标签、图片）
- [ ] **DB-03**: SQLite 数据库引擎初始化，含 check_same_thread=False
- [ ] **DB-04**: 种子数据脚本，幂等插入三食堂 + 菜品数据

### 响应契约

- [ ] **SCHEMA-01**: Pydantic v2 响应模型，camelCase 字段别名匹配前端 types.ts
- [ ] **SCHEMA-02**: from_attributes=True 支持 ORM 对象直接序列化
- [ ] **SCHEMA-03**: tags 字段从 JSON TEXT 列反序列化为 list[str]

### 数据端点

- [ ] **API-01**: GET /api/canteens 返回食堂列表
- [ ] **API-02**: GET /api/dishes/recommended 返回推荐菜品列表
- [ ] **API-03**: GET /api/dishes/search?keyword=xxx 按关键词搜索菜品
- [ ] **API-04**: GET /api/suggestion/today 返回今日推荐文案（含嵌套完整 Dish 对象）
- [ ] **API-05**: GET /api/search/hot-keywords 返回热门搜索关键词列表
- [ ] **API-06**: GET /api/search/suggestions?keyword=xxx 返回搜索联想词列表

### AI 代理

- [ ] **AI-01**: POST /api/ai/chat 通过 httpx 代理转发到 MiMo API，不暴露 API Key

### 基础设施

- [ ] **INFRA-01**: CORS 中间件允许前端 localhost:5173 跨域请求
- [ ] **INFRA-02**: .env 文件管理 MiMo API Key，python-dotenv 加载
- [ ] **INFRA-03**: uvicorn 启动配置，端口 8000
- [ ] **INFRA-04**: FastAPI lifespan 管理启动/关闭（seed + httpx client）

## v2 Requirements

### 前端联调

- **FE-01**: 前端 mockApi.ts 切换为 fetch 真实后端 API
- **FE-02**: aiService.ts 改为调用后端 /api/ai/chat 代替直接调 MiMo

### 扩展功能

- **EXT-01**: 用户评价/评论系统
- **EXT-02**: 用户收藏菜品功能
- **EXT-03**: 食堂营业状态实时更新

## Out of Scope

| Feature | Reason |
|---------|--------|
| 用户认证/注册 | v1 不需要用户系统 |
| 评论后端 | 前端评论页数据结构未定义 |
| 分页 | 前端未传分页参数 |
| 缓存层 | 数据量极小，无需缓存 |
| Docker 部署 | 本地开发阶段 |
| Android 集成 | 后续阶段 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Pending |
| DB-02 | Phase 1 | Pending |
| DB-03 | Phase 1 | Pending |
| DB-04 | Phase 1 | Pending |
| SCHEMA-01 | Phase 1 | Pending |
| SCHEMA-02 | Phase 1 | Pending |
| SCHEMA-03 | Phase 1 | Pending |
| API-01 | Phase 2 | Pending |
| API-02 | Phase 2 | Pending |
| API-03 | Phase 2 | Pending |
| API-04 | Phase 2 | Pending |
| API-05 | Phase 2 | Pending |
| API-06 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-08*
*Last updated: 2026-06-08 after initial definition*
