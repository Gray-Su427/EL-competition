# 今天吃什么 — 校园餐饮推荐应用

南京大学鼓楼校区校园餐饮推荐系统，帮助学生快速找到想吃的菜。包含食堂信息查询、菜品推荐、智能搜索、AI 对话、邮箱登录和菜品评价功能。

## 项目结构

```
EL-competition/
├── what_to_eat_today_web/
│   ├── frontend/          # React SPA 前端
│   └── backend/           # FastAPI 后端
├── What_to_eat_today_app/ # Android WebView 壳应用
└── .planning/             # 项目规划文档
```

## 技术栈

### 前端
- React 19 + TypeScript
- React Router DOM 7（客户端路由）
- React Markdown（AI 回复渲染）
- Vite 8（开发服务器 + 构建工具）

### 后端
- FastAPI（Web 框架）
- SQLAlchemy 2.0（ORM）
- SQLite（数据库）
- httpx（异步 HTTP 客户端，用于 AI 代理）
- PyJWT（认证令牌）
- python-dotenv（环境变量管理）
- python-multipart（文件上传）

### Android
- Kotlin + Jetpack Compose
- WebView 加载前端页面

## 快速开始

### 前置要求

- Python 3.10+
- Node.js 18+
- npm

### 1. 启动后端

```bash
cd what_to_eat_today_web/backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入各项配置（见下方环境变量说明）

# 启动服务（首次启动会自动创建数据库和种子数据）
python -m uvicorn main:app --port 8000
```

后端运行在 http://localhost:8000，Swagger 文档在 http://localhost:8000/docs

### 2. 启动前端

```bash
cd what_to_eat_today_web/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 http://localhost:5173，自动代理 `/api` 请求到后端。

### 3. 打开浏览器

访问 http://localhost:5173 即可使用。

## API 端点

### 数据查询

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/canteens` | 获取食堂列表（含实时客流） |
| GET | `/api/dishes/recommended` | 获取推荐菜品 |
| GET | `/api/suggestion/today` | 获取今日推荐文案 |
| GET | `/api/dishes/search?keyword=xxx` | 搜索菜品 |
| GET | `/api/search/hot-keywords` | 获取热门搜索词 |
| GET | `/api/search/suggestions?keyword=xxx` | 搜索联想 |
| POST | `/api/ai/chat` | AI 对话代理（代理 MiMo API） |

### 认证

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/send-code` | 发送邮箱验证码（限 @nju.edu.cn） |
| POST | `/api/auth/verify` | 验证码校验，返回 JWT |
| POST | `/api/auth/set-nickname` | 设置昵称（需登录） |
| GET | `/api/auth/me` | 获取当前用户信息（需登录） |

### 评价

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/reviews` | 创建评价，支持图片上传（需登录） |
| GET | `/api/reviews?dish_id=xxx` | 获取某菜品的评价列表 |
| GET | `/api/reviews/recent` | 获取最新评价 |
| GET | `/api/reviews/mine` | 获取我的评价（需登录） |

### AI 聊天请求格式

```json
// 方式一：完整消息数组
{
  "messages": [
    {"role": "user", "content": "今天吃什么"}
  ]
}

// 方式二：简单字符串
{
  "message": "今天吃什么"
}
```

## 前端页面

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 | 今日推荐、菜品列表、食堂热度、快捷入口 |
| `/canteens` | 食堂页 | 所有食堂详情和实时客流 |
| `/recommended` | 推荐页 | 全部推荐菜品 |
| `/comments` | 评价页 | 菜品评价列表、发表评价 |
| `/user` | 个人页 | 登录状态、我的收藏、我的评价 |
| `/login` | 登录页 | 邮箱验证码登录 |
| `/search` | 搜索页 | 热门关键词、搜索联想、菜品搜索 |
| `/ai` | AI 聊天 | 与"吃什么小助手"对话 |

## 后端目录结构

```
what_to_eat_today_web/backend/
├── main.py              # FastAPI 应用入口、lifespan、CORS、静态文件
├── database.py          # SQLAlchemy 引擎和 SessionLocal
├── models.py            # ORM 模型（Canteen, Dish, User, VerificationCode, Review）
├── schemas.py           # Pydantic 响应模型（camelCase 别名）
├── seed.py              # 种子数据初始化（从 Excel 导入）
├── jwt_utils.py         # JWT 签发和验证
├── auth_service.py      # 邮箱验证码发送和校验
├── canteen_flow_service.py  # 食堂客流实时抓取（E-Mobile）
├── routes/
│   ├── auth.py          # /api/auth/*（登录注册）
│   ├── reviews.py       # /api/reviews/*（评价 CRUD + 图片上传）
│   ├── canteens.py      # /api/canteens
│   ├── dishes.py        # /api/dishes/*
│   ├── suggestion.py    # /api/suggestion/today
│   ├── search.py        # /api/search/*
│   └── ai.py            # /api/ai/chat（MiMo 代理）
├── static/uploads/      # 评价图片存储目录
├── tests/
│   └── test_ai.py       # AI 端点测试
├── requirements.txt     # Python 依赖
├── .env.example         # 环境变量模板
└── canteen.db           # SQLite 数据库（自动生成）
```

