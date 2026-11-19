import type { RegionalPreset } from '../types/air';

export const REGIONAL_PRESETS: RegionalPreset[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
        title: 'Replace unvented gas room heaters with layered thermal bedding & safe electric throws',
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
  },
];
