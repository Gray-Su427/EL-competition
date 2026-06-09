# Phase 4: User System — Research

**Researched:** 2026-06-09
**Phase Goal:** 用户可注册/登录，JWT 认证保护后续写入端点

## 1. CAS 协议集成（服务端 Ticket 验证）

### CAS 3.0 Service Ticket Validation

南大 CAS 服务器：`https://authserver.nju.edu.cn/authserver`

**验证流程（无需浏览器）：**
1. 前端跳转到 CAS 登录页：`{cas_server}/login?service={service_url}`
2. 用户登录成功后，CAS 将浏览器重定向到 `{service_url}?ticket=ST-xxxxx`
3. 前端从 URL 参数提取 ticket，POST 到后端 `/api/auth/login`
4. 后端向 CAS 服务器验证 ticket：`GET {cas_server}/serviceValidate?ticket={ticket}&service={service_url}`
5. CAS 返回 XML 响应，包含用户信息（uid/学号）

**CAS serviceValidate 响应格式：**

成功：
```xml
<cas:serviceResponse xmlns:cas='http://www.yale.edu/tp/cas'>
  <cas:authenticationSuccess>
    <cas:user>学号</cas:user>
    <cas:attributes>
      <cas:uid>学号</cas:uid>
      <cas:cn>姓名</cas:cn>
    </cas:attributes>
  </cas:authenticationSuccess>
</cas:serviceResponse>
```

失败：
```xml
<cas:serviceResponse xmlns:cas='http://www.yale.edu/tp/cas'>
  <cas:authenticationFailure code="INVALID_TICKET">
    Ticket ST-xxxxx not recognized
  </cas:authenticationFailure>
</cas:serviceResponse>
```

### 实现要点

- **service URL 必须严格一致：** CAS 验证 ticket 时，service 参数必须与登录时传入的 service 完全相同（包括协议、端口、路径）
- **ticket 一次性：** 每个 ticket 只能验证一次，第二次验证返回 INVALID_TICKET
- **XML 解析：** 使用 Python 标准库 `xml.etree.ElementTree` 解析 CAS 响应，避免额外依赖
- **HTTPS 验证：** 南大 CAS 服务器使用有效证书，httpx 默认验证即可（不需要 verify=False）

### 关键常量

```python
CAS_SERVER = "https://authserver.nju.edu.cn/authserver"
CAS_LOGIN_URL = f"{CAS_SERVER}/login"
CAS_VALIDATE_URL = f"{CAS_SERVER}/serviceValidate"
CAS_NAMESPACE = "http://www.yale.edu/tp/cas"
```

### Service URL 设计

前端回调路由：`http://localhost:5173/auth/callback`（开发环境）
后端配置：通过 `.env` 中 `CAS_SERVICE_URL` 管理，默认 `http://localhost:5173/auth/callback`

## 2. JWT 实现方案

### 库选择：PyJWT

- **推荐 PyJWT** 而非 python-jose：PyJWT 更轻量、维护更活跃、pip install pyjwt 即可
- python-jose 已停止维护（last release 2022）

### FastAPI JWT 依赖注入模式

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Token 策略

- 算法：HS256（对称密钥，适合单服务部署）
- 过期时间：7 天（CONTEXT.md Claude's Discretion 建议）
- Payload：`{"sub": "学号", "name": "姓名", "exp": timestamp}`
- Secret：`.env` 中 `JWT_SECRET`，启动时缺失则 raise

### 全局认证保护（D-08）

两种方式：
1. **路由级别 Depends（推荐）：** 每个路由文件添加 `Depends(get_current_user)`
2. ~~全局中间件~~ → 不推荐，因为需要排除 `/api/auth/login` 和 `/` health check

**选择方案 1：** 在每个现有 router 添加 dependencies 参数：
```python
router = APIRouter(prefix="/api", tags=["canteens"], dependencies=[Depends(get_current_user)])
```

这样整个 router 下的所有端点都需认证，无需改动单个路由函数签名。

## 3. E-Mobile 食堂客流数据抓取

### 问题分析

`canteen_flow.py` 使用 Playwright 浏览器完成 CAS 登录获取 cookies，然后用 cookies 调 E-Mobile API。服务端无法自动化浏览器登录。

### 解决方案：复用用户 CAS 登录的 cookies

**核心思路（对应 D-14/D-15）：**
1. 用户通过前端 CAS 登录后，后端验证 ticket 时，**同时用 ticket 向 E-Mobile 获取一次 session**
2. 存储 E-Mobile 的 cookies + sessionKey 到数据库（或内存）
3. 定时任务使用存储的 session 调 E-Mobile API 刷新客流数据

**但实际上 CAS ticket 无法直接获取 E-Mobile cookies。** CAS ticket 是给特定 service 的一次性凭证。E-Mobile (`rll.nju.edu.cn`) 是另一个 service。

### 可行方案

**方案 A（推荐 — 简化版）：** 后端提供一个手动触发接口
- 管理员（或特定用户）运行 `canteen_flow.py` 获取 session 并保存到 `session.json`
- 后端启动时加载 `session.json`，定时使用其中的 cookies + sessionKey 调 E-Mobile API
- session 过期时，需要重新运行 `canteen_flow.py`

