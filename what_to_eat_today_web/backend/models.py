"""ORM models for Canteen, Dish, and User."""

from sqlalchemy import Column, Float, Integer, String, Text

from database import Base


class Canteen(Base):
    __tablename__ = "canteens"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    distance = Column(String, nullable=False)
    open_time = Column(String, nullable=False)
    current_people = Column(Integer, nullable=True)
    occupancy_pct = Column(String, nullable=True)
    flow_updated_at = Column(String, nullable=True)


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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
