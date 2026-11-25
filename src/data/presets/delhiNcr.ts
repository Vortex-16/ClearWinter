import type { RegionalPreset } from '../../types/air';

/** Winter inversion scenario preset for Delhi NCR, India (hazardous seasonal particulate load). */
export const DELHI_NCR_PRESET: RegionalPreset = {
  id: 'delhi-ncr',
  label: 'Delhi NCR',
  seasonNote: 'Post-harvest inversion & morning traffic haze',
  profile: {
    city: 'Delhi NCR, India',
    aqi: 312,
    householdType: 'Family with young children & elders',
    heatingSource: 'Portable electric room heaters',
    commuteMode: 'Metro + short car school drop-off',
    housingType: 'Older apartment with balcony doors',
    priorities: [
      'Protect children & elders',
      'Cut indoor cooking & dust spikes',
      'Zero-car school runs',
    ],
  },
  bestVentilationWindow: '1:30 PM – 3:30 PM (when boundary layer rises briefly)',
  impactNarrative:
    'At AQI 312, cold night air traps vehicle exhaust and regional smoke within 200 meters of the street. Combining afternoon-only cross-ventilation with HEPA filtration in sleeping zones cuts family PM2.5 inhalation by over half while replacing short cold-start car trips prevents concentrated curbside diesel emissions.',
  defaultAdoptedIds: ['r-1', 'i-1', 'c-1'],
  actions: [
    {
      id: 'r-1',
      category: 'routine',
      title: 'Shift outdoor errands and school walks to midday solar mixing',
      contextLabel: 'Daily Routine · 1:00 PM – 3:30 PM',
      costTier: 'Zero cost',
      steps:
        'Keep early-morning (6:30–10:00 AM) movement indoors or masked. Consolidate grocery, pharmacy, and park visits into the early afternoon window when sun warmth lifts the inversion lid.',
      personalImpactSummary: '-41% peak inhaled PM2.5 dose',
      communityImpactSummary: 'Reduces rush-hour congestion idling',
      whyItWorks:
        'Winter morning inversions trap overnight particulates right at breathing height; afternoon heating disperses ground concentrations by 35–50%.',
      exposureReductionPct: 24,
      weeklyCo2eAvoidedKg: 1.8,
      weeklyPm25AvoidedGrams: 3.4,
    },
    {
      id: 'r-2',
      category: 'routine',
      title: 'Replace solo cold-start school car runs with Metro + walking bus',
      contextLabel: 'Morning Commute · Mon–Fri',
      costTier: 'Zero cost',
      steps:
        'Eliminate sub-3 km petrol/diesel car errands where catalytic converters never warm up. Pair with two neighbor parents for a masked walk or e-rickshaw transfer to the nearest Metro station.',
      personalImpactSummary: 'Lowers cabin NO2 exposure by 30%',
      communityImpactSummary: '-11.4 kg CO2e/wk · -14.2 g PM2.5/wk',
      whyItWorks:
        'A cold engine emits up to 4x more unburned hydrocarbons and fine soot in its first 5 minutes; removing two daily short trips prevents high-toxicity curbside plumes near school gates.',
      exposureReductionPct: 12,
      weeklyCo2eAvoidedKg: 11.4,
      weeklyPm25AvoidedGrams: 14.2,
    },
    {
      id: 'r-3',
      category: 'routine',
      title: 'Batch-cook high-smoke meals with closed-door exhaust discipline',
      contextLabel: 'Kitchen Routine · Evening',
      costTier: 'Zero cost',
      steps:
        'Cook high-heat frying or tadka dishes in 2–3 day batches using lids and the chimney hood on medium-high 5 minutes before ignition, keeping the kitchen door shut from living areas.',
      personalImpactSummary: '-48 µg/m³ indoor evening spike',
      communityImpactSummary: '-1.6 kg CO2e/wk from lower gas burn',
      whyItWorks:
        'Unvented indoor cooking during sealed winter evenings routinely pushes kitchen PM2.5 above 400 µg/m³—higher than outdoor smog—and lingers for hours without capture.',
      exposureReductionPct: 19,
      weeklyCo2eAvoidedKg: 1.6,
      weeklyPm25AvoidedGrams: 2.1,
    },
    {
      id: 'r-4',
      category: 'routine',
      title: 'Run damp-mop floor cleaning instead of dry sweeping',
      contextLabel: 'Home Maintenance · 3x Weekly',
      costTier: 'Zero cost',
      steps:
        'Switch from brooms and unsealed vacuums to microfiber damp mopping every other afternoon so settled soot and road dust are captured rather than resuspended at child breathing height.',
      personalImpactSummary: '-22% coarse & fine resuspension',
      communityImpactSummary: 'Zero added chemical aerosol VOCs',
      whyItWorks:
        'Dry sweeping launches settled PM10 and heavy-metal street dust back into the air column for 2–4 hours.',
      exposureReductionPct: 10,
      weeklyCo2eAvoidedKg: 0.4,
      weeklyPm25AvoidedGrams: 0.9,
    },
    {
      id: 'i-1',
      category: 'indoor',
      title: 'Create a sealed Clean-Air Bedroom Sanctuary with MERV-13 / HEPA',
      contextLabel: 'Sleeping Zones · Nighttime (10 PM – 7 AM)',
      costTier: 'Low cost',
      steps:
        'Run a true HEPA purifier (or 4-filter Corsi-Rosenthal box fan) continuously in bedrooms with doors closed. Seal window gaps with adhesive EPDM foam weatherstripping.',
      personalImpactSummary: '-62% overnight sleeping PM2.5 load',
      communityImpactSummary: 'Uses ~38W LED-equivalent draw',
      whyItWorks:
        'Families spend 8–9 continuous hours asleep when nocturnal inversion peaks; filtering one sealed bedroom gives lungs daily recovery time at <35 µg/m³.',
      exposureReductionPct: 38,
      weeklyCo2eAvoidedKg: 0.5,
      weeklyPm25AvoidedGrams: 1.1,
    },
    {
      id: 'i-2',
      category: 'indoor',
      title: 'Install under-door draft sweeps and wet-towel balcony seals',
      contextLabel: 'Living Room Perimeter · Continuous',
      costTier: 'Low cost',
      steps:
        'Fit silicone sweeps under main entry and balcony sliding doors. Close exhaust fan dampers when not cooking so negative pressure does not suck street smog through cracks.',
      personalImpactSummary: '-28% outdoor infiltration rate',
      communityImpactSummary: '-3.2 kg CO2e/wk from retained heat',
      whyItWorks:
        'Cutting air leakage keeps both indoor warmth and filtered air inside, reducing the runtime needed from space heaters and purifiers alike.',
      exposureReductionPct: 16,
      weeklyCo2eAvoidedKg: 3.2,
      weeklyPm25AvoidedGrams: 2.8,
    },
    {
      id: 'i-3',
      category: 'indoor',
      title: 'Eliminate indoor incense, candles, and mosquito coils during smog days',
      contextLabel: 'All Rooms · Winter Alert Days',
      costTier: 'Zero cost',
      steps:
        'Pause all indoor open-flame scents and coils whenever AQI exceeds 150. Switch to plug-in ultrasonic or net barriers for insects and bowl-steamed citrus/clove simmer pots.',
      personalImpactSummary: '-35 µg/m³ ultrafine indoor soot',
      communityImpactSummary: 'Eliminates zero-filtration indoor smoke',
      whyItWorks:
        'A single incense stick or paraffin candle in a closed winter room emits PM2.5 equivalent to heavy urban traffic.',
      exposureReductionPct: 14,
      weeklyCo2eAvoidedKg: 0.3,
      weeklyPm25AvoidedGrams: 4.5,
    },
    {
      id: 'c-1',
      category: 'community',
      title: 'Organize a 4-family electric/transit school carpool rotation',
      contextLabel: 'Neighborhood Network · School Days',
      costTier: 'Shared investment',
      steps:
        'Coordinate 3 nearby households via a shared pickup schedule so one EV or CNG vehicle (or parent-led Metro group) replaces four separate daily cars.',
      personalImpactSummary: 'Cuts morning curb wait exposure',
      communityImpactSummary: '-18.5 kg CO2e/wk · -21.0 g PM2.5/wk',
      whyItWorks:
        'School drop-off zones create localized micro-hotspots of brake dust and tailpipe PM2.5; pooling cuts perimeter vehicles by 75%.',
      exposureReductionPct: 8,
      weeklyCo2eAvoidedKg: 18.5,
      weeklyPm25AvoidedGrams: 21.0,
    },
    {
      id: 'c-2',
      category: 'community',
      title: 'Start a community DIY Corsi-Rosenthal filter build for local classrooms',
      contextLabel: 'School & Elder Center · Weekend Workshop',
      costTier: 'Shared investment',
      steps:
        'Pool Rs 3,500 ($42) per classroom with parents to assemble 20-inch box fans with four MERV-13 filters and duct tape—delivering 450+ CFM clean air at 1/5th commercial purifier cost.',
      personalImpactSummary: '-55% classroom daytime PM2.5',
      communityImpactSummary: 'Protects 30+ children per unit',
      whyItWorks:
        'Four-sided MERV-13 cubes capture 85%+ of PM2.5 particles on a single pass without expensive proprietary replacement cartridges.',
      exposureReductionPct: 18,
      weeklyCo2eAvoidedKg: 1.2,
      weeklyPm25AvoidedGrams: 6.4,
    },
    {
      id: 'c-3',
      category: 'community',
      title: 'Replace open leaf & garden waste burning with shared compost bins',
      contextLabel: 'Resident Association · Weekly',
      costTier: 'Shared investment',
      steps:
        'Supply night security guards and grounds staff with electric kettles, thermal blankets, and two aerated leaf-compost drums so winter leaves are never burned for warmth or disposal.',
      personalImpactSummary: 'Stops acrid evening smoke drift',
      communityImpactSummary: '-9.2 kg CO2e/wk · -38.0 g PM2.5/wk',
      whyItWorks:
        'Smoldering biomass fires emit 10–20x more PM2.5 per kilogram than regulated engines and trigger severe neighborhood asthma spikes.',
      exposureReductionPct: 14,
      weeklyCo2eAvoidedKg: 9.2,
      weeklyPm25AvoidedGrams: 38.0,
    },
  ],
};
