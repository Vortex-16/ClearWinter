import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REGIONAL_PRESETS } from '../data/presets';
import { calculateImpactSummary } from '../utils/airImpact';
import { ImpactStrip } from './ImpactStrip';

describe('ImpactStrip and ExposureProjectionChart components', () => {
  const preset = REGIONAL_PRESETS[0];

  it('displays formatted exposure metrics and 12-week Recharts projection when habits are adopted', () => {
    const impact = calculateImpactSummary(preset.actions, preset.defaultAdoptedIds, preset.profile);
    render(<ImpactStrip profile={preset.profile} impact={impact} />);

    expect(screen.getByTestId('metric-exposure-cut')).toHaveTextContent(`-${impact.exposureReductionPct}%`);
    expect(screen.getByTestId('metric-co2e-avoided')).toHaveTextContent(
      `${impact.weeklyCo2eAvoidedKg.toFixed(1)} kg`,
    );
    expect(screen.getByTestId('metric-pm25-prevented')).toHaveTextContent(
      `${impact.weeklyPm25AvoidedGrams.toFixed(1)} g`,
    );
    expect(screen.getByTestId('exposure-projection-chart')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Projected 12-Week Winter Smog Exposure Reduction' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('projection-avoided-mg')).not.toHaveTextContent('-0.0 mg');
  });

  it('displays an adoption callout banner when zero actions are adopted', () => {
    const zeroImpact = calculateImpactSummary(preset.actions, [], preset.profile);
    render(<ImpactStrip profile={preset.profile} impact={zeroImpact} />);

    expect(screen.getByTestId('metric-exposure-cut')).toHaveTextContent('-0%');
    expect(screen.getByTestId('projection-avoided-mg')).toHaveTextContent('-0.0 mg');
    expect(screen.getByText(/No habits are currently adopted/i)).toBeInTheDocument();
  });
});
