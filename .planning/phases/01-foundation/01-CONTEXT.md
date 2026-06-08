# Phase 1: Foundation - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

后端可启动，数据库初始化完成，Pydantic camelCase 契约锁定，种子数据已插入。本阶段交付一个能跑的 FastAPI 骨架，包括 ORM 模型、响应 Schema、种子数据、基础设施配置（CORS、.env、uvicorn、lifespan）。不含任何 API 路由实现（那是 Phase 2）。

</domain>

<decisions>
## Implementation Decisions

### 种子数据范围
- **D-01:** 种子数据完全复制前端 mockApi.ts 的 3 个食堂 + 7 道菜品，字段值一一对应
- **D-02:** 不扩充额外数据，保持前后端数据一致性，降低联调风险

### 后端项目结构
- **D-03:** 多文件拆分，按职责组织：
  - `main.py` — FastAPI app 实例 + lifespan + CORS
  - `database.py` — SQLAlchemy engine + session
  - `models.py` — ORM 模型 (Canteen, Dish)
  - `schemas.py` — Pydantic 响应模型 (camelCase alias)
  - `seed.py` — 种子数据插入脚本
  - `.env` — MiMo API Key
  - `requirements.txt` — 依赖列表
- **D-04:** routes/ 目录留到 Phase 2 创建，Phase 1 不写任何路由

### CORS 与端口配置
- **D-05:** 前端 Vite dev server 端口确认为 5173（默认配置，无自定义）
- **D-06:** CORS 白名单只允许 `http://localhost:5173`，不提前加生产域名
- **D-07:** 后端端口固定 8000（与前端 config.ts 中 API_BASE 一致）

### 字段映射
- **D-08:** 后端存储所有前端字段，包括 emoji 和 distance
- **D-09:** Dish 模型字段：id, name, price, canteen, window, rating, reviewCount, tags, heatStatus, emoji
- **D-10:** Canteen 模型字段：id, name, status, distance, openTime

### 已锁定决策（来自 STATE.md）
- **D-11:** Sync SQLAlchemy 用于所有 DB 路由；async httpx 仅用于 AI 代理
- **D-12:** 字符串主键（`"c1"`, `"d1"`）— 非整数
- **D-13:** camelCase 通过 `alias_generator = to_camel` 在 schemas.py 中锁定
- **D-14:** SQLite 绝对路径通过 `pathlib.Path(__file__).parent / "canteen.db"`
- **D-15:** httpx.AsyncClient 在 lifespan 启动时创建一次，跨所有 AI 代理请求复用

### Claude's Discretion
- 具体的 SQLAlchemy Column 类型选择（Text vs String 等）
- requirements.txt 中具体版本号
- seed.py 幂等性实现细节（insert-or-ignore vs delete-then-insert）
- lifespan 函数中的日志打印内容

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 前端数据契约
- `what_to_eat_today_web/frontend/src/types.ts` — TypeScript 接口定义，后端 Schema 必须 1:1 匹配
- `what_to_eat_today_web/frontend/src/mock/mockApi.ts` — 种子数据来源 + API 调用模式参考

### 项目规划
- `.planning/ROADMAP.md` — Phase 1 成功标准和需求映射
- `.planning/REQUIREMENTS.md` — DB-01~DB-04, SCHEMA-01~03, INFRA-01~04 需求详情
- `.planning/PROJECT.md` — 项目约束和关键决策

### 架构参考
- `.planning/codebase/ARCHITECTURE.md` — 系统架构图和计划 API 端点表
- `.planning/codebase/STACK.md` — 技术栈详情

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `what_to_eat_today_web/frontend/src/types.ts` — Canteen/Dish/TodaySuggestion 接口，后端 Pydantic schema 直接对标
- `what_to_eat_today_web/frontend/src/mock/mockApi.ts` — 完整的种子数据（3 食堂 + 7 菜品 + 文案），可直接转为 Python 数据

### Established Patterns
- 前端使用 camelCase 字段名（openTime, heatStatus, reviewCount）
- 字符串 ID 格式：食堂 `c1`~`c3`，菜品 `d1`~`d7`
- tags 字段是字符串数组，需要后端用 JSON TEXT 列存储
- status/heatStatus 是中文枚举值：'空闲' | '正常' | '拥挤'

### Integration Points
- 后端 `main.py` 是空文件，从零搭建
- 前端 config.ts 已配置 `API_BASE = 'http://localhost:8000'`
- Vite dev server 在 localhost:5173（默认配置）

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-06-08*
