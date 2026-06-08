
# Domain Pitfalls

**Domain:** FastAPI + SQLAlchemy + SQLite API backend matching an existing frontend contract
**Project:** 今天吃什么 — Campus Dining Recommendation Backend
**Researched:** 2026-06-08
**Confidence:** HIGH (derived from direct source file analysis of frontend types.ts, mockApi.ts, aiService.ts)

---

## Critical Pitfalls

Mistakes that cause silent data mismatches or require significant rewrites.

---

### Pitfall 1: Pydantic Returns Integer `id`, Frontend Expects String `id`

**What goes wrong:** SQLAlchemy integer primary keys are serialized as `id: 1` by Pydantic. The frontend TypeScript type is `id: string` and the mock data uses `'c1'`, `'d1'` string IDs. The frontend will receive `1` where it expects `"c1"` and React key props, equality checks, and any string operations silently break.

**Why it happens:** SQLAlchemy `Integer` column → Python `int` → Pydantic serializes as JSON number. The TypeScript `string` type is only enforced at compile time; at runtime it just receives whatever the API sends.

**Consequences:** Component keys become integers, string comparisons like `dish.id === 'd1'` always fail, and any display code that pads or formats IDs breaks. Bugs are invisible until UI behavior is inspected.

**Prevention:**
- Define the SQLAlchemy primary key as `String` (`id = Column(String, primary_key=True)`) and seed with string values matching mock format (`"c1"`, `"d1"`).
- Alternatively keep Integer PK internally and add a Pydantic `@validator` or `model_serializer` to convert to string before response. The first option is simpler and safer.
- Pydantic schema must declare `id: str`, not `id: int`.

**Detection:** Any `id` field in a JSON response that shows as a bare number (no quotes) is wrong. Test with `curl http://localhost:8000/api/canteens` and confirm `"id": "c1"`.

**Phase:** Address in the models.py + schemas.py implementation step before any route is tested.

---

### Pitfall 2: `TodaySuggestion` Response Must Embed a Full Nested `Dish` Object

**What goes wrong:** `GET /api/suggestion/today` must return `{ text: string, highlightDish?: Dish }` where `highlightDish` is the complete Dish object — not an ID, not a partial object. If the backend returns `highlightDish: null`, `highlightDish: { id: "d1" }`, or omits the field, `HomePage.tsx` silently receives `null` for `highlightDish` and displays nothing in the recommendation card.

**Why it happens:** It is natural to return only foreign keys or simplified references to avoid over-fetching. The nested structure in the mock is easy to miss when reading the type definition.

**Root cause reference:** `types.ts` line 27: `highlightDish?: Dish` — the full `Dish` interface. `HomePage.tsx` line 34: `setHighlightDish(suggestionData.highlightDish ?? null)`.

**Prevention:**
- The `suggestion/today` route must perform a JOIN or second query to load the full dish row and serialize it as a nested Pydantic model.
- Pydantic schema must be: `class TodaySuggestionResponse(BaseModel): text: str; highlight_dish: Optional[DishResponse] = None` with `model_config = ConfigDict(populate_by_name=True)` and a field alias `highlightDish`.
- Alternatively use `alias_generator` or `by_alias=True` in the response serialization call.

**Detection:** Call `GET /api/suggestion/today` and verify the response contains a fully populated nested dish object, not just an ID.

**Phase:** Address in `routes/suggestion.py` implementation. Flag for code review.

---

### Pitfall 3: JSON Field Names Must Be camelCase — Python Snake_case Will Break the Frontend

**What goes wrong:** Python/Pydantic convention is `snake_case` (`review_count`, `heat_status`, `open_time`). The TypeScript frontend expects `camelCase` (`reviewCount`, `heatStatus`, `openTime`). Pydantic by default serializes using the Python field name. The frontend will silently receive `undefined` for every affected field.

**Why it happens:** FastAPI uses Pydantic model field names directly as JSON keys. The mismatch is invisible at the Python layer.

