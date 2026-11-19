import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ActionCategory,
  AdoptionFilter,
  AirAction,
  AqiClassification,
  HouseholdProfile,
  ImpactSummary,
} from '../types/air';

const { mockClassifyAqiBand, mockFilterActions } = vi.hoisted(() => ({
  mockClassifyAqiBand: vi.fn<(aqi: number) => AqiClassification>(),
  mockFilterActions: vi.fn<
    (
      actions: AirAction[],
      category: ActionCategory,
      statusFilter: AdoptionFilter,
      adoptedIds: string[],
      searchQuery: string,
    ) => AirAction[]
  >(),
}));

vi.mock('../utils/airImpact', () => ({
  classifyAqiBand: mockClassifyAqiBand,
  filterActions: mockFilterActions,
}));

vi.mock('../components/ExposureProjectionChart', () => ({
  ExposureProjectionChart: ({
    profile,
    impact,
  }: {
    profile: HouseholdProfile;
    impact: ImpactSummary;
  }) => (
    <div
      data-testid="mock-exposure-projection"
      data-city={profile.city}
      data-adopted={impact.adoptedCount}
    />
  ),
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <svg data-testid={`icon-${name}`} {...props} />;
    };
  return {
    AlertTriangle: icon('AlertTriangle'),
    Check: icon('Check'),
    CheckCircle2: icon('CheckCircle2'),
    Info: icon('Info'),
    Search: icon('Search'),
    ShieldAlert: icon('ShieldAlert'),
    ShieldCheck: icon('ShieldCheck'),
    Sprout: icon('Sprout'),
  };
});

import { ActionWorkspace } from '../components/ActionWorkspace';
import { ImpactStrip } from '../components/ImpactStrip';

const MOCK_PROFILE: HouseholdProfile = {
  city: 'Salt Lake City, Utah',
  aqi: 168,
  householdType: 'Family with school-age kids',
  heatingSource: 'Natural gas furnace / boiler',
  commuteMode: 'Solo petrol/diesel car',
  housingType: 'Single-family home (1990s build)',
  priorities: ['Zero-car school runs'],
};

const MOCK_IMPACT: ImpactSummary = {
  outdoorPm25: 89.4,
  estimatedIndoorPm25: 25.5,
  exposureReductionPct: 58,
  weeklyCo2eAvoidedKg: 18.4,
  weeklyPm25AvoidedGrams: 11.2,
  adoptedCount: 2,
  totalCount: 5,
};

const MOCK_ACTIONS: AirAction[] = [
  {
    id: 'act-1',
    category: 'routine',
    title: 'Replace solo school car runs',
    contextLabel: 'Morning · Mon–Fri',
    costTier: 'Zero cost',
    steps: 'Join neighborhood walking bus.',
    personalImpactSummary: '-25% cabin NO2',
    communityImpactSummary: 'Cuts idling at school gate',
    whyItWorks: 'Eliminates cold-start exhaust.',
    exposureReductionPct: 22,
    weeklyCo2eAvoidedKg: 11.2,
    weeklyPm25AvoidedGrams: 7.4,
  },
  {
    id: 'act-2',
    category: 'routine',
    title: 'Midday furnace vent cycle',
    contextLabel: 'Daily · 2 PM',
    costTier: 'Zero cost',
    steps: 'Air rooms during afternoon peak dispersion.',
    personalImpactSummary: '-18% indoor PM2.5',
    communityImpactSummary: 'Avoids extra heating demand',
    whyItWorks: 'Midday boundary mixing lowers outside soot.',
    exposureReductionPct: 16,
    weeklyCo2eAvoidedKg: 3.1,
    weeklyPm25AvoidedGrams: 2.0,
  },
];

