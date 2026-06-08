"""ORM models for Canteen and Dish."""

from sqlalchemy import Column, Float, Integer, String, Text

from database import Base


class Canteen(Base):
    __tablename__ = "canteens"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    distance = Column(String, nullable=False)
    open_time = Column(String, nullable=False)


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    canteen = Column(String, nullable=False)
    window = Column(String, nullable=False)
    rating = Column(Float, nullable=False)
    review_count = Column(Integer, nullable=False)
    tags = Column(Text, nullable=False)
    heat_status = Column(String, nullable=False)
    emoji = Column(String, nullable=False)
