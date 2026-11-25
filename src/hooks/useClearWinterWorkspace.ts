import { useMemo, useState } from 'react';
import { REGIONAL_PRESETS } from '../data/presets';
import { requestTailoredPlan } from '../services/planApiService';
import type {
  AdoptionFilter,
  AirAction,
  AqiAlertToast,
  AssistantMessage,
  HouseholdProfile,
  WorkspaceTab,
} from '../types/air';
import { calculateImpactSummary, classifyAqiBand } from '../utils/airImpact';
import { useAqiAlerts } from './useAqiAlerts';

/**
 * Central application state controller coordinating regional presets, household profile
 * impact recalculations, live AQI alerts, and custom Gemini plan flows.
 */
export function useClearWinterWorkspace() {
  const initialPreset = REGIONAL_PRESETS[0];

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
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const {
    savedBaseline,
    alerts,
    isCheckingLive,
    saveBaseline: saveAlertBaseline,
    checkLiveAqi,
    dismissAlert,
  } = useAqiAlerts(initialPreset.profile, setLiveAnnouncement);

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

  function openCustomizer() {
    setPlanError(null);
    setCustomizerOpen(true);
  }

  function closeCustomizer() {
    setCustomizerOpen(false);
  }

  function selectPreset(presetId: string) {
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

  function toggleAdopt(actionId: string) {
    setAdoptedIds((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId],
    );
  }

  function saveBaseline() {
    saveAlertBaseline(profile.city, profile.aqi);
  }

  function applyLiveAqi(alert: AqiAlertToast) {
    setProfile((prev) => ({
      ...prev,
      city: alert.city,
      aqi: alert.currentAqi,
    }));
    dismissAlert(alert.id);
  }

  function applyLocalProfile(nextProfile: HouseholdProfile) {
    setActivePresetId(null);
    setProfile(nextProfile);
    setPlanError(null);
    setCustomizerOpen(false);
    setLiveAnnouncement(
      `Updated profile locally for ${nextProfile.city} at AQI ${nextProfile.aqi}.`,
    );
  }

  async function generateCustomPlan(nextProfile: HouseholdProfile) {
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

  function appendMessages(userMsg: AssistantMessage, assistantMsg: AssistantMessage) {
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  }

  return {
    savedBaseline,
    activeTab,
    setActiveTab,
    activePresetId,
    profile,
    actions,
    adoptedIds,
    bestVentilationWindow,
    impactNarrative,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    messages,
    customizerOpen,
    openCustomizer,
    closeCustomizer,
    isGeneratingPlan,
    planError,
    alerts,
    isCheckingLive,
    liveAnnouncement,
    impact,
    aqiBand,
    counts,
    adoptedTitles,
    selectPreset,
    toggleAdopt,
    saveBaseline,
    checkLiveAqi,
    dismissAlert,
    applyLiveAqi,
    applyLocalProfile,
    generateCustomPlan,
    appendMessages,
  };
}
