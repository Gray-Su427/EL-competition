<!-- GSD:project-start source:PROJECT.md -->
## Project

**今天吃什么 — 后端实现**

南京大学鼓楼校区校园餐饮推荐应用的后端服务。为已有的 React 前端 SPA 提供数据 API，包括食堂信息、菜品推荐、搜索和 AI 对话代理。

**Core Value:** 让学生快速找到想吃的菜——食堂、菜品、推荐数据必须准确可用。

### Constraints

- **Tech stack**: FastAPI + SQLAlchemy + SQLite（开发指南已确定）
- **API 兼容**: 端点路径和响应格式必须匹配前端 mock 中的调用方式
- **环境变量**: MiMo API Key 通过 `.env` 管理，不可硬编码
- **端口**: 后端运行在 8000 端口
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ~6.0.2 - Frontend SPA (`what_to_eat_today_web/frontend/src/`)
- Kotlin 2.2.10 - Android shell app (`What_to_eat_today_app/app/src/`)
- Python - Backend placeholder (`what_to_eat_today_web/backend/main.py`, currently a 1-line stub)
- CSS - UI styling (`what_to_eat_today_web/frontend/src/styles.css`, `src/App.css`, `src/index.css`)
## Runtime
- Browser (targets ES2023)
- No Node.js runtime in production — pure client-side SPA
- Python runtime (FastAPI intended — `main.py` not yet implemented)
- Android SDK 24+ (minSdk 24, targetSdk 36)
- JVM 11 (compile and target compatibility)
## Package Manager
- npm
- Lockfile: `what_to_eat_today_web/frontend/package-lock.json` (present)
- Gradle 9.4.1 (via wrapper)
- Version catalog: `What_to_eat_today_app/gradle/libs.versions.toml`
## Frameworks
- React 19.2.6 - UI component framework
- React DOM 19.2.6 - DOM renderer
- React Router DOM 7.17.0 - Client-side routing (`BrowserRouter`, `Routes`, `Route`)
- Vite 8.0.12 - Dev server and bundler (`what_to_eat_today_web/frontend/vite.config.ts`)
- `@vitejs/plugin-react` 6.0.1 - React Fast Refresh + JSX transform
- Jetpack Compose BOM 2026.02.01 - Declarative UI toolkit
- Compose Material3 - Material You design components
- Compose UI, UI Graphics, UI Tooling Preview
- AndroidX Activity Compose 1.8.0 - `setContent {}` integration
- AndroidX Lifecycle Runtime KTX 2.6.1
- AndroidX Core KTX 1.10.1
- FastAPI + SQLAlchemy + SQLite (referenced in project description)
## Key Dependencies
- `react-router-dom` 7.17.0 - All navigation: `/`, `/search`, `/ai` routes
- Native `fetch` API - HTTP calls to Xiaomi MiMo AI service (no HTTP client library)
- `localStorage` (browser built-in) - Search history persistence in `SearchPage.tsx`
- Xiaomi MiMo API (OpenAI-compatible protocol) — called directly from frontend
- Android built-in `WebView` — renders the frontend web app inside the native shell
## Configuration
- `what_to_eat_today_web/frontend/tsconfig.json` - Root config
- `what_to_eat_today_web/frontend/tsconfig.app.json` - App-level: `target: es2023`, `jsx: react-jsx`, strict unused checks
- `what_to_eat_today_web/frontend/tsconfig.node.json` - Node tooling config
- `what_to_eat_today_web/frontend/eslint.config.js`
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Type-aware linting via `typescript-eslint` 8.59.2
- AGP (Android Gradle Plugin) 9.2.1
- `What_to_eat_today_app/app/build.gradle.kts` - App module config
- `What_to_eat_today_app/gradle.properties` - Gradle properties
- Kotlin Compose compiler plugin 2.2.10
- No `.env` files detected — no environment variable system in place
- API keys are hardcoded in `src/services/aiService.ts`
## Development Commands
- Not yet runnable — `main.py` is a stub with no content
## Platform Requirements
- Node.js (version not pinned — no `.nvmrc` or `.node-version`)
- Android Studio or compatible IDE with Kotlin support
- JDK 11+
- Frontend: Static file host (Vite outputs to `dist/`)
- Backend: Python server (not yet implemented)
- Android: APK/AAB distributed directly or via Play Store
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| `MainActivity` | Android entry point; renders WebView in Compose | `What_to_eat_today_app/app/src/main/java/com/example/WhatToEatToday/MainActivity.kt` |
| `WebViewScreen` | Composable; full-screen WebView with loading indicator and back-nav | `MainActivity.kt` (same file) |
| `App` | React router root; declares all routes | `what_to_eat_today_web/frontend/src/App.tsx` |
| `HomePage` | Main screen; orchestrates all home widgets, loads mock data | `what_to_eat_today_web/frontend/src/pages/HomePage.tsx` |
| `SearchPage` | Full-screen search: guide/suggest/result modes, history via localStorage | `what_to_eat_today_web/frontend/src/components/SearchPage.tsx` |
| `AIChat` | Chat UI; sends conversation history to MiMo API | `what_to_eat_today_web/frontend/src/components/AIChat.tsx` |
| `Header` | Location label + search bar (tap to navigate to `/search`) | `what_to_eat_today_web/frontend/src/components/Header.tsx` |
| `RecommendCard` | Hero card; shows a randomly selected suggestion + highlight dish | `what_to_eat_today_web/frontend/src/components/RecommendCard.tsx` |
| `QuickEntry` | 4-button shortcut row (附近食堂, 热门菜品, AI问问, 我要评价) | `what_to_eat_today_web/frontend/src/components/QuickEntry.tsx` |
| `DishList` | Renders top-3 recommended dishes with like/toggle per dish | `what_to_eat_today_web/frontend/src/components/DishList.tsx` |
| `CanteenHeat` | Shows 3 canteens with crowd status badges | `what_to_eat_today_web/frontend/src/components/CanteenHeat.tsx` |
| `AISuggestion` | Promo card; CTA to open AI chat | `what_to_eat_today_web/frontend/src/components/AISuggestion.tsx` |
| `BottomNav` | 5-tab bottom navigation bar (tabs mostly link to `/` placeholder) | `what_to_eat_today_web/frontend/src/components/BottomNav.tsx` |
| `mockApi` | In-memory data store + simulated async API functions | `what_to_eat_today_web/frontend/src/mock/mockApi.ts` |
| `aiService` | Wrapper for Xiaomi MiMo OpenAI-compatible chat API | `what_to_eat_today_web/frontend/src/services/aiService.ts` |
## Pattern Overview
- No real backend — all data is served from `mockApi.ts` with simulated latency (`setTimeout`)
- AI feature is the only live integration — calls an external API directly from the browser
- Single `HomePage` acts as a page-level orchestrator, fetching all data in parallel via `Promise.all`
- Components are stateless presentational except `DishList` (local like-state) and `SearchPage`/`AIChat` (complex local state)
## Directory Layout
```
```
## Layers
- Purpose: Screen-level orchestrators that own data fetching and compose multiple components
- Location: `what_to_eat_today_web/frontend/src/pages/`
- Contains: `HomePage.tsx`
- Depends on: components, mock, types
- Note: `SearchPage.tsx` lives in `components/` despite being page-level — inconsistency
- Purpose: Presentational UI units receiving typed props
- Location: `what_to_eat_today_web/frontend/src/components/`
- Contains: All visual components
- Depends on: types, mock (SearchPage only), services (AIChat only)
- Purpose: Simulates a real REST API with static in-memory data and artificial latency
- Location: `what_to_eat_today_web/frontend/src/mock/mockApi.ts`
- Exports: `getCanteens()`, `getRecommendedDishes()`, `getTodaySuggestion()`, `searchDishes()`, `getHotKeywords()`, `getSearchSuggestions()`
- Comments in file indicate the future real API endpoints (e.g., `GET /api/canteens`)
- Purpose: External HTTP integrations
- Location: `what_to_eat_today_web/frontend/src/services/`
- Contains: `aiService.ts` — MiMo chat completions client
- Purpose: Shared TypeScript interfaces
- Location: `what_to_eat_today_web/frontend/src/types.ts`
- Exports: `Canteen`, `Dish`, `TodaySuggestion`
## Data Flow
### Home Page Load
### AI Chat Flow
### Search Flow
- All state is local React `useState` per component
- No global state manager (no Redux, Zustand, Context)
- Search history uses `localStorage` for persistence across sessions
## Entry Points
- Location: `what_to_eat_today_web/frontend/index.html`
- Triggers: Browser request or `WebView.loadUrl()`
- Responsibilities: Loads `src/main.tsx` as ES module; sets `viewport` for mobile (no user-scalable)
- Location: `What_to_eat_today_app/app/src/main/java/com/example/WhatToEatToday/MainActivity.kt`
- Triggers: Android launcher intent
- Responsibilities: Sets up edge-to-edge layout, renders `WebViewScreen` composable; handles back navigation via `BackHandler`
## Android WebView Integration
- Loading a URL in a full-screen `WebView`
- Showing a `CircularProgressIndicator` while the page loads
- Intercepting Android back button to call `webView.goBack()` instead of finishing the activity
- JavaScript: enabled
- DOM storage: enabled
- Wide viewport + overview mode
- Zoom controls (UI controls hidden)
- File/content access: disabled (security)
## API Endpoints (Planned — Not Yet Implemented)
| Mock Function | Planned Endpoint |
|---------------|-----------------|
| `getCanteens()` | `GET /api/canteens` |
| `getRecommendedDishes()` | `GET /api/dishes/recommended` |
| `getTodaySuggestion()` | `GET /api/suggestion/today` |
| `searchDishes(kw)` | `GET /api/dishes/search?keyword=xxx` |
| `getHotKeywords()` | `GET /api/search/hot-keywords` |
| `getSearchSuggestions(kw)` | `GET /api/search/suggestions?keyword=xxx` |
## Error Handling
- `HomePage`: `catch (error) { console.error('加载数据失败:', error) }` — no user-visible error state
- `AIChat`: error replaces loading bubble with a friendly message (`抱歉，AI 服务暂时不可用`)
- `SearchPage`: catch sets results to empty array with no error message shown
- `aiService`: re-throws after logging; caller is responsible for error display
## Architectural Constraints
- **No backend connection:** All data except AI chat comes from in-memory mock data — the backend `main.py` is an empty file
- **Hardcoded API key:** `aiService.ts` contains a hardcoded MiMo API key — exposes credentials to any user who inspects the bundle
- **Global state:** None — each component manages its own state; data is not shared across route navigations
- **Android URL:** `WebViewScreen` defaults to `about:blank`; requires a deployed URL to be passed before the Android app works end-to-end
- **BottomNav placeholder:** 4 of 5 bottom nav tabs link to `/` with no-op actions
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
