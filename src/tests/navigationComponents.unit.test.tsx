import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AqiAlertToast,
  AqiClassification,
  HouseholdProfile,
  RegionalPreset,
  SavedLocationBaseline,
} from '../types/air';

const { mockClassifyAqiBand } = vi.hoisted(() => ({
  mockClassifyAqiBand: vi.fn<(aqi: number) => AqiClassification>(),
}));

vi.mock('../utils/airImpact', () => ({
  classifyAqiBand: mockClassifyAqiBand,
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  MotionConfig: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      layout: _l,
      layoutId: _lid,
      ...rest
    }: Record<string, unknown> & { children?: ReactNode }) => <div {...rest}>{children}</div>,
    span: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      layout: _l,
      layoutId: _lid,
      ...rest
    }: Record<string, unknown> & { children?: ReactNode }) => <span {...rest}>{children}</span>,
  },
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <svg data-testid={`icon-${name}`} {...props} />;
    };
  return {
    ArrowUpRight: icon('ArrowUpRight'),
    BookmarkCheck: icon('BookmarkCheck'),
    CalendarClock: icon('CalendarClock'),
    Home: icon('Home'),
    MapPin: icon('MapPin'),
    Menu: icon('Menu'),
    MessageSquareText: icon('MessageSquareText'),
    PanelLeftClose: icon('PanelLeftClose'),
    PanelLeftOpen: icon('PanelLeftOpen'),
    RefreshCw: icon('RefreshCw'),
    ShieldAlert: icon('ShieldAlert'),
    SlidersHorizontal: icon('SlidersHorizontal'),
    Users: icon('Users'),
    Wind: icon('Wind'),
    X: icon('X'),
  };
});

import { AlertToastStack } from '../components/AlertToastStack';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';

const MOCK_PROFILE: HouseholdProfile = {
  city: 'Delhi NCR, India',
  aqi: 312,
  householdType: 'Family with young children & elders',
  heatingSource: 'Portable electric room heaters',
  commuteMode: 'Metro + short car school drop-off',
  housingType: 'Older apartment with drafty windows',
  priorities: ['Protect children & elders'],
};

const MOCK_BASELINE: SavedLocationBaseline = {
  city: 'delhi ncr, india',
  baselineAqi: 312,
  savedAt: '2026-11-19T10:00:00.000Z',
};

const MOCK_PRESETS: RegionalPreset[] = [
  {
    id: 'delhi',
    label: 'Delhi NCR',
    seasonNote: 'Nov-Jan inversion',
    profile: MOCK_PROFILE,
    bestVentilationWindow: '1:30 PM – 3:30 PM',
    impactNarrative: 'Narrative',
    actions: [],
    defaultAdoptedIds: [],
  },
  {
    id: 'krakow',
    label: 'Kraków',
    seasonNote: 'Dec valley fog',
    profile: { ...MOCK_PROFILE, city: 'Kraków, Poland', aqi: 194 },
    bestVentilationWindow: '1:00 PM – 3:00 PM',
    impactNarrative: 'Narrative',
    actions: [],
    defaultAdoptedIds: [],
  },
];

