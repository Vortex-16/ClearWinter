# ClearWinter — Family & Community Winter Smog Assistant

ClearWinter is a full-stack GenAI-powered assistant built to help families and neighborhood communities navigate severe winter smog, thermal inversions, and urban particulate pollution. It translates local air quality conditions and household constraints into concrete low-emission daily routines, indoor air quality protocols, and community alternatives—while quantifying both personal exposure reduction and collective emissions prevented.

---

## 1. Chosen Vertical

**Urban Civic & Family Environmental Health (Winter Smog & Thermal Inversion Resilience)**

Winter air pollution behaves fundamentally differently from summer ozone or wildfire smoke:
- Cold nocturnal air traps vehicle tailpipe exhaust, solid-fuel heating smoke, and industrial emissions inside a shallow atmospheric boundary layer near street level.
- Unvented indoor cooking and space heating inside sealed winter homes frequently create indoor PM2.5 and NO2 peaks worse than outdoor street air.
- Families need actionable, low-cost guidance synchronized to **time of day** (when solar mixing briefly opens safe ventilation windows), **home envelope & heating type**, and **commute patterns**, paired with transparent cause-and-effect math.

---

## 2. Approach & Decision Logic

ClearWinter uses a **hybrid architecture**: deterministic environmental health modeling handles quantitative exposure math, AQI severity classification, and real-time alert evaluation, while **Gemini (`gemini-4-hydrogen`)** generates context-aware plans and answers follow-up questions via strict structured JSON schemas.

### A. Context-Driven Decision Making
1. **Location & AQI Severity Mapping (`classifyAqiBand`, `estimatePm25FromAqi`)**:
   - Maps any AQI (`1–500`) across US EPA breakpoints to ambient PM2.5 concentration (`µg/m³`), severity tier (`Good` through `Hazardous`), and tailored health advisories.
2. **24-Hour Thermal Inversion Modeling (`buildHourlyInversionCurve`)**:
   - Models the diurnal winter boundary layer: morning cold-trap commute peaks (7–10 AM), brief midday solar mixing (`1:00 PM – 4:00 PM`) as the safest cross-ventilation window, and evening heating/nocturnal inversion rebounds (7–11 PM).
3. **Interactive Impact & 12-Week Exposure Projection (`calculateImpactSummary`, `buildLongTermExposureProjection`)**:
   - Every adopted habit updates four real-time metrics: Ambient Winter Smog, Personal Exposure Cut (`%` and estimated indoor `µg/m³`), Weekly CO2e Avoided (`kg`), and Local PM2.5 Prevented (`g`).
   - Rather than summing percentages naively past 100%, exposure cuts combine multiplicatively with diminishing returns and a realistic cap (`82%`) so projections stay scientifically credible.
   - Projects a 12-week seasonal curve (`W1–W12`) in Recharts comparing unmitigated baseline indoor inhalation (`mg` PM2.5) against the household's adopted plan.
4. **Real-Time Worsening Alert Logic (`evaluateAqiWorsening`)**:
   - Compares incoming live readings against the user's persisted `SavedLocationBaseline`.
   - Fires an alert toast when either the AQI severity tier escalates (e.g., `Unhealthy` → `Very Unhealthy`) or local AQI spikes by `≥ 15` points above baseline, with idempotent deduplication to prevent repeat notifications.

### B. GenAI Reasoning (`gemini-4-hydrogen`)
- **Tailored Action Plans (`POST /api/plan`)**: Sends city, AQI, household profile, heating source, commute mode, housing envelope, and priorities to Gemini with a strict `responseSchema`, returning 10 actions across `routine`, `indoor`, and `community` categories—each explicitly articulating **Direct Personal Impact**, **Direct Community Impact**, and **Scientific Mechanism**.
- **Grounded Household Q&A (`POST /api/ask`)**: Maintains conversational context grounded in the active location, AQI, and already-adopted habits, returning a concise recommendation alongside one-line Personal and Community takeaways.

---

