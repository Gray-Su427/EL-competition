# Phase 3: AI Proxy - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

POST /api/ai/chat 端点实现。通过后端 httpx 代理转发用户对话到 MiMo API，避免前端暴露 API Key。本阶段只做一个端点，不修改前端代码（前端联调属于 v2 FE-02）。

</domain>

<decisions>
## Implementation Decisions

### 请求格式
- **D-01:** 前端传完整 messages 数组（role + content），后端透传给 MiMo API
- **D-02:** 请求体格式：`{ "messages": [{"role": "user", "content": "今天吃什么"}] }`
- **D-03:** 后端不限制 messages 数组长度（数据量极小，无需截断）

### System Prompt 管理
- **D-04:** System prompt 由后端注入，不依赖前端传递
- **D-05:** 后端在 messages 数组最前面自动插入 system message（复制 aiService.ts 中的完整提示词）
- **D-06:** 前端传来的 messages 中如果包含 role=system 的消息，后端忽略（以后端为准）

### 响应格式
- **D-07:** 成功时返回 `{"reply": "AI回复内容"}`
- **D-08:** 失败时返回 HTTP 500 + `{"detail": "AI 服务暂时不可用"}` （不暴露内部错误详情）
- **D-09:** MIMO_API_KEY 缺失时，端点返回 HTTP 500 + `{"detail": "AI 服务未配置"}`，不泄露 key 值

### MiMo API 调用参数
- **D-10:** 完全复用前端 aiService.ts 的参数：model=mimo-v2.5-pro, max_completion_tokens=512, temperature=0.7
- **D-11:** 认证头使用 `api-key: {MIMO_API_KEY}`（与前端一致）
- **D-12:** API 基地址：`https://token-plan-cn.xiaomimimo.com/v1/chat/completions`

### 路由文件
- **D-13:** 新建 `routes/ai.py`，使用 APIRouter(prefix="/api/ai", tags=["ai"])
- **D-14:** 在 main.py 中 include_router 接入

### 已锁定决策（来自 Phase 1）
- **D-15:** httpx.AsyncClient 已在 lifespan 启动时创建（app.state.http_client），直接使用
- **D-16:** .env 已通过 python-dotenv 加载，使用 os.environ 读取 MIMO_API_KEY
- **D-17:** CORS 已配置，前端 localhost:5173 可跨域访问

### Claude's Discretion
- Pydantic 请求体 schema 的具体字段验证细节
- httpx 请求超时时间（已设置 30s，可调整）
- 日志记录的具体内容和级别

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 前端 AI 服务契约
- `what_to_eat_today_web/frontend/src/services/aiService.ts` — MiMo API 调用方式、认证头格式、请求参数、响应解析路径（data.choices[0].message.content）、System Prompt 完整文本
- `what_to_eat_today_web/frontend/src/components/AIChat.tsx` — 前端如何组织 messages 数组发送给 AI 服务

### 已有后端代码
- `what_to_eat_today_web/backend/main.py` — app.state.http_client（httpx.AsyncClient 实例）、lifespan 管理
- `what_to_eat_today_web/backend/.env.example` — MIMO_API_KEY 环境变量模板

### 项目规划
- `.planning/ROADMAP.md` — Phase 3 成功标准（3 个 curl 验证命令）
- `.planning/REQUIREMENTS.md` — AI-01 需求详情

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app.state.http_client` — 已在 lifespan 中初始化的 httpx.AsyncClient（timeout=30s），直接用于代理请求
- `os.environ` — .env 已通过 load_dotenv() 加载，MIMO_API_KEY 可直接读取
- Phase 2 的路由模式 — APIRouter + include_router 模式已建立，照搬即可

### Established Patterns
- 路由文件使用 APIRouter(prefix="/api/xxx", tags=["xxx"])
- Session/请求资源通过 try/finally 或直接使用
- 响应模型使用 Pydantic BaseModel

### Integration Points
- `main.py` 需新增 `from routes.ai import router as ai_router` + `app.include_router(ai_router)`
- 路由函数需要 `request: Request` 参数来访问 `request.app.state.http_client`

</code_context>

<specifics>
## Specific Ideas

- 前端 aiService.ts 的认证头是 `api-key`（不是 `Authorization: Bearer`），后端代理必须保持一致
- MiMo 响应路径是 `data.choices[0].message.content`，后端提取后包装为 `{"reply": content}`

</specifics>

<deferred>
## Deferred Ideas

- 流式响应（SSE）— 目前前端不支持流式，后续如需打字机效果再考虑
- 对话历史持久化 — 当前对话只在前端 state 中存活，关闭页面即丢失
- 前端改为调用后端代理（FE-02）— v2 需求，本阶段后端先独立可用

</deferred>

---

*Phase: 3-AI Proxy*
*Context gathered: 2026-06-09*
