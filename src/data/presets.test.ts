import { describe, expect, it } from 'vitest';
import { REGIONAL_PRESETS } from './presets';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('REGIONAL_PRESETS data integrity', () => {
  it('defines at least 4 valid presets with balanced categories, valid references, and zero emojis', () => {
    expect(REGIONAL_PRESETS.length).toBeGreaterThanOrEqual(4);

    const presetIds = new Set<string>();
    const globalActionIds = new Set<string>();

    for (const preset of REGIONAL_PRESETS) {
      expect(preset.id.trim().length).toBeGreaterThan(0);
      expect(presetIds.has(preset.id)).toBe(false);
      presetIds.add(preset.id);

      expect(preset.profile.city.trim().length).toBeGreaterThanOrEqual(2);
      expect(preset.profile.aqi).toBeGreaterThanOrEqual(1);
      expect(preset.profile.aqi).toBeLessThanOrEqual(500);
      expect(preset.profile.priorities.length).toBeGreaterThan(0);
      expect(preset.bestVentilationWindow.trim().length).toBeGreaterThan(0);
      expect(preset.impactNarrative.trim().length).toBeGreaterThan(20);

      const actionIds = new Set(preset.actions.map((a) => a.id));
      for (const adoptedId of preset.defaultAdoptedIds) {
        expect(actionIds.has(adoptedId)).toBe(true);
      }

      const categories = new Set(preset.actions.map((a) => a.category));
      expect(categories.has('routine')).toBe(true);
      expect(categories.has('indoor')).toBe(true);
      expect(categories.has('community')).toBe(true);

      for (const action of preset.actions) {
        expect(globalActionIds.has(action.id)).toBe(false);
        globalActionIds.add(action.id);
        expect(action.exposureReductionPct).toBeGreaterThan(0);
        expect(action.exposureReductionPct).toBeLessThanOrEqual(60);
        expect(action.weeklyCo2eAvoidedKg).toBeGreaterThanOrEqual(0);
        expect(action.weeklyPm25AvoidedGrams).toBeGreaterThanOrEqual(0);

        const textFields = [
          preset.label,
          preset.seasonNote,
          preset.bestVentilationWindow,
          preset.impactNarrative,
          action.title,
          action.contextLabel,
          action.steps,
          action.personalImpactSummary,
          action.communityImpactSummary,
          action.whyItWorks,
        ];
        for (const field of textFields) {
          expect(EMOJI_REGEX.test(field)).toBe(false);
        }
      }
    }
  });
});
