<!-- refreshed: 2026-06-08 -->
# Architecture

**Analysis Date:** 2026-06-08

## System Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                   Android Shell (WebView)                     │
│   `What_to_eat_today_app/app/src/main/java/…/MainActivity.kt`│
│   Wraps the web app URL in a full-screen WebView component    │
└───────────────────────────┬──────────────────────────────────┘
                            │ loads URL via WebView.loadUrl()
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  React SPA (Frontend)                         │
│          `what_to_eat_today_web/frontend/src/`               │
│                                                              │
│  Routes:  /  →  HomePage                                     │
│           /search  →  SearchPage                             │
│           /ai  →  AIChat                                     │
└──────┬────────────────────────────┬───────────────────────── ┘
       │ mock data (in-process)     │ fetch() HTTP
       ▼                            ▼
┌─────────────────┐     ┌────────────────────────────────────┐
│  Mock API layer │     │   Xiaomi MiMo AI API (external)    │
│  `src/mock/     │     │  https://token-plan-cn.xiaomimimo  │
│   mockApi.ts`   │     │  .com/v1/chat/completions          │
│  (in-memory     │     │  `src/services/aiService.ts`       │
│   static data)  │     └────────────────────────────────────┘
└─────────────────┘
       ↑
  [Backend stub — not yet connected]
  `what_to_eat_today_web/backend/main.py` (empty file)
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

**Overall:** Mobile-first SPA wrapped in an Android WebView shell. All application logic lives in the browser; the Android app is a thin container.

**Key Characteristics:**
- No real backend — all data is served from `mockApi.ts` with simulated latency (`setTimeout`)
- AI feature is the only live integration — calls an external API directly from the browser
- Single `HomePage` acts as a page-level orchestrator, fetching all data in parallel via `Promise.all`
- Components are stateless presentational except `DishList` (local like-state) and `SearchPage`/`AIChat` (complex local state)

## Directory Layout

```
EL-competition/
├── What_to_eat_today_app/          # Android shell (Kotlin/Compose)
│   ├── app/
│   │   ├── build.gradle.kts
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/com/example/WhatToEatToday/
│   │           ├── MainActivity.kt         # Only Kotlin source file
│   │           └── ui/theme/               # Material3 theme files
│   └── gradle/
│       └── libs.versions.toml              # Dependency version catalog
│
├── what_to_eat_today_web/
│   ├── backend/
│   │   └── main.py                         # Empty stub — not implemented
│   └── frontend/
│       ├── index.html                      # HTML entry point
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.app.json
│       └── src/
│           ├── main.tsx                    # React DOM root + BrowserRouter
│           ├── App.tsx                     # Route declarations
│           ├── types.ts                    # Shared TypeScript interfaces
│           ├── styles.css                  # Primary CSS (all component styles)
│           ├── index.css                   # Base/reset CSS
│           ├── App.css                     # App-level CSS
│           ├── assets/                     # Static images (hero.png, svgs)
│           ├── components/                 # UI components (flat, no subdirs)
│           │   ├── AIChat.tsx
│           │   ├── AISuggestion.tsx
│           │   ├── BottomNav.tsx
│           │   ├── CanteenHeat.tsx
│           │   ├── DishList.tsx
│           │   ├── Header.tsx
│           │   ├── QuickEntry.tsx
│           │   ├── RecommendCard.tsx
│           │   └── SearchPage.tsx          # SearchPage is in components/, not pages/
│           ├── pages/
│           │   └── HomePage.tsx            # Only page-level component
│           ├── mock/
│           │   └── mockApi.ts              # Static data + simulated API functions
│           └── services/
│               └── aiService.ts            # MiMo AI HTTP client
│
└── .planning/codebase/                     # Analysis documents
```

## Layers

**Pages:**
- Purpose: Screen-level orchestrators that own data fetching and compose multiple components
- Location: `what_to_eat_today_web/frontend/src/pages/`
- Contains: `HomePage.tsx`
- Depends on: components, mock, types
- Note: `SearchPage.tsx` lives in `components/` despite being page-level — inconsistency

**Components:**
- Purpose: Presentational UI units receiving typed props
- Location: `what_to_eat_today_web/frontend/src/components/`
- Contains: All visual components
- Depends on: types, mock (SearchPage only), services (AIChat only)

