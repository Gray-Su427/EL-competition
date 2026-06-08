# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 1-Foundation
**Areas discussed:** 种子数据范围, 后端项目结构, CORS 与端口配置, Dish 字段映射细节

---

## 种子数据范围

| Option | Description | Selected |
|--------|-------------|----------|
| 复制 mock 数据 | 完全复制前端 mock 的 3 食堂 + 7 菜品，保持一致性 | ✓ |
| 在 mock 基础上扩充 | 加几道南大鼓楼实际有的菜品，让演示更丰富 | |
| 最小数据集 | 先只放 1-2 道菜做最小验证 | |

**User's choice:** 复制 mock 数据
**Notes:** 保持前后端数据一致性，降低联调风险

---

## 后端项目结构

| Option | Description | Selected |
|--------|-------------|----------|
| 多文件拆分 | main.py + models.py + schemas.py + database.py + seed.py | ✓ |
| 单文件 main.py | 所有代码写在一个 main.py (~300 行) | |
| 先单文件再逐步拆 | 从单文件开始，代码变多了再拆 | |

**User's choice:** 多文件拆分
**Notes:** 用户选择了预览中的结构，职责清晰便于学习

---

## CORS 与端口配置

| Option | Description | Selected |
|--------|-------------|----------|
| 只允许 localhost:5173 | CORS 白名单只写本地前端端口，够开发用 | ✓ |
| 开发+生产域名占位 | 白名单多加一个生产域名占位符 | |
| 允许所有来源 | allow_origins=["*"]，最宽松但不安全 | |

**User's choice:** 只允许 localhost:5173
**Notes:** 用户不熟悉 CORS 概念，解释后理解。确认 Vite 使用默认 5173 端口（vite.config.ts 无自定义端口配置）。用户问了为什么不推荐选项 2——解释了当前没有确定的生产域名，写占位符反而困惑。

---

## Dish 字段映射细节

| Option | Description | Selected |
|--------|-------------|----------|
| 全部存后端 | 后端数据库存所有字段包括 emoji 和 distance | ✓ |
| emoji/distance 前端维护 | 这两个字段不存后端，前端自己补 | |
| 先存后端后续再说 | 先保持一致，以后觉得不合适再改 | |

**User's choice:** 全部存后端
**Notes:** 后端返回数据与前端 mock 保持 100% 一致，前端联调时不需要额外处理

---

## Claude's Discretion

- 具体的 SQLAlchemy Column 类型选择（Text vs String 等）
- requirements.txt 中具体版本号
- seed.py 幂等性实现细节
- lifespan 函数中的日志打印内容

## Deferred Ideas

None — discussion stayed within phase scope
