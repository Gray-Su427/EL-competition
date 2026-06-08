# Project State

**Current Phase:** 2
**Status:** Ready
**Last Updated:** 2026-06-08

## Phase Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | Complete | 2/2 |
| 2 | Core Endpoints | Not Started | 0/0 |
| 3 | AI Proxy | Not Started | 0/0 |

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** 让学生快速找到想吃的菜——食堂、菜品、推荐数据必须准确可用
**Current focus:** Phase 2 — Core Endpoints (ready to plan)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 3 |
| Phases complete | 1 |
| Requirements mapped | 18/18 |
| Plans complete | 2/2 |
| Plan 01-01 duration | 206s |
| Plan 01-02 duration | 292s |

## Accumulated Context

### Key Decisions

- Sync SQLAlchemy for all DB routes; async httpx only for AI proxy
- String PKs (`"c1"`, `"d1"`) — not integers
- camelCase via `alias_generator = to_camel` locked in schemas.py before any route is built
- Absolute SQLite path via `pathlib.Path(__file__).parent / "canteen.db"`
- httpx.AsyncClient created once at lifespan startup, reused across all AI proxy requests
- Used DeclarativeBase (SQLAlchemy 2.0 style) over legacy declarative_base()
- Tags stored as JSON Text with field_validator deserialization
- delete-then-insert strategy for seed idempotency
- Added !.env.example exception to .gitignore (.env.* pattern was blocking template commit)

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

Last action: Phase 1 Foundation complete — verified 2026-06-08
Next action: `/gsd-plan-phase 2` — plan Core Endpoints phase
Resume file: .planning/phases/01-foundation/01-VERIFICATION.md
