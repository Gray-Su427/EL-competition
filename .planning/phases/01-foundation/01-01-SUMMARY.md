---
phase: 01-foundation
plan: 01
subsystem: data-layer
tags: [orm, pydantic, sqlite, seed-data]
dependency_graph:
  requires: []
  provides: [database-engine, orm-models, pydantic-schemas, seed-data]
  affects: [phase-02-routes]
tech_stack:
  added: [sqlalchemy-2.0, pydantic-v2-alias-generators]
  patterns: [declarative-base, camel-case-alias, field-validator-json-parse, delete-then-insert-seed]
key_files:
  created:
    - what_to_eat_today_web/backend/database.py
    - what_to_eat_today_web/backend/models.py
    - what_to_eat_today_web/backend/schemas.py
    - what_to_eat_today_web/backend/seed.py
    - what_to_eat_today_web/backend/__init__.py
  modified:
    - .gitignore
decisions:
  - "Used DeclarativeBase (SQLAlchemy 2.0 style) over legacy declarative_base()"
  - "Tags stored as JSON Text with field_validator deserialization"
  - "delete-then-insert strategy for seed idempotency"
metrics:
  duration: 206s
  completed: 2026-06-08T14:56:34Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 1
---

# Phase 01 Plan 01: Data Layer - ORM + Pydantic Contract + Seed Data Summary

SQLAlchemy ORM models (Canteen 5 cols, Dish 10 cols with String PKs) + Pydantic v2 camelCase response schemas with tags JSON auto-parsing + idempotent seed script (3 canteens, 7 dishes from mockApi.ts).

## Task Execution

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| A1 | database.py + models.py | bcb7e9b | database.py, models.py |
| A2 | schemas.py + seed.py | f184bd2 | schemas.py, seed.py |

## Verification Results

All plan verification commands passed:
- `from database import engine, SessionLocal, Base` -> OK
- `Canteen.__tablename__` = "canteens", `Dish.__tablename__` = "dishes"
- `CanteenOut.model_dump(by_alias=True)` contains "openTime" key
- `DishOut.model_dump(by_alias=True)` contains "reviewCount", "heatStatus" keys
- `DishOut.tags` correctly parses JSON Text to `list[str]`
- `seed_data()` idempotent: canteens=3, dishes=7 after repeated calls
- Dish d1: name="宫保鸡丁", price=12, emoji="🍗"

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
