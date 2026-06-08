# Architecture Patterns

**Domain:** Campus dining recommendation backend — FastAPI + SQLAlchemy + SQLite
**Researched:** 2026-06-08
**Confidence:** HIGH (well-established FastAPI idioms; project constraints from dev guide)

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React SPA (port 3000)                │
│  mockApi.ts → fetch calls → http://localhost:8000/api/  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP (CORS allowed)
                        ▼
┌─────────────────────────────────────────────────────────┐
│             FastAPI Application (port 8000)             │
│                                                         │
│  main.py                                                │
│  ├── CORSMiddleware (allow localhost:3000 + *)          │
│  └── APIRouter mounts:                                  │
│       /api/canteens    → routes/canteens.py             │
│       /api/dishes      → routes/dishes.py               │
│       /api/suggestion  → routes/suggestion.py           │
│       /api/search      → routes/search.py               │
│       /api/ai          → routes/ai.py                   │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │           Route Handlers                │            │
│  │  receive: Request / query params        │            │
│  │  inject:  db Session (Depends)          │            │
│  │  return:  Pydantic schema (auto-JSON)   │            │
│  └──────────────┬──────────────────────────┘            │
│                 │ SQLAlchemy ORM queries                 │
│  ┌──────────────▼──────────────────────────┐            │
│  │           models.py                     │            │
│  │  Canteen (id, name, status, distance,   │            │
│  │           open_time)                    │            │
│  │  Dish    (id, name, price, canteen_name,│            │
│  │           window, rating, review_count, │            │
│  │           tags_json, heat_status, emoji)│            │
│  └──────────────┬──────────────────────────┘            │
│                 │                                        │
│  ┌──────────────▼──────────────────────────┐            │
│  │           database.py                   │            │
│  │  engine = create_engine("sqlite:///...") │           │
│  │  SessionLocal = sessionmaker(...)        │           │
│  │  get_db() → generator (Depends target)  │            │
│  └──────────────┬──────────────────────────┘            │
│                 │ file I/O                               │
│  ┌──────────────▼──────────────────────────┐            │
│  │        canteen.db (SQLite file)         │            │
│  └─────────────────────────────────────────┘            │
│                                                         │
│  routes/ai.py                                           │
│  └── httpx.AsyncClient → POST MiMo API                 │
│       (API key from .env via python-dotenv)             │
└─────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | File | Responsibility | Communicates With |
|-----------|------|---------------|-------------------|
| App entry | `main.py` | Create FastAPI instance, add CORS, mount routers, call seed on startup | All route modules |
| DB layer | `database.py` | Engine creation, session factory, `get_db()` dependency | `models.py`, all route handlers |
| ORM models | `models.py` | SQLAlchemy table definitions for `Canteen` and `Dish` | `database.py`, `schemas.py`, route handlers |
| Response schemas | `schemas.py` | Pydantic models that mirror the TypeScript types frontend expects | Route handlers (return type) |
| Seed data | `seed.py` | Idempotent populate of 3 canteens + 7 dishes | `database.py`, `models.py` |
| Canteens router | `routes/canteens.py` | `GET /api/canteens` | `database.py`, `models.py`, `schemas.py` |
| Dishes router | `routes/dishes.py` | `GET /api/dishes/recommended`, `GET /api/dishes/search?keyword=` | same |
| Suggestion router | `routes/suggestion.py` | `GET /api/suggestion/today` (random suggestion + highlight dish) | `database.py`, `models.py`, `schemas.py` |
| Search router | `routes/search.py` | `GET /api/search/hot-keywords`, `GET /api/search/suggestions?keyword=` | `database.py`, `models.py` |
| AI proxy router | `routes/ai.py` | `POST /api/ai/chat` — forward to MiMo API via httpx | External MiMo API, `.env` |

---

## Data Flow

### Standard read request (e.g., GET /api/canteens)

```
Frontend fetch()
  → FastAPI route function
    → Depends(get_db) injects Session
      → session.query(Canteen).all()
        → SQLite read
      → list[Canteen ORM objects]
    → Pydantic CanteenSchema.model_validate(orm_obj)
  → JSON response
```

### Search request (GET /api/dishes/search?keyword=宫保)

