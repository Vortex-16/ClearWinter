import type {
  ActionCategory,
  AdoptionFilter,
  AirAction,
  AqiClassification,
  HourlySmogPoint,
  HouseholdProfile,
  ImpactSummary,
  LongTermProjectionPoint,
  LongTermProjectionSummary,
  ProfileValidationErrors,
} from '../types/air';

/** Maps a numeric US AQI score to its severity band, health advisory, and accessible Tailwind tokens. */
export function classifyAqiBand(aqi: number): AqiClassification {
  const safeAqi = Math.max(0, Math.round(aqi));

  if (safeAqi <= 50) {
    return {
      severity: 'Good',
      advisory: 'Air quality poses little risk. Normal outdoor movement and natural ventilation are safe.',
      textColorClass: 'text-emerald-700',
      surfaceClass: 'bg-emerald-50',
      borderColorClass: 'border-emerald-200',
      dotColorClass: 'bg-emerald-600',
    };
  }
  if (safeAqi <= 100) {
    return {
      severity: 'Moderate',
      advisory: 'Acceptable air quality; unusually sensitive individuals should limit prolonged roadside exertion.',
      textColorClass: 'text-amber-700',
      surfaceClass: 'bg-amber-50',
      borderColorClass: 'border-amber-200',
      dotColorClass: 'bg-amber-600',
    };
  }
  if (safeAqi <= 150) {
    return {
      severity: 'Sensitive',
      advisory: 'Children, elders, and adults with asthma should shift vigorous outdoor exercise indoors.',
      textColorClass: 'text-amber-800',
      surfaceClass: 'bg-amber-50',
      borderColorClass: 'border-amber-300',
      dotColorClass: 'bg-amber-600',
    };
  }
  if (safeAqi <= 200) {
    return {
      severity: 'Unhealthy',
      advisory: 'Thermal inversion traps emissions near street level. Wear N95/FFP2 masks outside and run HEPA filtration.',
      textColorClass: 'text-red-700',
      surfaceClass: 'bg-red-50',
      borderColorClass: 'border-red-200',
      dotColorClass: 'bg-red-600',
    };
  }
  if (safeAqi <= 300) {
    return {
      severity: 'Very Unhealthy',
      advisory: 'Severe winter smog alert. Keep windows sealed during peak inversion hours and avoid solo combustion trips.',
      textColorClass: 'text-red-800',
      surfaceClass: 'bg-red-50',
      borderColorClass: 'border-red-300',
      dotColorClass: 'bg-red-700',
    };
  }
  return {
    severity: 'Hazardous',
    advisory: 'Emergency particulate load. Maintain clean-air sanctuary rooms indoors and eliminate all non-essential combustion.',
    textColorClass: 'text-red-900',
    surfaceClass: 'bg-red-100',
    borderColorClass: 'border-red-300',
    dotColorClass: 'bg-red-800',
  };
}

/**
 * Estimates ambient PM2.5 concentration (ug/m3) from US EPA AQI breakpoints.
 */
export function estimatePm25FromAqi(aqi: number): number {
  const clamped = Math.max(0, Math.min(500, aqi));

  const breakpoints: Array<[number, number, number, number]> = [
    [0, 50, 0.0, 12.0],
    [51, 100, 12.1, 35.4],
    [101, 150, 35.5, 55.4],
    [151, 200, 55.5, 150.4],
    [201, 300, 150.5, 250.4],
    [301, 500, 250.5, 500.4],
  ];

  for (const [iLow, iHigh, cLow, cHigh] of breakpoints) {
    if (clamped <= iHigh) {
      const ratio = (clamped - iLow) / Math.max(1, iHigh - iLow);
      return Number((cLow + ratio * (cHigh - cLow)).toFixed(1));
    }
  }
  return 500.4;
}

/**
 * Generates a realistic 24-hour winter thermal inversion PM2.5 profile.
 * Morning rush + cold shallow boundary layer peaks around 8-9 AM;
 * Midday solar mixing briefly opens a lower-particulate ventilation window (1-4 PM);
 * Evening heating + commute inversion rebounds after 7 PM.
 */
