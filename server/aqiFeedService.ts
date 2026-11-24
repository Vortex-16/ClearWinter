import type { Response } from 'express';

export interface ServerAqiReading {
  city: string;
  aqi: number;
  pm25?: number;
  source: 'open-meteo' | 'station-feed';
  timestamp: string;
}

export interface AqiSubscriber {
  res: Response;
  city: string;
}

export const MAX_SSE_SUBSCRIBERS = 200;
export const MAX_CACHED_CITIES = 500;

export function normalizeCityKey(city: string): string {
  return city.split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');
}

export function citiesOverlap(cityA: string, cityB: string): boolean {
  const a = normalizeCityKey(cityA);
  const b = normalizeCityKey(cityB);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

export async function fetchLiveOpenMeteoAqi(
  city: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<ServerAqiReading | null> {
  const cleanCity = city.split(',')[0].trim();
  if (!cleanCity) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const geoRes = await fetchImpl(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanCity)}&count=1&language=en&format=json`,
      { signal: controller.signal },
    );
    if (!geoRes.ok) return null;

    const geoData = (await geoRes.json()) as {
      results?: Array<{ latitude: number; longitude: number; name: string }>;
    };
    const match = geoData.results?.[0];
    if (!match) return null;

    const aqRes = await fetchImpl(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${match.latitude}&longitude=${match.longitude}&current=us_aqi,pm2_5`,
      { signal: controller.signal },
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
  } finally {
    clearTimeout(timer);
  }
}

export function createAqiFeedHub() {
  const subscribers = new Set<AqiSubscriber>();
  const latestReadings = new Map<string, ServerAqiReading>();

  function cacheReading(reading: ServerAqiReading) {
    const cityKey = normalizeCityKey(reading.city);
    if (!cityKey) return;
    if (latestReadings.size >= MAX_CACHED_CITIES && !latestReadings.has(cityKey)) {
      const oldest = latestReadings.keys().next().value;
      if (oldest !== undefined) latestReadings.delete(oldest);
    }
    latestReadings.set(cityKey, reading);
  }

  function broadcastReading(reading: ServerAqiReading) {
    cacheReading(reading);
    const payload = `event: aqi:reading\ndata: ${JSON.stringify(reading)}\n\n`;
    for (const sub of subscribers) {
      if (citiesOverlap(sub.city, reading.city)) {
        sub.res.write(payload);
      }
    }
  }

  function getCachedReading(city: string): ServerAqiReading | null {
    return latestReadings.get(normalizeCityKey(city)) ?? null;
  }

  return {
    subscribers,
    latestReadings,
    cacheReading,
    broadcastReading,
    getCachedReading,
  };
}
