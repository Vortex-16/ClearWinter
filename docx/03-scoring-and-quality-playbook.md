# Engineering Quality & Evaluation Rubric Playbook

This checklist summarizes the practices built into ClearWinter so future updates maintain maximum scores across every evaluation pillar.

---

## 1. Code Quality (High Impact)

- **Modular Single-Responsibility Files**:
  - Keep page/layout components (`src/App.tsx`) free of dense business logic; place state orchestration in hooks (`src/hooks/useClearWinterWorkspace.ts`, `src/hooks/useSidebarState.ts`).
  - Keep network fetching isolated in `src/services/` (`planApiService.ts`, `aqiAlertService.ts`) and pure calculations isolated in `src/utils/` (`airImpact.ts`, `aqiAlertRules.ts`).
  - Extract sub-components (`src/components/sidebar/*`, `src/components/profile/*`) whenever a UI file approaches ~250–300 lines.
- **DRY Shared Helpers**:
  - Reuse shared formulas (`getBaselineInfiltrationFactor`) and reusable UI primitives (`ProfileSelectField`) instead of copying logic.
- **Documentation & Maintainability**:
  - Write concise JSDoc comments on exported interfaces, hooks, and functions describing *contracts and invariants* (not obvious syntax), and explain *why* non-obvious math or edge-case guards exist.
- **Resilience**:
  - Keep `<ErrorBoundary>` around the root tree in `src/main.tsx` so runtime render exceptions degrade cleanly with keyboard-accessible recovery.

---

## 2. Security (Medium Impact)

- **Strict Server Input Validation (`server/security.ts`)**:
  - Strip ASCII control characters (`stripControlChars`), clamp string lengths, and validate numeric bounds (`aqi: 1-500`, `pm25: 0-1000`) for all JSON bodies and query params (`/api/aqi-live`, `/api/aqi-stream`).
- **Rate Limiting & Memory Caps**:
  - Apply `createRateLimiter` on every API endpoint, enable `app.set('trust proxy', 1)` in `server.ts` so `req.ip` reflects proxy headers accurately, and enforce bounded caches (`MAX_KEYS`, `MAX_CACHED_CITIES`, `MAX_SSE_SUBSCRIBERS`).
- **Security Headers & Safe Errors**:
  - Keep `app.disable('x-powered-by')` and headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cross-Origin-Resource-Policy: same-origin`).
  - Never echo raw stack traces or upstream SDK error payloads to HTTP clients (`formatGeminiError`).
- **Prompt Injection Defense (`server/geminiService.ts`)**:
  - Keep user-supplied inputs isolated inside XML tags (`<household_profile>`, `<user_question>`, `<recent_history>`) with explicit instructions treating their contents strictly as data.

---

## 3. Efficiency (Medium Impact)

- Memoize expensive derived computations with `useMemo` (`DiurnalSmogChart`, `ExposureProjectionChart`, `useClearWinterWorkspace`).
- Use `Set` lookups (`new Set(adoptedIds)`) rather than repeated `.includes()` scans inside render loops.
- Deduplicate live alert toasts and enforce short upstream fetch timeouts (`3000ms` in `aqiFeedService.ts`) with clean `EventSource` / `setInterval` teardown on unmount.

---

## 4. Accessibility (Low Impact, Full Polish)

- **Landmarks & Keyboard Navigation**:
  - Preserve the `Skip to main content` link targeting `<main id="main-content" tabIndex={-1}>`.
  - Keep Left/Right/Home/End arrow-key navigation working across the 24 hourly bars in `DiurnalSmogChart.tsx`.
  - Keep `Ctrl/Cmd+B` sidebar toggle and `Escape` dismissal for modals and mobile drawers.
- **Focus & Screen-Reader Announcements**:
  - Focus primary controls when modals/drawers open and restore focus when modals close (`ProfileCustomizerModal.tsx`).
  - Keep polite `aria-live="polite"` regions on dynamic status updates (`App.tsx`, `DiurnalSmogChart.tsx`) and `role="log"` on `AskAssistantView.tsx`.
- **Contrast & Reduced Motion**:
  - Wrap the app in `<MotionConfig reducedMotion="user">` and maintain `>= 4.5:1` foreground/background contrast.

---

## 5. Pre-Push Verification Checklist

Before committing or deploying updates, always run all three checks locally:

```bash
npm run lint     # Must finish with 0 TypeScript errors
npm test         # All 23 test files / 91 tests (including axe-core audits) must pass
npm run build    # Vite production bundle must compile cleanly
```

If adding new components or utility functions:
1. Add dependency-mocked unit tests in `src/tests/*.unit.test.ts(x)`.
2. Verify any new interactive views or dialogs against `axe-core` in `src/tests/accessibility.test.ts` or your unit test file.