**Affected fields:**
- `Dish.reviewCount` ← Python would default to `review_count`
- `Dish.heatStatus` ← Python would default to `heat_status`
- `Canteen.openTime` ← Python would default to `open_time`
- `TodaySuggestion.highlightDish` ← Python would default to `highlight_dish`

**Prevention:** Configure Pydantic globally with `alias_generator = to_camel` from `pydantic.alias_generators` and `model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)`. Apply to all response schemas. Call `response.model_dump(by_alias=True)` or use FastAPI's `response_model_by_alias=True`.

**Detection:** Inspect JSON response keys directly. Any key containing an underscore is wrong for this frontend.

**Phase:** Address in `schemas.py` before any route returns data. A single base config class solves this for all schemas.

---

### Pitfall 4: `heatStatus` and `status` Are Chinese String Enum Values — Must Survive DB Round-Trip Exactly

**What goes wrong:** The TypeScript types declare `status: '空闲' | '正常' | '拥挤'` and `heatStatus: '空闲' | '正常' | '拥挤'`. If the SQLite column stores ASCII equivalents, English words, or if any encoding conversion happens, the frontend receives a value outside the union and the conditional rendering (e.g., color-coding canteen heat) silently falls through.

**Why it happens:** SQLite stores strings as UTF-8 but developers sometimes use Python Enum with English members and Chinese display values, or SQLAlchemy's `Enum` type which restricts values to declared members.

**Prevention:**
- Store the raw Chinese string directly in the `VARCHAR` column (`'空闲'`, `'正常'`, `'拥挤'`).
- Do not use SQLAlchemy `Enum` type with this column unless all three Chinese values are declared as enum members.
- Seed data must use these exact strings — copy from `types.ts` rather than retyping.

**Detection:** `SELECT status FROM canteen;` in SQLite Browser should show Chinese characters. The JSON response must show `"status": "正常"` not `"status": "normal"`.

**Phase:** Address in `seed.py` and `models.py`.

---

### Pitfall 5: SQLAlchemy Session Not Closed Per Request — Causes Connection Leaks Under Load

**What goes wrong:** Using a global `Session()` object or creating a session in a route function without a `try/finally` or dependency injection means sessions accumulate and never close. With SQLite this causes `OperationalError: database is locked` errors, especially during seed initialization that runs at startup while routes are already receiving requests.

**Why it happens:** The natural first implementation creates a session at module level or at the top of a route function and returns early on success without closing. Exceptions also bypass cleanup.

**Prevention:** Use FastAPI's dependency injection pattern exclusively:
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/api/canteens")
def get_canteens(db: Session = Depends(get_db)):
    ...
```
Never share a single session across requests. Never import `session` from a module-level variable.

**Detection:** Run two simultaneous requests in development. Any `database is locked` error indicates session mis-management.

**Phase:** Address in `database.py` and enforce in all route files from the start.

---

## Moderate Pitfalls

---

### Pitfall 6: CORS `allow_origins` Too Restrictive Blocks Frontend Dev Server

**What goes wrong:** The Vite dev server runs on `http://localhost:5173` (default port). If CORS is configured with `allow_origins=["http://localhost:3000"]` or `allow_origins=["*"]` is avoided too aggressively, the browser blocks all API calls with a CORS error. The Android WebView also needs `http://localhost:8000` allowed if it makes requests during hybrid testing.

**Prevention:** For local development, configure:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Do not use `allow_origins=["*"]` and `allow_credentials=True` together — this is a CORS spec violation that FastAPI will raise an error for. Use explicit origins when `allow_credentials=True`.

**Detection:** Open browser devtools Network tab. A CORS error appears as a red request with no response status. The error message names the disallowed origin.

**Phase:** Address in `main.py` CORS setup before any frontend integration testing.

---

### Pitfall 7: `aiService.ts` Currently Calls MiMo Directly — API Key Is Exposed in Frontend Source

