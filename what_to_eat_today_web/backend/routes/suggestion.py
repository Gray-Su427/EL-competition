"""Today's suggestion endpoint."""

import random

from fastapi import APIRouter, Depends

from auth import get_current_user
from database import SessionLocal
from models import Dish
from schemas import TodaySuggestionOut

router = APIRouter(
    prefix="/api/suggestion",
    tags=["suggestion"],
    dependencies=[Depends(get_current_user)],
)

# Hardcoded suggestions per D-01, mapping text to dish_id
_SUGGESTIONS = [
    {"text": "今天二食堂比较拥挤，建议去一食堂川菜窗口试试宫保鸡丁。", "dish_id": "d1"},
    {"text": "天气转凉，推荐来一碗二食堂的番茄牛腩面，暖胃又好吃！", "dish_id": "d2"},
    {"text": "三食堂今天很空闲，想吃清淡的话可以试试轻食沙拉。", "dish_id": "d5"},
    {"text": "想吃辣的？一食堂麻辣烫窗口的麻辣香锅值得一试！", "dish_id": "d3"},
    {"text": "赶时间的话，三食堂快餐窗口的鸡蛋炒饭出餐很快。", "dish_id": "d4"},
]


@router.get("/today", response_model=TodaySuggestionOut)
def get_today_suggestion() -> TodaySuggestionOut:
    """Return a random daily suggestion with its associated dish."""
    suggestion = random.choice(_SUGGESTIONS)

    session = SessionLocal()
    try:
        dish = session.query(Dish).filter(Dish.id == suggestion["dish_id"]).first()
        return TodaySuggestionOut(
            text=suggestion["text"],
            highlight_dish=dish,  # type: ignore[arg-type]
        )
    finally:
        session.close()
