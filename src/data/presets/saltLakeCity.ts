import type { RegionalPreset } from '../../types/air';

/** Winter mountain-basin inversion preset for Salt Lake City, Utah. */
export const SALT_LAKE_CITY_PRESET: RegionalPreset = {
  id: 'salt-lake',
  label: 'Salt Lake City',
  seasonNote: 'Mountain basin cold-air pool inversion',
  profile: {
    city: 'Salt Lake City, Utah',
    aqi: 168,
    householdType: 'Family with school-age kids',
    heatingSource: 'Natural gas furnace',
    commuteMode: 'Solo SUV commute + school drop-off',
    housingType: 'Single-family home (1990s build)',
    priorities: [
      'Cut vehicle inversion emissions',
      'Upgrade central HVAC filtration',
      'Protect outdoor youth sports',
    ],
  },
  bestVentilationWindow: '2:00 PM – 4:00 PM (peak afternoon sun breakup)',
  impactNarrative:
    'In a mountain basin inversion, cold valley air gets pinned beneath warm upper air for days. Upgrading your central furnace filter to MERV-13 turns existing heating cycles into whole-home particulate scrubbing, while trip-chaining eliminates cold-engine NOx spikes that form secondary winter PM2.5.',
  defaultAdoptedIds: ['sl-r1', 'sl-i1'],
  actions: [
    {
      id: 'sl-r1',
      category: 'routine',
      title: 'Switch from cold-engine idling to electric pre-conditioning or bundled errands',
      contextLabel: 'Morning Routine · Mon–Fri',
      costTier: 'Zero cost',
      steps:
        'Eliminate 10-minute driveway warm-ups (modern engines warm faster under gentle driving after 30 seconds). Combine grocery and school pickups into one warm-engine loop.',
      personalImpactSummary: 'Cuts garage & driveway fume backdraft',
      communityImpactSummary: '-8.6 kg CO2e/wk · -7.2 g NOx/PM2.5',
      whyItWorks:
        'Basin inversions convert morning vehicle NOx directly into ammonium nitrate PM2.5 haze over the next 12 hours.',
      exposureReductionPct: 11,
      weeklyCo2eAvoidedKg: 8.6,
      weeklyPm25AvoidedGrams: 7.2,
    },
    {
      id: 'sl-r2',
      category: 'routine',
      title: 'Move youth sports & dog walks above the inversion bench or indoors',
      contextLabel: 'Afternoon · AQI > 150 Days',
      costTier: 'Zero cost',
      steps:
        'When valley floor AQI crosses 150, move cardio exercise indoors or to higher-elevation foothills above the visible brown inversion cap.',
      personalImpactSummary: '-58% exercise-amplified PM2.5 dose',
      communityImpactSummary: 'Encourages school red-air indoor protocols',
      whyItWorks:
        'Vigorous breathing multiplies minute ventilation 6–10x, driving fine particles deeper into lung alveoli.',
      exposureReductionPct: 22,
      weeklyCo2eAvoidedKg: 0.5,
      weeklyPm25AvoidedGrams: 1.0,
    },
    {
      id: 'sl-i1',
      category: 'indoor',
      title: 'Swap furnace filter to MERV-13 and run HVAC fan on Circulate mode',
      contextLabel: 'Central HVAC · Continuous during inversion',
      costTier: 'Low cost',
      steps:
        'Replace standard fiberglass MERV-6 furnace filters with pleated MERV-13 filters (check static pressure compatibility) and switch thermostat fan from Auto to Circulate (20 min/hr).',
      personalImpactSummary: '-49% whole-home indoor PM2.5',
      communityImpactSummary: 'Uses existing blower without new hardware',
      whyItWorks:
        'Standard MERV-6 filters only catch lint; MERV-13 captures fine inversion aerosols on every heating cycle.',
      exposureReductionPct: 35,
      weeklyCo2eAvoidedKg: 0.9,
      weeklyPm25AvoidedGrams: 2.2,
    },
    {
      id: 'sl-i2',
      category: 'indoor',
      title: 'Lower gas water heater & thermostat 2°F at night with thermal curtains',
      contextLabel: 'Whole Home · Overnight',
      costTier: 'Zero cost',
      steps:
        'Set nighttime thermostat to 64°F (18°C) and draw heavy curtains at dusk to reduce furnace runtime and outdoor combustion exhaust.',
      personalImpactSummary: 'More restful cool-air sleep quality',
      communityImpactSummary: '-6.8 kg CO2e/wk · -4.1 g NOx',
      whyItWorks:
        'Residential natural gas space heating accounts for ~30% of basin-wide winter NOx precursor emissions.',
      exposureReductionPct: 8,
      weeklyCo2eAvoidedKg: 6.8,
      weeklyPm25AvoidedGrams: 4.1,
    },
    {
      id: 'sl-c1',
      category: 'community',
      title: 'Adopt TRAX / bus transit pass on Red Air Alert weeks',
      contextLabel: 'Commuter Corridor · Alert Days',
      costTier: 'Low cost',
      steps:
        'Take regional rail or express bus two days per week during declared winter inversion alerts, or pledge remote workdays with your employer.',
      personalImpactSummary: 'Removes 2.5 hrs of highway tailpipe exposure',
      communityImpactSummary: '-14.2 kg CO2e/wk · -11.8 g PM2.5/wk',
      whyItWorks:
        'Even a 15% drop in valley vehicle miles traveled during day-3 of an inversion prevents AQI from escalating from Unhealthy to Very Unhealthy.',
      exposureReductionPct: 12,
      weeklyCo2eAvoidedKg: 14.2,
      weeklyPm25AvoidedGrams: 11.8,
    },
  ],
};
