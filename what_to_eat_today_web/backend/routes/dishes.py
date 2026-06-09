"""Dish recommendation and search endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_

from auth import get_current_user
from database import SessionLocal
from models import Dish
from schemas import DishOut

router = APIRouter(
    prefix="/api/dishes", tags=["dishes"], dependencies=[Depends(get_current_user)]
)


@router.get("/recommended", response_model=list[DishOut])
def get_recommended_dishes() -> list[DishOut]:
    """Return all recommended dishes."""
    session = SessionLocal()
    try:
        dishes = session.query(Dish).all()
        return dishes  # type: ignore[return-value]
    finally:
        session.close()


@router.get("/search", response_model=list[DishOut])
def search_dishes(keyword: str = Query(default="")) -> list[DishOut]:
    """Search dishes by keyword across name, canteen, window, and tags."""
    if not keyword.strip():
        return []

    session = SessionLocal()
    try:
        kw = keyword.strip()
        results = session.query(Dish).filter(
            or_(
                Dish.name.contains(kw),
                Dish.canteen.contains(kw),
                Dish.window.contains(kw),
                Dish.tags.contains(kw),
            )
        ).all()
        return results  # type: ignore[return-value]
    finally:
        session.close()
