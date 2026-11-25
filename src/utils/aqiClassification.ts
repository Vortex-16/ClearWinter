import type { AqiClassification } from '../types/air';

/** Maps a numeric US AQI score to its severity band, health advisory, and accessible Tailwind tokens. */
export function classifyAqiBand(aqi: number): AqiClassification {
  const safeAqi = Math.max(0, Math.round(aqi));

  if (safeAqi <= 50) {
    return {
      severity: 'Good',
      advisory:
        'Air quality poses little risk. Normal outdoor movement and natural ventilation are safe.',
      textColorClass: 'text-emerald-700',
      surfaceClass: 'bg-emerald-50',
      borderColorClass: 'border-emerald-200',
      dotColorClass: 'bg-emerald-600',
    };
  }
  if (safeAqi <= 100) {
    return {
      severity: 'Moderate',
      advisory:
        'Acceptable air quality; unusually sensitive individuals should limit prolonged roadside exertion.',
      textColorClass: 'text-amber-700',
      surfaceClass: 'bg-amber-50',
      borderColorClass: 'border-amber-200',
      dotColorClass: 'bg-amber-600',
    };
  }
  if (safeAqi <= 150) {
    return {
      severity: 'Sensitive',
      advisory:
        'Children, elders, and adults with asthma should shift vigorous outdoor exercise indoors.',
      textColorClass: 'text-amber-800',
      surfaceClass: 'bg-amber-50',
      borderColorClass: 'border-amber-300',
      dotColorClass: 'bg-amber-600',
    };
  }
  if (safeAqi <= 200) {
    return {
      severity: 'Unhealthy',
      advisory:
        'Thermal inversion traps emissions near street level. Wear N95/FFP2 masks outside and run HEPA filtration.',
      textColorClass: 'text-red-700',
      surfaceClass: 'bg-red-50',
      borderColorClass: 'border-red-200',
      dotColorClass: 'bg-red-600',
    };
  }
  if (safeAqi <= 300) {
    return {
      severity: 'Very Unhealthy',
      advisory:
        'Severe winter smog alert. Keep windows sealed during peak inversion hours and avoid solo combustion trips.',
      textColorClass: 'text-red-800',
      surfaceClass: 'bg-red-50',
      borderColorClass: 'border-red-300',
      dotColorClass: 'bg-red-700',
    };
  }
  return {
    severity: 'Hazardous',
    advisory:
      'Emergency particulate load. Maintain clean-air sanctuary rooms indoors and eliminate all non-essential combustion.',
    textColorClass: 'text-red-900',
    surfaceClass: 'bg-red-100',
    borderColorClass: 'border-red-300',
    dotColorClass: 'bg-red-800',
  };
}

/**
 * Estimates ambient PM2.5 concentration (µg/m³) from US EPA AQI linear breakpoints.
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
