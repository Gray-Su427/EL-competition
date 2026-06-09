---
phase: 4
plan: "04-03"
subsystem: canteen-flow
tags: [e-mobile, background-task, asyncio, httpx, data-sync]
dependency_graph:
  requires: ["04-01"]
  provides: ["canteen-flow-service", "live-canteen-status"]
  affects: ["canteens-table", "main-lifespan"]
tech_stack:
  added: []
  patterns: ["asyncio-background-task", "session-file-auth", "scheduled-refresh"]
key_files:
  created:
    - what_to_eat_today_web/backend/canteen_flow_service.py
  modified:
    - what_to_eat_today_web/backend/models.py
    - what_to_eat_today_web/backend/main.py
    - what_to_eat_today_web/backend/.env.example
    - .gitignore
decisions:
  - "E-Mobile session 通过文件系统 session.json 管理，非自动获取"
  - "定时刷新使用 asyncio.create_task 而非 APScheduler"
  - "拥挤度映射: <40% 空闲, 40-70% 正常, >70% 拥挤"
metrics:
  duration: "~8 min"
  completed: "2026-06-09T10:07:44Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 03: 食堂实时客流数据 Summary

E-Mobile API 抓取服务 + asyncio 定时刷新，10 分钟间隔更新 canteen 表实时状态

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Canteen 模型扩展 + E-Mobile 抓取服务 | d010820 | canteen_flow_service.py, models.py, .gitignore, .env.example |
| 2 | Lifespan 集成定时刷新任务 | fb584f5 | main.py |

## What Was Built

1. **Canteen 模型扩展** - 新增 `current_people` (Integer), `occupancy_pct` (String), `flow_updated_at` (String) 三个可空字段存储实时客流数据

2. **canteen_flow_service.py** - 完整的 E-Mobile API 调用服务：
   - `load_session()` - 读取 session.json 文件
   - `fetch_session_key()` - 异步获取 E-Mobile sessionKey
   - `fetch_canteen_data()` - 异步获取食堂流量数据
   - `update_canteen_status()` - 映射并更新数据库
   - `refresh_canteen_flow()` - 单次刷新流程
   - `start_refresh_loop()` - 无限循环定时刷新

3. **Lifespan 集成** - startup 启动后台任务，shutdown 优雅取消

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 现有 canteen.db 缺少新列**
- **Found during:** Task 2 验证
- **Issue:** `create_all()` 不会 ALTER 已存在的表，seed_data INSERT 时报 "no column named current_people"
- **Fix:** 使用 ALTER TABLE 手动添加三列（开发环境方案）
- **Files modified:** canteen.db (runtime)
- **Note:** 生产环境应使用 Alembic migration

**2. [Rule 2 - Security] session.json 添加到 .gitignore**
- **Found during:** Task 1 threat model 审查 (T-04-09)
- **Issue:** session.json 包含 E-Mobile 认证凭证，不应提交到版本控制
- **Fix:** .gitignore 添加 session.json
- **Files modified:** .gitignore
- **Commit:** d010820

## Known Stubs

None - 所有功能完整实现。session.json 文件需由管理员通过 canteen_flow.py 脚本生成，这是设计决策而非 stub。

## Self-Check: PASSED

- [x] canteen_flow_service.py exists
- [x] models.py has current_people, occupancy_pct, flow_updated_at
- [x] main.py has asyncio.create_task(start_refresh_loop(...))
- [x] Commit d010820 exists
- [x] Commit fb584f5 exists
- [x] Server starts without session.json
- [x] "Canteen flow refresh task started" printed at startup
