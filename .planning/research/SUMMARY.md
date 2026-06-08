# Research Summary — 今天吃什么 Backend

**Synthesized:** 2026-06-08
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Confidence:** HIGH (all research derived from direct source file analysis of frontend code and dev guide)

---

## Executive Summary

This is a FastAPI backend for a campus dining recommendation app targeting Nanjing University's Gulou campus. The frontend (React SPA) is already built and live-calling a set of well-defined API endpoints — the backend's job is to satisfy that existing contract exactly. The data model is intentionally tiny: 3 canteens, 7 dishes, static seed data. The architecture is deliberately simple: SQLite + SQLAlchemy sync ORM + FastAPI with dependency injection. The only genuinely complex piece is the AI proxy endpoint, which must forward chat messages to the MiMo API while keeping the API key server-side.

The main risk in this project is not technical complexity — it is silent contract mismatch. The frontend TypeScript types define precise field names (camelCase), precise ID formats (string `"c1"` not integer `1`), and precise nested response shapes. Any deviation causes React to silently render nothing rather than throw an error. Getting the Pydantic schemas right — camelCase aliases, string PKs, full nested Dish in TodaySuggestion — must happen before any route is tested.

The recommended build order is strictly bottom-up: database layer first, then ORM models, then Pydantic schemas (with the camelCase config locked in), then seed data, then routes one by one, then main.py to wire it all together. The AI proxy route is independent of the ORM and can be slotted in at any point after the HTTP client pattern is understood.

---

## Stack Summary

| Technology | Pinned Version | Role |
|------------|---------------|------|
| Python | 3.11+ | Runtime |
| FastAPI | `0.115.*` | HTTP framework |
| uvicorn | `0.32.*[standard]` | ASGI server |
| Pydantic | `2.9.*` | Response schemas and validation |
| SQLAlchemy | `2.0.*` (sync) | ORM — sync sessions only |
| SQLite | bundled | Storage — adequate for this scale |
| python-dotenv | `1.0.*` | Load `.env` for API key |
| httpx | `0.27.*` | Async HTTP client for AI proxy only |

**Key decision:** Sync SQLAlchemy for all DB routes (FastAPI runs sync handlers in a thread pool). Async only for the AI proxy (`httpx.AsyncClient`). Async SQLAlchemy (`aiosqlite`) is explicitly ruled out — adds complexity and risks "database is locked" errors with no throughput benefit at this scale.

**Deprecated patterns to avoid:**
- `@app.on_event("startup")` — use `lifespan` context manager instead
- `session.query(Model).filter(...)` — use `select(Model)` + `session.execute()` (SQLAlchemy 2.0 style)
- `class Config: orm_mode = True` — use `model_config = ConfigDict(from_attributes=True)` (Pydantic v2)

---

## Table Stakes

All 10 of the following are MVP blockers. The frontend breaks without every one of them.

| # | Endpoint | What It Returns |
|---|----------|----------------|
| 1 | CORS middleware (global) | Allows `http://localhost:5173` |
| 2 | `GET /api/canteens` | `Canteen[]` — id/name/status/distance/openTime |
| 3 | `GET /api/dishes/recommended` | `Dish[]` — full fields including tags/emoji/heatStatus |
| 4 | `GET /api/dishes/search?keyword=` | `Dish[]` — empty array for blank keyword |
| 5 | `GET /api/suggestion/today` | `{ text, highlightDish?: Dish }` — full nested Dish |
| 6 | `GET /api/search/hot-keywords` | `string[]` — 10 static keywords |
| 7 | `GET /api/search/suggestions?keyword=` | `string[]` — max 8 results |
| 8 | `POST /api/ai/chat` | `{ reply: string }` — proxied from MiMo |
| 9 | Seed data | 3 canteens + 7 dishes + 5 suggestion texts |
| 10 | Frontend `aiService.ts` migration | Switch from direct MiMo call to backend proxy |

**Explicitly out of scope for v1:** user auth, pagination, comments CRUD, real recommendation algorithms, admin CMS, image upload, Redis caching, WebSocket, multi-campus support.

---

## Architecture

### File Layout

```
backend/
├── main.py          — FastAPI app, CORS, router mounts, lifespan hook
├── database.py      — engine (singleton), SessionLocal, get_db() dependency
├── models.py        — Canteen, Dish ORM classes (String PKs)
├── schemas.py       — Pydantic response models (camelCase via alias_generator)
├── seed.py          — idempotent seed: 3 canteens + 7 dishes + suggestion texts
├── routes/
│   ├── canteens.py  — GET /api/canteens
│   ├── dishes.py    — GET /api/dishes/recommended + search
│   ├── suggestion.py— GET /api/suggestion/today
│   ├── search.py    — GET /api/search/hot-keywords + suggestions
│   └── ai.py        — POST /api/ai/chat (async, httpx proxy)
├── .env             — MIMO_API_KEY (never commit)
└── requirements.txt
```

### Key Patterns

