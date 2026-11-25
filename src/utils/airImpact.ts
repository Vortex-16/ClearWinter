/**
 * Domain calculation barrel aggregating AQI classification, exposure/dose modeling,
 * and action filtering/validation helpers.
 */
export { classifyAqiBand, estimatePm25FromAqi } from './aqiClassification';
export {
  buildHourlyInversionCurve,
  buildLongTermExposureProjection,
  calculateImpactSummary,
  getBaselineInfiltrationFactor,
} from './exposureModels';
export { filterActions, validateProfileInput } from './actionFilters';
