import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAqiBandStub,
  createTestAction,
  createTestImpact,
  createTestProfile,
} from '../test/factories';
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
  mockFilterActions:
    vi.fn<
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
      data-reduction={impact.exposureReductionPct}
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

const MOCK_PROFILE = createTestProfile({
  city: 'Salt Lake City, Utah',
  aqi: 168,
  housingType: 'Single-family home (1990s build)',
});
const MOCK_IMPACT = createTestImpact({
  outdoorPm25: 89.4,
  estimatedIndoorPm25: 25.5,
  exposureReductionPct: 58,
  weeklyCo2eAvoidedKg: 18.4,
  weeklyPm25AvoidedGrams: 11.2,
  adoptedCount: 2,
  totalCount: 5,
});
const MOCK_ACTIONS: AirAction[] = [
  createTestAction({
    id: 'act-1',
    title: 'Replace solo school car runs',
    exposureReductionPct: 22,
  }),
  createTestAction({ id: 'act-2', title: 'Midday furnace vent cycle', exposureReductionPct: 16 }),
];

describe('ImpactStrip and ActionWorkspace unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassifyAqiBand.mockImplementation((aqi) => createAqiBandStub(aqi));
    mockFilterActions.mockReturnValue(MOCK_ACTIONS);
  });

  describe('ImpactStrip', () => {
    it('renders KPI metrics, status icons across AQI bands, and zero-adopted impact state', () => {
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

      rerender(<ImpactStrip profile={{ ...MOCK_PROFILE, aqi: 120 }} impact={MOCK_IMPACT} />);
      expect(screen.getByTestId('icon-AlertTriangle')).toBeInTheDocument();

      rerender(
        <ImpactStrip
          profile={{ ...MOCK_PROFILE, aqi: 35 }}
          impact={createTestImpact({ exposureReductionPct: 0, adoptedCount: 0 })}
        />,
      );
      expect(screen.getByTestId('icon-CheckCircle2')).toBeInTheDocument();
      expect(screen.getByTestId('metric-exposure-cut')).toHaveTextContent('-0%');
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

      expect(mockFilterActions).toHaveBeenCalledWith(MOCK_ACTIONS, 'routine', 'all', ['act-1'], '');
      expect(screen.getAllByText('Direct Personal Impact').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Direct Community Impact').length).toBeGreaterThan(0);
      expect(screen.getByText('Mocked household impact explanation.')).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', { name: "Remove 'Replace solo school car runs' from plan" }),
      );
      expect(onToggleAdopt).toHaveBeenCalledWith('act-1');

      await user.click(screen.getByRole('button', { name: "Adopt 'Midday furnace vent cycle'" }));
      expect(onToggleAdopt).toHaveBeenCalledWith('act-2');

      await user.click(screen.getByRole('button', { name: 'Adopted' }));
      expect(onStatusFilterChange).toHaveBeenCalledWith('adopted');

      await user.type(screen.getByLabelText('Search recommendations'), 'x');
      expect(onSearchQueryChange).toHaveBeenCalledWith('x');

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
      expect(
        screen.getByText(/No alternative items match your current filter/i),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
      expect(onStatusFilterChange).toHaveBeenCalledWith('all');
      expect(onSearchQueryChange).toHaveBeenCalledWith('');
    });
  });
});
