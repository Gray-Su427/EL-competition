# Technology Stack

**Analysis Date:** 2026-06-08

## Languages

**Primary:**
- TypeScript ~6.0.2 - Frontend SPA (`what_to_eat_today_web/frontend/src/`)
- Kotlin 2.2.10 - Android shell app (`What_to_eat_today_app/app/src/`)

**Secondary:**
- Python - Backend placeholder (`what_to_eat_today_web/backend/main.py`, currently a 1-line stub)
- CSS - UI styling (`what_to_eat_today_web/frontend/src/styles.css`, `src/App.css`, `src/index.css`)

## Runtime

**Frontend:**
- Browser (targets ES2023)
- No Node.js runtime in production — pure client-side SPA

**Backend:**
- Python runtime (FastAPI intended — `main.py` not yet implemented)

**Android:**
- Android SDK 24+ (minSdk 24, targetSdk 36)
- JVM 11 (compile and target compatibility)

## Package Manager

**Frontend:**
- npm
- Lockfile: `what_to_eat_today_web/frontend/package-lock.json` (present)

**Android:**
- Gradle 9.4.1 (via wrapper)
- Version catalog: `What_to_eat_today_app/gradle/libs.versions.toml`

## Frameworks

**Frontend Core:**
- React 19.2.6 - UI component framework
- React DOM 19.2.6 - DOM renderer
- React Router DOM 7.17.0 - Client-side routing (`BrowserRouter`, `Routes`, `Route`)

**Frontend Build:**
- Vite 8.0.12 - Dev server and bundler (`what_to_eat_today_web/frontend/vite.config.ts`)
- `@vitejs/plugin-react` 6.0.1 - React Fast Refresh + JSX transform

**Android:**
- Jetpack Compose BOM 2026.02.01 - Declarative UI toolkit
- Compose Material3 - Material You design components
- Compose UI, UI Graphics, UI Tooling Preview
- AndroidX Activity Compose 1.8.0 - `setContent {}` integration
- AndroidX Lifecycle Runtime KTX 2.6.1
- AndroidX Core KTX 1.10.1

**Backend (planned, not yet implemented):**
- FastAPI + SQLAlchemy + SQLite (referenced in project description)

## Key Dependencies

**Critical:**
- `react-router-dom` 7.17.0 - All navigation: `/`, `/search`, `/ai` routes
- Native `fetch` API - HTTP calls to Xiaomi MiMo AI service (no HTTP client library)
- `localStorage` (browser built-in) - Search history persistence in `SearchPage.tsx`

**AI Integration:**
- Xiaomi MiMo API (OpenAI-compatible protocol) — called directly from frontend
  - Endpoint: `https://token-plan-cn.xiaomimimo.com/v1/chat/completions`
  - Model: `mimo-v2.5-pro`
  - Configured in `what_to_eat_today_web/frontend/src/services/aiService.ts`
  - API key is hardcoded in source (SECURITY CONCERN — see CONCERNS.md)

**Android WebView:**
- Android built-in `WebView` — renders the frontend web app inside the native shell

## Configuration

**Frontend TypeScript:**
- `what_to_eat_today_web/frontend/tsconfig.json` - Root config
- `what_to_eat_today_web/frontend/tsconfig.app.json` - App-level: `target: es2023`, `jsx: react-jsx`, strict unused checks
- `what_to_eat_today_web/frontend/tsconfig.node.json` - Node tooling config

**Frontend Linting:**
- `what_to_eat_today_web/frontend/eslint.config.js`
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Type-aware linting via `typescript-eslint` 8.59.2

**Android:**
- AGP (Android Gradle Plugin) 9.2.1
- `What_to_eat_today_app/app/build.gradle.kts` - App module config
- `What_to_eat_today_app/gradle.properties` - Gradle properties
- Kotlin Compose compiler plugin 2.2.10

**Environment:**
- No `.env` files detected — no environment variable system in place
- API keys are hardcoded in `src/services/aiService.ts`

## Development Commands

**Frontend (run from `what_to_eat_today_web/frontend/`):**
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (hot reload)
npm run build        # Type-check + production build (tsc -b && vite build)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

**Android (run from `What_to_eat_today_app/`):**
```bash
./gradlew assembleDebug      # Build debug APK
./gradlew assembleRelease    # Build release APK
./gradlew test               # Run unit tests
./gradlew connectedTest      # Run instrumented tests
```

**Backend (from `what_to_eat_today_web/backend/`):**
- Not yet runnable — `main.py` is a stub with no content

## Platform Requirements

**Development:**
- Node.js (version not pinned — no `.nvmrc` or `.node-version`)
- Android Studio or compatible IDE with Kotlin support
- JDK 11+

**Production / Deployment:**
- Frontend: Static file host (Vite outputs to `dist/`)
- Backend: Python server (not yet implemented)
- Android: APK/AAB distributed directly or via Play Store

---

*Stack analysis: 2026-06-08*
