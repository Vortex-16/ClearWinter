import { render } from '@testing-library/react';
import axe from 'axe-core';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ActionWorkspace } from '../components/ActionWorkspace';
import { AlertToastStack } from '../components/AlertToastStack';
import { AskAssistantView } from '../components/AskAssistantView';
import { DiurnalSmogChart } from '../components/DiurnalSmogChart';
import { ImpactStrip } from '../components/ImpactStrip';
import { ProfileCustomizerModal } from '../components/ProfileCustomizerModal';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { REGIONAL_PRESETS } from '../data/presets';
import { calculateImpactSummary } from '../utils/airImpact';

const preset = REGIONAL_PRESETS[0];
const impact = calculateImpactSummary(preset.actions, preset.defaultAdoptedIds, preset.profile);
const baseline = {
  city: preset.profile.city,
  baselineAqi: preset.profile.aqi,
  savedAt: '2026-11-19T10:00:00.000Z',
};

async function runAxeAudit(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not render layout/canvas pixels needed for computed contrast checks
      'color-contrast': { enabled: false },
    },
  });

  if (results.violations.length > 0) {
    const summary = results.violations
      .map(
        (v) =>
          `[${v.id}] (${v.impact ?? 'unknown'}) ${v.help}: ${v.nodes
            .map((n) => n.target.join(' '))
            .join(', ')}`,
      )
      .join('\n');
    throw new Error(`Accessibility violations detected:\n${summary}`);
  }

  expect(results.violations).toHaveLength(0);
}

describe('Automated accessibility audits (axe-core)', () => {
  it('App root workspace passes axe-core audit with valid landmarks and heading structure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>404</html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      }),
    );

    const { container } = render(createElement(App));
    await runAxeAudit(container);
  });

  it('TopBar and Sidebar (including open mobile drawer) pass axe-core audit', async () => {
    const { container: topContainer } = render(
      createElement(TopBar, {
        activeTab: 'routine',
        profile: preset.profile,
        onOpenCustomizer: vi.fn(),
        onOpenMobileMenu: vi.fn(),
        isGenerating: false,
      }),
    );
    await runAxeAudit(topContainer);

    const { container: sidebarContainer } = render(
      createElement(Sidebar, {
        activeTab: 'indoor',
        onSelectTab: vi.fn(),
        presets: REGIONAL_PRESETS,
        activePresetId: preset.id,
        onSelectPreset: vi.fn(),
        profile: preset.profile,
        savedBaseline: baseline,
        onSaveBaseline: vi.fn(),
        onCheckLiveAqi: vi.fn(),
        isCheckingLive: false,
        onOpenCustomizer: vi.fn(),
        counts: { routine: 4, indoor: 3, community: 3 },
        mobileOpen: true,
        onCloseMobile: vi.fn(),
      }),
    );
    await runAxeAudit(sidebarContainer);
  });

  it('ImpactStrip (with Recharts projection) and DiurnalSmogChart pass axe-core audit', async () => {
    const { container: impactContainer } = render(
      createElement(ImpactStrip, { profile: preset.profile, impact }),
    );
    await runAxeAudit(impactContainer);

    const { container: diurnalContainer } = render(
      createElement(DiurnalSmogChart, {
        aqi: preset.profile.aqi,
        bestVentilationWindow: preset.bestVentilationWindow,
      }),
    );
    await runAxeAudit(diurnalContainer);
  });

  it('ActionWorkspace populated, empty-filter, and loading states pass axe-core audit', async () => {
    const { container: populated } = render(
      createElement(ActionWorkspace, {
        category: 'routine',
        actions: preset.actions,
        adoptedIds: preset.defaultAdoptedIds,
        onToggleAdopt: vi.fn(),
        statusFilter: 'all',
        onStatusFilterChange: vi.fn(),
        searchQuery: '',
        onSearchQueryChange: vi.fn(),
        isLoading: false,
        impactNarrative: preset.impactNarrative,
      }),
    );
    await runAxeAudit(populated);

    const { container: empty } = render(
      createElement(ActionWorkspace, {
        category: 'community',
        actions: preset.actions,
        adoptedIds: preset.defaultAdoptedIds,
        onToggleAdopt: vi.fn(),
        statusFilter: 'adopted',
        onStatusFilterChange: vi.fn(),
        searchQuery: 'no-matching-term',
        onSearchQueryChange: vi.fn(),
        isLoading: false,
        impactNarrative: preset.impactNarrative,
      }),
    );
    await runAxeAudit(empty);

    const { container: loading } = render(
      createElement(ActionWorkspace, {
        category: 'indoor',
        actions: preset.actions,
        adoptedIds: preset.defaultAdoptedIds,
        onToggleAdopt: vi.fn(),
        statusFilter: 'all',
        onStatusFilterChange: vi.fn(),
        searchQuery: '',
        onSearchQueryChange: vi.fn(),
        isLoading: true,
        impactNarrative: preset.impactNarrative,
      }),
    );
    await runAxeAudit(loading);
  });

  it('AskAssistantView passes axe-core audit with conversation turns', async () => {
    const { container } = render(
      createElement(AskAssistantView, {
        profile: preset.profile,
        adoptedTitles: ['Create a sealed Clean-Air Bedroom Sanctuary'],
        messages: [
          {
            id: 'u-1',
            role: 'user',
            content: 'When is it safest to air out bedrooms today?',
            timestamp: '10:15 AM',
          },
          {
            id: 'a-1',
            role: 'assistant',
            content: 'Cross-ventilate for 10 minutes between 1:30 PM and 2:30 PM.',
            personalTakeaway: 'Keeps indoor CO2 healthy without trapping evening soot.',
            communityTakeaway: 'Avoids re-heating chilled masonry walls.',
            timestamp: '10:15 AM',
          },
        ],
        onAppendMessages: vi.fn(),
      }),
    );
    await runAxeAudit(container);
  });

  it('ProfileCustomizerModal dialog and AlertToastStack region pass axe-core audit', async () => {
    const { container: modalContainer } = render(
      createElement(ProfileCustomizerModal, {
        open: true,
        initialProfile: preset.profile,
        isGenerating: false,
        apiError: 'Example server error message.',
        onClose: vi.fn(),
        onGeneratePlan: vi.fn(async () => {}),
        onApplyLocalProfile: vi.fn(),
      }),
    );
    await runAxeAudit(modalContainer);

    const { container: toastContainer } = render(
      createElement(AlertToastStack, {
        alerts: [
          {
            id: 'toast-365',
            city: 'Delhi NCR, India',
            baselineAqi: 312,
            baselineSeverity: 'Hazardous',
            currentAqi: 365,
            currentSeverity: 'Hazardous',
            delta: 53,
            pm25: 315.4,
            reason: 'Local AQI climbed +53 points beyond your saved 312 AQI baseline.',
            source: 'station-feed',
            timestamp: '2026-11-19T12:00:00.000Z',
          },
        ],
        onDismiss: vi.fn(),
        onApplyLiveAqi: vi.fn(),
      }),
    );
    await runAxeAudit(toastContainer);
  });
});
