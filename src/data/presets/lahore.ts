import type { RegionalPreset } from '../../types/air';

/** Winter industrial, brick-kiln, and traffic smog preset for Lahore, Pakistan. */
export const LAHORE_PRESET: RegionalPreset = {
  id: 'lahore',
  label: 'Lahore',
  seasonNote: 'Dense winter smog & brick-kiln / traffic haze',
  profile: {
    city: 'Lahore, Pakistan',
    aqi: 285,
    householdType: 'Extended family home',
    heatingSource: 'Gas space heaters + blankets',
    commuteMode: 'Motorbike + car',
    housingType: 'Concrete townhouse with courtyard',
    priorities: [
      'Low-cost DIY air filtration',
      'Reduce indoor gas heater CO/NO2',
      'Safe school & motorbike commutes',
    ],
  },
  bestVentilationWindow: '2:00 PM – 3:45 PM (warmest sunlight window)',
  impactNarrative:
    'At AQI 285, unvented indoor gas heaters compound outdoor industrial and traffic particulates with dangerous indoor NO2. Switching to targeted electric bedding/layered insulation and a DIY box-fan MERV-13 purifier creates an immediate, affordable clean-air zone for children and grandparents.',
  defaultAdoptedIds: ['lh-r1', 'lh-i1'],
  actions: [
    {
      id: 'lh-r1',
      category: 'routine',
      title: 'Wear fitted N95 masks on all motorbike commutes and morning walks',
      contextLabel: 'Daily Travel · Peak Smog',
      costTier: 'Low cost',
      steps:
        'Keep reusable KN95/N95 respirators by the front door for every motorbike rider and schoolchild; replace once breathing resistance rises or after ~40 hours of smog use.',
      personalImpactSummary: '-85% inhaled PM2.5 during transit',
      communityImpactSummary: 'Protects high-exposure two-wheeler riders',
      whyItWorks:
        'Cloth scarves block less than 15% of PM2.5; electrostatic melt-blown N95 media captures 95%+ of toxic fine haze.',
      exposureReductionPct: 28,
      weeklyCo2eAvoidedKg: 0.2,
      weeklyPm25AvoidedGrams: 0.5,
    },
    {
      id: 'lh-i1',
      category: 'indoor',
      title:
        'Replace unvented gas room heaters with layered thermal bedding & safe electric throws',
      contextLabel: 'Bedrooms · Evening & Night',
      costTier: 'Low cost',
      steps:
        'Eliminate open-flame unvented gas heaters inside sleeping rooms. Use heavy cotton/wool quilts, hot-water bottles, or thermostatic electric blankets before sleep.',
      personalImpactSummary: 'Cuts indoor NO2 & CO to near zero',
      communityImpactSummary: '-7.4 kg CO2e/wk · prevents oxygen depletion',
      whyItWorks:
        'Unvented gas heaters dump combustion NO2, moisture, and carbon monoxide directly into sealed smog-day bedrooms.',
      exposureReductionPct: 24,
      weeklyCo2eAvoidedKg: 7.4,
      weeklyPm25AvoidedGrams: 5.2,
    },
    {
      id: 'lh-i2',
      category: 'indoor',
      title: 'Assemble a single-room DIY MERV-13 fan purifier for elder & child bedrooms',
      contextLabel: 'Main Sleeping Room · Nighttime',
      costTier: 'Low cost',
      steps:
        'Tape a 20x20-inch MERV-13 pleated filter securely to the intake side of a standard pedestal or box fan with a cardboard shroud to seal edge gaps.',
      personalImpactSummary: '-54% room PM2.5 within 45 minutes',
      communityImpactSummary: '1/4 the cost of imported purifiers',
      whyItWorks:
        'High airflow through a low-pressure pleated MERV-13 filter delivers Clean Air Delivery Rates (CADR) matching mid-size commercial purifiers.',
      exposureReductionPct: 34,
      weeklyCo2eAvoidedKg: 0.4,
      weeklyPm25AvoidedGrams: 1.0,
    },
    {
      id: 'lh-c1',
      category: 'community',
      title: 'Shift street-side food stalls & generator backups to shared clean power',
      contextLabel: 'Neighborhood Block · Evening',
      costTier: 'Shared investment',
      steps:
        'Coordinate lane neighbors on inverter-battery sharing during brief load-shedding rather than running smoky diesel/petrol backup generators outdoors.',
      personalImpactSummary: 'Removes loud evening exhaust plumes',
      communityImpactSummary: '-16.8 kg CO2e/wk · -29.0 g PM2.5/wk',
      whyItWorks:
        'Small two-stroke and diesel backup generators lack catalytic converters and emit massive localized PM2.5.',
      exposureReductionPct: 12,
      weeklyCo2eAvoidedKg: 16.8,
      weeklyPm25AvoidedGrams: 29.0,
    },
  ],
};