export function buildHourlyInversionCurve(baseAqi: number): HourlySmogPoint[] {
  const basePm25 = estimatePm25FromAqi(baseAqi);
  const multipliers = [
    1.14, 1.08, 1.04, 1.02, 1.05, 1.12,
    1.24, 1.36, 1.42, 1.31, 1.08, 0.86,
    0.72, 0.62, 0.58, 0.63, 0.74, 0.92,
    1.12, 1.28, 1.38, 1.36, 1.29, 1.21,
  ];

  return multipliers.map((mult, hour) => {
    const pm25 = Number((basePm25 * mult).toFixed(1));
    const approxAqi = Math.min(500, Math.round(baseAqi * mult));
    const ventilationSafe = hour >= 13 && hour <= 15;
    const formattedHour =
      hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

    let phaseLabel = 'Stable inversion layer';
    if (hour >= 7 && hour <= 10) {
      phaseLabel = 'Morning commute + shallow cold trap';
    } else if (ventilationSafe) {
      phaseLabel = 'Peak solar mixing · Best ventilation window';
    } else if (hour >= 19 && hour <= 23) {
      phaseLabel = 'Evening heating + nocturnal inversion';
    }

    return {
      hour,
      label: formattedHour,
      pm25,
      aqi: approxAqi,
      ventilationSafe,
      phaseLabel,
    };
  });
}

/**
 * Unmitigated older/drafty homes infiltrate ~68% of outdoor winter PM2.5;
 * sealed modern apartments infiltrate ~52%.
 */
export function getBaselineInfiltrationFactor(housingType: string): number {
  return housingType.toLowerCase().includes('modern') ? 0.52 : 0.68;
}

/** Computes ambient vs. estimated indoor PM2.5, cumulative exposure reduction, and weekly savings. */
export function calculateImpactSummary(
  actions: AirAction[],
  adoptedIds: string[],
  profile: HouseholdProfile,
): ImpactSummary {
  const adoptedSet = new Set(adoptedIds);
  const adoptedActions = actions.filter((action) => adoptedSet.has(action.id));

  const outdoorPm25 = estimatePm25FromAqi(profile.aqi);

  // Combine exposure reductions multiplicatively to reflect diminishing returns realistically,
  // capped at 82% maximum indoor/personal reduction.
  const remainingExposureFraction = adoptedActions.reduce((acc, action) => {
    const stepReduction = Math.min(0.6, Math.max(0, action.exposureReductionPct / 100));
    return acc * (1 - stepReduction * 0.65);
  }, 1);

  const rawReductionPct = Math.round((1 - remainingExposureFraction) * 100);
  const exposureReductionPct = Math.min(82, Math.max(0, rawReductionPct));

  const baselineInfiltration = getBaselineInfiltrationFactor(profile.housingType);
  const baselineIndoorPm25 = outdoorPm25 * baselineInfiltration;
  const estimatedIndoorPm25 = Number(
    Math.max(4.0, baselineIndoorPm25 * (1 - exposureReductionPct / 100)).toFixed(1),
  );

  const weeklyCo2eAvoidedKg = Number(
    adoptedActions.reduce((sum, item) => sum + item.weeklyCo2eAvoidedKg, 0).toFixed(1),
  );
  const weeklyPm25AvoidedGrams = Number(
    adoptedActions.reduce((sum, item) => sum + item.weeklyPm25AvoidedGrams, 0).toFixed(1),
  );

  return {
    outdoorPm25,
    estimatedIndoorPm25,
    exposureReductionPct,
    weeklyCo2eAvoidedKg,
    weeklyPm25AvoidedGrams,
    adoptedCount: adoptedActions.length,
    totalCount: actions.length,
  };
}

