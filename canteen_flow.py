#!/usr/bin/env python3
"""
南京大学食堂流量数据获取脚本

通过 E-Mobile 平台获取食堂实时人流量数据。
支持两种模式：
1. 默认模式：打开浏览器进行 CAS 登录，获取 session 后抓取数据
2. --fetch 模式：复用已保存的 session 直接获取数据

依赖：pip install playwright requests
首次使用：playwright install chromium
"""

import argparse
import json
import sys
import time
import urllib3
from datetime import datetime
from pathlib import Path

import requests
from playwright.sync_api import sync_playwright

# 抑制 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# === 常量定义 ===
SCRIPT_DIR = Path(__file__).parent
SESSION_FILE = SCRIPT_DIR / "session.json"
DATA_FILE = SCRIPT_DIR / "canteen_data.json"

BASE_URL = "https://rll.nju.edu.cn/mobilemode/mobile"
SERVER_URL = f"{BASE_URL}/server.jsp"

# CAS 登录地址
CAS_LOGIN_URL = (
    "https://authserver.nju.edu.cn/authserver/login"
    "?service=https%3A%2F%2Frll.nju.edu.cn%2Fmobilemode%2Fmobile%2Fview.html"
    "%3FappHomepageId%3D2%26mTokenFrom%3Danonymous"
)

# 登录成功后的目标页面
TARGET_URL = (
    f"{BASE_URL}/view.html?appHomepageId=2"
    "&mTokenFrom=anonymous"
    "&mToken=EDB577ED3E38C695466CE2DC95FC2A77"
    "&t_s=1780307937434&amp_sec_version_=1"
    "&gid_=RS9VSnU1WHpKd1hueVZGSkZwTlRieWVCV1JHam9haTlsMWxaQ3UzRTZZRk1Y"
    "SzlvdjVwcSt0dHpFOGlWdloyRW1QRlBBU0syT3hQZTFzMTdWbDBpa0E9PQ"
    "&EMAP_LANG=zh&THEME="
)

# API invoker 参数（base64 编码的 Java 类名）
META_INVOKER = (
    "Y29tLmFwaS5tb2JpbGVtb2RlLndlYi5tb2JpbGUuc2VydmljZS5Nb2JpbGVFbnRyYW5jZUFjdGlvbg=="
)
NLIST_INVOKER = (
    "Y29tLmFwaS5tb2JpbGVtb2RlLndlYi5tb2JpbGUuY29tcG9uZW50Lk5MaXN0QWN0aW9u"
)


def login_with_browser() -> dict:
    """
    使用 Playwright 打开 Edge 浏览器，用户手动完成 CAS 登录。
    登录成功后提取 cookies 并返回。
    """
    print("[*] 正在启动浏览器，请在弹出的窗口中完成统一身份认证登录...")
    print(f"[*] 登录地址: {CAS_LOGIN_URL}")

    cookies_dict = {}

    with sync_playwright() as p:
        # 使用 Edge 浏览器（Chromium 内核）
        browser = p.chromium.launch(
            headless=False,
            channel="msedge",
        )
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()

        # 导航到 CAS 登录页
        page.goto(CAS_LOGIN_URL, wait_until="domcontentloaded")

        print("[*] 等待登录完成（页面将自动跳转到目标页面）...")
        # 等待跳转到 rll.nju.edu.cn，表示登录成功
        page.wait_for_url("**/rll.nju.edu.cn/**", timeout=300000)

        # 确保页面完全加载
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # 导航到目标页面以确保获取完整 cookies
        page.goto(TARGET_URL, wait_until="networkidle")
        time.sleep(2)

        # 提取所有 cookies
        cookies = context.cookies()
        for cookie in cookies:
            cookies_dict[cookie["name"]] = cookie["value"]

        print(f"[+] 登录成功，获取到 {len(cookies_dict)} 个 cookies")
        browser.close()

    return cookies_dict


