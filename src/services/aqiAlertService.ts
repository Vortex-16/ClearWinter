import {
  evaluateAqiWorsening,
  loadSavedBaseline,
  persistSavedBaseline,
} from '../utils/aqiAlertRules';
import type { AqiAlertToast, AqiReadingEvent, SavedLocationBaseline } from '../types/air';

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads the saved alert baseline from browser storage or falls back to the provided city/AQI. */
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

/** Saves the user's current city and AQI threshold as their persisted alert baseline. */
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

/** Checks whether the Express backend is running rather than static hosting by verifying JSON health response. */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    return contentType.includes('application/json');
  } catch {
    return false;
  }
}

/** Queries public Open-Meteo geocoding and air-quality endpoints directly when running on static hosting. */
export async function fetchOpenMeteoDirect(city: string): Promise<AqiReadingEvent | null> {
  const cleanCity = city.split(',')[0].trim();
  if (!cleanCity) return null;

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`,
    );
    if (!geoRes.ok) return null;
    const geoData = (await geoRes.json()) as {
      results?: Array<{ latitude: number; longitude: number }>;
    };
    const match = geoData.results?.[0];
    if (!match) return null;

    const aqRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${match.latitude}&longitude=${match.longitude}&current=us_aqi,pm2_5`,
    );
    if (!aqRes.ok) return null;
    const aqData = (await aqRes.json()) as {
      current?: { us_aqi?: number; pm2_5?: number };
    };
    const usAqi = aqData.current?.us_aqi;
    if (typeof usAqi !== 'number' || !Number.isFinite(usAqi)) return null;

    return {
      city,
      aqi: Math.round(usAqi),
      pm25:
        typeof aqData.current?.pm2_5 === 'number'
          ? Number(aqData.current.pm2_5.toFixed(1))
          : undefined,
      source: 'open-meteo',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Subscribes to the server-authoritative SSE stream when the Express backend is present,
 * or falls back cleanly to direct CORS Open-Meteo checks on static hosts (e.g. GitHub Pages).
 */
export function subscribeToAqiAlerts(
  baseline: SavedLocationBaseline,
  handlers: AqiStreamHandlers,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let closed = false;
  let lastAlertedAqi: number | null = null;
  let source: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const processReading = (reading: AqiReadingEvent) => {
    if (closed) return;
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
  };

  void isBackendAvailable().then((hasBackend) => {
    if (closed) return;

    if (hasBackend && typeof EventSource !== 'undefined') {
      const url = `/api/aqi-stream?city=${encodeURIComponent(baseline.city)}`;
      source = new EventSource(url);

      source.addEventListener('aqi:reading', (event) => {
        const messageEvent = event as MessageEvent<string>;
        try {
          processReading(JSON.parse(messageEvent.data) as AqiReadingEvent);
        } catch {
          // Ignore malformed SSE payload
        }
      });

      source.onerror = () => {
        handlers.onError?.('Live AQI stream reconnecting...');
      };
    } else {
      // Static-host mode (e.g., GitHub Pages): poll public Open-Meteo CORS API directly
      const runStaticCheck = async () => {
        const live = await fetchOpenMeteoDirect(baseline.city);
        if (live) processReading(live);
      };
      void runStaticCheck();
      pollTimer = setInterval(() => {
        void runStaticCheck();
      }, 120_000);
    }
  });

  return () => {
    closed = true;
    source?.close();
    if (pollTimer !== null) {
      clearInterval(pollTimer);
    }
  };
}

/** Fetches the latest AQI reading from Express (/api/aqi-live) or falls back to direct Open-Meteo CORS polling. */
export async function fetchLiveAqiReading(city: string): Promise<AqiReadingEvent | null> {
  try {
    const response = await fetch(`/api/aqi-live?city=${encodeURIComponent(city)}`);
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const data = (await response.json()) as {
        reading?: AqiReadingEvent | null;
        error?: string;
      };
      return data.reading ?? null;
    }
  } catch {
    // Fall through to direct Open-Meteo fetch on static deployments
  }

  return fetchOpenMeteoDirect(city);
}
