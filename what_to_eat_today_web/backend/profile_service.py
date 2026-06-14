"""User profile helpers for AI personalization."""

from __future__ import annotations

import json
from typing import Any

from database import SessionLocal
from models import Dish, UserContextState, UserProfile

POSITIVE_REVIEW_TAGS = {"推荐", "清淡", "性价比高", "快"}
NEGATIVE_REVIEW_TAGS = {"太辣", "太咸", "排队久"}


def _parse_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return [item for item in parsed if isinstance(item, str)]


def merge_unique_json_array(raw: str | None, new_items: list[str]) -> str:
    current = _parse_list(raw)
    for item in new_items:
        if item and item not in current:
            current.append(item)
    return json.dumps(current, ensure_ascii=False)


def get_or_create_profile(db, user_id: int) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        return profile
    profile = UserProfile(user_id=user_id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def get_or_create_context_state(db, user_id: int) -> UserContextState:
    context_state = (
        db.query(UserContextState)
        .filter(UserContextState.user_id == user_id)
        .first()
    )
    if context_state:
        return context_state
    context_state = UserContextState(user_id=user_id)
    db.add(context_state)
    db.commit()
    db.refresh(context_state)
    return context_state


def evaluate_profile_status(profile: UserProfile) -> str:
    signals = 0
    signals += len(_parse_list(profile.liked_cuisines))
    signals += len(_parse_list(profile.disliked_ingredients))
    signals += len(_parse_list(profile.favorite_tags))
    signals += len(_parse_list(profile.preferred_canteens))
    if profile.spice_preference != "unknown":
        signals += 1
    if profile.budget_preference != "unknown":
        signals += 1

    if signals == 0:
        return "empty"
    if signals < 3:
        return "partial"
    return "ready"


def build_intro_message(profile_status: str) -> str:
    if profile_status == "empty":
        return (
            "我会在聊天和评价里慢慢记住你的口味。"
            "你可以自然地告诉我爱吃什么、忌口什么，"
            "或者今天想吃快一点、清淡一点。"
        )
    if profile_status == "partial":
        return (
            "我先按目前了解的偏好推荐 3 道菜。"
            "如果你今天想换口味、赶时间，直接告诉我就行。"
        )
    return (
        "我先按你的口味挑了 3 个更合适的选择。"
        "如果你今天想吃快一点、清淡一点或换个食堂，也可以直接说。"
    )


def _dish_tags(dish: Dish) -> list[str]:
    return _parse_list(dish.tags)


def score_dish_for_profile(
    dish: Dish,
    profile: UserProfile,
    context_state: UserContextState,
) -> float:
    score = float(dish.rating)
    dish_tags = _dish_tags(dish)
    liked_cuisines = _parse_list(profile.liked_cuisines)
    disliked_ingredients = _parse_list(profile.disliked_ingredients)
    favorite_tags = _parse_list(profile.favorite_tags)
    avoid_tags = _parse_list(profile.avoid_tags)
    preferred_canteens = _parse_list(profile.preferred_canteens)
    avoid_canteens = _parse_list(profile.avoid_canteens)

    if dish.cuisine and dish.cuisine in liked_cuisines:
        score += 2.0
    if dish.canteen in preferred_canteens:
        score += 1.5
    if dish.canteen in avoid_canteens:
        score -= 1.5
    if any(tag in dish_tags for tag in favorite_tags):
        score += 1.2
    if any(tag in dish_tags for tag in avoid_tags):
        score -= 2.5
    if profile.budget_preference == "low" and dish.price <= 15:
        score += 1.0
    if profile.budget_preference == "high" and dish.price >= 18:
        score += 0.5
    if profile.spice_preference == "avoid_spicy" and dish.spice_level in {"中辣", "重辣"}:
        score -= 2.0
    if profile.spice_preference == "love_spicy" and dish.spice_level in {"中辣", "重辣"}:
        score += 1.0
    if any(ingredient in (dish.ingredient or "") for ingredient in disliked_ingredients):
        score -= 2.5
    if context_state.current_speed_need == "fast" and "快" in dish_tags:
        score += 1.0
    if context_state.current_lightness_need == "light" and "清淡" in dish_tags:
        score += 1.0
    if context_state.current_spice_need == "spicy" and dish.spice_level in {"中辣", "重辣"}:
        score += 1.0
    return score


def rank_dishes_for_user(
    db,
    profile: UserProfile,
    context_state: UserContextState,
    limit: int = 3,
) -> list[Dish]:
    dishes = db.query(Dish).all()
    if not dishes:
        return []
    if profile.profile_status == "empty":
        ranked = sorted(
            dishes,
            key=lambda dish: (dish.rating, dish.review_count),
            reverse=True,
        )
        return ranked[:limit]

    ranked = sorted(
        dishes,
        key=lambda dish: score_dish_for_profile(dish, profile, context_state),
        reverse=True,
    )
    return ranked[:limit]


def build_profile_prompt(
    profile: UserProfile,
    context_state: UserContextState,
    candidate_dishes: list[Any],
) -> str:
    candidates = "、".join(
        (
            f"{dish['name']}（{dish['canteen']}/{dish['window']}）"
            if isinstance(dish, dict)
            else f"{dish.name}（{dish.canteen}/{dish.window}）"
        )
        for dish in candidate_dishes
    ) or "暂无候选菜品"

    return (
        f"当前用户长期画像摘要：{profile.profile_summary or '暂无稳定画像'}。"
        f"长期偏好：喜欢菜系={profile.liked_cuisines}，"
        f"忌口食材={profile.disliked_ingredients}，"
        f"常点标签={profile.favorite_tags}。"
        f"本次上下文：预算={context_state.current_budget or '未知'}，"
        f"清淡需求={context_state.current_lightness_need or '未知'}，"
        f"速度需求={context_state.current_speed_need or '未知'}，"
        f"辣度需求={context_state.current_spice_need or '未知'}。"
        f"首屏推荐候选：{candidates}。"
        "不要逐条复述首屏三张推荐卡，优先解释推荐逻辑，"
        "并顺手引导用户继续自然表达口味、忌口或当下需求。"
    )


def apply_profile_patch(db, user_id: int, patch: dict[str, Any]) -> None:
    if patch.get("confidence", 0) < 0.75:
        return

    profile = get_or_create_profile(db, user_id)
    context_state = get_or_create_context_state(db, user_id)
    long_term = patch.get("long_term_updates", {})
    context_updates = patch.get("context_updates", {})

    if "liked_cuisines" in long_term:
        profile.liked_cuisines = merge_unique_json_array(
            profile.liked_cuisines,
            long_term["liked_cuisines"],
        )
    if "disliked_ingredients" in long_term:
        profile.disliked_ingredients = merge_unique_json_array(
            profile.disliked_ingredients,
            long_term["disliked_ingredients"],
        )
    if "favorite_tags" in long_term:
        profile.favorite_tags = merge_unique_json_array(
            profile.favorite_tags,
            long_term["favorite_tags"],
        )
    if "preferred_canteens" in long_term:
        profile.preferred_canteens = merge_unique_json_array(
            profile.preferred_canteens,
            long_term["preferred_canteens"],
        )
    if long_term.get("spice_preference"):
        profile.spice_preference = long_term["spice_preference"]
    if long_term.get("budget_preference"):
        profile.budget_preference = long_term["budget_preference"]

    summary_patch = patch.get("summary_patch", "").strip()
    if summary_patch and summary_patch not in profile.profile_summary:
        profile.profile_summary = "；".join(
            part for part in [profile.profile_summary.strip(), summary_patch] if part
        )

    if context_updates.get("current_lightness_need"):
        context_state.current_lightness_need = context_updates["current_lightness_need"]
    if context_updates.get("current_speed_need"):
        context_state.current_speed_need = context_updates["current_speed_need"]
    if context_updates.get("current_budget"):
        context_state.current_budget = context_updates["current_budget"]
    if context_updates.get("current_spice_need"):
        context_state.current_spice_need = context_updates["current_spice_need"]

    profile.profile_status = evaluate_profile_status(profile)
    db.commit()


def update_profile_from_review(
    db,
    user_id: int,
    content: str | None,
    tags: list[str],
    rating: int,
) -> None:
    profile = get_or_create_profile(db, user_id)
    positive_tags = [tag for tag in tags if tag in POSITIVE_REVIEW_TAGS]
    negative_tags = [tag for tag in tags if tag in NEGATIVE_REVIEW_TAGS]

    if positive_tags and rating >= 4:
        profile.favorite_tags = merge_unique_json_array(
            profile.favorite_tags,
            positive_tags,
        )
    if negative_tags and rating <= 3:
        profile.avoid_tags = merge_unique_json_array(
            profile.avoid_tags,
            negative_tags,
        )
    if content and "不吃香菜" in content:
        profile.disliked_ingredients = merge_unique_json_array(
            profile.disliked_ingredients,
            ["香菜"],
        )

    profile.profile_status = evaluate_profile_status(profile)
    db.commit()
