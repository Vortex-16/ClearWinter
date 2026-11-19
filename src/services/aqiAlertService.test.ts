import { describe, expect, it, vi } from 'vitest';
import {
  fetchLiveAqiReading,
  fetchOpenMeteoDirect,
  getSavedLocationBaseline,
  isBackendAvailable,
  saveLocationBaseline,
  subscribeToAqiAlerts,
} from './aqiAlertService';

describe('aqiAlertService', () => {
  it('persists and retrieves location baselines via localStorage', () => {
    const saved = saveLocationBaseline('  Milan, Italy  ', 184.6);
    expect(saved.city).toBe('Milan, Italy');
    expect(saved.baselineAqi).toBe(185);

    const loaded = getSavedLocationBaseline('Fallback City', 100);
    expect(loaded.city).toBe('Milan, Italy');
    expect(loaded.baselineAqi).toBe(185);
  });

  it('isBackendAvailable returns true only when /api/health serves OK JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await isBackendAvailable()).toBe(true);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<!doctype html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      }),
    );
    expect(await isBackendAvailable()).toBe(false);

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'));
    expect(await isBackendAvailable()).toBe(false);
  });

  it('fetchOpenMeteoDirect geocodes city and returns normalized US AQI reading', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('geocoding-api.open-meteo.com')) {
        return new Response(
          JSON.stringify({ results: [{ latitude: 28.61, longitude: 77.21 }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ current: { us_aqi: 274.4, pm2_5: 198.27 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const reading = await fetchOpenMeteoDirect('Delhi NCR, India');
    expect(reading).not.toBeNull();
    expect(reading?.city).toBe('Delhi NCR, India');
    expect(reading?.aqi).toBe(274);
    expect(reading?.pm25).toBe(198.3);
    expect(reading?.source).toBe('open-meteo');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(await fetchOpenMeteoDirect('   ')).toBeNull();
  });

  it('fetchLiveAqiReading prefers Express backend and falls back to Open-Meteo on static 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          reading: {
            city: 'Lahore, Pakistan',
            aqi: 305,
            pm25: 255.1,
            source: 'station-feed',
            timestamp: '2026-11-19T10:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const fromBackend = await fetchLiveAqiReading('Lahore, Pakistan');
    expect(fromBackend?.source).toBe('station-feed');
    expect(fromBackend?.aqi).toBe(305);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith('/api/aqi-live')) {
        return new Response('<html>404</html>', {
          status: 404,
          headers: { 'content-type': 'text/html' },
        });
      }
      if (url.includes('geocoding-api.open-meteo.com')) {
        return new Response(
          JSON.stringify({ results: [{ latitude: 31.55, longitude: 74.34 }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ current: { us_aqi: 291, pm2_5: 221.4 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const fromFallback = await fetchLiveAqiReading('Lahore, Pakistan');
    expect(fromFallback?.source).toBe('open-meteo');
    expect(fromFallback?.aqi).toBe(291);
  });

  it('subscribeToAqiAlerts falls back cleanly on static hosts and triggers onAlert on worsening AQI', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === '/api/health') {
        return new Response('<html>404</html>', {
          status: 404,
          headers: { 'content-type': 'text/html' },
        });
      }
      if (url.includes('geocoding-api.open-meteo.com')) {
        return new Response(
          JSON.stringify({ results: [{ latitude: 40.76, longitude: -111.89 }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ current: { us_aqi: 225, pm2_5: 175.4 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const onAlert = vi.fn();
    const onReading = vi.fn();
    const unsubscribe = subscribeToAqiAlerts(
      {
        city: 'Salt Lake City, Utah',
        baselineAqi: 168,
        savedAt: '2026-11-19T10:00:00.000Z',
      },
      { onAlert, onReading },
    );

    await vi.waitFor(() => {
      expect(onReading).toHaveBeenCalledTimes(1);
      expect(onAlert).toHaveBeenCalledTimes(1);
    });

    expect(onAlert.mock.calls[0][0].currentAqi).toBe(225);
    expect(onAlert.mock.calls[0][0].currentSeverity).toBe('Very Unhealthy');
    unsubscribe();
  });
});