describe('Navigation and Alert components unit tests (all dependencies mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClassifyAqiBand.mockReturnValue({
      severity: 'Hazardous',
      advisory: 'Mocked advisory',
      textColorClass: 'text-red-900',
      surfaceClass: 'bg-red-100',
      borderColorClass: 'border-red-300',
      dotColorClass: 'bg-red-800',
    });
  });

  describe('TopBar', () => {
    it('renders tab title, mocked AQI severity, and dispatches mobile, collapse, and customizer callbacks', async () => {
      const user = userEvent.setup();
      const onOpenCustomizer = vi.fn();
      const onOpenMobileMenu = vi.fn();
      const onToggleDesktopSidebar = vi.fn();

      const { rerender } = render(
        <TopBar
          activeTab="community"
          profile={MOCK_PROFILE}
          onOpenCustomizer={onOpenCustomizer}
          onOpenMobileMenu={onOpenMobileMenu}
          sidebarCollapsed={false}
          onToggleDesktopSidebar={onToggleDesktopSidebar}
          isGenerating={false}
        />,
      );

      expect(mockClassifyAqiBand).toHaveBeenCalledWith(312);
      expect(screen.getByRole('heading', { name: 'Community & Swaps' })).toBeInTheDocument();
      expect(screen.getByText('AQI 312')).toBeInTheDocument();
      expect(screen.getByText('Hazardous')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open navigation menu' }));
      expect(onOpenMobileMenu).toHaveBeenCalledTimes(1);

      const desktopToggle = screen.getByRole('button', { name: 'Collapse navigation sidebar' });
      expect(desktopToggle).toHaveAttribute('aria-expanded', 'true');
      await user.click(desktopToggle);
      expect(onToggleDesktopSidebar).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: /Tailor with AI/i }));
      expect(onOpenCustomizer).toHaveBeenCalledTimes(1);

      rerender(
        <TopBar
          activeTab="assistant"
          profile={MOCK_PROFILE}
          onOpenCustomizer={onOpenCustomizer}
          onOpenMobileMenu={onOpenMobileMenu}
          sidebarCollapsed={true}
          onToggleDesktopSidebar={onToggleDesktopSidebar}
          isGenerating={true}
        />,
      );

      expect(screen.getByRole('heading', { name: 'Ask Assistant' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Expand navigation sidebar' }),
      ).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByRole('button', { name: /Tailoring Plan/i })).toBeDisabled();
    });
  });

  describe('Sidebar', () => {
    it('supports expanded desktop nav, baseline matching, compact collapsed rail, and mobile drawer', async () => {
      const user = userEvent.setup();
      const onSelectTab = vi.fn();
      const onSelectPreset = vi.fn();
      const onSaveBaseline = vi.fn();
      const onCheckLiveAqi = vi.fn();
      const onOpenCustomizer = vi.fn();
      const onToggleCollapsed = vi.fn();
      const onCloseMobile = vi.fn();

      const { rerender } = render(
        <Sidebar
          activeTab="routine"
          onSelectTab={onSelectTab}
          presets={MOCK_PRESETS}
          activePresetId="delhi"
          onSelectPreset={onSelectPreset}
          profile={MOCK_PROFILE}
          savedBaseline={MOCK_BASELINE}
          onSaveBaseline={onSaveBaseline}
          onCheckLiveAqi={onCheckLiveAqi}
          isCheckingLive={false}
          onOpenCustomizer={onOpenCustomizer}
          counts={{ routine: 4, indoor: 3, community: 2 }}
          collapsed={false}
          onToggleCollapsed={onToggleCollapsed}
          mobileOpen={false}
          onCloseMobile={onCloseMobile}
        />,
      );

      expect(screen.getByRole('button', { name: /Daily Routine/i })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(
        screen.queryByRole('button', { name: /Save Current as Baseline/i }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Indoor Air Hacks/i }));
      expect(onSelectTab).toHaveBeenCalledWith('indoor');
      expect(onCloseMobile).toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /Kraków/i }));
      expect(onSelectPreset).toHaveBeenCalledWith('krakow');

      await user.click(screen.getByRole('button', { name: /Check Live AQI/i }));
      expect(onCheckLiveAqi).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: /Edit Lifestyle & City/i }));
      expect(onOpenCustomizer).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
      expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

      // Switch to collapsed icon rail + different profile AQI + checking live state
      rerender(
        <Sidebar
          activeTab="routine"
          onSelectTab={onSelectTab}
          presets={MOCK_PRESETS}
          activePresetId="krakow"
          onSelectPreset={onSelectPreset}
          profile={{ ...MOCK_PROFILE, aqi: 210 }}
          savedBaseline={MOCK_BASELINE}
          onSaveBaseline={onSaveBaseline}
          onCheckLiveAqi={onCheckLiveAqi}
          isCheckingLive={true}
          onOpenCustomizer={onOpenCustomizer}
          counts={{ routine: 4, indoor: 3, community: 2 }}
          collapsed={true}
          onToggleCollapsed={onToggleCollapsed}
          mobileOpen={false}
          onCloseMobile={onCloseMobile}
        />,
      );

      expect(screen.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
      expect(screen.getByRole('button', { name: 'Checking Live AQI...' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Save Current as Baseline' }));
      expect(onSaveBaseline).toHaveBeenCalledTimes(1);
      await user.click(screen.getByRole('button', { name: 'Kraków (194 AQI)' }));
      expect(onSelectPreset).toHaveBeenCalledWith('krakow');

      // Open mobile drawer
      rerender(
        <Sidebar
          activeTab="routine"
          onSelectTab={onSelectTab}
          presets={MOCK_PRESETS}
          activePresetId="delhi"
          onSelectPreset={onSelectPreset}
          profile={MOCK_PROFILE}
          savedBaseline={MOCK_BASELINE}
          onSaveBaseline={onSaveBaseline}
          onCheckLiveAqi={onCheckLiveAqi}
          isCheckingLive={false}
          onOpenCustomizer={onOpenCustomizer}
          counts={{ routine: 4, indoor: 3, community: 2 }}
          collapsed={false}
          onToggleCollapsed={onToggleCollapsed}
          mobileOpen={true}
          onCloseMobile={onCloseMobile}
        />,
      );

      const dialog = screen.getByRole('dialog', { name: 'Workspace navigation menu' });
      const closeBtn = within(dialog).getByRole('button', { name: 'Close navigation menu' });
      await user.click(closeBtn);
      expect(onCloseMobile).toHaveBeenCalled();
    });
  });

  describe('AlertToastStack', () => {
    it('returns null when empty and handles apply/dismiss actions across alerts', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const onApplyLiveAqi = vi.fn();

      const alert: AqiAlertToast = {
        id: 'alert-1',
        city: 'Delhi NCR, India',
        baselineAqi: 312,
        baselineSeverity: 'Hazardous',
        currentAqi: 378,
        currentSeverity: 'Hazardous',
        delta: 66,
        pm25: 328.4,
        reason: 'Local AQI climbed +66 points.',
        source: 'station-feed',
        timestamp: '2026-11-19T12:00:00.000Z',
      };

      const { container, rerender } = render(
        <AlertToastStack alerts={[]} onDismiss={onDismiss} onApplyLiveAqi={onApplyLiveAqi} />,
      );
      expect(container).toBeEmptyDOMElement();

      rerender(
        <AlertToastStack
          alerts={[alert]}
          onDismiss={onDismiss}
          onApplyLiveAqi={onApplyLiveAqi}
        />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('378 AQI');
      expect(screen.getByRole('alert')).toHaveTextContent('328.4 µg/m³');

      await user.click(screen.getByRole('button', { name: 'Apply 378 AQI' }));
      expect(onApplyLiveAqi).toHaveBeenCalledWith(alert);

      await user.click(screen.getByRole('button', { name: 'Dismiss AQI alert for Delhi NCR, India' }));
      expect(onDismiss).toHaveBeenCalledWith('alert-1');
    });
  });
});
