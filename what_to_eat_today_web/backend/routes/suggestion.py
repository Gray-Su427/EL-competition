"""Today's suggestion endpoint — picks a random dish to recommend."""

import random

from fastapi import APIRouter

from database import SessionLocal
from models import Dish
from schemas import TodaySuggestionOut

router = APIRouter(prefix="/api/suggestion", tags=["suggestion"])


@router.get("/today", response_model=TodaySuggestionOut)
def get_today_suggestion() -> TodaySuggestionOut:
    """Return a randomly selected dish as today's recommendation."""
    session = SessionLocal()
    try:
        dishes = session.query(Dish).all()
        if not dishes:
            raise ValueError("No dishes in database")

        dish = random.choice(dishes)

        return TodaySuggestionOut(
            text="",
            highlight_dish=dish,  # type: ignore[arg-type]
        )
    finally:
        session.close()
