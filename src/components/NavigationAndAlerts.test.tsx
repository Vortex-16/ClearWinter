import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGIONAL_PRESETS } from '../data/presets';
import { AlertToastStack } from './AlertToastStack';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const preset = REGIONAL_PRESETS[0];
const matchingBaseline = {
  city: preset.profile.city,
  baselineAqi: preset.profile.aqi,
  savedAt: '2026-11-19T10:00:00.000Z',
};

describe('TopBar, Sidebar, and AlertToastStack components', () => {
  it('TopBar renders active section title, AQI band, and Tailor with AI action', async () => {
    const user = userEvent.setup();
    const onOpenCustomizer = vi.fn();

    render(
      <TopBar
        activeTab="indoor"
        profile={preset.profile}
        onOpenCustomizer={onOpenCustomizer}
        onOpenMobileMenu={vi.fn()}
        isGenerating={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Indoor Air Hacks' })).toBeInTheDocument();
    expect(screen.getByText('AQI 312')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Tailor with AI/i }));
    expect(onOpenCustomizer).toHaveBeenCalledTimes(1);
  });

  it('Sidebar handles tab switching, preset changes, and conditional baseline saving', async () => {
    const user = userEvent.setup();
    const onSelectTab = vi.fn();
    const onSelectPreset = vi.fn();
    const onSaveBaseline = vi.fn();
    const onCheckLiveAqi = vi.fn();

    const { rerender } = render(
      <Sidebar
        activeTab="routine"
        onSelectTab={onSelectTab}
        presets={REGIONAL_PRESETS}
        activePresetId={preset.id}
        onSelectPreset={onSelectPreset}
        profile={preset.profile}
        savedBaseline={matchingBaseline}
        onSaveBaseline={onSaveBaseline}
        onCheckLiveAqi={onCheckLiveAqi}
        isCheckingLive={false}
        onOpenCustomizer={vi.fn()}
        counts={{ routine: 4, indoor: 3, community: 3 }}
        mobileOpen={false}
        onCloseMobile={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Save Current as Baseline/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Indoor Air Hacks/i }));
    expect(onSelectTab).toHaveBeenCalledWith('indoor');

    await user.click(screen.getByRole('button', { name: /Salt Lake City/i }));
    expect(onSelectPreset).toHaveBeenCalledWith('salt-lake');

    await user.click(screen.getByRole('button', { name: /Check Live AQI/i }));
    expect(onCheckLiveAqi).toHaveBeenCalledTimes(1);

    rerender(
      <Sidebar
        activeTab="routine"
        onSelectTab={onSelectTab}
        presets={REGIONAL_PRESETS}
        activePresetId="salt-lake"
        onSelectPreset={onSelectPreset}
        profile={REGIONAL_PRESETS[1].profile}
        savedBaseline={matchingBaseline}
        onSaveBaseline={onSaveBaseline}
        onCheckLiveAqi={onCheckLiveAqi}
        isCheckingLive={false}
        onOpenCustomizer={vi.fn()}
        counts={{ routine: 2, indoor: 2, community: 1 }}
        mobileOpen={false}
        onCloseMobile={vi.fn()}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /Save Current as Baseline/i });
    await user.click(saveBtn);
    expect(onSaveBaseline).toHaveBeenCalledTimes(1);
  });

  it('AlertToastStack renders alert toasts and dispatches dismiss and apply actions', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onApplyLiveAqi = vi.fn();

    const alert = {
      id: 'alert-365',
      city: 'Delhi NCR, India',
      baselineAqi: 312,
      baselineSeverity: 'Hazardous' as const,
      currentAqi: 365,
      currentSeverity: 'Hazardous' as const,
      delta: 53,
      pm25: 315.4,
      reason: 'Local AQI climbed +53 points beyond your saved 312 AQI baseline.',
      source: 'station-feed' as const,
      timestamp: '2026-11-19T12:00:00.000Z',
    };

    const { rerender } = render(
      <AlertToastStack alerts={[]} onDismiss={onDismiss} onApplyLiveAqi={onApplyLiveAqi} />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(
      <AlertToastStack alerts={[alert]} onDismiss={onDismiss} onApplyLiveAqi={onApplyLiveAqi} />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('365 AQI');
    await user.click(screen.getByRole('button', { name: 'Apply 365 AQI' }));
    expect(onApplyLiveAqi).toHaveBeenCalledWith(alert);

    await user.click(screen.getByRole('button', { name: /Dismiss AQI alert/i }));
    expect(onDismiss).toHaveBeenCalledWith('alert-365');
  });

  it('Sidebar compact collapsed rail preserves accessible names and triggers toggle callbacks', async () => {
    const user = userEvent.setup();
    const onToggleCollapsed = vi.fn();
    const onToggleDesktopSidebar = vi.fn();
    const onSelectPreset = vi.fn();

    render(
      <>
        <TopBar
          activeTab="routine"
          profile={preset.profile}
          onOpenCustomizer={vi.fn()}
          onOpenMobileMenu={vi.fn()}
          sidebarCollapsed={true}
          onToggleDesktopSidebar={onToggleDesktopSidebar}
          isGenerating={false}
        />
        <Sidebar
          activeTab="routine"
          onSelectTab={vi.fn()}
          presets={REGIONAL_PRESETS}
          activePresetId={preset.id}
          onSelectPreset={onSelectPreset}
          profile={preset.profile}
          savedBaseline={matchingBaseline}
          onSaveBaseline={vi.fn()}
          onCheckLiveAqi={vi.fn()}
          isCheckingLive={false}
          onOpenCustomizer={vi.fn()}
          counts={{ routine: 4, indoor: 3, community: 3 }}
          collapsed={true}
          onToggleCollapsed={onToggleCollapsed}
          mobileOpen={false}
          onCloseMobile={vi.fn()}
        />
      </>,
    );

    const aside = screen.getByTestId('desktop-sidebar');
    expect(aside).toHaveAttribute('data-collapsed', 'true');

    const topBarToggle = screen.getByRole('button', { name: 'Expand navigation sidebar' });
    expect(topBarToggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(topBarToggle);
    expect(onToggleDesktopSidebar).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Salt Lake City (168 AQI)' }));
    expect(onSelectPreset).toHaveBeenCalledWith('salt-lake');
  });
});
