---
phase: 04-user-system
verified: 2026-06-09T11:00:00Z
status: human_needed
score: 6/6
overrides_applied: 0
human_verification:
  - test: "CAS 登录完整流程：浏览器打开首页 → 跳转 CAS → 输入学号密码 → 回调换 JWT → 首页渲染"
    expected: "首页正常显示食堂和菜品数据，localStorage 中有 jwt_token"
    why_human: "需要真实的南大 CAS 账号和浏览器交互，grep 无法验证"
  - test: "AuthGuard 跳转行为：清除 localStorage jwt_token 后刷新首页"
    expected: "浏览器自动跳转到 authserver.nju.edu.cn 的 CAS 登录页"
    why_human: "window.location.href 跳转行为需浏览器环境验证"
  - test: "E-Mobile 客流刷新：放置有效 session.json 后观察定时更新"
    expected: "canteens 表 status/current_people/occupancy_pct 字段 10 分钟后更新"
    why_human: "需要真实 E-Mobile session 凭证和网络访问"
---

# Phase 4: User System Verification Report

**Phase Goal:** 用户通过南大 CAS 登录获取 JWT，所有端点需认证，食堂客流实时更新
**Verified:** 2026-06-09T11:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/auth/login 接收 CAS ticket，验证后返回 JWT token + 用户信息 | VERIFIED | `routes/auth.py` POST /login 端点存在，调用 `validate_cas_ticket` 验证 ticket，通过 `create_access_token` 签发 JWT，返回 `LoginResponse(token, user)` |
| 2 | 无效 ticket 返回 401；无 Authorization header 访问数据端点返回 401/403 | VERIFIED | `auth.py` validate_cas_ticket 解析失败 raise HTTPException(401)；HTTPBearer 缺 header 返回 403；无效/过期 token 返回 401 |
| 3 | 携带有效 JWT 的请求正常访问所有数据端点 | VERIFIED | 5 个路由均用 `dependencies=[Depends(get_current_user)]`，`get_current_user` 仅在 token 无效时抛异常，有效 token 通过后正常执行路由逻辑 |
| 4 | 首次登录自动创建 User 记录（users 表） | VERIFIED | `routes/auth.py` login 函数：查询 `User.student_id == student_id`，None 时 `session.add(User(...))` 并 commit |
| 5 | 前端无 JWT 时自动跳转 CAS 登录页；/auth/callback 可提取 ticket 换 JWT | VERIFIED | `AuthGuard.tsx` useEffect 调 `isTokenValid()`，无效时调 `redirectToCAS()`；`AuthCallback.tsx` 用 URLSearchParams 提取 ticket 并调 `loginWithTicket()` |
| 6 | 定时任务启动且 session.json 存在时可更新 canteen status 字段 | VERIFIED | `main.py` lifespan 中 `asyncio.create_task(start_refresh_loop(...))`；`canteen_flow_service.py` 完整实现 load_session -> fetch -> update_canteen_status 链路；无 session.json 时打印警告并跳过 |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/auth.py` | JWT 签发/验证 + get_current_user 依赖 | VERIFIED | 117 行，含 create_access_token、get_current_user、validate_cas_ticket 三个函数，JWT_SECRET 从 env 读取 |
| `backend/routes/auth.py` | POST /api/auth/login 端点 | VERIFIED | 65 行，APIRouter prefix="/api/auth"，POST /login + GET /me |
| `frontend/src/services/authService.ts` | Token 管理 + CAS 跳转逻辑 | VERIFIED | 75 行，导出 7 个函数：getToken, setToken, removeToken, isTokenValid, redirectToCAS, loginWithTicket, getAuthHeaders |
| `frontend/src/components/AuthCallback.tsx` | CAS 回调页面组件 | VERIFIED | 63 行，React 函数组件，URLSearchParams 提取 ticket，调 loginWithTicket，成功 navigate("/") |
| `frontend/src/components/AuthGuard.tsx` | 前端认证守卫组件 | VERIFIED | 38 行，useEffect+state 模式，checking/valid/invalid 三态，无效时 redirectToCAS() |
| `backend/canteen_flow_service.py` | E-Mobile API 调用 + 数据映射 + 定时刷新逻辑 | VERIFIED | 255 行，含 CANTEEN_NAME_MAP(3条目)、6 个函数、REFRESH_INTERVAL_SECONDS=600 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| AuthCallback.tsx | POST /api/auth/login | fetch with ticket param | WIRED | `loginWithTicket()` 调用 `fetch('/api/auth/login', {method:'POST', body: JSON.stringify({ticket})})` |
| routes/auth.py | CAS serviceValidate | httpx GET with ticket + service params | WIRED | `validate_cas_ticket` 调用 `http_client.get(CAS_VALIDATE_URL, params={"ticket": ticket, "service": service_url})` |
| routes/auth.py | auth.create_access_token() | function call | WIRED | login 函数中 `token = create_access_token(student_id, name)` |
| routes/canteens.py | auth.get_current_user | APIRouter dependencies | WIRED | `dependencies=[Depends(get_current_user)]` 确认（Python 运行时验证 5 个路由均有 1 个 auth 依赖） |
| AuthGuard.tsx | authService.isTokenValid | import and check on mount | WIRED | `import { isTokenValid, redirectToCAS } from '../services/authService'` + useEffect 中调用 |
| canteen_flow_service.py | models.Canteen.status | SessionLocal update query | WIRED | `session.query(Canteen).filter_by(id=canteen_id).update({"status": status, ...})` |
| main.py lifespan | canteen_flow_service.start_refresh_loop | asyncio.create_task in startup | WIRED | `app.state.flow_task = asyncio.create_task(start_refresh_loop(app.state.http_client))` 确认（运行时验证 flow_task 为 Task 类型） |
| aiService.ts | authService.getAuthHeaders | import + spread in fetch headers | WIRED | `import { getAuthHeaders } from './authService'` + `headers: {...getAuthHeaders()}` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| canteen_flow_service imports + CANTEEN_NAME_MAP | `python -c "from canteen_flow_service import load_session, CANTEEN_NAME_MAP; print(len(CANTEEN_NAME_MAP))"` | 3 | PASS |
| User model tablename | `python -c "from models import User; print(User.__tablename__)"` | users | PASS |
| create_access_token produces valid token | `python -c "from auth import create_access_token; t=create_access_token('220001','张三'); print(len(t)>50)"` | True | PASS |
| routes/auth.py prefix | `python -c "from routes.auth import router; print(router.prefix)"` | /api/auth | PASS |
| All 5 data routes have auth dependency | Python script checking `router.dependencies` | All 5 confirm has_auth=True | PASS |
| Auth router is NOT protected | `python -c "from routes.auth import router; print(len(router.dependencies))"` | 0 | PASS |
| Lifespan creates flow_task | async lifespan startup test | flow_task exists: True, type: Task | PASS |
| Occupancy mapping logic | _occupancy_to_status('30%'/'40%'/'70%'/'75%') | 空闲/正常/正常/拥挤 | PASS |
| Frontend TypeScript | `npx tsc --noEmit` | No errors (exit 0) | PASS |
| REFRESH_INTERVAL_SECONDS | `python -c "from canteen_flow_service import REFRESH_INTERVAL_SECONDS; print(...)"` | 600 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| D-01 | 04-01 | 标准 CAS 客户端接入 | SATISFIED | auth.py CAS_VALIDATE_URL 指向 authserver.nju.edu.cn/authserver/serviceValidate |
| D-02 | 04-01 | CAS 回调到前端 /auth/callback?ticket=xxx | SATISFIED | App.tsx Route path="/auth/callback"，AuthCallback.tsx 提取 ticket |
| D-03 | 04-01 | 后端验证 ticket → 提取用户信息 → 首次创建用户 → 签发 JWT | SATISFIED | routes/auth.py login 函数完整实现此流程 |
| D-04 | 04-01 | CAS 服务器地址 authserver.nju.edu.cn/authserver | SATISFIED | auth.py CAS_SERVER 常量 |
| D-05 | 04-01 | JWT 存储在前端 localStorage | SATISFIED | authService.ts TOKEN_KEY='jwt_token'，setToken 用 localStorage.setItem |
| D-06 | 04-01 | Authorization: Bearer token 头传递 | SATISFIED | authService.ts getAuthHeaders 返回 Bearer 格式；aiService.ts 展开使用 |
| D-07 | 04-01 | JWT 过期时间合理默认值 | SATISFIED | auth.py JWT_EXPIRE_DAYS = 7 |
| D-08 | 04-02 | 所有 API 端点均需登录 | SATISFIED | 5 个数据路由 router dependencies 均含 get_current_user |
| D-09 | 04-02 | 前端无有效 JWT 跳转 CAS 登录页 | SATISFIED | AuthGuard.tsx isTokenValid() 失败时调 redirectToCAS() |
| D-10 | 04-02 | 6 个数据端点 + AI 端点全部加认证 | SATISFIED | canteens/dishes/suggestion/search/ai 均 dependencies=[Depends(get_current_user)] |
| D-11 | 04-01 | User 表字段：学号/姓名/昵称/头像/创建时间 | SATISFIED | models.py User 含 student_id/name/nickname/avatar_url/created_at |
| D-12 | 04-01 | 首次 CAS 登录自动创建用户 | SATISFIED | routes/auth.py login 中 if user is None: session.add(User(...)) |
| D-13 | 04-01 | 昵称和头像留空 | SATISFIED | User 模型 nickname/avatar_url nullable=True，创建时不传 |
| D-14 | 04-03 | 后端调 E-Mobile API 获取食堂客流 | SATISFIED | canteen_flow_service.py fetch_canteen_data 完整实现 |
| D-15 | 04-03 | 定时刷新机制 | SATISFIED | start_refresh_loop 无限循环 + asyncio.sleep(600) |
| D-16 | 04-03 | 抓取逻辑参考 canteen_flow.py | SATISFIED | META_INVOKER/NLIST_INVOKER/server.jsp 逻辑完整移植 |
| D-17 | 04-03 | 客流数据更新 canteen 表 status 字段 | SATISFIED | update_canteen_status 更新 status/current_people/occupancy_pct/flow_updated_at |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TBD/FIXME/XXX/TODO markers found in phase 4 files |

### Human Verification Required

### 1. CAS 登录完整流程

**Test:** 浏览器打开首页 → 跳转 CAS → 输入学号密码 → 回调换 JWT → 首页渲染
**Expected:** 首页正常显示食堂和菜品数据，localStorage 中有 jwt_token，DevTools Network 可见 Authorization header
**Why human:** 需要真实的南大 CAS 账号和浏览器交互，grep 无法验证端到端流程

### 2. AuthGuard 跳转行为

**Test:** 清除 localStorage jwt_token 后刷新首页
**Expected:** 浏览器自动跳转到 authserver.nju.edu.cn 的 CAS 登录页
**Why human:** window.location.href 跳转行为需浏览器环境验证

### 3. E-Mobile 客流定时刷新

**Test:** 放置有效 session.json 后启动服务，等待 10 分钟
**Expected:** canteens 表 status/current_people/occupancy_pct 字段被更新为真实数据
**Why human:** 需要真实 E-Mobile session 凭证和外部网络访问

---

_Verified: 2026-06-09T11:00:00Z_
_Verifier: Claude (gsd-verifier)_
