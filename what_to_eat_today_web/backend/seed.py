"""Idempotent seed data insertion — reads dishes from Excel spreadsheet."""

import json
import re
from pathlib import Path

import pandas as pd

from database import SessionLocal
from models import Canteen, Dish

# Excel 文件路径（项目根目录）
EXCEL_PATH = Path(__file__).resolve().parent.parent.parent / "食堂菜品统计表_已加标签.xlsx"

# 品类到 emoji 的映射
CATEGORY_EMOJI: dict[str, str] = {
    "凉菜": "🥒",
    "卤味": "🦆",
    "面食": "🍜",
    "面条": "🍜",
    "主食": "🍚",
    "早餐": "🥐",
    "小吃": "🥟",
    "套餐": "🍱",
    "砂锅": "🍲",
    "粥": "🥣",
    "汤": "🥣",
    "铁板": "🥩",
    "烧烤": "🍢",
    "减脂": "🥗",
    "轻食": "🥗",
    "甜品": "🍰",
    "饮品": "🧋",
    "炒菜": "🍳",
    "盖饭": "🍱",
    "煎炸": "🍳",
    "饼": "🥞",
    "馒头": "🥐",
    "包子": "🥟",
    "饺子": "🥟",
}


def _parse_price(price_str: object) -> float:
    """解析价格字符串，如 '16元' -> 16.0"""
    if pd.isna(price_str):
        return 0.0
    match = re.search(r"[\d.]+", str(price_str))
    return float(match.group()) if match else 0.0


def _get_emoji(category: str | None, name: str) -> str:
    """根据品类和菜名返回 emoji"""
    text = f"{category or ''} {name}"
    for key, emoji in CATEGORY_EMOJI.items():
        if key in text:
            return emoji
    if "肉" in name or "鸡" in name or "鱼" in name or "虾" in name:
        return "🍖"
    return "🍽️"


def _safe_str(val: object) -> str | None:
    """将 pandas 值转为字符串，NaN 返回 None"""
    if pd.isna(val):
        return None
    s = str(val).strip()
    return s if s and s != "无明显别名" else None


def _build_tags(row: pd.Series) -> list[str]:
    """从多个标签字段构建 tags 数组"""
    tags: list[str] = []

    # 从综合标签中取（用分号分隔）
    comprehensive = _safe_str(row.get("自动-综合标签"))
    if comprehensive:
        parts = [t.strip() for t in comprehensive.replace("；", ";").split(";")]
        tags.extend(p for p in parts if p and len(p) < 10)

    # 补充关键独立字段
    for field in ["自动-品类", "自动-荤素", "自动-口味标签", "自动-价格带"]:
        val = _safe_str(row.get(field))
        if val and val not in tags:
            tags.append(val)

    return tags[:8]  # 最多 8 个标签


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

        canteen_names = {"一食堂": "一食堂", "二食堂": "二食堂"}
        dishes: list[Dish] = []
        dish_id = 0

        for sheet_name, canteen_name in canteen_names.items():
            try:
                df = pd.read_excel(EXCEL_PATH, sheet_name=sheet_name)
            except ValueError:
                print(f"[seed] Sheet '{sheet_name}' 不存在，跳过")
                continue

            for _, row in df.iterrows():
                dish_id += 1
                # 新 Excel 用 "菜品" 列名
                name = _safe_str(row.get("菜品")) or _safe_str(row.get("菜名"))
                if not name:
                    continue

                cuisine = _safe_str(row.get("自动-菜系/风味"))
                category = _safe_str(row.get("自动-品类"))
                spice = _safe_str(row.get("自动-口味标签"))
                ingredient = _safe_str(row.get("自动-主要食材"))
                alias = _safe_str(row.get("自动-别名/常见叫法")) or _safe_str(row.get("别名"))

                tags_list = _build_tags(row)

                dishes.append(Dish(
                    id=f"d{dish_id}",
                    name=name,
                    price=_parse_price(row.get("价格")),
                    canteen=canteen_name,
                    window=_safe_str(row.get("窗口")) or "综合窗口",
                    rating=float(row["学生-评分(1-5)"]) if pd.notna(row.get("学生-评分(1-5)")) else 0.0,
                    review_count=0,
                    tags=json.dumps(tags_list, ensure_ascii=False),
                    heat_status="正常",
                    emoji=_get_emoji(category, name),
                    cuisine=cuisine,
                    spice_level=spice,
                    ingredient=ingredient,
                    alias=alias,
                ))

        session.add_all(dishes)
        session.commit()
        print(f"[seed] 导入完成: {len(canteens)} 个食堂, {len(dishes)} 道菜品")