**Mock layer:**
- Purpose: Simulates a real REST API with static in-memory data and artificial latency
- Location: `what_to_eat_today_web/frontend/src/mock/mockApi.ts`
- Exports: `getCanteens()`, `getRecommendedDishes()`, `getTodaySuggestion()`, `searchDishes()`, `getHotKeywords()`, `getSearchSuggestions()`
- Comments in file indicate the future real API endpoints (e.g., `GET /api/canteens`)

**Services:**
- Purpose: External HTTP integrations
- Location: `what_to_eat_today_web/frontend/src/services/`
- Contains: `aiService.ts` — MiMo chat completions client

**Types:**
- Purpose: Shared TypeScript interfaces
- Location: `what_to_eat_today_web/frontend/src/types.ts`
- Exports: `Canteen`, `Dish`, `TodaySuggestion`

## Data Flow

### Home Page Load

1. `main.tsx` mounts `App` inside `BrowserRouter` (`what_to_eat_today_web/frontend/src/main.tsx`)
2. Router matches `/` → renders `HomePage` (`src/pages/HomePage.tsx`)
3. `useEffect` fires `Promise.all([getRecommendedDishes(), getCanteens(), getTodaySuggestion()])` against mock layer
4. Mock functions resolve after 300–400ms simulated delay
5. State updates trigger re-render; components receive data via props

### AI Chat Flow

1. User navigates to `/ai` (via `QuickEntry`, `AISuggestion`, or URL)
2. `AIChat` renders; `useEffect` focuses the input field
3. User sends a message → `handleSend()` appends user message + loading placeholder to local state
4. `chat(history)` in `aiService.ts` posts to `https://token-plan-cn.xiaomimimo.com/v1/chat/completions`
5. Response replaces the loading placeholder message

### Search Flow

1. User taps search bar in `Header` → `onSearchFocus` navigates to `/search`
2. `SearchPage` starts in `guide` mode (hot keywords + history)
3. Typing triggers debounced `getSearchSuggestions()` → shows `suggest` mode
4. Enter or tag click triggers `searchDishes(keyword)` → shows `result` mode
5. Search history is persisted to `localStorage` under key `search_history`

**State Management:**
- All state is local React `useState` per component
- No global state manager (no Redux, Zustand, Context)
- Search history uses `localStorage` for persistence across sessions

## Entry Points

**Web App:**
- Location: `what_to_eat_today_web/frontend/index.html`
- Triggers: Browser request or `WebView.loadUrl()`
- Responsibilities: Loads `src/main.tsx` as ES module; sets `viewport` for mobile (no user-scalable)

**Android App:**
- Location: `What_to_eat_today_app/app/src/main/java/com/example/WhatToEatToday/MainActivity.kt`
- Triggers: Android launcher intent
- Responsibilities: Sets up edge-to-edge layout, renders `WebViewScreen` composable; handles back navigation via `BackHandler`

## Android WebView Integration

The Android app is a pure shell. It has no native features beyond:
- Loading a URL in a full-screen `WebView`
- Showing a `CircularProgressIndicator` while the page loads
- Intercepting Android back button to call `webView.goBack()` instead of finishing the activity

**Current URL:** The `WebViewScreen` composable has a default parameter `url: String = "about:blank"`. No URL is passed from `MainActivity`. This means the app currently loads a blank page. The actual deployment URL must be passed to `WebViewScreen` before the app is functional.

**WebView settings enabled:**
- JavaScript: enabled
- DOM storage: enabled
- Wide viewport + overview mode
- Zoom controls (UI controls hidden)
- File/content access: disabled (security)

## API Endpoints (Planned — Not Yet Implemented)

The mock layer documents the intended real API via comments:

| Mock Function | Planned Endpoint |
|---------------|-----------------|
| `getCanteens()` | `GET /api/canteens` |
| `getRecommendedDishes()` | `GET /api/dishes/recommended` |
| `getTodaySuggestion()` | `GET /api/suggestion/today` |
| `searchDishes(kw)` | `GET /api/dishes/search?keyword=xxx` |
| `getHotKeywords()` | `GET /api/search/hot-keywords` |
| `getSearchSuggestions(kw)` | `GET /api/search/suggestions?keyword=xxx` |

## Error Handling

**Strategy:** Try/catch with console.error logging; UI falls back to empty state silently.

**Patterns:**
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

---

*Architecture analysis: 2026-06-08*