```
Frontend fetch("/api/dishes/search?keyword=宫保")
  → FastAPI route: keyword: str = Query(...)
    → session.query(Dish).filter(
        or_(Dish.name.contains(keyword),
            Dish.canteen_name.contains(keyword),
            Dish.window.contains(keyword),
            Dish.tags_json.contains(keyword))
      ).all()
    → serialize each row → list[DishSchema]
  → JSON response
```

### Tags storage note

The `Dish.tags` field is `list[str]` in TypeScript but SQLite has no native array type.
Store as JSON string in a `TEXT` column (`tags_json`). Deserialize in the Pydantic schema
using a `@field_validator` or `model_validator`. The frontend receives a proper JSON array.

```
DB column: tags_json = '["微辣","高人气","下饭"]'
Pydantic:  tags: list[str]  ← validator calls json.loads(tags_json)
```

### AI proxy request (POST /api/ai/chat)

```
Frontend fetch("POST /api/ai/chat", {messages: [...]})
  → FastAPI route: body: ChatRequest (Pydantic)
    → async with httpx.AsyncClient() as client:
         response = await client.post(MIMO_API_URL,
           headers={"Authorization": f"Bearer {API_KEY}"},
           json=body.dict())
    → return response.json() directly to frontend
```

The key design: the API key never leaves the server. The frontend only sees the proxied
response. The route uses `async def` + `httpx.AsyncClient` for non-blocking I/O.

### Suggestion endpoint (GET /api/suggestion/today)

```
GET /api/suggestion/today
  → query all dishes
  → pick random suggestion text (5 pre-written strings keyed to dish IDs)
  → fetch the corresponding highlight dish from DB
  → return { text: str, highlightDish: DishSchema | None }
```

---

## Pydantic ↔ TypeScript Shape Mapping

The Pydantic schemas in `schemas.py` must produce JSON that exactly matches the
TypeScript interfaces in `frontend/src/types.ts`.

| TypeScript field | Pydantic field | SQLAlchemy column | Notes |
|-----------------|----------------|-------------------|-------|
| `id: string` | `id: str` | `TEXT PRIMARY KEY` | Use string IDs matching mock ("c1", "d1") |
| `name: string` | `name: str` | `TEXT NOT NULL` | — |
| `status: '空闲'\|'正常'\|'拥挤'` | `status: str` | `TEXT` | Enum-like, stored as string |
| `distance: string` | `distance: str` | `TEXT` | e.g. "200m" |
| `openTime: string` | `open_time: str` | `TEXT` | Pydantic alias → camelCase via `model_config` |
| `canteen: string` | `canteen_name: str` | `TEXT` | Stored as name string (not FK) for simplicity |
| `tags: string[]` | `tags: list[str]` | `tags_json TEXT` | JSON serialize/deserialize |
| `reviewCount: number` | `review_count: int` | `INTEGER` | Alias → camelCase |
| `heatStatus: ...` | `heat_status: str` | `TEXT` | Alias → camelCase |

Use `model_config = ConfigDict(populate_by_name=True)` and `alias_generator` or explicit
`Field(alias="camelCase")` to emit camelCase JSON matching the frontend expectation.

---

## Patterns to Follow

### Pattern 1: Dependency Injection for DB Session

FastAPI's `Depends` mechanism ensures the session is opened per-request and always closed,
even on exceptions.

```python
# database.py
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# routes/canteens.py
@router.get("/canteens", response_model=list[CanteenSchema])
def get_canteens(db: Session = Depends(get_db)):
    return db.query(Canteen).all()
```

### Pattern 2: APIRouter with prefix — mount once in main.py

Each route file creates its own `APIRouter`. `main.py` mounts all with `/api` prefix.
This keeps route files free of the `/api` repetition and makes the prefix easy to change.

```python
# routes/canteens.py
router = APIRouter()

@router.get("/canteens", ...)
def get_canteens(...): ...

# main.py
from routes import canteens, dishes, suggestion, search, ai

app.include_router(canteens.router, prefix="/api")
app.include_router(dishes.router,   prefix="/api")
app.include_router(suggestion.router, prefix="/api")
app.include_router(search.router,   prefix="/api")
app.include_router(ai.router,       prefix="/api")
```

### Pattern 3: Idempotent seed on startup

Run seed inside a `@app.on_event("startup")` handler (or lifespan context). Check if data
already exists before inserting to avoid duplicate rows on hot reload.