1. **DB session via Depends:** Every route receives a `Session` through `Depends(get_db)`. The generator uses `try/yield/finally` to guarantee close on every request including exceptions.

2. **APIRouter per route file, `/api` prefix mounted once in main.py.** Route files never repeat the `/api` prefix.

3. **Lifespan for startup:** `create_all()` + `seed_if_empty()` run inside `@asynccontextmanager async def lifespan(app)`. The deprecated `@app.on_event("startup")` is not used.

4. **httpx.AsyncClient as lifespan singleton:** Created once at startup, reused across all AI proxy requests, closed on shutdown. Creating a new client per request defeats connection pooling.

5. **camelCase output via Pydantic alias_generator:** All response schemas inherit a base config with `alias_generator = to_camel` and `populate_by_name=True`. FastAPI routes use `response_model_by_alias=True`.

6. **tags stored as JSON string:** SQLite has no array type. `tags_json TEXT` column stores `'["微辣","高人气"]'`. A Pydantic field validator calls `json.loads()` to emit `list[str]` in responses.

7. **SQLite path is absolute:** `pathlib.Path(__file__).parent / "canteen.db"` — never relative to working directory.

---

## Critical Pitfalls

Top 5 things that must be right from the start. Fixing these late requires touching multiple files.

### 1. String IDs, not integers
SQLAlchemy defaults to integer PKs. The frontend expects string IDs (`"c1"`, `"d1"`). Define PKs as `Column(String, primary_key=True)` and seed with the exact mock format strings. Pydantic schema must declare `id: str`.

### 2. camelCase JSON field names
Python snake_case field names (`review_count`, `heat_status`, `open_time`, `highlight_dish`) will serialize as snake_case, causing the frontend to receive `undefined` for every affected field. Fix globally in `schemas.py` with `alias_generator = to_camel` before any route is built.

### 3. Full nested Dish in TodaySuggestion
`GET /api/suggestion/today` must embed a complete `Dish` object in `highlightDish`, not just an ID. The route needs a second DB query to load the full dish row. This is easy to miss because it looks like a scalar field in the TypeScript type.

### 4. Chinese enum strings must survive DB round-trip exactly
`status` and `heatStatus` store Chinese values (`空闲`, `正常`, `拥挤`). Do not use SQLAlchemy `Enum` with English member names. Store raw UTF-8 strings. Seed data must copy these strings from `types.ts` character-for-character.

### 5. AI key still in frontend until aiService.ts is migrated
`aiService.ts` currently calls MiMo directly with a hardcoded API key. The backend proxy endpoint is dead code unless `aiService.ts` is updated to call `http://localhost:8000/api/ai/chat`. Both pieces must ship together or the key remains exposed.

---

## Build Order

Dependencies determine this order. Do not skip ahead — each layer depends on the one before it.

```
Phase 1 — Foundation
  1. database.py      (engine, SessionLocal, get_db, absolute path)
  2. models.py        (Canteen + Dish with String PKs, tags_json TEXT)
  3. schemas.py       (camelCase alias_generator locked in for all schemas)
  4. seed.py          (idempotent guard: count > 0 → return early)
  5. main.py          (CORS, lifespan, router mounts — shell only)

Phase 2 — Core Read Endpoints
  6. routes/canteens.py     (GET /api/canteens)
  7. routes/dishes.py       (GET /api/dishes/recommended + search)
  8. routes/suggestion.py   (GET /api/suggestion/today — full nested Dish)
  9. routes/search.py       (GET /api/search/hot-keywords + suggestions, limit 8)

Phase 3 — AI Proxy
  10. routes/ai.py           (POST /api/ai/chat, httpx lifespan singleton)
  11. frontend aiService.ts  (switch from direct MiMo to backend proxy URL)
```

**Rationale:** The schema layer (step 3) must be correct before any route is written — fixing camelCase aliases after routes exist means retesting everything. The AI route (step 10) is independent of the ORM and can be built in isolation, but the frontend migration (step 11) must happen in the same phase or the endpoint is never exercised.

---

## Open Questions

| Question | Impact | Where to Resolve |
|----------|--------|-----------------|
| What exact field does `aiService.ts` read from the MiMo response? Currently `data.choices[0].message.content` — does the backend normalize to `{ reply: string }` or forward the raw MiMo shape? | Determines `routes/ai.py` response schema and whether `aiService.ts` needs deeper changes | Inspect `aiService.ts` before implementing `routes/ai.py` |
| Does the frontend Vite dev server run on port 5173 or 3000 in this repo? | CORS allow_origins list | Check `vite.config.ts` or `package.json` before CORS setup |
| Should `GET /api/dishes/recommended` return all 7 dishes or a specific subset? | Seed data and query logic | Inspect `HomePage.tsx` — currently renders first 3 from the array |
| Should `GET /api/suggestion/today` be truly random per request or stable per day? | Suggestion route implementation | Check `mockApi.ts` behavior — currently random per call |
| Exact MiMo API endpoint URL and model name to use in the proxy | `routes/ai.py` | Confirm from `aiService.ts` line 8 and `.env.example` once created |
