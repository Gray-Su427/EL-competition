# 今天吃什么 — 校园餐饮推荐应用

南京大学鼓楼校区校园餐饮推荐系统，帮助学生快速找到想吃的菜。包含食堂信息查询、菜品推荐、智能搜索和 AI 对话功能。

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
- python-dotenv（环境变量管理）

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
# 编辑 .env，填入你的 MiMo API Key
# MIMO_API_KEY=your-real-key-here

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

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/canteens` | 获取食堂列表（3 个食堂） |
| GET | `/api/dishes/recommended` | 获取推荐菜品（7 道菜） |
| GET | `/api/suggestion/today` | 获取今日推荐文案 |
| GET | `/api/dishes/search?keyword=xxx` | 搜索菜品 |
| GET | `/api/search/hot-keywords` | 获取热门搜索词（10 个） |
| GET | `/api/search/suggestions?keyword=xxx` | 搜索联想（最多 8 个） |
| POST | `/api/ai/chat` | AI 对话代理（代理 MiMo API） |

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

响应：
```json
{
  "reply": "AI 的回复内容..."
}
```

## 前端页面

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 | 今日推荐、菜品列表、食堂热度、快捷入口 |
| `/search` | 搜索页 | 热门关键词、搜索联想、菜品搜索结果 |
| `/ai` | AI 聊天 | 与"吃什么小助手"对话，支持快捷问题 |

## 后端目录结构

```
what_to_eat_today_web/backend/
├── main.py              # FastAPI 应用入口、lifespan、CORS
├── database.py          # SQLAlchemy 引擎和 SessionLocal
├── models.py            # ORM 模型（Canteen, Dish）
├── schemas.py           # Pydantic 响应模型（camelCase 别名）
├── seed.py              # 种子数据初始化
├── routes/
│   ├── canteens.py      # /api/canteens
│   ├── dishes.py        # /api/dishes/recommended, /api/dishes/search
│   ├── suggestion.py    # /api/suggestion/today
│   ├── search.py        # /api/search/hot-keywords, /api/search/suggestions
│   └── ai.py            # /api/ai/chat（MiMo 代理）
├── tests/
│   └── test_ai.py       # AI 端点测试（6 个用例）
├── requirements.txt     # Python 依赖
├── .env.example         # 环境变量模板
└── canteen.db           # SQLite 数据库（自动生成）
```

## 前端目录结构

```
what_to_eat_today_web/frontend/src/
├── App.tsx              # 路由配置
├── main.tsx             # 入口
├── types.ts             # TypeScript 类型定义
├── pages/
│   └── HomePage.tsx     # 首页
├── components/
│   ├── AIChat.tsx       # AI 聊天页
│   ├── SearchPage.tsx   # 搜索页
│   ├── Header.tsx       # 顶部栏
│   ├── RecommendCard.tsx # 推荐卡片
│   ├── DishList.tsx     # 菜品列表
│   ├── CanteenHeat.tsx  # 食堂热度
│   ├── QuickEntry.tsx   # 快捷入口
│   ├── AISuggestion.tsx # AI 推荐卡片
│   └── BottomNav.tsx    # 底部导航
├── mock/
│   └── mockApi.ts       # API 调用层（已对接真实后端）
├── services/
│   └── aiService.ts     # AI 聊天服务（调用后端代理）
└── styles.css           # 全局样式
```

## 环境变量

### 后端 (.env)

| 变量 | 说明 | 必须 |
|------|------|------|
| `MIMO_API_KEY` | 小米 MiMo AI API Key | 是（AI 功能需要） |

获取方式：前往 https://platform.mimopc.cn 注册并获取 API Key。

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
- 种子数据包含 3 个食堂 + 7 道菜品
- 删除 `canteen.db` 后重启会重新生成

### 添加新 API 端点

1. 在 `backend/routes/` 下创建新路由文件
2. 使用 `APIRouter(prefix="/api/xxx", tags=["xxx"])`
3. 在 `main.py` 中 `import` 并 `app.include_router()`
4. 前端在 `mock/mockApi.ts` 中添加对应的 `fetch` 调用

### 关键设计决策

- **camelCase 响应**：Pydantic 模型使用 `alias_generator = to_camel`，后端字段是 snake_case，API 输出是 camelCase
- **字符串 ID**：食堂和菜品使用字符串 ID（"c1", "d1"），非自增整数
- **AI Key 安全**：API Key 只存在后端 .env 中，前端通过 `/api/ai/chat` 代理访问，浏览器无法看到 key
- **System Prompt 服务端注入**：AI 的系统提示词由后端控制，前端传来的 system 消息会被过滤
- **同步 ORM + 异步 AI**：数据端点用同步 SQLAlchemy，AI 代理用 async httpx

## 许可

项目用于南京大学课程竞赛提交。
