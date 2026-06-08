# Technology Stack

**Project:** 今天吃什么 — FastAPI Backend
**Researched:** 2026-06-08
**Research mode:** Ecosystem — stack already decided, focus on versions and patterns

> Note: External tool access (Bash, WebSearch, WebFetch, Context7) was unavailable during
> this research session. All version information is from training data (cutoff August 2025).
> Confidence is flagged honestly. Verify pinned versions against PyPI before installing.

---

## Recommended Stack

### Core Framework

| Technology | Pinned Version | Purpose | Why |
|------------|---------------|---------|-----|
| Python | 3.11+ | Runtime | 3.11 is the sweet spot — async performance improvements over 3.10, widely supported, stable. 3.12 works too but 3.11 has broader hosting support. |
| FastAPI | `0.115.*` | HTTP framework | Stable release line as of mid-2025. Pydantic v2 integration is solid, lifespan events replaced `startup`/`shutdown` hooks. |
| uvicorn | `0.32.*` with `[standard]` extra | ASGI server | `[standard]` pulls in `uvloop` (Linux/macOS speed) and `httptools` (fast HTTP parsing). On Windows (dev environment) it falls back gracefully. |
| Pydantic | `2.9.*` | Data validation / schemas | FastAPI 0.100+ requires Pydantic v2. `model_config = ConfigDict(from_attributes=True)` replaces old `orm_mode = True`. |

**Confidence:** MEDIUM — versions are from training data. FastAPI moves fast; verify on PyPI.

### Database Layer

| Technology | Pinned Version | Purpose | Why |
|------------|---------------|---------|-----|
| SQLAlchemy | `2.0.*` | ORM | 2.0 is the current major version with the "2.0 style" query API (`select()`, `Session.execute()`). The legacy `Query` API still works but avoid it. |
| SQLite | bundled with Python | Storage | Right choice for this scale. Campus app, read-heavy, single server. No separate process, no migrations needed beyond `create_all()`. |
| aiosqlite | `0.20.*` | Async SQLite driver | Required if you use SQLAlchemy's async session. NOT needed if you use sync sessions. See decision below. |

### Supporting Libraries

| Library | Pinned Version | Purpose | When to Use |
|---------|---------------|---------|-------------|
| python-dotenv | `1.0.*` | Environment variable loading | Always — loads `.env` for MiMo API key. Call `load_dotenv()` once at startup. |
| httpx | `0.27.*` | Async HTTP client | AI proxy endpoint only — proxies `POST /api/ai/chat` to MiMo API. Use `httpx.AsyncClient` as a lifespan-scoped singleton. |

---

## Key Design Decision: Sync vs Async SQLAlchemy

**Recommendation: Use sync SQLAlchemy with a thread pool.**

### Why NOT async for this project

SQLAlchemy async (`AsyncSession` + `aiosqlite`) adds real complexity:
- Two different session types, two import paths
- Every ORM call needs `await`
- `selectinload` / `joinedload` behavior differs between sync and async
- SQLite with `aiosqlite` under async FastAPI is prone to "database is locked" errors under concurrent writes because SQLite's WAL mode is not enabled by default

### Why sync is fine here

FastAPI runs sync route handlers in a thread pool automatically — you annotate the function with `def` instead of `async def` and FastAPI handles the rest. For a campus app serving tens to low hundreds of concurrent users, the thread pool approach is completely adequate.

The only async part is the AI proxy (`httpx.AsyncClient`) which needs `async def` — that's fine because httpx has no SQLAlchemy dependency.

**Decision:** sync `Session` for all database routes, `async def` only for `/api/ai/chat`.

---

## Project Structure

```
what_to_eat_today_web/backend/
├── main.py              # FastAPI app factory, CORS middleware, router registration, lifespan
├── database.py          # Engine creation, SessionLocal factory, get_db() dependency
├── models.py            # SQLAlchemy ORM table classes (Canteen, Dish)
├── schemas.py           # Pydantic response models (CanteenOut, DishOut, etc.)
├── seed.py              # One-shot seed function called from lifespan on first run
├── routes/
│   ├── __init__.py
│   ├── canteens.py      # GET /api/canteens
│   ├── dishes.py        # GET /api/dishes/recommended, GET /api/dishes/search
│   ├── suggestion.py    # GET /api/suggestion/today
│   ├── search.py        # GET /api/search/hot-keywords, GET /api/search/suggestions
│   └── ai.py            # POST /api/ai/chat  (async, httpx proxy)
├── .env                 # MIMO_API_KEY — never commit
├── .env.example         # Template showing required keys
└── requirements.txt
```

