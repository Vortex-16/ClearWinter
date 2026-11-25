import { MotionConfig, motion } from 'motion/react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { REGIONAL_PRESETS } from './data/presets';
import { useClearWinterWorkspace } from './hooks/useClearWinterWorkspace';
import { useSidebarState } from './hooks/useSidebarState';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ImpactStrip } from './components/ImpactStrip';
import { DiurnalSmogChart } from './components/DiurnalSmogChart';
import { ActionWorkspace } from './components/ActionWorkspace';
import { AskAssistantView } from './components/AskAssistantView';
import { ProfileCustomizerModal } from './components/ProfileCustomizerModal';
import { AlertToastStack } from './components/AlertToastStack';

/**
 * Root ClearWinter workspace shell coordinating navigation, live AQI alerts,
 * personalized exposure metrics, and interactive smog-mitigation plans.
 */
export default function App() {
  const workspace = useClearWinterWorkspace();
  const {
    collapsed: sidebarCollapsed,
    mobileOpen: mobileMenuOpen,
    toggleCollapsed: toggleDesktopSidebar,
    openMobile: openMobileMenu,
    closeMobile: closeMobileMenu,
  } = useSidebarState();

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-[#f4f6f9] text-slate-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-teal-900"
        >
          Skip to main content
        </a>

        {/* Polite live region announcing state updates to assistive technologies */}
        <div role="status" aria-live="polite" className="sr-only">
          {workspace.liveAnnouncement}
        </div>

        <Sidebar
          activeTab={workspace.activeTab}
          onSelectTab={workspace.setActiveTab}
          presets={REGIONAL_PRESETS}
          activePresetId={workspace.activePresetId}
          onSelectPreset={workspace.selectPreset}
          profile={workspace.profile}
          savedBaseline={workspace.savedBaseline}
          onSaveBaseline={workspace.saveBaseline}
          onCheckLiveAqi={() => void workspace.checkLiveAqi()}
          isCheckingLive={workspace.isCheckingLive}
          onOpenCustomizer={workspace.openCustomizer}
          counts={workspace.counts}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleDesktopSidebar}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={closeMobileMenu}
        />

        <div
          className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[272px]'
          }`}
        >
          <TopBar
            activeTab={workspace.activeTab}
            profile={workspace.profile}
            onOpenCustomizer={workspace.openCustomizer}
            onOpenMobileMenu={openMobileMenu}
            sidebarCollapsed={sidebarCollapsed}
            onToggleDesktopSidebar={toggleDesktopSidebar}
            isGenerating={workspace.isGeneratingPlan}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 sm:px-6 lg:px-8 py-6 focus:outline-none"
          >
            <div className="max-w-6xl mx-auto space-y-6">
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 text-xs sm:text-sm transition-colors duration-150 ${workspace.aqiBand.surfaceClass} ${workspace.aqiBand.borderColorClass}`}
              >
                <ShieldAlert
                  className={`h-4 w-4 shrink-0 mt-0.5 ${workspace.aqiBand.textColorClass}`}
                  aria-hidden="true"
                />
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-900">
                    {workspace.profile.city} · AQI {workspace.profile.aqi} (
                    {workspace.aqiBand.severity})
                  </div>
                  <p className="text-slate-700 leading-relaxed">{workspace.aqiBand.advisory}</p>
                </div>
              </div>

              {workspace.planError && !workspace.customizerOpen && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900"
                >
                  <AlertCircle
                    className="h-4 w-4 text-red-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{workspace.planError}</span>
                </div>
              )}

              <ImpactStrip profile={workspace.profile} impact={workspace.impact} />

              <motion.div
                key={workspace.activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {workspace.activeTab === 'routine' && (
                  <DiurnalSmogChart
                    aqi={workspace.profile.aqi}
                    bestVentilationWindow={workspace.bestVentilationWindow}
                  />
                )}

                {workspace.activeTab === 'assistant' ? (
                  <AskAssistantView
                    profile={workspace.profile}
                    adoptedTitles={workspace.adoptedTitles}
                    messages={workspace.messages}
                    onAppendMessages={workspace.appendMessages}
                  />
                ) : (
                  <ActionWorkspace
                    category={workspace.activeTab}
                    actions={workspace.actions}
                    adoptedIds={workspace.adoptedIds}
                    onToggleAdopt={workspace.toggleAdopt}
                    statusFilter={workspace.statusFilter}
                    onStatusFilterChange={workspace.setStatusFilter}
                    searchQuery={workspace.searchQuery}
                    onSearchQueryChange={workspace.setSearchQuery}
                    isLoading={workspace.isGeneratingPlan}
                    impactNarrative={workspace.impactNarrative}
                  />
                )}
              </motion.div>
            </div>
          </main>
        </div>

        <ProfileCustomizerModal
          open={workspace.customizerOpen}
          initialProfile={workspace.profile}
          isGenerating={workspace.isGeneratingPlan}
          apiError={workspace.planError}
          onClose={workspace.closeCustomizer}
          onGeneratePlan={workspace.generateCustomPlan}
          onApplyLocalProfile={workspace.applyLocalProfile}
        />

        <AlertToastStack
          alerts={workspace.alerts}
          onDismiss={workspace.dismissAlert}
          onApplyLiveAqi={workspace.applyLiveAqi}
        />
      </div>
    </MotionConfig>
  );
}