/** Filters actions by workspace category, adoption status, and multi-field keyword search. */
export function filterActions(
  actions: AirAction[],
  category: ActionCategory,
  statusFilter: AdoptionFilter,
  adoptedIds: string[],
  searchQuery: string,
): AirAction[] {
  const adoptedSet = new Set(adoptedIds);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return actions.filter((action) => {
    if (action.category !== category) {
      return false;
    }
    const isAdopted = adoptedSet.has(action.id);
    if (statusFilter === 'adopted' && !isAdopted) {
      return false;
    }
    if (statusFilter === 'pending' && isAdopted) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      action.title,
      action.contextLabel,
      action.steps,
      action.personalImpactSummary,
      action.communityImpactSummary,
      action.whyItWorks,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

/** Validates household city and AQI range (1–500) prior to local update or AI plan requests. */
export function validateProfileInput(profile: HouseholdProfile): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  if (!profile.city.trim()) {
    errors.city = 'Enter a city or neighborhood name so advice matches local winter conditions.';
  } else if (profile.city.trim().length < 2) {
    errors.city = 'City name must be at least 2 characters.';
  }

  if (!Number.isFinite(profile.aqi) || profile.aqi < 1 || profile.aqi > 500) {
    errors.aqi = 'Enter a valid AQI value between 1 and 500.';
  }

  return errors;
}

/**
 * Projects cumulative 12-week winter smog inhaled PM2.5 dose (mg) comparing
 * unmitigated baseline indoor infiltration against the household's adopted plan.
 */
export function buildLongTermExposureProjection(
  impact: ImpactSummary,
  profile: HouseholdProfile,
  weeks = 12,
): LongTermProjectionSummary {
  const safeWeeks = Math.max(4, Math.min(24, Math.round(weeks)));
  const baselineInfiltration = getBaselineInfiltrationFactor(profile.housingType);
  const unmitigatedIndoorPm25 = impact.outdoorPm25 * baselineInfiltration;
  const weeklyAirCubicMeters = 98; // ~14 m3/day typical household member breathing rate

  // Seasonal mid-winter severity curve across 12 weeks (peaks mid-winter weeks 4-8)
  const seasonalMultipliers = [
    0.85, 0.92, 1.0, 1.08, 1.15, 1.18,
    1.14, 1.08, 1.0, 0.92, 0.86, 0.82,
  ];

  const targetReductionFraction = Math.min(0.82, Math.max(0, impact.exposureReductionPct / 100));

  let cumulativeBaseline = 0;
  let cumulativeProjected = 0;
  const points: LongTermProjectionPoint[] = [];

  for (let i = 0; i < safeWeeks; i++) {
    const weekNumber = i + 1;
    const seasonalMult = seasonalMultipliers[i % seasonalMultipliers.length];
    const weeklyBaselineMg = (unmitigatedIndoorPm25 * seasonalMult * weeklyAirCubicMeters) / 1000;

    // Week 1 ramps up to 80% of target reduction as sealing/habits settle; Week 2+ achieves full reduction
    const rampFactor = i === 0 ? 0.8 : 1.0;
    const effectiveReduction = targetReductionFraction * rampFactor;
    const weeklyProjectedMg = weeklyBaselineMg * (1 - effectiveReduction);

    cumulativeBaseline += weeklyBaselineMg;
    cumulativeProjected += weeklyProjectedMg;

    const baselineRounded = Number(cumulativeBaseline.toFixed(1));
    const projectedRounded = Number(cumulativeProjected.toFixed(1));
    const avoidedRounded = Number(Math.max(0, baselineRounded - projectedRounded).toFixed(1));

    points.push({
      weekNumber,
      weekLabel: `W${weekNumber}`,
      baselineCumulativeMg: baselineRounded,
      projectedCumulativeMg: projectedRounded,
      avoidedCumulativeMg: avoidedRounded,
    });
  }

  const last = points[points.length - 1];

  return {
    points,
    totalBaselineMg: last.baselineCumulativeMg,
    totalProjectedMg: last.projectedCumulativeMg,
    totalAvoidedMg: last.avoidedCumulativeMg,
    seasonalCo2eAvoidedKg: Number((impact.weeklyCo2eAvoidedKg * safeWeeks).toFixed(1)),
    seasonalPm25PreventedGrams: Number((impact.weeklyPm25AvoidedGrams * safeWeeks).toFixed(1)),
  };
}

