import {
  evaluateAqiWorsening,
  loadSavedBaseline,
  persistSavedBaseline,
} from '../utils/aqiAlertRules';
import type {
  AqiAlertToast,
  AqiReadingEvent,
  SavedLocationBaseline,
} from '../types/air';

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSavedLocationBaseline(
  fallbackCity: string,
  fallbackAqi: number,
): SavedLocationBaseline {
  return loadSavedBaseline(getBrowserStorage(), {
    city: fallbackCity,
    baselineAqi: fallbackAqi,
    savedAt: new Date().toISOString(),
  });
}

export function saveLocationBaseline(city: string, aqi: number): SavedLocationBaseline {
  const next: SavedLocationBaseline = {
    city: city.trim(),
    baselineAqi: Math.round(aqi),
    savedAt: new Date().toISOString(),
  };
  persistSavedBaseline(getBrowserStorage(), next);
  return next;
}

export interface AqiStreamHandlers {
  onAlert: (alert: AqiAlertToast) => void;
  onReading?: (reading: AqiReadingEvent) => void;
  onError?: (message: string) => void;
}

/**
 * Subscribes to the server-authoritative SSE stream for the saved location
 * and emits an AqiAlertToast whenever local AQI worsens beyond the saved baseline.
 */
export function subscribeToAqiAlerts(
  baseline: SavedLocationBaseline,
  handlers: AqiStreamHandlers,
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  let lastAlertedAqi: number | null = null;
  const url = `/api/aqi-stream?city=${encodeURIComponent(baseline.city)}`;
  const source = new EventSource(url);

  const handleReadingEvent = (rawData: string) => {
    try {
      const reading = JSON.parse(rawData) as AqiReadingEvent;
      handlers.onReading?.(reading);
      const alert = evaluateAqiWorsening({
        baseline,
        reading,
        lastAlertedAqi,
      });
      if (alert) {
        lastAlertedAqi = alert.currentAqi;
        handlers.onAlert(alert);
      }
    } catch {
      // Ignore malformed SSE payload
    }
  };

  source.addEventListener('aqi:reading', (event) => {
    const messageEvent = event as MessageEvent<string>;
    handleReadingEvent(messageEvent.data);
  });

  source.onerror = () => {
    // EventSource automatically reconnects; notify optional handler quietly
    handlers.onError?.('Live AQI stream reconnecting...');
  };

  return () => {
    source.close();
  };
}

export async function fetchLiveAqiReading(city: string): Promise<AqiReadingEvent | null> {
  const response = await fetch(`/api/aqi-live?city=${encodeURIComponent(city)}`);
  const data = (await response.json()) as {
    reading?: AqiReadingEvent | null;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || 'Unable to check live AQI reading.');
  }
  return data.reading ?? null;
}
