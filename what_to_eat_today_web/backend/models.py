"""ORM models for Canteen, Dish, User, VerificationCode, and Review."""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

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
    cuisine = Column(String, nullable=True)
    spice_level = Column(String, nullable=True)
    ingredient = Column(String, nullable=True)
    alias = Column(String, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    nickname = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    profile_summary = Column(Text, nullable=False, default="")
    liked_cuisines = Column(Text, nullable=False, default="[]")
    disliked_ingredients = Column(Text, nullable=False, default="[]")
    allergies = Column(Text, nullable=False, default="[]")
    dietary_rules = Column(Text, nullable=False, default="[]")
    spice_preference = Column(String, nullable=False, default="unknown")
    budget_preference = Column(String, nullable=False, default="unknown")
    preferred_canteens = Column(Text, nullable=False, default="[]")
    avoid_canteens = Column(Text, nullable=False, default="[]")
    favorite_tags = Column(Text, nullable=False, default="[]")
    avoid_tags = Column(Text, nullable=False, default="[]")
    profile_status = Column(String, nullable=False, default="empty")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UserContextState(Base):
    __tablename__ = "user_context_state"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    current_goal = Column(String, nullable=True)
    current_budget = Column(String, nullable=True)
    current_spice_need = Column(String, nullable=True)
    current_speed_need = Column(String, nullable=True)
    current_lightness_need = Column(String, nullable=True)
    current_avoidance = Column(Text, nullable=False, default="[]")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False)
    code = Column(String(6), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "dish_id", name="uq_reviews_user_dish"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dish_id = Column(String, ForeignKey("dishes.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON array
    images = Column(Text, nullable=True)  # JSON array of file paths
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, nullable=True)
