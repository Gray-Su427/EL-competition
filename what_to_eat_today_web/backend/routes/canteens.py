"""Canteen list endpoint."""

from fastapi import APIRouter, Depends

from auth import get_current_user
from database import SessionLocal
from models import Canteen
from schemas import CanteenOut

router = APIRouter(
    prefix="/api", tags=["canteens"], dependencies=[Depends(get_current_user)]
)


@router.get("/canteens", response_model=list[CanteenOut])
def get_canteens() -> list[CanteenOut]:
    """Return all canteens."""
    session = SessionLocal()
    try:
        canteens = session.query(Canteen).all()
        return canteens  # type: ignore[return-value]
    finally:
        session.close()