**What goes wrong:** `aiService.ts` (line 8) hardcodes `API_KEY = 'tp-cn64j8obzlijezx4hupsg36kzhjkde86ufzgwsv8mz0yldff'` and calls MiMo directly from the browser. The development guide states the backend should proxy this call. The frontend currently **bypasses** the backend `POST /api/ai/chat` endpoint entirely. If the backend implements `POST /api/ai/chat` but `aiService.ts` is not updated to call `http://localhost:8000/api/ai/chat`, the AI endpoint will never be exercised and the API key will remain exposed.

**Why it happens:** The AI service was built as a direct integration during frontend prototyping. The migration to backend proxy is a separate step that requires both backend implementation and frontend service update.

**Consequences:** API key visible in browser source / network tab, billing abuse risk, backend AI endpoint is dead code until frontend is updated.

**Prevention:**
- The backend `POST /api/ai/chat` endpoint must accept `{ messages: ChatMessage[] }` matching the existing `ChatMessage` type (`{ role: 'system' | 'user' | 'assistant', content: string }`).
- The backend must return `{ reply: string }` (or the frontend `aiService.ts` must be updated to read from whatever field the backend returns).
- Check what field name `aiService.ts` reads from before finalizing the response schema — currently it reads `data.choices[0].message.content` (raw MiMo format). The backend proxy can either forward the raw MiMo response or normalize it to `{ reply: string }` and the frontend service updated accordingly.
- The frontend `aiService.ts` switch (replacing direct MiMo call with `fetch('http://localhost:8000/api/ai/chat', ...)`) is a **phase deliverable**, not optional.

**Detection:** With backend running, make a `POST /api/ai/chat` request from Postman. Then confirm `aiService.ts` actually calls that URL, not the MiMo URL directly.

**Phase:** Backend AI endpoint in one step, `aiService.ts` migration in the frontend integration step.

---

### Pitfall 8: Seed Data Runs on Every Startup — Duplicate Rows Accumulate

**What goes wrong:** A naive seed function inserts all rows every time `uvicorn` starts (including `--reload` restarts during development). After 10 restarts, there are 10 copies of each canteen and dish. Queries still work but return inflated result sets. Hot-reload means this happens constantly during development.

**Prevention:** Check before inserting:
```python
def seed_db(db: Session):
    if db.query(Canteen).count() > 0:
        return  # already seeded
    # insert canteens and dishes
```
Or use `INSERT OR IGNORE` at the SQL level with a unique constraint on the `name` column.

**Detection:** Run `SELECT COUNT(*) FROM canteen;` after two restarts. If count > 3, seeding is not idempotent.

**Phase:** Address in `seed.py` before integration testing begins.

---

### Pitfall 9: `GET /api/dishes/search` Returns Empty Array for Empty Keyword — Must Not Return All Dishes

**What goes wrong:** If `keyword` query param is empty or whitespace, the mock returns an empty filtered list (nothing matches `""`). If the backend treats empty keyword as "no filter" it returns all dishes, breaking the empty-state UI. Conversely, if `keyword` is missing entirely from the request (param not sent), an unguarded `db.query(Dish).filter(Dish.name.contains(keyword))` will crash with a `TypeError`.

**Prevention:**
```python
@router.get("/api/dishes/search")
def search_dishes(keyword: str = "", db: Session = Depends(get_db)):
    if not keyword.strip():
        return []
    ...
```
Make `keyword` default to empty string, not required. Return early for blank input.

**Detection:** Call `GET /api/dishes/search` with no `keyword` param. Should return `[]`, not 500 or all dishes.

**Phase:** Address in `routes/dishes.py`.

---

### Pitfall 10: `GET /api/search/suggestions` Must Return at Most 8 Results

**What goes wrong:** The mock explicitly does `.slice(0, 8)`. If the backend returns more results, the suggestion dropdown renders an unexpectedly long list that overflows the mobile UI.