def get_session_key(cookies: dict) -> str:
    """
    调用 meta API 获取 sessionKey。
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

    print("[*] 正在获取 sessionKey...")
    try:
        resp = requests.get(
            SERVER_URL,
            params=params,
            cookies=cookies,
            verify=False,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "1":
            print(f"[!] meta 接口返回异常状态: {data}")
            sys.exit(1)

        session_key = data["data"]["sessionKey"]
        print(f"[+] 获取 sessionKey 成功: {session_key[:16]}...")
        return session_key

    except requests.RequestException as e:
        print(f"[!] 请求 meta 接口失败: {e}")
        sys.exit(1)
    except (KeyError, json.JSONDecodeError) as e:
        print(f"[!] 解析 meta 响应失败: {e}")
        sys.exit(1)


def fetch_canteen_data(cookies: dict, session_key: str) -> list:
    """
    调用 NListAction 接口获取食堂流量数据。
    """
    params = {
        "invoker": NLIST_INVOKER,
        "sessionkey": session_key,
        "_ec_ismobile": "true",
    }

    # POST 表单数据
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

    print("[*] 正在获取食堂流量数据...")
    try:
        resp = requests.post(
            SERVER_URL,
            params=params,
            data=form_data,
            cookies=cookies,
            verify=False,
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()

        # 响应格式: {"data": {"datas": [...]}, "status": "1"}
        # 或直接: {"datas": [...]}
        if "data" in result and "datas" in result["data"]:
            canteen_list = result["data"]["datas"]
        elif "datas" in result:
            canteen_list = result["datas"]
        else:
            print(f"[!] 响应中未找到数据: {json.dumps(result, ensure_ascii=False)[:200]}")
            sys.exit(1)

        print(f"[+] 成功获取 {len(canteen_list)} 条食堂数据")
        return canteen_list

    except requests.RequestException as e:
        print(f"[!] 请求食堂数据失败: {e}")
        sys.exit(1)
    except (KeyError, json.JSONDecodeError) as e:
        print(f"[!] 解析食堂数据失败: {e}")
        sys.exit(1)


def print_canteen_data(canteen_list: list) -> None:
    """
    格式化打印食堂流量数据。
    """
    print("\n" + "=" * 60)
    print(f"  南京大学食堂实时流量  ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    print("=" * 60)
    print(f"{'食堂名称':<12} {'校区':<8} {'当前人数':<8} {'拥挤度':<8}")
    print("-" * 60)

    for item in canteen_list:
        # 数据可能直接在 item 里，也可能嵌套在 dataMap 里
        dm = item.get("dataMap", item)
        name = dm.get("canteenname", "未知")
        campus = dm.get("xqmc_showvalue", "未知")
        people = dm.get("ttl", "N/A")
        occupancy = dm.get("bl", "N/A")
        print(f"{name:<12} {campus:<8} {str(people):<8} {occupancy:<8}")

    print("=" * 60)
    print(f"  共 {len(canteen_list)} 个食堂\n")


def save_session(cookies: dict, session_key: str) -> None:
    """
    保存 session 信息到文件，供后续复用。
    """
    session_data = {
        "cookies": cookies,
        "session_key": session_key,
        "saved_at": datetime.now().isoformat(),
    }
    SESSION_FILE.write_text(
        json.dumps(session_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[+] Session 已保存到 {SESSION_FILE}")


def load_session() -> tuple[dict, str]:
    """
    从文件加载已保存的 session 信息。
    返回 (cookies, session_key)。
    """
    if not SESSION_FILE.exists():
        print("[!] 未找到已保存的 session 文件，请先不带 --fetch 参数运行以完成登录")
        sys.exit(1)

    try:
        session_data = json.loads(SESSION_FILE.read_text(encoding="utf-8"))
        cookies = session_data["cookies"]
        session_key = session_data["session_key"]
        saved_at = session_data.get("saved_at", "未知")
        print(f"[+] 已加载保存的 session（保存时间: {saved_at}）")
        return cookies, session_key
    except (json.JSONDecodeError, KeyError) as e:
        print(f"[!] session 文件格式错误: {e}")
        sys.exit(1)


def save_canteen_data(canteen_list: list) -> None:
    """
    保存食堂数据到 JSON 文件。
    """
    output = {
        "timestamp": datetime.now().isoformat(),
        "count": len(canteen_list),
        "data": canteen_list,
    }
    DATA_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[+] 数据已保存到 {DATA_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="南京大学食堂流量数据获取工具"
    )
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="跳过登录，复用已保存的 session 直接获取数据",
    )
    args = parser.parse_args()

    if args.fetch:
        # 复用已保存的 session
        cookies, session_key = load_session()
    else:
        # 浏览器登录流程
        cookies = login_with_browser()
        session_key = get_session_key(cookies)
        # 保存 session 供后续使用
        save_session(cookies, session_key)

    # 获取食堂数据
    canteen_list = fetch_canteen_data(cookies, session_key)

    # 打印结果
    print_canteen_data(canteen_list)

    # 保存数据到文件
    save_canteen_data(canteen_list)


if __name__ == "__main__":
    main()
