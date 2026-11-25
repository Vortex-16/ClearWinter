import type { RegionalPreset } from '../../types/air';

/** Winter solid-fuel valley stagnation preset for Kraków, Poland. */
export const KRAKOW_PRESET: RegionalPreset = {
  id: 'krakow',
  label: 'Kraków',
  seasonNote: 'Cold valley coal & wood smoke stagnation',
  profile: {
    city: 'Kraków, Poland',
    aqi: 194,
    householdType: 'Multi-generational apartment',
    heatingSource: 'District heating + backup electric',
    commuteMode: 'Tram + bicycle',
    housingType: 'Historic brick tenement flat',
    priorities: [
      'Seal historic window sashes',
      'Protect elderly respiratory health',
      'Support clean-heat neighbors',
    ],
  },
  bestVentilationWindow: '1:00 PM – 3:00 PM (brief 10-minute cross-draft)',
  impactNarrative:
    'Surrounding peri-urban solid-fuel heating drifts into historic city tenements every evening after 6 PM. Sealing tall timber window sashes and pairing short midday purging with bedroom HEPA scrubbing protects older family members from nocturnal PAH and soot peaks.',
  defaultAdoptedIds: ['kr-r1', 'kr-i1'],
  actions: [
    {
      id: 'kr-r1',
      category: 'routine',
      title: 'Use timed 10-minute afternoon purge ventilation instead of tilted tilt-turn windows',
      contextLabel: 'Daily Routine · 1:30 PM',
      costTier: 'Zero cost',
      steps:
        'Never leave windows cracked on micro-ventilation overnight. Open opposite windows fully for 8–10 minutes at 1:30 PM to refresh CO2 without chilling brick walls.',
      personalImpactSummary: '-44% indoor evening soot ingress',
      communityImpactSummary: '-4.5 kg CO2e/wk from retained masonry heat',
      whyItWorks:
        'Continuous tilted windows steadily draw cold chimney smoke indoors while wasting heating energy.',
      exposureReductionPct: 26,
      weeklyCo2eAvoidedKg: 4.5,
      weeklyPm25AvoidedGrams: 3.1,
    },
    {
      id: 'kr-i1',
      category: 'indoor',
      title: 'Install window trickle-vent electrostatic filters + sash gaskets',
      contextLabel: 'Historic Timber Windows · Continuous',
      costTier: 'Low cost',
      steps:
        'Fit replaceable G4/F7 anti-smog filter strips inside window air inlets and seal drafty casements with removable silicone V-strips.',
      personalImpactSummary: '-38% incoming coal-smoke particulates',
      communityImpactSummary: 'Lowers building district-heat load',
      whyItWorks:
        'Anti-smog inlet membranes trap coarse soot and benzo[a]pyrene particles before air enters living rooms.',
      exposureReductionPct: 30,
      weeklyCo2eAvoidedKg: 2.8,
      weeklyPm25AvoidedGrams: 2.5,
    },
    {
      id: 'kr-c1',
      category: 'community',
      title: 'Connect neighbors to municipal clean-heat subsidy & stove-swap clinics',
      contextLabel: 'District Community · Monthly',
      costTier: 'Shared investment',
      steps:
        'Share municipal heat-pump / district-connection grant application help with adjacent peri-urban households still burning damp wood or coal.',
      personalImpactSummary: 'Lowers whole-block evening smoke odor',
      communityImpactSummary: '-42.0 kg CO2e/wk · -65.0 g PM2.5/wk per home swapped',
      whyItWorks:
        'Replacing one older solid-fuel stove cuts neighborhood winter PM2.5 by more than removing 25 passenger cars.',
      exposureReductionPct: 16,
      weeklyCo2eAvoidedKg: 42.0,
      weeklyPm25AvoidedGrams: 65.0,
    },
  ],
};
