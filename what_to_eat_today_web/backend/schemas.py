"""Pydantic response models with camelCase output aliases."""

import json

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


class UserOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: int
    student_id: str
    name: str
    nickname: str | None
    avatar_url: str | None
    created_at: str


class LoginRequest(BaseModel):
    ticket: str


class LoginResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    token: str
    user: UserOut
