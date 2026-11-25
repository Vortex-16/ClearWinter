import { useEffect, useState } from 'react';
import {
  fetchLiveAqiReading,
  getSavedLocationBaseline,
  saveLocationBaseline,
  subscribeToAqiAlerts,
} from '../services/aqiAlertService';
import type { AqiAlertToast, HouseholdProfile, SavedLocationBaseline } from '../types/air';
import { evaluateAqiWorsening } from '../utils/aqiAlertRules';

function appendUniqueAlert(prev: AqiAlertToast[], incoming: AqiAlertToast): AqiAlertToast[] {
  const alreadyVisible = prev.some(
    (item) => item.city === incoming.city && item.currentAqi === incoming.currentAqi,
  );
  return alreadyVisible ? prev : [incoming, ...prev].slice(0, 3);
}

/**
 * Manages persisted location baselines, real-time SSE/Open-Meteo alert subscriptions,
 * and on-demand live station checks without blocking workspace interactions.
 */
export function useAqiAlerts(
  initialProfile: HouseholdProfile,
  onAnnounce: (message: string) => void,
) {
  const [savedBaseline, setSavedBaseline] = useState<SavedLocationBaseline>(() =>
    getSavedLocationBaseline(initialProfile.city, initialProfile.aqi),
  );
  const [alerts, setAlerts] = useState<AqiAlertToast[]>([]);
  const [isCheckingLive, setIsCheckingLive] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAqiAlerts(savedBaseline, {
      onAlert: (incomingAlert) => {
        setAlerts((prev) => appendUniqueAlert(prev, incomingAlert));
      },
    });
    return unsubscribe;
  }, [savedBaseline]);

  function saveBaseline(city: string, aqi: number) {
    const next = saveLocationBaseline(city, aqi);
    setSavedBaseline(next);
    setAlerts([]);
    onAnnounce(`Saved ${next.city} baseline at ${next.baselineAqi} AQI.`);
  }

  async function checkLiveAqi() {
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
          setAlerts((prev) => appendUniqueAlert(prev, alert));
        }
      }
    } catch {
      // Live station telemetry checks are advisory and never block workspace interaction
    } finally {
      setIsCheckingLive(false);
    }
  }

  function dismissAlert(alertId: string) {
    setAlerts((prev) => prev.filter((item) => item.id !== alertId));
  }

  return {
    savedBaseline,
    alerts,
    isCheckingLive,
    saveBaseline,
    checkLiveAqi,
    dismissAlert,
  };
}
