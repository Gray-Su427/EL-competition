# 今天吃什么 — 后端实现

## What This Is

南京大学鼓楼校区校园餐饮推荐应用的后端服务。为已有的 React 前端 SPA 提供数据 API，包括食堂信息、菜品推荐、搜索和 AI 对话代理。

## Core Value

让学生快速找到想吃的菜——食堂、菜品、推荐数据必须准确可用。

## Requirements

### Validated

- ✓ 前端 SPA 路由和 UI 框架 — existing
- ✓ AI 对话界面（AIChat 组件） — existing
- ✓ 搜索页面 UI — existing
- ✓ Android WebView 壳应用结构 — existing

### Active

- [ ] FastAPI 后端全部 7 个 API 端点实现
- [ ] SQLAlchemy ORM 模型（Canteen、Dish）
- [ ] SQLite 数据库初始化
- [ ] 鼓楼校区三食堂种子数据
- [ ] AI 对话代理端点（httpx 代理 MiMo API）
- [ ] CORS 中间件配置

### Out of Scope

- 前端改造（mock → fetch 联调） — 本阶段只做后端
- 用户认证/注册系统 — v1 不需要
- Android 集成部署 — 后续阶段
- 评价/评论功能的后端 — 前端该页面尚未定义数据结构

## Context

- 前端已有 mock 数据层（`src/mock/mockApi.ts`），定义了数据结构和 API 调用模式
- 后端 `main.py` 目前是空文件，需要从零搭建
- AI 对话功能使用小米 MiMo API，需要通过后端代理转发（避免前端暴露 API Key）
- 种子数据基于南大鼓楼校区实际食堂：一食堂、二食堂、三食堂
- 前端 `config.ts` 已配置 `API_BASE = 'http://localhost:8000'`

## Constraints

- **Tech stack**: FastAPI + SQLAlchemy + SQLite（开发指南已确定）
- **API 兼容**: 端点路径和响应格式必须匹配前端 mock 中的调用方式
- **环境变量**: MiMo API Key 通过 `.env` 管理，不可硬编码
- **端口**: 后端运行在 8000 端口

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite 而非 PostgreSQL | 校园应用规模小，部署简单 | — Pending |
| httpx 代理 MiMo | 不暴露 API Key 到前端 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-08 after initialization*