**方案 B（CONTEXT.md D-14 描述）：** 利用用户登录自动获取
- 需要 CAS 代理票据（Proxy Ticket）或用户同时授权 E-Mobile service
- 南大 CAS 可能不支持 proxy ticket 模式
- 复杂度高，建议 Phase 4 先用方案 A，后续优化

### 定时刷新实现

**FastAPI 中实现定时任务的方案：**

1. **asyncio 后台任务（推荐，零依赖）：**
```python
import asyncio

async def refresh_canteen_flow():
    while True:
        await asyncio.sleep(600)  # 10 分钟
        await _fetch_and_update_canteen_data()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing startup ...
    task = asyncio.create_task(refresh_canteen_flow())
    yield
    task.cancel()
```

2. ~~APScheduler~~ → 额外依赖，对于单一定时任务 overkill

### E-Mobile API 调用（从 canteen_flow.py 提取）

关键步骤：
1. `GET server.jsp?action=meta` → 获取 sessionKey
2. `POST server.jsp?action=getDatas&searchid=1004` → 获取食堂列表数据

响应数据字段：
- `canteenname`: 食堂名称（如"鼓楼食堂一楼"）
- `ttl`: 当前人数
- `bl`: 拥挤度百分比（如"65%"）
- `xqmc_showvalue`: 校区名称

### 数据映射

需要建立 E-Mobile 食堂名 → 数据库 canteen.id 的映射表：
```python
CANTEEN_NAME_MAP = {
    "鼓楼食堂一楼": "c1",
    "鼓楼食堂二楼": "c2",
    "鼓楼教工食堂": "c3",
}
```

### Canteen 模型扩展

现有 `status` 字段（字符串，如"空闲"/"正常"/"拥挤"）已经存在。可增加：
- `current_people` (Integer, nullable): 当前人数
- `occupancy_pct` (String, nullable): 拥挤度百分比
- `flow_updated_at` (String, nullable): 最后更新时间

## 4. User 模型设计

### 字段设计（D-11）

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, unique=True, nullable=False, index=True)  # 学号
    name = Column(String, nullable=False)  # 姓名（CAS 返回）
    nickname = Column(String, nullable=True)  # 昵称（可空）
    avatar_url = Column(String, nullable=True)  # 头像（可空）
    created_at = Column(String, nullable=False)  # ISO 时间戳
```

选择自增 ID + 学号唯一索引（而非学号作 PK），原因：
- 其他表外键引用 user 时用 integer 更高效
- 学号作为业务标识可能变更（转专业等），PK 不应变

### CAS Session 存储

```python
class CasSession(Base):
    __tablename__ = "cas_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False)
    cookies_json = Column(Text, nullable=False)  # JSON 序列化的 cookies
    session_key = Column(String, nullable=False)  # E-Mobile sessionKey
    created_at = Column(String, nullable=False)
    expires_at = Column(String, nullable=True)  # 估算过期时间
```

## 5. 前端变更清单

### 新增路由
- `/auth/callback` — 接收 CAS 重定向，提取 ticket，调后端换 JWT

### 认证拦截
- 启动时检查 localStorage 中 JWT 是否存在且未过期
- 无 JWT → 重定向到 CAS 登录页
- 所有 API 请求添加 `Authorization: Bearer <token>` header

### 修改文件
- `App.tsx` — 新增 `/auth/callback` 路由
- `services/aiService.ts` — 请求加 Authorization header
- 新建 `services/authService.ts` — 登录/token 管理
- 新建 `components/AuthCallback.tsx` — 回调页面组件

## 6. 安全考虑

- **JWT Secret：** 至少 32 字符随机字符串，通过 .env 管理
- **CAS Ticket 验证超时：** httpx 请求 timeout 设 10s
- **CORS：** 已配置只允许 localhost:5173，认证后不需额外调整
- **Token 刷新：** 7 天过期较长，暂不实现 refresh token（简化）
- **E-Mobile Session 安全：** 存储在服务端数据库，不暴露给前端

## 7. 依赖新增

```
PyJWT>=2.8.0
```

httpx 已存在（AI proxy 使用），无需新增。

## 8. 文件结构规划

```
backend/
├── routes/
│   ├── auth.py          # POST /api/auth/login, GET /api/auth/me
│   └── ... (existing)
├── auth.py              # JWT 工具函数 + get_current_user 依赖
├── models.py            # 新增 User, CasSession 模型
├── schemas.py           # 新增 UserOut, LoginRequest, LoginResponse
├── canteen_flow_service.py  # E-Mobile 数据抓取服务（从 canteen_flow.py 提取）
└── ...
```

## Validation Architecture

### Critical Assertions
1. CAS ticket 验证后返回 JWT — 测试用 mock CAS 响应
2. 无效/过期 ticket 返回 401 — 测试 CAS 验证失败路径
3. JWT 过期返回 401 — 测试 token 过期
4. 无 Authorization header 返回 401 — 测试缺少认证
5. 现有 6 个端点 + AI 端点加认证后仍正常工作 — 带 token 请求
6. E-Mobile 数据刷新更新 canteen status — 测试数据映射

### Test Strategy
- **Unit tests:** JWT 签发/验证、CAS XML 解析、食堂名称映射
- **Integration tests:** 完整登录流程（mock CAS server）、认证保护端点
- **Manual test:** 真实 CAS 登录（需校园网环境）

---

*Research completed: 2026-06-09*
*Ready for planning*
