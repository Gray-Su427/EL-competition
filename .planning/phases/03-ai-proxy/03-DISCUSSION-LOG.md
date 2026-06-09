# Phase 3: AI Proxy - Discussion Log

**Date:** 2026-06-09
**Participants:** User, Claude
**Duration:** ~5 min
**Areas Discussed:** 3

## Discussion

### 1. 请求格式设计

**Options presented:**
- A) 只传单条 message（简单但无上下文）
- B) 传完整 messages 数组（与前端现有调用方式一致）

**User selection:** B — 推荐方案
**Notes:** 前端 AIChat 组件已经维护完整对话历史，保持一致

### 2. System Prompt 放哪里

**Options presented:**
- A) 后端注入（改 prompt 不需重新部署前端）
- B) 前端继续传（不改前端代码）

**User selection:** A — 推荐方案
**Notes:** 安全角度 prompt 不暴露给用户；改 prompt 只需改后端

### 3. 错误处理策略

**Options presented:**
- 统一 JSON 格式返回错误
- key 缺失返回 500 + 明确错误信息

**User selection:** 推荐方案（ROADMAP 成功标准已定义）
**Notes:** 无额外讨论空间，ROADMAP 已锁定行为

## Deferred Ideas

- 流式响应（SSE）
- 对话历史持久化
- 前端改为调后端代理（FE-02）

## Context

User 表示没有后端经验，由 Claude 给出推荐方案后用户全部接受。决策均基于前端现有代码契约和 ROADMAP 成功标准。

---

*Phase: 3-AI Proxy*
*Discussion date: 2026-06-09*