## 3. How the Solution Works

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ React 19 + TypeScript Frontend (Vite + Tailwind CSS v4 + Recharts)        │
│                                                                           │
│  Sidebar (Views, Presets, Saved Baseline)                                 │
│  ├─ ImpactStrip + ExposureProjectionChart (12-Week Recharts AreaChart)    │
│  ├─ DiurnalSmogChart (Interactive 24h Inversion & Ventilation Window)     │
│  ├─ ActionWorkspace (Routine / Indoor Hacks / Community Swaps + Filters)  │
│  ├─ AskAssistantView (Contextual Q&A grounded in profile + adopted plan)  │
│  ├─ ProfileCustomizerModal (Validated inputs -> POST /api/plan)           │
│  └─ AlertToastStack (SSE EventSource via src/services/aqiAlertService.ts) │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ HTTP / SSE (Port 3000)
┌───────────────────────────────▼───────────────────────────────────────────┐
│ Express Backend (server.ts)                                               │
│                                                                           │
│  ├─ POST /api/plan        -> @google/genai (gemini-4-hydrogen JSON schema)│
│  ├─ POST /api/ask         -> @google/genai (grounded household Q&A)       │
│  ├─ GET  /api/aqi-stream  -> Server-Sent Events (live Open-Meteo + push)  │
│  ├─ GET  /api/aqi-live    -> On-demand Open-Meteo US AQI / PM2.5 fetch    │
│  ├─ POST /api/aqi-report  -> Authoritative station update broadcast       │
│  └─ GET  /api/health      -> Service health check                         │
└───────────────────────────────────────────────────────────────────────────┘
```

### Getting Started
1. **Configure Secrets**: Set `GEMINI_API_KEY` in `.env` (or AI Studio **Settings > Secrets**). Never expose API keys to client code.
2. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```
3. **Verify Quality & Tests**:
   ```bash
   npm test       # Runs 13 deterministic unit tests (node:test via tsx)
   npm run lint   # Strict TypeScript check (tsc --noEmit)
   npm run build  # Production Vite bundle
   npm start      # Runs production server on port 3000
   ```

---

## 4. Assumptions Made

1. **Indoor Infiltration Ratios**: Unmitigated older/drafty homes are modeled with `0.68` indoor-to-outdoor winter PM2.5 infiltration, while modern sealed apartments are modeled at `0.52`, consistent with residential building-envelope literature.
2. **Breathing Rate for 12-Week Dose Projections**: Seasonal inhaled PM2.5 projections (`mg`) assume an average household member respiratory volume of `14 m³/day` (`98 m³/week`) weighted across a 12-week mid-winter severity curve.
3. **Additive vs. Multiplicative Mitigation**: Individual actions reduce remaining indoor/personal PM2.5 exposure multiplicatively (scaled and capped at `82%` total reduction) rather than linearly summing percentages, preventing physically impossible `>100%` reductions. Week 1 applies an `80%` ramp factor as sealing and routine adjustments settle.
4. **Alert Thresholds & Baseline Persistence**: A user's saved location baseline is persisted locally in `localStorage`. Real-time alert toasts trigger on any EPA severity-tier escalation or a `≥ 15` AQI jump above baseline to balance early warning with low alert fatigue.
5. **Resilient Live Telemetry**: The server queries Open-Meteo's Geocoding and Air Quality APIs with a 3-second timeout and falls back cleanly to server-cached station broadcasts (`/api/aqi-report`) if external requests are unavailable, while starter regional presets (**Delhi NCR**, **Salt Lake City**, **Kraków**, **Lahore**) ensure immediate offline usability.

---

## 5. Engineering Standards Covered

- **Code Quality**: Modular separation between pure domain logic (`src/utils/`), real-time client services (`src/services/`), focused UI components (`src/components/`), and server routes (`server.ts`).
- **Security**: `GEMINI_API_KEY` is strictly isolated on the server (`server.ts`); all endpoints enforce input validation, payload size bounds (`100kb`), string length caps, and security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`). Missing or invalid API errors propagate transparently rather than being masked.
- **Efficiency**: Uses `gemini-4-hydrogen` with `ThinkingLevel.LOW` and structured schemas for fast low-token responses, `useMemo` for derived client impact metrics, and non-blocking SSE heartbeats with cleanup on disconnect.
- **Testing**: 13 automated unit tests (`npm test`) validate EPA AQI math, diurnal inversion curves, impact aggregation, 12-week exposure projections, filtering, form validation, and alert deduplication.
- **Accessibility**: Semantic HTML (`<nav>`, `<main>`, `<article>`, `role="dialog"`, `role="alert"`, `aria-live="assertive"`), `Escape` key modal dismissal, `focus-visible` outlines, WCAG AA color contrast paired with explicit status labels/icons, and `prefers-reduced-motion` support.
