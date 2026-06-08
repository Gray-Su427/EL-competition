# Project State

**Current Phase:** 1
**Status:** Planned
**Last Updated:** 2026-06-08

## Phase Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | Planned | 0/2 |
| 2 | Core Endpoints | Not Started | 0/0 |
| 3 | AI Proxy | Not Started | 0/0 |

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** 让学生快速找到想吃的菜——食堂、菜品、推荐数据必须准确可用
**Current focus:** Phase 1 — Foundation (planning complete, ready to execute)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 3 |
| Phases complete | 0 |
| Requirements mapped | 18/18 |
| Plans complete | 0/2 |

## Accumulated Context

### Key Decisions

- Sync SQLAlchemy for all DB routes; async httpx only for AI proxy
- String PKs (`"c1"`, `"d1"`) — not integers
- camelCase via `alias_generator = to_camel` locked in schemas.py before any route is built
- Absolute SQLite path via `pathlib.Path(__file__).parent / "canteen.db"`
- httpx.AsyncClient created once at lifespan startup, reused across all AI proxy requests

### Build Order Constraint

Phase 1 (schemas.py) must be correct before Phase 2 routes are written.
Phase 3 (AI proxy) is independent of ORM — depends only on Phase 1 infra (lifespan, .env).

### Open Items

- ~~Confirm frontend Vite port (5173 vs 3000) before CORS config~~ → **Resolved: 5173 (Vite default, no custom config)**
- Inspect `aiService.ts` for exact MiMo response field path before implementing `routes/ai.py`
- ~~Confirm whether `GET /api/dishes/recommended` should return all 7 dishes or a subset~~ → **Resolved: return all 7**

### Phase 1 Decisions (from discuss-phase)

- Seed data: copy frontend mock exactly (3 canteens + 7 dishes)
- Project structure: multi-file (main/database/models/schemas/seed)
- CORS: allow only `http://localhost:5173`
- Fields: store ALL fields including emoji and distance

## Session Continuity

Last action: Phase 1 planning complete (2 plans created)
Next action: `/gsd-execute-phase 1` — execute Foundation phase
Resume file: `.planning/phases/01-foundation/01-01-PLAN.md`
