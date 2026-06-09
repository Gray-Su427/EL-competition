"""Idempotent seed data insertion — reads dishes from Excel spreadsheet."""

import json
import re
from pathlib import Path

import pandas as pd

from database import SessionLocal
from models import Canteen, Dish

# Excel 文件路径（项目根目录）
EXCEL_PATH = Path(__file__).resolve().parent.parent.parent / "食堂菜品统计表_补标签.xlsx"

# 菜系到 emoji 的简易映射
CUISINE_EMOJI: dict[str, str] = {
    "川菜": "🌶️",
    "凉菜": "🥒",
    "家常菜": "🍳",
    "面食": "🍜",
    "套餐饭": "🍱",
    "砂锅": "🍲",
    "铁板": "🥩",
    "粥汤": "🥣",
    "减脂餐": "🥗",
    "小吃": "🥟",
    "烧烤": "🍢",
    "西式": "🍔",
    "日韩": "🍣",
    "麻辣烫": "🌶️",
    "卤味": "🦆",
    "早餐": "🥐",
    "甜品": "🍰",
}


def _parse_price(price_str: str) -> float:
    """解析价格字符串，如 '16元' -> 16.0, '0.2元' -> 0.2"""
    if pd.isna(price_str):
        return 0.0
    match = re.search(r"[\d.]+", str(price_str))
    return float(match.group()) if match else 0.0


def _get_emoji(cuisine: str) -> str:
    """根据菜系返回 emoji，无匹配则返回通用食物 emoji"""
    if pd.isna(cuisine):
        return "🍽️"
    for key, emoji in CUISINE_EMOJI.items():
        if key in str(cuisine):
            return emoji
    return "🍽️"


def _safe_str(val: object) -> str | None:
    """将 pandas 值转为字符串，NaN 返回 None"""
    if pd.isna(val):
        return None
    return str(val).strip()


def seed_data() -> None:
    """Seed canteens and dishes from Excel. Safe to call multiple times."""
    with SessionLocal() as session:
        session.query(Dish).delete()
        session.query(Canteen).delete()

        # --- 食堂种子（4 个鼓楼校区真实食堂） ---
        canteens = [
            Canteen(id="c1", name="一食堂", status="正常", distance="200m", open_time="6:30-20:00"),
            Canteen(id="c2", name="二食堂", status="正常", distance="350m", open_time="6:30-20:30"),
            Canteen(id="c3", name="三食堂", status="正常", distance="500m", open_time="7:00-21:00"),
            Canteen(id="c4", name="教工餐厅", status="正常", distance="400m", open_time="7:00-20:00"),
        ]
        session.add_all(canteens)

        # --- 从 Excel 导入菜品 ---
        if not EXCEL_PATH.exists():
            print(f"[seed] Excel 文件不存在: {EXCEL_PATH}，跳过菜品导入")
            session.commit()
            return

        dishes: list[Dish] = []
        dish_id = 0

        for sheet_name in ["一食堂", "二食堂"]:
            df = pd.read_excel(EXCEL_PATH, sheet_name=sheet_name)

            for _, row in df.iterrows():
                dish_id += 1
                name = _safe_str(row.get("菜名"))
                if not name:
                    continue

                cuisine = _safe_str(row.get("菜系/类型"))
                tags_raw = _safe_str(row.get("标签"))
                tags_list = [t.strip() for t in tags_raw.split(",")] if tags_raw else []

                dishes.append(Dish(
                    id=f"d{dish_id}",
                    name=name,
                    price=_parse_price(row.get("价格")),
                    canteen=_safe_str(row.get("食堂")) or sheet_name,
                    window=_safe_str(row.get("窗口")) or "综合窗口",
                    rating=float(row["学生评分(1-5)"]) if pd.notna(row.get("学生评分(1-5)")) else 0.0,
                    review_count=0,
                    tags=json.dumps(tags_list, ensure_ascii=False),
                    heat_status="正常",
                    emoji=_get_emoji(cuisine),
                    cuisine=cuisine,
                    spice_level=_safe_str(row.get("辣度")),
                    ingredient=_safe_str(row.get("主料/忌口")),
                    alias=_safe_str(row.get("别名")),
                ))

        session.add_all(dishes)
        session.commit()
        print(f"[seed] 导入完成: {len(canteens)} 个食堂, {len(dishes)} 道菜品")