## 前端目录结构

```
what_to_eat_today_web/frontend/src/
├── App.tsx              # 路由配置 + AuthProvider
├── main.tsx             # 入口
├── types.ts             # TypeScript 类型（Canteen, Dish, Review 等）
├── contexts/
│   └── AuthContext.tsx  # 全局认证状态
├── pages/
│   ├── HomePage.tsx     # 首页
│   ├── CanteensPage.tsx # 食堂页
│   ├── RecommendedPage.tsx # 推荐页
│   ├── CommentsPage.tsx # 评价页
│   ├── UserPage.tsx     # 个人页
│   └── LoginPage.tsx    # 登录页
├── components/
│   ├── AIChat.tsx       # AI 聊天
│   ├── SearchPage.tsx   # 搜索页
│   ├── ReviewForm.tsx   # 评价表单
│   ├── Header.tsx       # 顶部栏
│   ├── RecommendCard.tsx # 推荐卡片
│   ├── DishList.tsx     # 菜品列表
│   ├── CanteenHeat.tsx  # 食堂热度
│   ├── QuickEntry.tsx   # 快捷入口
│   ├── AISuggestion.tsx # AI 推荐卡片
│   ├── Layout.tsx       # 页面布局
│   └── BottomNav.tsx    # 底部导航
├── mock/
│   └── mockApi.ts       # API 调用层（对接真实后端）
├── services/
│   ├── aiService.ts     # AI 聊天服务
│   └── authService.ts   # 认证服务（登录/注册/JWT）
└── styles.css           # 全局样式
```

## 环境变量

### 后端 (.env)

| 变量 | 说明 | 必须 |
|------|------|------|
| `MIMO_API_KEY` | 小米 MiMo AI API Key | 是（AI 功能需要） |
| `SMTP_HOST` | SMTP 服务器地址（如 smtp.163.com） | 是（登录功能需要） |
| `SMTP_PORT` | SMTP 端口（SSL 用 465） | 是 |
| `SMTP_USER` | 发件人邮箱地址 | 是 |
| `SMTP_PASS` | 邮箱授权码（非登录密码） | 是 |
| `JWT_SECRET` | JWT 签名密钥（随机字符串） | 是 |
| `EMOBILE_SESSION_PATH` | E-Mobile session 文件路径（可选） | 否 |

### 前端

前端开发模式通过 Vite proxy 代理 `/api` 到后端，无需额外环境变量配置。

## 开发指南

### 运行测试

```bash
cd what_to_eat_today_web/backend
pip install pytest pytest-asyncio httpx
python -m pytest tests/ -v
```

### 构建前端

```bash
cd what_to_eat_today_web/frontend
npm run build
# 产物输出到 dist/
```

### 数据库

- SQLite 文件 `canteen.db` 在后端首次启动时自动创建
- 种子数据从 Excel 文件导入真实菜品数据（4 个鼓楼食堂）
- 删除 `canteen.db` 后重启会重新生成

### 添加新 API 端点

1. 在 `backend/routes/` 下创建新路由文件
2. 使用 `APIRouter(prefix="/api/xxx", tags=["xxx"])`
3. 在 `main.py` 中 `import` 并 `app.include_router()`
4. 前端在 `mock/mockApi.ts` 中添加对应的 `fetch` 调用

### 关键设计决策

- **camelCase 响应**：Pydantic 模型使用 `alias_generator = to_camel`，后端字段是 snake_case，API 输出是 camelCase
- **字符串 ID**：食堂和菜品使用字符串 ID（"c1", "d1"），非自增整数
- **AI Key 安全**：API Key 只存在后端 .env 中，前端通过 `/api/ai/chat` 代理访问
- **邮箱验证码登录**：限 @nju.edu.cn 邮箱，验证码 5 分钟有效，JWT 7 天有效
- **图片上传**：评价图片存 `backend/static/uploads/`，通过 `/static/uploads/` 访问
- **食堂客流**：后台定时任务从 E-Mobile 抓取实时数据
- **同步 ORM + 异步 AI**：数据端点用同步 SQLAlchemy，AI 代理用 async httpx

## 许可

项目用于南京大学课程竞赛提交。
