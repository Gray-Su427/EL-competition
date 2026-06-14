# EL-competition — AGENTS.md

## 目录结构
```
what_to_eat_today_web/
├── frontend/              — React 19 + TypeScript 6 + Vite 8 SPA
├── backend/               — FastAPI + SQLite（后端项目）
What_to_eat_today_app/     — Android WebView 壳应用
```

## 前端 (`what_to_eat_today_web/frontend/`)
- 入口：`src/main.tsx` → `App.tsx`（包裹 BrowserRouter）
- React Router 路由：`/` 首页、`/search` 搜索、`/ai` AI 对话、`/canteens` 食堂、`/dishes` 菜品、`/recommended` 推荐、`/comments` 评价、`/user` 用户 
- 9 个组件（`src/components/`）+ `src/pages/`（7 个页面组件）
- 全部样式 `src/styles.css`（~1100 行），UI 文案中文
- `npm run dev` — Vite 开发服务器
- `npm run build` — `tsc -b && vite build`，输出 `dist/`
- `npm run lint` — ESLint
- 无测试框架
- TS 约束：`erasableSyntaxOnly: true`、`verbatimModuleSyntax: true`、`noUnusedLocals`、`noUnusedParameters`

## 后端 (`what_to_eat_today_web/backend/`)
- FastAPI + SQLAlchemy + SQLite
- 路由：`GET /api/canteens`、`GET /api/dishes/recommended`、`GET /api/dishes/search`、`GET /api/suggestion/today`、`GET /api/search/hot-keywords`、`GET /api/search/suggestions`、`POST /api/ai/chat`
- 启动：`uvicorn main:app --reload --port 3000`
- 前端 `src/services/aiService.ts` 请求 `POST /api/ai/chat`（不包含硬编码 Key）

## Android (`What_to_eat_today_app/`)
- Compose + WebView，加载 `file:///android_asset/index.html`
- `AndroidManifest.xml` 含 `android:usesCleartextTraffic="true"`
- 前端构建产物 `frontend/dist/` 复制到 `assets/`