describe('ImpactStrip and ActionWorkspace unit tests (mocked children & utils)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassifyAqiBand.mockReturnValue({
      severity: 'Unhealthy',
      advisory: 'Advisory text',
      textColorClass: 'text-red-700',
      surfaceClass: 'bg-red-50',
      borderColorClass: 'border-red-200',
      dotColorClass: 'bg-red-600',
    });
    mockFilterActions.mockReturnValue(MOCK_ACTIONS);
  });

  describe('ImpactStrip', () => {
    it('renders KPI metrics, status icon across AQI bands, and forwards props to mocked projection chart', () => {
      const { rerender } = render(<ImpactStrip profile={MOCK_PROFILE} impact={MOCK_IMPACT} />);

      expect(mockClassifyAqiBand).toHaveBeenCalledWith(168);
      expect(screen.getByTestId('icon-ShieldAlert')).toBeInTheDocument();
      expect(screen.getByTestId('metric-exposure-cut')).toHaveTextContent('-58%');
      expect(screen.getByTestId('metric-co2e-avoided')).toHaveTextContent('18.4 kg');
      expect(screen.getByTestId('metric-pm25-prevented')).toHaveTextContent('11.2 g');
      expect(screen.getByTestId('mock-exposure-projection')).toHaveAttribute(
        'data-city',
        'Salt Lake City, Utah',
      );
      expect(screen.getByTestId('mock-exposure-projection')).toHaveAttribute('data-adopted', '2');

      mockClassifyAqiBand.mockReturnValueOnce({
        severity: 'Sensitive',
        advisory: 'Sensitive advisory',
        textColorClass: 'text-amber-800',
        surfaceClass: 'bg-amber-50',
        borderColorClass: 'border-amber-300',
        dotColorClass: 'bg-amber-600',
      });
      rerender(<ImpactStrip profile={{ ...MOCK_PROFILE, aqi: 120 }} impact={MOCK_IMPACT} />);
      expect(screen.getByTestId('icon-AlertTriangle')).toBeInTheDocument();

      mockClassifyAqiBand.mockReturnValueOnce({
        severity: 'Good',
        advisory: 'Good advisory',
        textColorClass: 'text-emerald-700',
        surfaceClass: 'bg-emerald-50',
        borderColorClass: 'border-emerald-200',
        dotColorClass: 'bg-emerald-600',
      });
      rerender(<ImpactStrip profile={{ ...MOCK_PROFILE, aqi: 35 }} impact={MOCK_IMPACT} />);
      expect(screen.getByTestId('icon-CheckCircle2')).toBeInTheDocument();
    });
  });

  describe('ActionWorkspace', () => {
    it('handles loading skeleton, empty filter reset, search/status controls, and adoption toggling', async () => {
      const user = userEvent.setup();
      const onToggleAdopt = vi.fn();
      const onStatusFilterChange = vi.fn();
      const onSearchQueryChange = vi.fn();

      const { rerender } = render(
        <ActionWorkspace
          category="routine"
          actions={MOCK_ACTIONS}
          adoptedIds={['act-1']}
          onToggleAdopt={onToggleAdopt}
          statusFilter="all"
          onStatusFilterChange={onStatusFilterChange}
          searchQuery=""
          onSearchQueryChange={onSearchQueryChange}
          isLoading={false}
          impactNarrative="Mocked household impact explanation."
        />,
      );

      expect(mockFilterActions).toHaveBeenCalledWith(
        MOCK_ACTIONS,
        'routine',
        'all',
        ['act-1'],
        '',
      );
      expect(screen.getByText('Mocked household impact explanation.')).toBeInTheDocument();
      expect(screen.getByText('Active in household plan')).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', { name: "Remove 'Replace solo school car runs' from plan" }),
      );
      expect(onToggleAdopt).toHaveBeenCalledWith('act-1');

      await user.click(
        screen.getByRole('button', { name: "Adopt 'Midday furnace vent cycle'" }),
      );
      expect(onToggleAdopt).toHaveBeenCalledWith('act-2');

      await user.click(screen.getByRole('button', { name: 'Adopted' }));
      expect(onStatusFilterChange).toHaveBeenCalledWith('adopted');

      await user.type(screen.getByLabelText('Search recommendations'), 'x');
      expect(onSearchQueryChange).toHaveBeenCalledWith('x');

      // Loading skeleton state
      rerender(
        <ActionWorkspace
          category="indoor"
          actions={MOCK_ACTIONS}
          adoptedIds={[]}
          onToggleAdopt={onToggleAdopt}
          statusFilter="all"
          onStatusFilterChange={onStatusFilterChange}
          searchQuery=""
          onSearchQueryChange={onSearchQueryChange}
          isLoading={true}
          impactNarrative="Indoor narrative"
        />,
      );
      expect(screen.getByRole('status', { name: 'Generating tailored actions' })).toHaveAttribute(
        'aria-busy',
        'true',
      );

      // Empty filter state
      mockFilterActions.mockReturnValue([]);
      rerender(
        <ActionWorkspace
          category="community"
          actions={MOCK_ACTIONS}
          adoptedIds={[]}
          onToggleAdopt={onToggleAdopt}
          statusFilter="adopted"
          onStatusFilterChange={onStatusFilterChange}
          searchQuery="unmatched"
          onSearchQueryChange={onSearchQueryChange}
          isLoading={false}
          impactNarrative="Community narrative"
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
      expect(onStatusFilterChange).toHaveBeenCalledWith('all');
      expect(onSearchQueryChange).toHaveBeenCalledWith('');
    });
  });
});
