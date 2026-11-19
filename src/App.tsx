import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { REGIONAL_PRESETS } from './data/presets';
import { calculateImpactSummary, classifyAqiBand } from './utils/airImpact';
import { evaluateAqiWorsening } from './utils/aqiAlertRules';
import {
  fetchLiveAqiReading,
  getSavedLocationBaseline,
  saveLocationBaseline,
  subscribeToAqiAlerts,
} from './services/aqiAlertService';
import type {
  AdoptionFilter,
  AirAction,
  AqiAlertToast,
  AssistantMessage,
  GeneratedPlanPayload,
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

  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<AqiAlertToast[]>([]);
  const [isCheckingLive, setIsCheckingLive] = useState(false);

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

  async function handleGenerateCustomPlan(nextProfile: HouseholdProfile) {
    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextProfile),
      });

      const data = (await response.json()) as Partial<GeneratedPlanPayload> & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate tailored plan.');
      }

      if (!Array.isArray(data.actions) || data.actions.length === 0) {
        throw new Error('Assistant returned an empty action list. Please try again.');
      }

      setActivePresetId(null);
      setProfile(nextProfile);
      setActions(data.actions);
      setAdoptedIds(data.actions.slice(0, 3).map((item) => item.id));
      setBestVentilationWindow(
        data.bestVentilationWindow || '1:30 PM – 3:30 PM (peak afternoon dispersion)',
      );
      setImpactNarrative(
        data.impactNarrative ||
          `Tailored plan for ${nextProfile.city} at AQI ${nextProfile.aqi}.`,
      );
      setStatusFilter('all');
      setSearchQuery('');
      setMessages([]);
      setCustomizerOpen(false);
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
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
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
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          profile={profile}
          onOpenCustomizer={() => {
            setPlanError(null);
            setCustomizerOpen(true);
          }}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          isGenerating={isGeneratingPlan}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 text-xs sm:text-sm ${aqiBand.surfaceClass} ${aqiBand.borderColorClass}`}
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
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900"
              >
                <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{planError}</span>
              </div>
            )}

            <ImpactStrip profile={profile} impact={impact} />

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
      />

      <AlertToastStack
        alerts={alerts}
        onDismiss={handleDismissAlert}
        onApplyLiveAqi={handleApplyLiveAqi}
      />
    </div>
  );
}
