"""Pydantic response models with camelCase output aliases."""

import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class CanteenOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: str
    name: str
    status: str
    distance: str
    open_time: str
    current_people: int | None = None
    occupancy_pct: str | None = None


class DishOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: str
    name: str
    price: float
    canteen: str
    window: str
    rating: float
    review_count: int
    tags: list[str]
    heat_status: str
    emoji: str
    cuisine: str | None = None
    spice_level: str | None = None
    ingredient: str | None = None
    alias: str | None = None

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v: object) -> list[str]:
        if isinstance(v, str):
            return json.loads(v)
        return v  # type: ignore[return-value]


class TodaySuggestionOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    text: str
    highlight_dish: DishOut


class ReviewOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: int
    user_id: int
    dish_id: str
    dish_name: str = ""
    dish_emoji: str = ""
    nickname: str = ""
    rating: int
    content: str | None = None
    tags: list[str] = []
    images: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator("tags", mode="before")
    @classmethod
    def parse_review_tags(cls, v: object) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        if v is None:
            return []
        return v  # type: ignore[return-value]

    @field_validator("images", mode="before")
    @classmethod
    def parse_images(cls, v: object) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        if v is None:
            return []
        return v  # type: ignore[return-value]


class UserProfileOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    profile_summary: str
    liked_cuisines: list[str]
    disliked_ingredients: list[str]
    allergies: list[str]
    dietary_rules: list[str]
    spice_preference: str
    budget_preference: str
    preferred_canteens: list[str]
    avoid_canteens: list[str]
    favorite_tags: list[str]
    avoid_tags: list[str]
    profile_status: str

    @field_validator(
        "liked_cuisines",
        "disliked_ingredients",
        "allergies",
        "dietary_rules",
        "preferred_canteens",
        "avoid_canteens",
        "favorite_tags",
        "avoid_tags",
        mode="before",
    )
    @classmethod
    def parse_profile_lists(cls, v: object) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return []
        if v is None:
            return []
        return v  # type: ignore[return-value]


class AiSessionInitOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    profile_status: str
    profile_summary: str
    intro_message: str
    recommended_dishes: list[DishOut]
