# ClearWinter Developer Workflow & Architecture Guide

This guide explains how the ClearWinter codebase is organized and how to run, verify, and ship changes locally or through GitHub Actions.

---

## 1. Quick Start & Scripts

| Command | Purpose |
| :--- | :--- |
| `npm install` | Install runtime and dev dependencies from `package-lock.json` |
| `npm run dev` | Start Express + Vite middleware dev server on `http://localhost:3000` (`tsx server.ts`) |
| `npm run lint` | Run strict TypeScript type-checking (`tsc --noEmit`) across frontend and server |
| `npm test` | Execute all **23 Vitest test files (91 tests)** including `axe-core` accessibility audits |
| `npm run build` | Compile optimized static production bundle into `dist/` (`vite build`) |
| `npm start` | Serve production Express API + compiled `dist/` SPA (`node server.ts`) |

### Environment Variables
Create a local `.env` from `.env.example`:
- `GEMINI_API_KEY`: Required only when running live Gemini plan generation (`POST /api/plan`) or contextual Q&A (`POST /api/ask`) via the Express backend.
- Never commit `.env` or expose API keys inside `VITE_*` client variables.

---

## 2. Repository Layout

```text
.
├── server.ts                          # Express HTTP orchestrator, headers, routing, static SPA serving
├── server/
│   ├── geminiService.ts               # Gemini SDK client, linear retry backoff, XML prompt boundaries, error sanitizer
│   ├── aqiFeedService.ts              # Bounded SSE subscriber hub + Open-Meteo 3s timeout telemetry fetcher
│   ├── security.ts                    # Input validation, control-char stripping, bounded rate limiters
│   └── security.test.ts               # Unit tests for payload sanitization and rate limiting
├── src/
│   ├── main.tsx                       # App bootstrap wrapped in React StrictMode + ErrorBoundary
│   ├── App.tsx                        # Root layout shell consuming useClearWinterWorkspace & useSidebarState
│   ├── types/air.ts                   # Shared domain TypeScript interfaces and union types
│   ├── data/presets.ts                # Regional winter smog scenarios (profile, actions, default adopted IDs)
│   ├── hooks/
│   │   ├── useClearWinterWorkspace.ts # Central workspace state, preset/adoption flows, live AQI alerts, plan requests
│   │   └── useSidebarState.ts         # Persisted desktop rail state, mobile drawer toggle, Ctrl+B & Escape bindings
│   ├── services/
│   │   ├── aqiAlertService.ts         # Browser baseline storage, /api/aqi-stream SSE client, Open-Meteo CORS fallback
│   │   └── planApiService.ts          # JSON API client for /api/plan and /api/ask with static-host detection
│   ├── utils/
│   │   ├── airImpact.ts               # EPA PM2.5 conversion, diurnal curve, infiltration baseline, 12-week model
│   │   └── aqiAlertRules.ts           # Pure worsening trigger rules (+15 AQI spike or severity band escalation)
│   ├── components/
│   │   ├── ErrorBoundary.tsx          # Accessible runtime error boundary with retry recovery
│   │   ├── Sidebar.tsx                # Fixed collapsible desktop rail (272px/76px) + mobile modal drawer
│   │   ├── sidebar/                   # Modular SidebarNav, SidebarPresets, and SidebarFooter
│   │   ├── ProfileCustomizerModal.tsx # Household & AQI dialog using profileFormConstants + ProfileSelectField
│   │   ├── profile/                   # Shared profile selector options and accessible select field component
│   │   ├── TopBar.tsx                 # Workspace header, mobile menu trigger, desktop collapse toggle
│   │   ├── ImpactStrip.tsx            # Top KPI metrics + collapsible 12-week PM2.5 projection panel
│   │   ├── ExposureProjectionChart.tsx# Recharts cumulative baseline vs. adopted PM2.5 chart
│   │   ├── DiurnalSmogChart.tsx       # Keyboard-navigable (Arrow/Home/End) 24-hour inversion bar chart
│   │   ├── ActionWorkspace.tsx        # Search, status filter, and adoption cards per category
│   │   ├── AskAssistantView.tsx       # Contextual Q&A view with starter prompts and aria-live log
│   │   └── AlertToastStack.tsx        # Real-time worsening AQI alerts with Apply Live AQI action
│   └── tests/                         # Dependency-mocked unit tests, server service tests, and axe-core audits
└── .github/workflows/
    ├── ci.yml                         # PR/push CI running lint, tests, and Vite build
    └── deploy-pages.yml               # Static GitHub Pages build + artifact deployment
```

---

## 3. Dual Runtime Architecture (Full-Stack Express vs. GitHub Pages)

ClearWinter intentionally supports two runtime modes without code branching hacks:

1. **Full-Stack Mode (`npm run dev` or `npm start`)**
   - Express handles `/api/health`, `/api/plan`, `/api/ask`, `/api/aqi-stream` (SSE), `/api/aqi-live`, and `/api/aqi-report`.
   - `GEMINI_API_KEY` stays strictly server-side.
2. **Static Hosting Mode (GitHub Pages via `deploy-pages.yml`)**
   - `aqiAlertService.ts` checks `/api/health` for `application/json`; when static HTML is returned instead, it switches automatically to direct CORS polling against Open-Meteo.
   - `planApiService.ts` detects non-JSON static responses on `/api/plan` or `/api/ask` and displays clear guidance to use **Apply Locally** or run the Express server.