**Prevention:** Add `.limit(8)` to the SQLAlchemy query, or apply `[:8]` slice to the Python result list before returning.

**Detection:** Seed with enough dishes that a broad keyword returns more than 8 matches, then call the endpoint and count the array length.

**Phase:** Address in `routes/search.py`.

---

## Minor Pitfalls

---

### Pitfall 11: `uvicorn --reload` Does Not Pick Up `.env` Changes

**What goes wrong:** If `MIMO_API_KEY` is added to `.env` after `uvicorn` is already running with `--reload`, the new value is not loaded until a full server restart. Developers assume `--reload` picks up env changes and wonder why the AI endpoint still fails.

**Prevention:** Always do a full restart (`Ctrl+C` + `uvicorn main:app --reload --port 8000`) after editing `.env`. Add a startup check that logs whether the API key was found.

---

### Pitfall 12: SQLite File Path Resolves Relative to Working Directory

**What goes wrong:** `create_engine("sqlite:///app.db")` creates `app.db` in whatever directory `uvicorn` is launched from. Running `uvicorn main:app` from the project root creates `app.db` in the root. Running from `backend/` creates it inside `backend/`. The file appears to be missing or empty when the working directory changes.

**Prevention:** Use an absolute path derived from `__file__`:
```python
import pathlib
BASE_DIR = pathlib.Path(__file__).parent
engine = create_engine(f"sqlite:///{BASE_DIR}/app.db")
```

**Phase:** Address in `database.py`.

---

### Pitfall 13: Pydantic v1 vs v2 API Differences

**What goes wrong:** FastAPI 0.100+ uses Pydantic v2 by default. If requirements.txt pins `pydantic<2` or uses Pydantic v1 syntax (`class Config: orm_mode = True` instead of `model_config = ConfigDict(from_attributes=True)`), the schemas fail silently or raise deprecation warnings that become errors.

**Prevention:** Use Pydantic v2 syntax exclusively:
```python
from pydantic import BaseModel, ConfigDict

class DishResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
```
Do not mix `class Config` (v1) and `model_config` (v2) in the same project.

**Phase:** Address in `schemas.py` before any route is tested.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| `models.py` + `schemas.py` | Pitfalls 1, 3, 4, 13 — ID type, camelCase aliases, Chinese enums, Pydantic version | Define base config class with alias generator first; use String PKs |
| `seed.py` | Pitfall 8, 4 — duplicate seeding, exact Chinese strings | Add count-check guard; copy strings from types.ts |
| `database.py` | Pitfalls 5, 12 — session lifecycle, SQLite file path | Use `yield` dependency; absolute path from `__file__` |
| `main.py` CORS setup | Pitfall 6 — blocked dev server | Use explicit origin list; never combine `*` with `allow_credentials=True` |
| `routes/suggestion.py` | Pitfall 2 — partial nested Dish | Verify full Dish object is loaded and serialized |
| `routes/dishes.py` | Pitfall 9 — empty keyword behavior | Return `[]` early for blank input |
| `routes/search.py` | Pitfall 10 — result count | `.limit(8)` on query |
| `routes/ai.py` + `aiService.ts` migration | Pitfall 7 — API key still in frontend | Both backend endpoint and frontend service update are required together |

## Sources

- Direct analysis of `frontend/src/types.ts` (TypeScript interface definitions)
- Direct analysis of `frontend/src/mock/mockApi.ts` (exact mock data structure and return shapes)
- Direct analysis of `frontend/src/services/aiService.ts` (hardcoded API key, direct MiMo call)
- Direct analysis of `frontend/src/pages/HomePage.tsx` (how TodaySuggestion is consumed)
- `开发指南-v3.md` (backend architecture specification)
- `.planning/PROJECT.md` (scope and constraints)
- FastAPI official docs: dependency injection session pattern (HIGH confidence — well-established pattern)
- Pydantic v2 docs: `ConfigDict`, `alias_generator`, `from_attributes` (HIGH confidence)
