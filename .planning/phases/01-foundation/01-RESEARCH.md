# Phase 1: Foundation - Research

**Researched:** 2026-06-08
**Domain:** FastAPI + SQLAlchemy + Pydantic v2 (Python backend scaffolding)
**Confidence:** HIGH

## Summary

Phase 1 搭建后端骨架：FastAPI 应用实例、SQLAlchemy ORM 模型、Pydantic v2 camelCase 响应契约、SQLite 数据库初始化、种子数据插入、基础设施配置（CORS、.env、lifespan）。不包含任何 API 路由实现。

所有核心依赖已在本地验证可用（Python 3.13、FastAPI 0.136.3、SQLAlchemy 2.0.50、Pydantic 2.13.4、uvicorn 0.49.0）。关键模式（alias_generator to_camel、from_attributes ORM 序列化、Text 列 JSON 解析、lifespan 上下文管理器）均已通过实际代码验证，行为符合预期。

**Primary recommendation:** 严格按照 CONTEXT.md 锁定的多文件结构实现，使用 Pydantic field_validator 在 `tags` 字段上实现 JSON TEXT -> list[str] 反序列化。seed.py 推荐 delete-then-insert 策略（简单、幂等、数据量极小无性能顾虑）。

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01~D-02: 种子数据完全复制前端 mockApi.ts（3 食堂 + 7 菜品），不扩充
- D-03: 多文件拆分：main.py / database.py / models.py / schemas.py / seed.py / .env / requirements.txt
- D-04: routes/ 目录留到 Phase 2，Phase 1 不写任何路由
- D-05~D-07: CORS 仅允许 http://localhost:5173，后端端口 8000
- D-08~D-10: 存储所有字段含 emoji/distance；字段映射已锁定
- D-11: Sync SQLAlchemy（DB）；async httpx 仅 AI proxy
- D-12: 字符串主键 "c1"/"d1"
- D-13: camelCase via alias_generator = to_camel
- D-14: SQLite 绝对路径 pathlib.Path(__file__).parent / "canteen.db"
- D-15: httpx.AsyncClient lifespan 单例

### Claude's Discretion
- Column 类型选择（Text vs String）
- requirements.txt 版本号
- seed.py 幂等策略
- lifespan 日志内容

### Deferred (OUT OF SCOPE)
None

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | Canteen ORM 模型 | String PK + 5 字段已验证 |
| DB-02 | Dish ORM 模型 | String PK + tags Text JSON 已验证 |
| DB-03 | SQLite engine + check_same_thread=False | 已验证可行 |
| DB-04 | 幂等种子数据脚本 | mockApi.ts 数据已完整读取 |
| SCHEMA-01 | Pydantic camelCase 别名 | to_camel 输出已验证 |
| SCHEMA-02 | from_attributes=True | ORM->Pydantic 已验证 |
| SCHEMA-03 | tags JSON TEXT -> list[str] | field_validator 已验证 |
| INFRA-01 | CORS 中间件 | CORSMiddleware 标准用法 |
| INFRA-02 | .env + python-dotenv | 1.2.2 可用 |
| INFRA-03 | uvicorn 端口 8000 | 0.49.0 可用 |
| INFRA-04 | FastAPI lifespan | asynccontextmanager 已验证 |



## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ORM 模型定义 | Database/Storage | -- | 数据持久化层职责 |
| Pydantic 响应契约 | API/Backend | -- | 序列化/验证属于 API 层 |
| 种子数据插入 | Database/Storage | API/Backend (lifespan) | 数据初始化，由 lifespan 触发 |
| CORS 配置 | API/Backend | -- | HTTP 中间件层 |
| 环境变量管理 | API/Backend | -- | 服务配置层 |
| SQLite 引擎初始化 | Database/Storage | -- | 存储引擎创建 |
| httpx client 初始化 | API/Backend | -- | 外部服务客户端，lifespan 管理 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastapi | 0.136.3 | Web 框架 | Python 异步 Web 框架标准选择 [VERIFIED: pip registry] |
| sqlalchemy | 2.0.50 | ORM | Python 生态最成熟的 ORM [VERIFIED: pip registry] |
| pydantic | 2.13.4 | 数据验证/序列化 | FastAPI 内置依赖 [VERIFIED: pip registry] |
| uvicorn | 0.49.0 | ASGI 服务器 | FastAPI 推荐运行时 [VERIFIED: pip registry] |
| python-dotenv | 1.2.2 | 环境变量加载 | .env 管理标准方案 [VERIFIED: pip registry] |
| httpx | 0.28.1 | 异步 HTTP 客户端 | AI proxy 需要 [VERIFIED: pip registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest | 8.3.4 | 测试框架 | 验证 ORM/Schema 正确性 [VERIFIED: installed] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLAlchemy sync | SQLAlchemy async (asyncpg) | 决策已锁定：sync for DB, async only for httpx |
| python-dotenv | pydantic-settings | 项目简单，dotenv 足够 |
| Text + JSON parse | SQLAlchemy JSON type | SQLite 原生不支持 JSON 类型，Text 更可靠 |

**Installation:**
```bash
pip install fastapi==0.136.3 sqlalchemy==2.0.50 uvicorn==0.49.0 python-dotenv==1.2.2 httpx==0.28.1
```

注：pydantic 是 fastapi 的依赖，会自动安装。

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| fastapi | PyPI | 6+ yrs | 40M+/mo | github.com/fastapi/fastapi | [OK] | Approved |
| sqlalchemy | PyPI | 18+ yrs | 50M+/mo | github.com/sqlalchemy/sqlalchemy | [OK] | Approved |
| pydantic | PyPI | 7+ yrs | 200M+/mo | github.com/pydantic/pydantic | [OK] | Approved |
| uvicorn | PyPI | 6+ yrs | 30M+/mo | github.com/encode/uvicorn | [OK] | Approved |
| python-dotenv | PyPI | 9+ yrs | 40M+/mo | github.com/theskumar/python-dotenv | [OK] | Approved |
| httpx | PyPI | 5+ yrs | 30M+/mo | github.com/encode/httpx | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none



## Architecture Patterns

### System Architecture Diagram

```
[uvicorn :8000]
    |
[FastAPI app (main.py)]
    |--- lifespan startup ---> [seed.py] ---> [SQLite canteen.db]
    |--- lifespan startup ---> [httpx.AsyncClient] (stored in app.state)
    |--- CORSMiddleware (allow: localhost:5173)
    |
    |--- [database.py] ---> engine + SessionLocal
    |--- [models.py] ---> Canteen, Dish (ORM)
    |--- [schemas.py] ---> CanteenOut, DishOut (Pydantic, camelCase)
    |
    |--- (Phase 2: routes/*.py)
```

### Recommended Project Structure
```
what_to_eat_today_web/backend/
├── main.py          # FastAPI app, lifespan, CORS middleware
├── database.py      # Engine, SessionLocal, Base
├── models.py        # Canteen, Dish ORM models
├── schemas.py       # Pydantic response models (camelCase)
├── seed.py          # Idempotent seed data insertion
├── .env             # MIMO_API_KEY=xxx
├── .env.example     # Template without real key
└── requirements.txt # Pinned dependencies
```

### Pattern 1: Database Module (database.py)
**What:** 集中管理 SQLAlchemy engine 和 session factory
**When to use:** 任何需要数据库访问的模块
**Example:**
```python
# [VERIFIED: local execution test]
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_PATH = Path(__file__).parent / "canteen.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass
```

### Pattern 2: ORM Model with String PK
**What:** 使用字符串主键匹配前端 ID 格式
**When to use:** Canteen 和 Dish 模型
**Example:**
```python
# [VERIFIED: local execution test]
from sqlalchemy import Column, String, Float, Integer, Text
from database import Base

class Dish(Base):
    __tablename__ = "dishes"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    canteen = Column(String, nullable=False)
    window = Column(String, nullable=False)
    rating = Column(Float, nullable=False)
    review_count = Column(Integer, nullable=False)
    tags = Column(Text, nullable=False)  # JSON string
    heat_status = Column(String, nullable=False)
    emoji = Column(String, nullable=False)
```



### Pattern 3: Pydantic Schema with camelCase + JSON parsing
**What:** Pydantic v2 响应模型，自动 camelCase 别名 + tags 反序列化
**When to use:** 所有对外 API 响应
**Example:**
```python
# [VERIFIED: local execution test]
import json
from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

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
    def parse_tags(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v
```

### Pattern 4: FastAPI Lifespan
**What:** 应用生命周期管理（startup seed + httpx client）
**When to use:** main.py 中 FastAPI 初始化
**Example:**
```python
# [VERIFIED: local execution test]
from contextlib import asynccontextmanager
from fastapi import FastAPI
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from database import engine, Base
    from seed import seed_data
    Base.metadata.create_all(bind=engine)
    seed_data()
    app.state.http_client = httpx.AsyncClient(timeout=30.0)
    print("Application startup complete")
    yield
    # Shutdown
    await app.state.http_client.aclose()
    print("Application shutdown complete")

app = FastAPI(title="今天吃什么 API", lifespan=lifespan)
```

### Pattern 5: Idempotent Seed (delete-then-insert)
**What:** 每次启动清空并重新插入种子数据
**When to use:** seed.py
**Example:**
```python
# [ASSUMED] — strategy choice within Claude's discretion
from database import SessionLocal
from models import Canteen, Dish
import json

def seed_data():
    with SessionLocal() as session:
        session.query(Dish).delete()
        session.query(Canteen).delete()
        # Insert canteens and dishes...
        session.commit()
```

### Anti-Patterns to Avoid
- **直接用 Integer 自增主键:** 前端硬编码 "c1"/"d1" 字符串，整数主键会导致联调失败
- **在 Pydantic schema 中手写 alias:** 用 alias_generator 统一管理，避免遗漏
- **SQLite 不加 check_same_thread=False:** FastAPI 多线程环境下会报错
- **tags 用 PickleType 或 JSON 列类型:** SQLite 原生不支持 JSON 类型索引，Text + 手动解析最可靠
- **在 seed.py 中用 merge/upsert:** 增加复杂度，delete-then-insert 对 10 条数据最简洁



## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| camelCase 转换 | 手写每个字段 alias | pydantic.alias_generators.to_camel | 统一、不易遗漏 |
| JSON 解析 | 自定义 TypeDecorator | field_validator mode="before" | 简单直接，不需要 SQLAlchemy 自定义类型 |
| CORS 处理 | 手写 middleware | fastapi.middleware.cors.CORSMiddleware | 标准实现，处理 preflight |
| 环境变量 | os.environ 手动读取 | python-dotenv load_dotenv() | 自动加载 .env 文件 |
| HTTP 客户端 | urllib/requests | httpx.AsyncClient | 支持异步、连接池复用 |

**Key insight:** 本阶段所有需求均有标准库/框架解决方案，无需自定义实现。

## Common Pitfalls

### Pitfall 1: ORM 列名与 Pydantic 字段名不匹配
**What goes wrong:** SQLAlchemy 列用 snake_case（review_count），前端期望 camelCase（reviewCount），中间可能写错映射
**Why it happens:** from_attributes=True 读取 ORM 属性名，alias_generator 生成输出别名；两步都要正确
**How to avoid:** ORM 列名必须是 snake_case（review_count），Pydantic 字段名也必须是 snake_case，alias_generator 负责转 camelCase
**Warning signs:** model_dump(by_alias=True) 输出的 key 与 types.ts 不匹配

### Pitfall 2: tags JSON 解析遗漏
**What goes wrong:** 从 DB 读出的 tags 是字符串 '["a","b"]'，直接返回给前端变成字符串而非数组
**Why it happens:** from_attributes 不会自动 JSON.parse
**How to avoid:** 在 DishOut 上加 field_validator("tags", mode="before") 做 json.loads
**Warning signs:** 前端收到 tags 字段类型是 string 而非 array

### Pitfall 3: SQLite check_same_thread
**What goes wrong:** 多线程访问 SQLite 报 "SQLite objects created in a thread can only be used in that same thread"
**Why it happens:** SQLite 默认线程安全检查
**How to avoid:** connect_args={"check_same_thread": False}
**Warning signs:** 启动后第一个并发请求就崩溃

### Pitfall 4: Canteen 模型缺少 distance/openTime 等字段
**What goes wrong:** Phase 2 路由返回的数据缺字段，前端显示空白
**Why it happens:** 遗漏 CONTEXT.md 中 D-08/D-10 的字段要求
**How to avoid:** 严格对照 types.ts 接口定义每个字段
**Warning signs:** TypeScript 编译无报错但运行时数据缺失

### Pitfall 5: .env 文件被 git 提交
**What goes wrong:** API Key 泄露
**Why it happens:** 忘记添加 .gitignore 规则
**How to avoid:** 确认 .gitignore 包含 .env；提供 .env.example 模板
**Warning signs:** git status 显示 .env 未被忽略



## Code Examples

### 完整字段映射参考（从 types.ts 导出）

**Canteen 字段 (types.ts -> ORM -> Schema):**
| TypeScript | ORM Column | Pydantic Field | Output Alias |
|------------|-----------|----------------|--------------|
| id: string | id = Column(String, primary_key=True) | id: str | id |
| name: string | name = Column(String) | name: str | name |
| status: '空闲'\|'正常'\|'拥挤' | status = Column(String) | status: str | status |
| distance: string | distance = Column(String) | distance: str | distance |
| openTime: string | open_time = Column(String) | open_time: str | openTime |

**Dish 字段 (types.ts -> ORM -> Schema):**
| TypeScript | ORM Column | Pydantic Field | Output Alias |
|------------|-----------|----------------|--------------|
| id: string | id = Column(String, PK) | id: str | id |
| name: string | name = Column(String) | name: str | name |
| price: number | price = Column(Float) | price: float | price |
| canteen: string | canteen = Column(String) | canteen: str | canteen |
| window: string | window = Column(String) | window: str | window |
| rating: number | rating = Column(Float) | rating: float | rating |
| reviewCount: number | review_count = Column(Integer) | review_count: int | reviewCount |
| tags: string[] | tags = Column(Text) [JSON] | tags: list[str] | tags |
| heatStatus: string | heat_status = Column(String) | heat_status: str | heatStatus |
| emoji: string | emoji = Column(String) | emoji: str | emoji |

### 种子数据精确值（从 mockApi.ts 提取）

**3 Canteens:**
```python
CANTEEN_SEED = [
    {"id": "c1", "name": "一食堂", "status": "正常", "distance": "200m", "open_time": "6:30-20:00"},
    {"id": "c2", "name": "二食堂", "status": "拥挤", "distance": "350m", "open_time": "6:30-20:30"},
    {"id": "c3", "name": "三食堂", "status": "空闲", "distance": "500m", "open_time": "7:00-21:00"},
]
```

**7 Dishes:**
```python
DISH_SEED = [
    {"id": "d1", "name": "宫保鸡丁", "price": 12, "canteen": "一食堂", "window": "川菜窗口",
     "rating": 4.6, "review_count": 238, "tags": '["微辣","高人气","下饭"]',
     "heat_status": "正常", "emoji": "🍗"},
    {"id": "d2", "name": "番茄牛腩面", "price": 15, "canteen": "二食堂", "window": "面食窗口",
     "rating": 4.8, "review_count": 312, "tags": '["清淡","暖胃","高人气"]',
     "heat_status": "拥挤", "emoji": "🍜"},
    {"id": "d3", "name": "麻辣香锅", "price": 18, "canteen": "一食堂", "window": "麻辣烫窗口",
     "rating": 4.5, "review_count": 189, "tags": '["麻辣","自选","高人气"]',
     "heat_status": "正常", "emoji": "🌶️"},
    {"id": "d4", "name": "鸡蛋炒饭", "price": 8, "canteen": "三食堂", "window": "快餐窗口",
     "rating": 4.2, "review_count": 156, "tags": '["实惠","快速","清淡"]',
     "heat_status": "空闲", "emoji": "🍳"},
    {"id": "d5", "name": "轻食沙拉", "price": 22, "canteen": "三食堂", "window": "轻食窗口",
     "rating": 4.7, "review_count": 98, "tags": '["健康","低卡","清淡"]',
     "heat_status": "空闲", "emoji": "🥗"},
    {"id": "d6", "name": "红烧排骨", "price": 16, "canteen": "二食堂", "window": "家常菜窗口",
     "rating": 4.4, "review_count": 201, "tags": '["家常","高人气","下饭"]',
     "heat_status": "拥挤", "emoji": "🍖"},
    {"id": "d7", "name": "酸辣粉", "price": 10, "canteen": "一食堂", "window": "小吃窗口",
     "rating": 4.3, "review_count": 167, "tags": '["酸辣","开胃","实惠"]',
     "heat_status": "正常", "emoji": "🥢"},
]
```



## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pydantic v1 Config class | Pydantic v2 model_config = ConfigDict() | 2023 | 必须用 v2 语法 |
| FastAPI @app.on_event("startup") | asynccontextmanager lifespan | FastAPI 0.109+ | on_event 已弃用 |
| SQLAlchemy 1.x declarative_base() | SQLAlchemy 2.0 DeclarativeBase 类 | 2023 | 新项目用 class 继承 |
| Pydantic orm_mode=True | from_attributes=True | Pydantic v2 | 配置键名变更 |

**Deprecated/outdated:**
- `@app.on_event("startup"/"shutdown")`: 已弃用，用 lifespan 替代
- `pydantic.BaseSettings`: 已移至 pydantic-settings 独立包（本项目用 dotenv 即可）
- `sqlalchemy.ext.declarative.declarative_base()`: 用 DeclarativeBase 类替代

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3.4 |
| Config file | 无 — Wave 0 创建 |
| Quick run command | `pytest tests/ -x -q` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | Canteen 模型可创建、字段类型正确 | unit | `pytest tests/test_models.py::test_canteen_model -x` | Wave 0 |
| DB-02 | Dish 模型可创建、tags 为 Text | unit | `pytest tests/test_models.py::test_dish_model -x` | Wave 0 |
| DB-03 | Engine 创建成功、check_same_thread 生效 | unit | `pytest tests/test_database.py::test_engine_init -x` | Wave 0 |
| DB-04 | seed 后 canteens=3, dishes=7 | integration | `pytest tests/test_seed.py::test_seed_counts -x` | Wave 0 |
| SCHEMA-01 | model_dump(by_alias=True) 输出 camelCase | unit | `pytest tests/test_schemas.py::test_camel_case -x` | Wave 0 |
| SCHEMA-02 | model_validate(orm_obj) 成功 | unit | `pytest tests/test_schemas.py::test_from_attributes -x` | Wave 0 |
| SCHEMA-03 | tags JSON string -> list[str] | unit | `pytest tests/test_schemas.py::test_tags_parsing -x` | Wave 0 |
| INFRA-01 | CORS headers present for localhost:5173 | integration | `pytest tests/test_main.py::test_cors -x` | Wave 0 |
| INFRA-02 | dotenv 加载 MIMO_API_KEY | unit | `pytest tests/test_main.py::test_env_loading -x` | Wave 0 |
| INFRA-03 | app starts on port 8000 | smoke | 手动: `uvicorn backend.main:app --port 8000` | manual |
| INFRA-04 | lifespan 执行 seed + httpx init | integration | `pytest tests/test_main.py::test_lifespan -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/ -x -q`
- **Per wave merge:** `pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/__init__.py` — package marker
- [ ] `tests/test_models.py` — ORM model tests
- [ ] `tests/test_schemas.py` — Pydantic schema tests
- [ ] `tests/test_database.py` — engine/session tests
- [ ] `tests/test_seed.py` — seed data tests
- [ ] `tests/test_main.py` — app lifespan + CORS tests
- [ ] `tests/conftest.py` — shared fixtures (in-memory SQLite engine)



## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | 无用户系统 |
| V3 Session Management | no | 无会话 |
| V4 Access Control | no | 公开 API |
| V5 Input Validation | yes | Pydantic schema validation |
| V6 Cryptography | no | 不涉及加密 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| .env 文件泄露 | Information Disclosure | .gitignore 排除 .env |
| SQLite 文件路径遍历 | Tampering | 绝对路径，不接受用户输入路径 |
| CORS 配置过宽 | Spoofing | 严格限制 allow_origins |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | 全部 | yes | 3.13.5 | -- |
| pip | 包安装 | yes | 25.1 | -- |
| fastapi | Web 框架 | yes | 0.136.3 (installed) | -- |
| sqlalchemy | ORM | yes | 2.0.50 (installed) | -- |
| pydantic | Schema | yes | 2.13.4 (installed) | -- |
| uvicorn | ASGI 服务器 | yes | 0.49.0 (installing) | -- |
| python-dotenv | 环境变量 | yes | 1.2.2 (installed) | -- |
| httpx | HTTP 客户端 | yes | 0.28.1 (installed) | -- |
| pytest | 测试 | yes | 8.3.4 | -- |

**Missing dependencies with no fallback:** None
**Missing dependencies with fallback:** None

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | seed.py 用 delete-then-insert 策略 | Architecture Patterns | 低 — 在 discretion 范围内 |
| A2 | requirements.txt 固定当前最新版本 | Standard Stack | 低 — 版本已验证兼容 |

**所有核心模式已通过本地代码执行验证，无需用户确认。**

## Open Questions

1. **后端目录位置确认**
   - What we know: 当前 `what_to_eat_today_web/backend/main.py` 存在但为空
   - What's unclear: 是否在该目录下创建所有文件，还是创建新的顶层 `backend/` 目录
   - Recommendation: 在现有 `what_to_eat_today_web/backend/` 目录下创建（保持项目结构一致）

## Sources

### Primary (HIGH confidence)
- pip registry: 所有 6 个包版本已验证
- 本地代码执行: FastAPI lifespan, SQLAlchemy engine, Pydantic alias_generator 均已验证
- 前端源码: types.ts 和 mockApi.ts 已完整读取

### Secondary (MEDIUM confidence)
- FastAPI 官方文档模式（lifespan, CORSMiddleware）

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 全部已安装且本地验证
- Architecture: HIGH - 模式已通过代码执行验证
- Pitfalls: HIGH - 基于已验证的模式和已知 SQLite/Pydantic 行为

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (稳定技术栈，30 天有效)
