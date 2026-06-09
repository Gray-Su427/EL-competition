"""E-Mobile canteen flow data fetching and scheduled refresh service."""

import asyncio
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from database import SessionLocal
from models import Canteen

# --- Constants ---

BASE_URL = "https://rll.nju.edu.cn/mobilemode/mobile"
SERVER_URL = f"{BASE_URL}/server.jsp"

# API invoker parameters (base64-encoded Java class names, same as canteen_flow.py)
META_INVOKER = (
    "Y29tLmFwaS5tb2JpbGVtb2RlLndlYi5tb2JpbGUuc2VydmljZS5Nb2JpbGVFbnRyYW5jZUFjdGlvbg=="
)
NLIST_INVOKER = (
    "Y29tLmFwaS5tb2JpbGVtb2RlLndlYi5tb2JpbGUuY29tcG9uZW50Lk5MaXN0QWN0aW9u"
)

# Refresh interval: 10 minutes
REFRESH_INTERVAL_SECONDS = 600

# Session file path: configurable via env or default to project root session.json
SESSION_FILE_PATH = Path(
    os.environ.get("EMOBILE_SESSION_PATH", "")
    or (Path(__file__).parent.parent.parent / "session.json")
)

# E-Mobile canteen name -> database canteen id mapping
CANTEEN_NAME_MAP: dict[str, str] = {
    "鼓楼食堂一楼": "c1",
    "鼓楼食堂二楼": "c2",
    "鼓楼教工食堂": "c3",
}


def load_session() -> tuple[dict, str] | None:
    """Load saved E-Mobile session from JSON file.

    Returns (cookies_dict, session_key) or None if file missing/invalid.
    """
    if not SESSION_FILE_PATH.exists():
        return None

    try:
        data = json.loads(SESSION_FILE_PATH.read_text(encoding="utf-8"))
        cookies = data["cookies"]
        session_key = data["session_key"]
        return cookies, session_key
    except (json.JSONDecodeError, KeyError, TypeError):
        return None


async def fetch_session_key(
    http_client: httpx.AsyncClient, cookies: dict
) -> str | None:
    """Call E-Mobile meta API to obtain a sessionKey.

    Returns the sessionKey string or None on failure.
    """
    params = {
        "invoker": META_INVOKER,
        "action": "meta",
        "appid": "",
        "appHomepageId": "2",
        "mTokenFrom": "anonymous",
        "mToken": "EDB577ED3E38C695466CE2DC95FC2A77",
        "_ec_ismobile": "true",
        "timeZoneOffset": "-480",
    }

    try:
        resp = await http_client.get(
            SERVER_URL, params=params, cookies=cookies
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "1":
            print(f"[canteen_flow] meta API returned unexpected status: {data}")
            return None

        return data["data"]["sessionKey"]
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as exc:
        print(f"[canteen_flow] Failed to fetch session key: {exc}")
        return None


async def fetch_canteen_data(
    http_client: httpx.AsyncClient, cookies: dict, session_key: str
) -> list[dict] | None:
    """Call E-Mobile NListAction API to fetch canteen flow data.

    Returns a list of canteen data dicts or None on failure.
    """
    params = {
        "invoker": NLIST_INVOKER,
        "sessionkey": session_key,
        "_ec_ismobile": "true",
    }

    form_data = {
        "pageNo": "1",
        "pageSize": "20",
        "searchKey": "",
        "action": "getDatas",
        "searchid": "1004",
        "fieldparse": "3,14,10462,4802,1,2,60,12,12457,",
        "searchFields": (
            "91,123,34,105,100,34,58,34,49,48,52,54,50,34,44,34,110,"
            "97,109,101,34,58,34,78,65,77,69,34,125,93"
        ),
        "unreadBadge": "false",
        "pageKey": "be281e6736374eb1ab9c64854000c61b_2",
        "t_s": str(int(time.time() * 1000)),
        "amp_sec_version_": "1",
        "gid_": (
            "RS9VSnU1WHpKd1hueVZGSkZwTlRieWVCV1JHam9haTlsMWxaQ3UzRTZZRk1Y"
            "SzlvdjVwcSt0dHpFOGlWdloyRW1QRlBBU0syT3hQZTFzMTdWbDBpa0E9PQ"
        ),
        "EMAP_LANG": "zh",
        "THEME": "",
    }

    try:
        resp = await http_client.post(
            SERVER_URL, params=params, data=form_data, cookies=cookies
        )
        resp.raise_for_status()
        result = resp.json()

        if "data" in result and "datas" in result["data"]:
            return result["data"]["datas"]
        elif "datas" in result:
            return result["datas"]
        else:
            print(f"[canteen_flow] Unexpected response structure: {str(result)[:200]}")
            return None
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as exc:
        print(f"[canteen_flow] Failed to fetch canteen data: {exc}")
        return None


def _occupancy_to_status(bl_str: str) -> str:
    """Convert occupancy percentage string (e.g. '65%') to status text."""
    try:
        pct = int(bl_str.replace("%", "").strip())
    except (ValueError, AttributeError):
        return "正常"

    if pct < 40:
        return "空闲"
    elif pct <= 70:
        return "正常"
    else:
        return "拥挤"


def update_canteen_status(canteen_list: list[dict]) -> int:
    """Update canteen table with live flow data.

    Maps E-Mobile canteen names to database IDs and updates status fields.
    Returns the number of records updated.
    """
    updated = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    with SessionLocal() as session:
        for item in canteen_list:
            dm = item.get("dataMap", item)
            canteen_name = dm.get("canteenname", "")
            canteen_id = CANTEEN_NAME_MAP.get(canteen_name)

            if canteen_id is None:
                continue

            ttl = dm.get("ttl")
            bl = dm.get("bl", "")

            # Parse current_people as integer
            try:
                people = int(ttl) if ttl is not None else None
            except (ValueError, TypeError):
                people = None

            status = _occupancy_to_status(bl)

            rows = (
                session.query(Canteen)
                .filter_by(id=canteen_id)
                .update(
                    {
                        "status": status,
                        "current_people": people,
                        "occupancy_pct": bl if bl else None,
                        "flow_updated_at": now_iso,
                    }
                )
            )
            updated += rows

        session.commit()

    return updated


async def refresh_canteen_flow(http_client: httpx.AsyncClient) -> None:
    """Execute one refresh cycle: load session, fetch data, update DB.

    Silently returns on any failure (session missing, API error, etc.).
    """
    session_data = load_session()
    if session_data is None:
        print("[canteen_flow] No session file found, skipping refresh")
        return

    cookies, session_key = session_data

    # Try to use the saved session_key first; re-fetch if needed
    new_key = await fetch_session_key(http_client, cookies)
    if new_key is not None:
        session_key = new_key

    canteen_list = await fetch_canteen_data(http_client, cookies, session_key)
    if canteen_list is None:
        print("[canteen_flow] Failed to fetch canteen data, skipping update")
        return

    count = update_canteen_status(canteen_list)
    print(f"[canteen_flow] Updated {count} canteen(s) with live flow data")


async def start_refresh_loop(http_client: httpx.AsyncClient) -> None:
    """Infinite loop: refresh canteen flow data every REFRESH_INTERVAL_SECONDS.

    Catches CancelledError for graceful shutdown. Catches other exceptions
    to prevent the task from dying.
    """
    try:
        while True:
            await refresh_canteen_flow(http_client)
            await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
    except asyncio.CancelledError:
        print("[canteen_flow] Refresh loop cancelled")
    except Exception as exc:
        print(f"[canteen_flow] Unexpected error in refresh loop: {exc}")