```python
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_data()   # no-op if rows already exist
```

### Pattern 4: Async httpx for AI proxy

The AI route is the only genuinely async I/O path. Use `async def` + `AsyncClient` there.
All other routes can be plain `def` (FastAPI runs sync routes in a thread pool automatically).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Hardcoding the MiMo API key

```python
# WRONG
headers = {"Authorization": "Bearer sk-abcdef..."}

# CORRECT
from dotenv import load_dotenv
load_dotenv()
MIMO_API_KEY = os.environ["MIMO_API_KEY"]  # fails fast if missing
```

### Anti-Pattern 2: Creating a new engine per request

The engine should be a module-level singleton. Creating it per request wastes file handles
and is slow. `SessionLocal` is the per-request object.

### Anti-Pattern 3: Returning ORM objects directly

FastAPI cannot serialize SQLAlchemy ORM objects. Always return from a route with a
`response_model` Pydantic schema, or explicitly call `CanteenSchema.model_validate(row)`.

### Anti-Pattern 4: Storing tags as a real FK table

For this app's scale (7 dishes, static data), a JSON string column for `tags` is
intentionally simpler than a many-to-many join table. Don't over-engineer.

### Anti-Pattern 5: Using `Base.metadata.create_all` inside a route

Schema creation belongs in startup. Calling it inside a request handler triggers a
filesystem stat on every request.

---

## Suggested Build Order

Dependencies between components determine the build order. Build bottom-up:

```
1. database.py          ← no dependencies, everything else imports from here
2. models.py            ← imports database.py (Base, engine)
3. schemas.py           ← imports models.py shapes; pure Pydantic, no DB calls
4. seed.py              ← imports database.py + models.py
5. routes/canteens.py   ← imports database.py + models.py + schemas.py
6. routes/dishes.py     ← same pattern as canteens
7. routes/suggestion.py ← same pattern; slightly more logic (random pick)
8. routes/search.py     ← same pattern; OR filter across name/canteen/window/tags
9. routes/ai.py         ← imports httpx + os; independent of ORM
10. main.py             ← imports all routes + database; CORS; startup hook
```

Rationale: each layer only depends on layers above it in this list. The AI route (step 9)
is independent of the ORM and can be built and tested in isolation.

---

## File Layout (as prescribed by dev guide)

```
backend/
├── main.py            ← FastAPI app, CORS, router mounts, startup seed
├── database.py        ← engine, SessionLocal, get_db(), Base
├── models.py          ← Canteen, Dish ORM classes
├── schemas.py         ← CanteenSchema, DishSchema, TodaySuggestionSchema, ChatRequest
├── seed.py            ← seed_data() function, 3 canteens + 7 dishes
├── routes/
│   ├── __init__.py    ← empty
│   ├── canteens.py    ← GET /api/canteens
│   ├── dishes.py      ← GET /api/dishes/recommended  +  GET /api/dishes/search
│   ├── suggestion.py  ← GET /api/suggestion/today
│   ├── search.py      ← GET /api/search/hot-keywords  +  GET /api/search/suggestions
│   └── ai.py          ← POST /api/ai/chat
├── .env               ← MIMO_API_KEY (not committed)
└── requirements.txt   ← fastapi, uvicorn[standard], sqlalchemy, python-dotenv, httpx
```

---

## Scalability Considerations

This is a single-user campus demo app. The architecture choices reflect that.

| Concern | At current scale | If it grew |
|---------|-----------------|------------|
| Database | SQLite (file) — fine for read-heavy, low concurrency | Switch engine URL to PostgreSQL; no ORM changes needed |
| Concurrency | Uvicorn + sync routes in thread pool — adequate | Add workers: `uvicorn --workers 4` |
| AI proxy latency | httpx async — non-blocking | Add streaming response support via `StreamingResponse` |
| Seed data | In-process on startup | Extract to a migration tool (Alembic) |

---

## Sources

- FastAPI official docs — dependency injection, APIRouter, startup events (HIGH confidence)
- SQLAlchemy 2.x docs — session management, ORM patterns (HIGH confidence)
- Project dev guide (`开发指南-v3.md`) — prescribed file layout and endpoint table (authoritative)
- Frontend `types.ts` and `mockApi.ts` — ground truth for expected JSON shapes (authoritative)
