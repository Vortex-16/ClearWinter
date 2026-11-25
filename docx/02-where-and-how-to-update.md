# Where and How to Update ClearWinter Features

Use this lookup guide whenever you need to modify calculations, add scenarios, adjust AI behavior, change UI components, or update backend endpoints cleanly.

---

## 1. Quick Change Map

| What You Want to Update                           | File(s) to Edit                                                                                              | Key Rules / Guardrails                                                                                                                                   |
| :------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add or edit a regional city preset**            | `src/data/presets/<city>.ts`, `src/data/presets.ts`                                                          | Provide unique `id`, valid `aqi` (`1-500`), 10 balanced actions across `routine` (4), `indoor` (3), `community` (3), and valid `defaultAdoptedIds`.      |
| **Adjust PM2.5 / exposure / 12-week formulas**    | `src/utils/aqiClassification.ts`, `exposureModels.ts`, `actionFilters.ts`                                    | Reuse `getBaselineInfiltrationFactor()` so `calculateImpactSummary` and `buildLongTermExposureProjection` stay mathematically aligned.                   |
| **Change live AQI worsening alert rules**         | `src/utils/aqiAlertRules.ts`                                                                                 | Keep severity-band escalation and `>= 15` AQI delta checks pure and side-effect free; verify `lastAlertedAqi` deduplication still prevents spam.         |
| **Change SSE live polling or Open-Meteo adapter** | `server/aqiFeedService.ts`, `src/services/aqiAlertService.ts`                                                | Keep Open-Meteo `AbortController` timeout (`3000ms`), `MAX_CACHED_CITIES` bound (`500`), and static-host Open-Meteo fallback intact.                     |
| **Update Gemini prompts, model, or JSON schema**  | `server/geminiService.ts`, `geminiSchemas.ts`, `geminiPrompts.ts`, `geminiErrors.ts`                         | Keep `MODEL_ID`, `ThinkingLevel.LOW`, strict `responseSchema`, `sanitizeGeneratedActions`, and `<household_profile>` / `<user_question>` XML delimiters. |
| **Add or update API routes & security limits**    | `server.ts`, `server/routes/*`, `server/securitySanitizers.ts`, `server/rateLimiter.ts`                      | Always apply `enforceRateLimit` and input sanitizers (`stripControlChars`, bounded slices) to every route, and return sanitized errors.                  |
| **Modify sidebar links, presets, or footer**      | `src/components/sidebar/SidebarHeader.tsx`, `SidebarNav.tsx`, `SidebarPresets.tsx`, `SidebarFooter.tsx`      | Preserve `Ctrl/Cmd+B` shortcut (`useSidebarState.ts`), `aria-current="page"`, compact icon `aria-label`s, and mobile focus handling.                     |
| **Modify profile customizer fields or options**   | `src/components/profile/profileFormConstants.ts`, `ProfileCustomizerDialog.tsx`, `ProfileIdentityFields.tsx` | Keep `validateProfileInput`, initial focus into `#profile-city`, `Escape` / backdrop close, and focus restoration to trigger button.                     |
| **Modify action workspace or assistant log**      | `src/components/workspace/*`, `src/components/assistant/AssistantMessageList.tsx`                            | Keep category copy, aria-pressed toggles, and aria-live conversation log accessible.                                                                     |
| **Update charts or KPI cards**                    | `src/components/DiurnalSmogChart.tsx`, `ExposureProjectionChart.tsx`, `ImpactStrip.tsx`                      | Wrap derived series in `useMemo`, use zero gradients (solid colors only), and preserve Left/Right/Home/End keyboard navigation on `DiurnalSmogChart`.    |
| **Modify workspace state or live announcements**  | `src/hooks/useClearWinterWorkspace.ts`, `src/hooks/useAqiAlerts.ts`, `src/App.tsx`                           | Update `liveAnnouncement` on user-initiated state transitions so screen readers stay informed via the polite live region.                                |

---

## 2. Step-by-Step Examples

### Adding a New Winter Smog City Preset

1. Create a new preset module under `src/data/presets/<city>.ts` exporting a `RegionalPreset` matching `src/types/air.ts`, then register it in `src/data/presets.ts`.
2. Keep `exposureReductionPct` between `5` and `45` and ensure `defaultAdoptedIds` only references action `id` values inside that preset.
3. Run `npm test` — `src/data/presets.test.ts` automatically validates preset schema integrity, unique IDs, and required categories.

### Updating Gemini Model or Prompt Instructions

1. Edit `server/geminiPrompts.ts` / `server/geminiSchemas.ts` / `server/geminiService.ts`.
2. Preserve XML tags (`<household_profile>`, `<household_context>`, `<recent_history>`, `<user_question>`) so user-supplied text never breaks out into system instructions.
3. Update `sanitizeGeneratedActions` in `server/geminiErrors.ts` if you add new action fields so every field remains clamped before reaching the client.
4. Never leak raw `error.message` strings in HTTP `502` responses—add safe error mappings inside `formatGeminiError()`.

### Adding New UI Components or Controls

1. Keep every production module compact (under ~200 lines). Extract repeated controls, schemas, or sub-views into dedicated helper modules.
2. **Design Constraints (Project Rules)**:
   - **Zero emojis** in UI text or data labels—use `lucide-react` icons with `aria-hidden="true"`.
   - **Zero CSS or SVG gradients** (`bg-gradient-*`, `linear-gradient`, `<linearGradient>`). Use clean solid Tailwind surface tokens.
   - Maintain **WCAG AA text contrast (`>= 4.5:1`)**—on light surfaces (`bg-white`, `bg-slate-50`), use `text-slate-600` or darker for readable captions.
3. Reuse fixture builders in `src/test/factories.ts`, extend unit tests in `src/tests/`, and verify automated accessibility with `axe-core` before finishing.