**Rationale:** This exactly matches the 开发指南-v3 recommendation and is the standard FastAPI community layout for small projects. Files over 200 lines should be split; for this scope each file will stay well under that limit.

---

## requirements.txt

```
fastapi==0.115.6
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
pydantic==2.9.2
python-dotenv==1.0.1
httpx==0.27.2
```

**Version strategy:** Pinned to minor version. These were the current releases as of mid-2025. Run `pip install -r requirements.txt` and verify no conflicts. Do NOT use open ranges (`>=`) — they cause environment drift between dev and prod.

---

## Patterns to Follow

### database.py — Sync Pattern

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

SQLALCHEMY_DATABASE_URL = "sqlite:///./canteen.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite + threads
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

`check_same_thread=False` is mandatory for SQLite when FastAPI runs handlers across threads.

### Dependency Injection in Routes

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db

router = APIRouter()

@router.get("/api/canteens")
def get_canteens(db: Session = Depends(get_db)):
    ...
```

Use `def` (not `async def`) for all database routes. FastAPI puts sync handlers in a thread pool.

### Pydantic v2 Schema Pattern

```python
from pydantic import BaseModel, ConfigDict

class DishOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    canteen_id: int
    price: float
    tags: str  # stored as comma-separated string; parse in response if needed
```

`from_attributes=True` replaces Pydantic v1's `orm_mode = True`.

### lifespan for Startup (FastAPI 0.95+)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: create tables + seed
    Base.metadata.create_all(bind=engine)
    seed_if_empty()
    yield
    # shutdown: nothing needed for SQLite

app = FastAPI(lifespan=lifespan)
```

Avoid the deprecated `@app.on_event("startup")` — `lifespan` is the current pattern since FastAPI 0.95.

### httpx Async Client for AI Proxy

```python
import httpx
from contextlib import asynccontextmanager

_http_client: httpx.AsyncClient | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _http_client
    _http_client = httpx.AsyncClient(timeout=30.0)
    # ... other startup
    yield
    await _http_client.aclose()
```

Create `httpx.AsyncClient` once at startup, reuse across requests. Creating a new client per request defeats connection pooling.

### CORS — Minimal Config for Dev

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
```

Lock down to the Vite dev port during development. When the frontend is served from the Android WebView as a file bundle (future phase), add `file://` or expand origins appropriately.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | SQLAlchemy 2.0 sync | SQLAlchemy async | Adds complexity (aiosqlite, locked DB errors) for no throughput benefit at this scale |
| ORM | SQLAlchemy | Tortoise ORM | Less mature, smaller ecosystem, not worth learning curve for a small project |
| HTTP framework | FastAPI | Flask + Marshmallow | FastAPI's built-in Pydantic validation and OpenAPI docs save significant boilerplate |
| HTTP client | httpx | aiohttp | httpx has a sync/async unified API and matches FastAPI's ecosystem better |
| DB | SQLite | PostgreSQL | Overkill — SQLite has no setup overhead and the app has no concurrent write requirements |

---

## What NOT to Use

- `@app.on_event("startup")` — deprecated since FastAPI 0.95, use `lifespan` instead
- `Query` API in SQLAlchemy 2.0 — the `session.query(Model).filter(...)` pattern is legacy. Use `select(Model)` + `session.execute()`
- Pydantic v1 `orm_mode = True` in `class Config` — replaced by `model_config = ConfigDict(from_attributes=True)`
- `AsyncSession` + `aiosqlite` — unnecessary complexity for this project's scale and requirements
- Open version ranges in requirements.txt — use pinned versions to keep environments reproducible

---

## Installation

```bash
cd what_to_eat_today_web/backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and set MIMO_API_KEY
uvicorn main:app --reload --port 8000
```

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| FastAPI 0.115.x current release | Training data (Aug 2025) | MEDIUM — verify on PyPI |
| SQLAlchemy 2.0.x current | Training data (Aug 2025) | MEDIUM — verify on PyPI |
| lifespan replaces on_event | FastAPI official docs (confirmed in training) | HIGH |
| sync handlers run in thread pool | FastAPI official docs | HIGH |
| check_same_thread=False for SQLite | SQLAlchemy/SQLite docs | HIGH |
| Pydantic v2 ConfigDict from_attributes | Pydantic v2 migration guide | HIGH |
| httpx AsyncClient reuse pattern | httpx official docs | HIGH |
| aiosqlite "database is locked" risk | Community reports, SQLite WAL docs | MEDIUM |
