# Phase 4: User System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 04-user-system
**Areas discussed:** CAS 登录方式, CAS 流程, Token 策略, 认证保护范围, 用户模型, 食堂客流数据

---

## 脚本用途确认

| Option | Description | Selected |
|--------|-------------|----------|
| 数据源：抓实时客流 | 后端定时调脚本获取实时食堂人流量数据 | |
| 登录：CAS 统一认证 | 让应用用户通过南大 CAS 系统登录 | |
| 两个都想做 | 两个都想做——先用 CAS 数据更新客流，也打算用 CAS 做用户登录 | ✓ |

**User's choice:** 两个都想做
**Notes:** 用户提供了 `canteen_flow.py` 脚本作为参考实现

---

## CAS 登录实现方式

| Option | Description | Selected |
|--------|-------------|----------|
| 标准 CAS 客户端接入 | 前端跳 CAS 登录页，登录成功 CAS 回调，后端验 ticket + 签发 JWT | ✓ |
| 后端代理 CAS 登录 | 后端提供接口，用户传学号+密码，后端代理去 CAS 验证 | |
| 自建账号系统 + 独立抓取 | 简单做：用户名+密码本地注册，不接 CAS | |

**User's choice:** 标准 CAS 客户端接入
**Notes:** 用户对 CAS 流程不太熟悉，给出了详细解释后确认选择

---

## CAS 回调方向

| Option | Description | Selected |
|--------|-------------|----------|
| 回调到前端（推荐） | CAS 登录成功后跳回前端页面，前端拿 ticket 再调后端。对 SPA 更友好 | ✓ |
| 回调到后端 | CAS 登录成功后跳回后端，后端处理完再跳前端。后端多一步重定向 | |

**User's choice:** 回调到前端
**Notes:** 需要给用户解释两种方案的区别后才做出选择

---

## Token 存储方式

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage + Header | 前端存 localStorage，请求时放在 Authorization: Bearer xxx 头里 | ✓ |
| httpOnly Cookie | 后端设置 httpOnly cookie。更安全（防 XSS 窃取），但跨域配置更复杂 | |

**User's choice:** localStorage + Header
**Notes:** 校园内部使用，用户量小，安全要求不高

---

## 认证保护范围

| Option | Description | Selected |
|--------|-------------|----------|
| 只保护写入端点 | 现有 6 个数据读取端点不需要登录，只有 Phase 5 的写入操作才需要 | |
| 全部端点需要登录 | 登录后才能用所有功能，未登录访问任何接口都返回 401 | ✓ |
| 混合 | 读取免登录+写入需登录 | |

**User's choice:** 全部端点需要登录
**Notes:** 用户反问"不能首次进入都需要登陆吗"，确认希望强制全局认证

---

## 用户模型

**User's choice:** 学号+姓名+昵称+头像（为 Phase 5 评价功能预留）
**Notes:** 用户表示"要做阶段五为什么还要问我"——既然后续要评价功能，自然需要用户展示信息

---

## 食堂客流数据更新策略

| Option | Description | Selected |
|--------|-------------|----------|
| 登录时拉取一次（推荐） | 每次有人登录就刷新一次客流数据 | |
| 登录+定时刷新 | 登录时拉取 + 后台定期用最近 session 再拉取 | ✓ |

**User's choice:** 登录+定时刷新
**Notes:** 无额外说明

---

## Claude's Discretion

- JWT 过期时间
- CAS ticket 验证实现细节
- 定时刷新间隔
- CAS session 存储和过期策略
- User 模型主键设计
- 认证中间件实现方式
- Canteen 模型新增字段

## Deferred Ideas

- 用户资料编辑（昵称、头像设置）— Phase 5+
- SSE 流式推送客流变化
- CAS session 持久化到 Redis
- 多用户 session 池轮询
