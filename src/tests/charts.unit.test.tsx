import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestImpact, createTestProfile } from '../test/factories';
import type {
  HourlySmogPoint,
  HouseholdProfile,
  ImpactSummary,
  LongTermProjectionSummary,
} from '../types/air';

const { mockBuildLongTermExposureProjection, mockBuildHourlyInversionCurve } = vi.hoisted(() => ({
  mockBuildLongTermExposureProjection:
    vi.fn<
      (
        impact: ImpactSummary,
        profile: HouseholdProfile,
        weeks?: number,
      ) => LongTermProjectionSummary
    >(),
  mockBuildHourlyInversionCurve: vi.fn<(baseAqi: number) => HourlySmogPoint[]>(),
}));

vi.mock('../utils/airImpact', () => ({
  buildLongTermExposureProjection: mockBuildLongTermExposureProjection,
  buildHourlyInversionCurve: mockBuildHourlyInversionCurve,
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <svg data-testid={`icon-${name}`} {...props} />;
    };
  return {
    Clock: icon('Clock'),
    TrendingDown: icon('TrendingDown'),
  };
});

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  ),
  AreaChart: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data?: LongTermProjectionSummary['points'];
  }) => (
    <div data-testid="recharts-area-chart" data-point-count={data?.length ?? 0}>
      {children}
    </div>
  ),
  CartesianGrid: () => <div data-testid="recharts-grid" />,
  XAxis: ({ dataKey }: { dataKey?: string }) => (
    <div data-testid="recharts-xaxis" data-key={dataKey} />
  ),
  YAxis: ({ tickFormatter }: { tickFormatter?: (val: number) => string }) => (
    <div data-testid="recharts-yaxis">{tickFormatter ? tickFormatter(123.6) : ''}</div>
  ),
  Tooltip: ({ content }: { content?: ReactElement<{ active?: boolean; payload?: unknown[] }> }) => {
    if (!isValidElement(content)) {
      return null;
    }
    const samplePayload = [
      {
        payload: {
          weekNumber: 6,
          weekLabel: 'W6',
          baselineCumulativeMg: 102.4,
          projectedCumulativeMg: 58.1,
          avoidedCumulativeMg: 44.3,
        },
      },
    ];
    return (
      <div data-testid="recharts-tooltip-probe">
        <div data-testid="tooltip-inactive">
          {cloneElement(content, { active: false, payload: samplePayload })}
        </div>
        <div data-testid="tooltip-active">
          {cloneElement(content, { active: true, payload: samplePayload })}
        </div>
      </div>
    );
  },
  Area: ({ dataKey, name }: { dataKey?: string; name?: string }) => (
    <div data-testid={`recharts-area-${dataKey}`} data-name={name} />
  ),
}));

import { DiurnalSmogChart } from '../components/DiurnalSmogChart';
import { ExposureProjectionChart } from '../components/ExposureProjectionChart';

const MOCK_PROFILE = createTestProfile({
  city: 'Lahore, Pakistan',
  aqi: 285,
  housingType: 'Older apartment with drafty windows',
});
const MOCK_IMPACT = createTestImpact();
const MOCK_PROJECTION: LongTermProjectionSummary = {
  points: [
    {
      weekNumber: 1,
      weekLabel: 'W1',
      baselineCumulativeMg: 14.0,
      projectedCumulativeMg: 8.4,
      avoidedCumulativeMg: 5.6,
    },
    {
      weekNumber: 12,
      weekLabel: 'W12',
      baselineCumulativeMg: 190.2,
      projectedCumulativeMg: 99.1,
      avoidedCumulativeMg: 91.1,
    },
  ],
  totalBaselineMg: 190.2,
  totalProjectedMg: 99.1,
  totalAvoidedMg: 91.1,
  seasonalCo2eAvoidedKg: 180.0,
  seasonalPm25PreventedGrams: 216.0,
};

const MOCK_CURVE: HourlySmogPoint[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  label:
    hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
  pm25: hour === 8 ? 310.5 : hour === 14 ? 120.2 : 200.0,
  aqi: hour === 8 ? 360 : hour === 14 ? 148 : 220,
  ventilationSafe: hour >= 13 && hour <= 15,
  phaseLabel:
    hour >= 7 && hour <= 10
      ? 'Morning commute + shallow cold trap'
      : hour >= 13 && hour <= 15
        ? 'Peak solar mixing · Best ventilation window'
        : 'Stable inversion layer',
}));

describe('Chart components unit tests (mocked Recharts & airImpact)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildLongTermExposureProjection.mockReturnValue(MOCK_PROJECTION);
    mockBuildHourlyInversionCurve.mockReturnValue(MOCK_CURVE);
  });

  describe('ExposureProjectionChart', () => {
    it('renders seasonal KPIs, Recharts series, custom tooltip states, and zero-adopted prompt', () => {
      const { rerender } = render(
        <ExposureProjectionChart profile={MOCK_PROFILE} impact={MOCK_IMPACT} />,
      );

      expect(mockBuildLongTermExposureProjection).toHaveBeenCalledWith(
        MOCK_IMPACT,
        MOCK_PROFILE,
        12,
      );
      expect(screen.getByTestId('projection-avoided-mg')).toHaveTextContent('-91.1 mg');
      expect(screen.getByText('180.0 kg')).toBeInTheDocument();
      expect(screen.getByText('216.0 g')).toBeInTheDocument();
      expect(screen.getByTestId('recharts-area-chart')).toHaveAttribute('data-point-count', '2');
      expect(screen.getByTestId('recharts-yaxis')).toHaveTextContent('124mg');

      expect(screen.getByTestId('tooltip-inactive')).toBeEmptyDOMElement();
      const activeTooltip = screen.getByTestId('tooltip-active');
      expect(activeTooltip).toHaveTextContent('Week 6 Cumulative Dose');
      expect(activeTooltip).toHaveTextContent('102.4 mg');
      expect(activeTooltip).toHaveTextContent('58.1 mg');
      expect(activeTooltip).toHaveTextContent('-44.3 mg');

      rerender(
        <ExposureProjectionChart
          profile={MOCK_PROFILE}
          impact={{ ...MOCK_IMPACT, adoptedCount: 0, exposureReductionPct: 0 }}
        />,
      );
      expect(screen.getByText(/No habits are currently adopted/i)).toBeInTheDocument();
    });
  });

  describe('DiurnalSmogChart', () => {
    it('renders 24 hourly bars, defaults to 2 PM selection, and updates readout on click', async () => {
      const user = userEvent.setup();

      render(
        <DiurnalSmogChart
          aqi={285}
          bestVentilationWindow="1:30 PM – 3:30 PM (afternoon clearing)"
        />,
      );

      expect(mockBuildHourlyInversionCurve).toHaveBeenCalledWith(285);
      expect(screen.getAllByRole('button')).toHaveLength(24);
      expect(screen.getByText(/Best Window: 1:30 PM – 3:30 PM/i)).toBeInTheDocument();

      const afternoonBtn = screen.getByRole('button', {
        name: /2 PM: 120.2 micrograms per cubic meter/i,
      });
      expect(afternoonBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Peak solar mixing · Best ventilation window')).toBeInTheDocument();

      const morningBtn = screen.getByRole('button', {
        name: /8 AM: 310.5 micrograms per cubic meter/i,
      });
      await user.click(morningBtn);

      expect(morningBtn).toHaveAttribute('aria-pressed', 'true');
      expect(afternoonBtn).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Morning commute + shallow cold trap')).toBeInTheDocument();
    });
  });
});
