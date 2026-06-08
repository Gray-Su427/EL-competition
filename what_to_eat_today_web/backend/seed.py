"""Idempotent seed data insertion (delete-then-insert)."""

import json

from database import SessionLocal
from models import Canteen, Dish


def seed_data() -> None:
    """Seed canteens and dishes. Safe to call multiple times."""
    with SessionLocal() as session:
        session.query(Dish).delete()
        session.query(Canteen).delete()

        canteens = [
            Canteen(id="c1", name="一食堂", status="正常", distance="200m", open_time="6:30-20:00"),
            Canteen(id="c2", name="二食堂", status="拥挤", distance="350m", open_time="6:30-20:30"),
            Canteen(id="c3", name="三食堂", status="空闲", distance="500m", open_time="7:00-21:00"),
        ]

        dishes = [
            Dish(
                id="d1", name="宫保鸡丁", price=12, canteen="一食堂",
                window="川菜窗口", rating=4.6, review_count=238,
                tags=json.dumps(["微辣", "高人气", "下饭"], ensure_ascii=False),
                heat_status="正常", emoji="🍗",
            ),
            Dish(
                id="d2", name="番茄牛腩面", price=15, canteen="二食堂",
                window="面食窗口", rating=4.8, review_count=312,
                tags=json.dumps(["清淡", "暖胃", "高人气"], ensure_ascii=False),
                heat_status="拥挤", emoji="🍜",
            ),
            Dish(
                id="d3", name="麻辣香锅", price=18, canteen="一食堂",
                window="麻辣烫窗口", rating=4.5, review_count=189,
                tags=json.dumps(["麻辣", "自选", "高人气"], ensure_ascii=False),
                heat_status="正常", emoji="🌶️",
            ),
            Dish(
                id="d4", name="鸡蛋炒饭", price=8, canteen="三食堂",
                window="快餐窗口", rating=4.2, review_count=156,
                tags=json.dumps(["实惠", "快速", "清淡"], ensure_ascii=False),
                heat_status="空闲", emoji="🍳",
            ),
            Dish(
                id="d5", name="轻食沙拉", price=22, canteen="三食堂",
                window="轻食窗口", rating=4.7, review_count=98,
                tags=json.dumps(["健康", "低卡", "清淡"], ensure_ascii=False),
                heat_status="空闲", emoji="🥗",
            ),
            Dish(
                id="d6", name="红烧排骨", price=16, canteen="二食堂",
                window="家常菜窗口", rating=4.4, review_count=201,
                tags=json.dumps(["家常", "高人气", "下饭"], ensure_ascii=False),
                heat_status="拥挤", emoji="🍖",
            ),
            Dish(
                id="d7", name="酸辣粉", price=10, canteen="一食堂",
                window="小吃窗口", rating=4.3, review_count=167,
                tags=json.dumps(["酸辣", "开胃", "实惠"], ensure_ascii=False),
                heat_status="正常", emoji="🥢",
            ),
        ]

        session.add_all(canteens)
        session.add_all(dishes)
        session.commit()
