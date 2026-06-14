# 今天吃什么 - 校园餐饮推荐应用

面向南京大学鼓楼校区的校园餐饮推荐系统，帮助用户快速找到适合当前状态的菜品。项目包含食堂信息、菜品推荐、搜索、AI 对话、邮箱登录、评论系统，以及一阶段的用户画像能力。

## 项目结构

```text
EL-competition/
├── what_to_eat_today_web/
│   ├── frontend/      # React + TypeScript + Vite 前端
│   └── backend/       # FastAPI + SQLite 后端
├── What_to_eat_today_app/  # Android WebView / 原生语音桥
├── ocr_to_sql/             # 菜品数据整理工具
├── canteen_flow.py         # 食堂客流抓取脚本
└── 食堂菜品统计表_已加标签.xlsx  # 菜品种子数据
```

## 当前能力

### 核心业务

- 食堂列表与实时热度展示
- 菜品推荐、搜索建议、热门关键词
- 邮箱验证码登录（JWT）
- 菜品评论、图片上传、评论修改
- 同一用户对同一菜品仅保留一条评论

### AI 功能

- AI 对话普通模式：`POST /api/ai/chat`
- AI 对话流式模式：`POST /api/ai/chat/stream`
- AI 会话初始化：`GET /api/ai/session/init`
- Android 原生语音识别桥 + Web Speech 回退

### 用户画像（当前为一阶段）

- 登录用户进入 AI 页时返回画像状态、欢迎文案、3 道推荐菜
- 从聊天内容中提取部分长期偏好与临时需求
  - 例如：不吃香菜、想吃清淡、赶时间、想吃辣
- 长期画像与临时上下文分开存储
  - `user_profiles`
  - `user_context_state`
- 评论标签和内容会反哺用户画像
- 推荐逻辑基于画像做规则打分排序

## 技术栈

### 前端

- React 19
- TypeScript 6
- Vite 8
- React Router
- React Markdown

### 后端

- FastAPI
- SQLAlchemy 2.x
- SQLite
- httpx
- PyJWT
- python-dotenv
- python-multipart

### Android

- Kotlin
- Jetpack Compose
- WebView
- 原生语音识别桥接

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- npm

### 启动后端

```bash
cd what_to_eat_today_web/backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn main:app --host 0.0.0.0 --port 3000
```

后端地址：

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

### 启动前端

```bash
cd what_to_eat_today_web/frontend
npm install
npm run dev
```

前端地址：

- `http://localhost:5173`

开发模式下，Vite 会代理 `/api` 与 `/static` 到后端。

### 生产构建

```bash
cd what_to_eat_today_web/frontend
npm run build
```

然后启动后端即可托管 `frontend/dist/`。

## 主要 API

### 数据查询

- `GET /api/canteens`
- `GET /api/dishes/recommended`
- `GET /api/dishes/search?keyword=xxx`
- `GET /api/suggestion/today`
- `GET /api/search/hot-keywords`
- `GET /api/search/suggestions?keyword=xxx`

### 认证

- `POST /api/auth/send-code`
- `POST /api/auth/verify`
- `POST /api/auth/set-nickname`
- `GET /api/auth/me`

### 评论

- `POST /api/reviews`
- `PUT /api/reviews/{id}`
- `GET /api/reviews?dish_id=xxx`
- `GET /api/reviews/recent`
- `GET /api/reviews/mine`

### AI

- `GET /api/ai/session/init`
- `POST /api/ai/chat`
- `POST /api/ai/chat/stream`

## 前端页面

- `/` 首页
- `/canteens` 食堂页
- `/search` 搜索页
- `/ai` AI 助手页
- `/comments` 评论页
- `/dish/:id` 菜品详情页
- `/user` 个人页
- `/login` 登录页

## 关键实现说明

- 后端统一输出 camelCase JSON
- AI Key 仅保存在后端环境变量中
- AI 流式回复使用 SSE
- 评论图片保存在 `backend/static/uploads/`
- 菜品种子数据来自 Excel，后端启动时自动导入
- AI 页面已接入语音输入，并处理移动端可视区域高度变化

## 测试与校验

### 后端测试

```bash
cd what_to_eat_today_web/backend
python -m pytest tests -v
```

### 前端检查

```bash
cd what_to_eat_today_web/frontend
npm run build
npm run lint
```

## 环境变量

后端 `.env` 常用项：

- `MIMO_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `JWT_SECRET`
- `EMOBILE_SESSION_PATH`（可选）

## 备注

当前用户画像功能已经可用，适合一阶段演示与迭代验证；如果要进一步提升“个性化推荐”效果，后续还需要继续增强偏好提取精度、画像维度和推荐策略。
