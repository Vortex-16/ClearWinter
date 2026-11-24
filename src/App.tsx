import { useEffect, useMemo, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { REGIONAL_PRESETS } from './data/presets';
import { calculateImpactSummary, classifyAqiBand } from './utils/airImpact';
import { evaluateAqiWorsening } from './utils/aqiAlertRules';
import { useSidebarState } from './hooks/useSidebarState';
import {
  fetchLiveAqiReading,
  getSavedLocationBaseline,
  saveLocationBaseline,
  subscribeToAqiAlerts,
} from './services/aqiAlertService';
import { requestTailoredPlan } from './services/planApiService';
import type {
  AdoptionFilter,
  AirAction,
  AqiAlertToast,
  AssistantMessage,
  HouseholdProfile,
  SavedLocationBaseline,
  WorkspaceTab,
} from './types/air';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ImpactStrip } from './components/ImpactStrip';
import { DiurnalSmogChart } from './components/DiurnalSmogChart';
import { ActionWorkspace } from './components/ActionWorkspace';
import { AskAssistantView } from './components/AskAssistantView';
import { ProfileCustomizerModal } from './components/ProfileCustomizerModal';
import { AlertToastStack } from './components/AlertToastStack';

export default function App() {
  const initialPreset = REGIONAL_PRESETS[0];

  const [savedBaseline, setSavedBaseline] = useState<SavedLocationBaseline>(() =>
    getSavedLocationBaseline(initialPreset.profile.city, initialPreset.profile.aqi),
  );

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('routine');
  const [activePresetId, setActivePresetId] = useState<string | null>(initialPreset.id);
  const [profile, setProfile] = useState<HouseholdProfile>(initialPreset.profile);
  const [actions, setActions] = useState<AirAction[]>(initialPreset.actions);
  const [adoptedIds, setAdoptedIds] = useState<string[]>(initialPreset.defaultAdoptedIds);
  const [bestVentilationWindow, setBestVentilationWindow] = useState<string>(
    initialPreset.bestVentilationWindow,
  );
  const [impactNarrative, setImpactNarrative] = useState<string>(initialPreset.impactNarrative);

  const [statusFilter, setStatusFilter] = useState<AdoptionFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  const {
    collapsed: sidebarCollapsed,
    mobileOpen: mobileMenuOpen,
    toggleCollapsed: toggleDesktopSidebar,
    openMobile: openMobileMenu,
    closeMobile: closeMobileMenu,
  } = useSidebarState();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<AqiAlertToast[]>([]);
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAqiAlerts(savedBaseline, {
      onAlert: (incomingAlert) => {
        setAlerts((prev) => {
          const alreadyVisible = prev.some(
            (item) =>
              item.city === incomingAlert.city && item.currentAqi === incomingAlert.currentAqi,
          );
          if (alreadyVisible) return prev;
          return [incomingAlert, ...prev].slice(0, 3);
        });
      },
    });
    return unsubscribe;
  }, [savedBaseline]);

  const impact = useMemo(
    () => calculateImpactSummary(actions, adoptedIds, profile),
    [actions, adoptedIds, profile],
  );

  const aqiBand = useMemo(() => classifyAqiBand(profile.aqi), [profile.aqi]);

  const counts = useMemo(
    () => ({
      routine: actions.filter((a) => a.category === 'routine').length,
      indoor: actions.filter((a) => a.category === 'indoor').length,
      community: actions.filter((a) => a.category === 'community').length,
    }),
    [actions],
  );

  const adoptedTitles = useMemo(() => {
    const set = new Set(adoptedIds);
    return actions.filter((a) => set.has(a.id)).map((a) => a.title);
  }, [actions, adoptedIds]);

  function handleSelectPreset(presetId: string) {
    const found = REGIONAL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;

    setActivePresetId(found.id);
    setProfile(found.profile);
    setActions(found.actions);
    setAdoptedIds(found.defaultAdoptedIds);
    setBestVentilationWindow(found.bestVentilationWindow);
    setImpactNarrative(found.impactNarrative);
    setStatusFilter('all');
    setSearchQuery('');
    setMessages([]);
    setPlanError(null);
    setLiveAnnouncement(`Switched scenario to ${found.profile.city} at AQI ${found.profile.aqi}.`);
  }

  function handleToggleAdopt(actionId: string) {
    setAdoptedIds((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId],
    );
  }

  function handleSaveBaseline() {
    const next = saveLocationBaseline(profile.city, profile.aqi);
    setSavedBaseline(next);
    setAlerts([]);
    setLiveAnnouncement(`Saved ${next.city} baseline at ${next.baselineAqi} AQI.`);
  }

  async function handleCheckLiveAqi() {
    setIsCheckingLive(true);
    try {
      const reading = await fetchLiveAqiReading(savedBaseline.city);
      if (reading) {
        const latestAlerted = alerts[0]?.currentAqi ?? null;
        const alert = evaluateAqiWorsening({
          baseline: savedBaseline,
          reading,
          lastAlertedAqi: latestAlerted,
        });
        if (alert) {
          setAlerts((prev) => {
            const exists = prev.some(
              (item) => item.city === alert.city && item.currentAqi === alert.currentAqi,
            );
            return exists ? prev : [alert, ...prev].slice(0, 3);
          });
        }
      }
    } catch {
      // Live station check errors are non-blocking
    } finally {
      setIsCheckingLive(false);
    }
  }

  function handleDismissAlert(alertId: string) {
    setAlerts((prev) => prev.filter((item) => item.id !== alertId));
  }

  function handleApplyLiveAqi(alert: AqiAlertToast) {
    setProfile((prev) => ({
      ...prev,
      city: alert.city,
      aqi: alert.currentAqi,
    }));
    setAlerts((prev) => prev.filter((item) => item.id !== alert.id));
  }

  function handleApplyLocalProfile(nextProfile: HouseholdProfile) {
    setActivePresetId(null);
    setProfile(nextProfile);
    setPlanError(null);
    setCustomizerOpen(false);
    setLiveAnnouncement(`Updated profile locally for ${nextProfile.city} at AQI ${nextProfile.aqi}.`);
  }

  async function handleGenerateCustomPlan(nextProfile: HouseholdProfile) {
    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      const data = await requestTailoredPlan(nextProfile);
      setActivePresetId(null);
      setProfile(nextProfile);
      setActions(data.actions);
      setAdoptedIds(data.actions.slice(0, 3).map((item) => item.id));
      setBestVentilationWindow(data.bestVentilationWindow);
      setImpactNarrative(data.impactNarrative);
      setStatusFilter('all');
      setSearchQuery('');
      setMessages([]);
      setCustomizerOpen(false);
      setLiveAnnouncement(`Generated custom ClearWinter plan for ${nextProfile.city}.`);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Unable to connect to server.');
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  function handleAppendMessages(userMsg: AssistantMessage, assistantMsg: AssistantMessage) {
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-[#f4f6f9] text-slate-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-white focus:outline-2 focus:outline-offset-2 focus:outline-teal-900"
        >
          Skip to main content
        </a>

        <div role="status" aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>

        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          presets={REGIONAL_PRESETS}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          profile={profile}
          savedBaseline={savedBaseline}
          onSaveBaseline={handleSaveBaseline}
          onCheckLiveAqi={() => void handleCheckLiveAqi()}
          isCheckingLive={isCheckingLive}
          onOpenCustomizer={() => {
            setPlanError(null);
            setCustomizerOpen(true);
          }}
          counts={counts}
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
            activeTab={activeTab}
            profile={profile}
            onOpenCustomizer={() => {
              setPlanError(null);
              setCustomizerOpen(true);
            }}
            onOpenMobileMenu={openMobileMenu}
            sidebarCollapsed={sidebarCollapsed}
            onToggleDesktopSidebar={toggleDesktopSidebar}
            isGenerating={isGeneratingPlan}
          />

          <main id="main-content" tabIndex={-1} className="flex-1 px-4 sm:px-6 lg:px-8 py-6 focus:outline-none">
            <div className="max-w-6xl mx-auto space-y-6">
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 text-xs sm:text-sm transition-colors duration-150 ${aqiBand.surfaceClass} ${aqiBand.borderColorClass}`}
              >
                <ShieldAlert
                  className={`h-4 w-4 shrink-0 mt-0.5 ${aqiBand.textColorClass}`}
                  aria-hidden="true"
                />
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-900">
                    {profile.city} · AQI {profile.aqi} ({aqiBand.severity})
                  </div>
                  <p className="text-slate-700 leading-relaxed">{aqiBand.advisory}</p>
                </div>
              </div>

              {planError && !customizerOpen && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900"
                >
                  <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{planError}</span>
                </div>
              )}

              <ImpactStrip profile={profile} impact={impact} />

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {activeTab === 'routine' && (
                  <DiurnalSmogChart
                    aqi={profile.aqi}
                    bestVentilationWindow={bestVentilationWindow}
                  />
                )}

                {activeTab === 'assistant' ? (
                  <AskAssistantView
                    profile={profile}
                    adoptedTitles={adoptedTitles}
                    messages={messages}
                    onAppendMessages={handleAppendMessages}
                  />
                ) : (
                  <ActionWorkspace
                    category={activeTab}
                    actions={actions}
                    adoptedIds={adoptedIds}
                    onToggleAdopt={handleToggleAdopt}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    isLoading={isGeneratingPlan}
                    impactNarrative={impactNarrative}
                  />
                )}
              </motion.div>
            </div>
          </main>
        </div>

        <ProfileCustomizerModal
          open={customizerOpen}
          initialProfile={profile}
          isGenerating={isGeneratingPlan}
          apiError={planError}
          onClose={() => setCustomizerOpen(false)}
          onGeneratePlan={handleGenerateCustomPlan}
          onApplyLocalProfile={handleApplyLocalProfile}
        />

        <AlertToastStack
          alerts={alerts}
          onDismiss={handleDismissAlert}
          onApplyLiveAqi={handleApplyLiveAqi}
        />
      </div>
    </MotionConfig>
  );
}
