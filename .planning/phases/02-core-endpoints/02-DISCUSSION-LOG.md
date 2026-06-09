# Phase 2: Core Endpoints - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 02-core-endpoints
**Areas discussed:** 今日推荐逻辑, 搜索匹配策略, 路由文件组织, 热门关键词数据源

---

## 今日推荐逻辑

| Option | Description | Selected |
|--------|-------------|----------|
| A：纯硬编码 | 5 条文案和菜品信息全部写死在代码里 | |
| B：全动态生成 | 从数据库随机选菜品拼模板文案 | |
| C：文案硬编码 + 菜品 ID 查库 | 文案写死但通过菜品 ID 查数据库拿最新信息 | ✓ |

**User's choice:** 方案 C — 文案硬编码 + 菜品 ID 查数据库
**Notes:** 用户担心"以后加数据不一定记得更新"，选择了折中方案。文案仍需手写（质量保证），但菜品信息从数据库动态获取（不会过期）。

---

## 搜索匹配策略

| Option | Description | Selected |
|--------|-------------|----------|
| A：简单 LIKE 匹配 | SQL LIKE 匹配 name/canteen/window/tags 4 个字段 | ✓ |
| B：LIKE + 优先级排序 | 同 A 但按匹配字段优先级排序结果 | |

**User's choice:** 方案 A — 简单 LIKE 匹配
**Notes:** 只有 7 道菜，排序没有实际意义。

---

## 路由文件组织

| Option | Description | Selected |
|--------|-------------|----------|
| A：单文件 routes/data.py | 所有 6 个端点写在一个文件（~100 行） | |
| B：按资源拆 4 个文件 | canteens/dishes/search/suggestion 各一个文件 | ✓ |
| C：折中分 2 个 | canteens + dishes（含搜索和推荐） | |

**User's choice:** 方案 B — 按资源拆 4 个文件
**Notes:** 用户偏好清晰的组织结构，方便后续扩展。

---

## 热门关键词数据源

| Option | Description | Selected |
|--------|-------------|----------|
| A：硬编码 10 个词 | 和前端 mock 一致的固定列表 | |
| B：存数据库表 | 独立表存热词，换词不用改代码 | |
| C：动态聚合标签 | 从菜品 tags 字段动态提取按频率排序 | ✓ |

**User's choice:** 方案 C — 动态提取菜品标签
**Notes:** 用户经过多轮讨论后决定。关键考量：(1) 提取出的标签天然适合筛选（"清淡"、"实惠"等）；(2) 加新菜品时只需打好标签，热搜自动更新；(3) 用户认为热词"应该有实际意义"，动态提取保证每个词都能搜到结果。接受和前端 mock 不完全一致。

---

## Claude's Discretion

- TodaySuggestion Pydantic schema 具体实现
- APIRouter prefix 和 tags 配置
- 路由文件中的导入组织
- 搜索建议端点的具体逻辑

## Deferred Ideas

- 基于真实搜索量统计的热门关键词（需搜索日志 + 用户量）
- 分类标签系统（独立品类概念，如"甜品"、"面食"）
- 搜索结果优先级排序（数据量大了再考虑）
