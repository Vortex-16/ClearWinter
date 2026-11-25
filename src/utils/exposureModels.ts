import type {
  AirAction,
  HourlySmogPoint,
  HouseholdProfile,
  ImpactSummary,
  LongTermProjectionPoint,
  LongTermProjectionSummary,
} from '../types/air';
import { estimatePm25FromAqi } from './aqiClassification';

/**
 * Unmitigated older/drafty homes infiltrate ~68% of outdoor winter PM2.5;
 * sealed modern apartments infiltrate ~52%.
 */
export function getBaselineInfiltrationFactor(housingType: string): number {
  return housingType.toLowerCase().includes('modern') ? 0.52 : 0.68;
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
    1.14, 1.08, 1.04, 1.02, 1.05, 1.12, 1.24, 1.36, 1.42, 1.31, 1.08, 0.86, 0.72, 0.62, 0.58, 0.63,
    0.74, 0.92, 1.12, 1.28, 1.38, 1.36, 1.29, 1.21,
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

/** Computes ambient vs. estimated indoor PM2.5, cumulative exposure reduction, and weekly savings. */
export function calculateImpactSummary(
  actions: AirAction[],
  adoptedIds: string[],
  profile: HouseholdProfile,
): ImpactSummary {
  const adoptedSet = new Set(adoptedIds);
  const adoptedActions = actions.filter((action) => adoptedSet.has(action.id));
  const outdoorPm25 = estimatePm25FromAqi(profile.aqi);

  // Combine reductions multiplicatively to reflect realistic diminishing returns, capped at 82%.
  const remainingExposureFraction = adoptedActions.reduce((acc, action) => {
    const stepReduction = Math.min(0.6, Math.max(0, action.exposureReductionPct / 100));
    return acc * (1 - stepReduction * 0.65);
  }, 1);

  const rawReductionPct = Math.round((1 - remainingExposureFraction) * 100);
  const exposureReductionPct = Math.min(82, Math.max(0, rawReductionPct));

  const baselineIndoorPm25 = outdoorPm25 * getBaselineInfiltrationFactor(profile.housingType);
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
  const unmitigatedIndoorPm25 =
    impact.outdoorPm25 * getBaselineInfiltrationFactor(profile.housingType);
  const weeklyAirCubicMeters = 98; // ~14 m³/day typical household member breathing rate

  // Seasonal mid-winter severity curve across 12 weeks (peaks mid-winter weeks 4-8)
  const seasonalMultipliers = [
    0.85, 0.92, 1.0, 1.08, 1.15, 1.18, 1.14, 1.08, 1.0, 0.92, 0.86, 0.82,
  ];

  const targetReductionFraction = Math.min(0.82, Math.max(0, impact.exposureReductionPct / 100));

  let cumulativeBaseline = 0;
  let cumulativeProjected = 0;
  const points: LongTermProjectionPoint[] = [];

  for (let i = 0; i < safeWeeks; i++) {
    const weekNumber = i + 1;
    const seasonalMult = seasonalMultipliers[i % seasonalMultipliers.length];
    const weeklyBaselineMg = (unmitigatedIndoorPm25 * seasonalMult * weeklyAirCubicMeters) / 1000;

    // Week 1 ramps up to 80% of target reduction as sealing/habits settle; Week 2+ hits full cut.
    const rampFactor = i === 0 ? 0.8 : 1.0;
    const weeklyProjectedMg = weeklyBaselineMg * (1 - targetReductionFraction * rampFactor);

    cumulativeBaseline += weeklyBaselineMg;
    cumulativeProjected += weeklyProjectedMg;

    const baselineRounded = Number(cumulativeBaseline.toFixed(1));
    const projectedRounded = Number(cumulativeProjected.toFixed(1));

    points.push({
      weekNumber,
      weekLabel: `W${weekNumber}`,
      baselineCumulativeMg: baselineRounded,
      projectedCumulativeMg: projectedRounded,
      avoidedCumulativeMg: Number(Math.max(0, baselineRounded - projectedRounded).toFixed(1)),
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
