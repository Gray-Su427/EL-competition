"""Hot keywords and search suggestions endpoints."""

import json
from collections import Counter

from fastapi import APIRouter, Depends, Query

from auth import get_current_user
from database import SessionLocal
from models import Dish

router = APIRouter(
    prefix="/api/search", tags=["search"], dependencies=[Depends(get_current_user)]
)


@router.get("/hot-keywords", response_model=list[str])
def get_hot_keywords() -> list[str]:
    """Return top 10 tags by frequency across all dishes."""
    session = SessionLocal()
    try:
        dishes = session.query(Dish).all()
        tag_counter: Counter[str] = Counter()
        for dish in dishes:
            tags = json.loads(dish.tags) if isinstance(dish.tags, str) else dish.tags
            for tag in tags:
                tag_counter[tag] += 1
        return [tag for tag, _ in tag_counter.most_common(10)]
    finally:
        session.close()


@router.get("/suggestions", response_model=list[str])
def get_search_suggestions(keyword: str = Query(default="")) -> list[str]:
    """Return up to 8 deduplicated suggestions matching keyword."""
    if not keyword.strip():
        return []

    kw = keyword.strip()
    session = SessionLocal()
    try:
        dishes = session.query(Dish).all()
        suggestions: set[str] = set()
        for dish in dishes:
            if kw in dish.name:
                suggestions.add(dish.name)
            if kw in dish.canteen:
                suggestions.add(dish.canteen)
            if kw in dish.window:
                suggestions.add(dish.window)
            tags = json.loads(dish.tags) if isinstance(dish.tags, str) else dish.tags
            for tag in tags:
                if kw in tag:
                    suggestions.add(tag)
        return list(suggestions)[:8]
    finally:
        session.close()
