import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

function mockStaticEndpoints(liveAqi = 312) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === '/api/health') {
      return new Response('<html>404</html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      });
    }
    if (url.startsWith('/api/aqi-live')) {
      return new Response(
        JSON.stringify({
          reading: {
            city: 'Delhi NCR, India',
            aqi: liveAqi,
            pm25: 315.4,
            source: 'station-feed',
            timestamp: '2026-11-19T13:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('geocoding-api.open-meteo.com')) {
      return new Response(
        JSON.stringify({ results: [{ latitude: 28.61, longitude: 77.21 }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url.includes('air-quality-api.open-meteo.com')) {
      return new Response(
        JSON.stringify({ current: { us_aqi: liveAqi, pm2_5: 315.4 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('<html>404</html>', {
      status: 404,
      headers: { 'content-type': 'text/html' },
    });
  });
}

describe('App integration flows', () => {
  it('switches regional presets, toggles habit adoption, and recalculates impact metrics', async () => {
    mockStaticEndpoints(312);
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText(/Delhi NCR, India · AQI 312 \(Hazardous\)/i)).toBeInTheDocument();
    const initialCut = screen.getByTestId('metric-exposure-cut').textContent;

    const adoptRoutineBtn = screen.getByRole('button', {
      name: /Adopt 'Replace solo cold-start school car runs with Metro \+ walking bus'/i,
    });
    await user.click(adoptRoutineBtn);

    expect(screen.getByTestId('metric-exposure-cut').textContent).not.toBe(initialCut);
    expect(screen.getByTestId('metric-co2e-avoided')).toHaveTextContent('32.2 kg');

    await user.click(screen.getByRole('button', { name: /Salt Lake City/i }));
    expect(screen.getByText(/Salt Lake City, Utah · AQI 168 \(Unhealthy\)/i)).toBeInTheDocument();
  });

  it('triggers live AQI worsening toast and applies the live AQI when confirmed', async () => {
    mockStaticEndpoints(365);
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /Check Live AQI/i }));
    const toast = await screen.findByTestId('aqi-toast-365');
    expect(toast).toHaveTextContent('365 AQI');

    await user.click(screen.getByRole('button', { name: 'Apply 365 AQI' }));
    expect(screen.queryByTestId('aqi-toast-365')).not.toBeInTheDocument();
    expect(screen.getByText(/Delhi NCR, India · AQI 365 \(Hazardous\)/i)).toBeInTheDocument();
  });

  it('navigates to Ask Assistant tab and updates custom location locally without emojis or gradients', async () => {
    mockStaticEndpoints(312);
    const user = userEvent.setup();

    const { container } = render(<App />);

    await user.click(screen.getByRole('button', { name: /Ask Assistant/i }));
    expect(screen.getByRole('heading', { name: /Tailored Winter Smog Q&A/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tailor with AI/i }));
    const cityInput = screen.getByLabelText('City or Neighborhood');
    const aqiInput = screen.getByLabelText(/Current Winter AQI/i);
    await user.clear(cityInput);
    await user.type(cityInput, 'Milan, Italy');
    await user.clear(aqiInput);
    await user.type(aqiInput, '185');
    await user.click(screen.getByRole('button', { name: 'Apply Locally' }));

    expect(screen.getByText(/Milan, Italy · AQI 185 \(Unhealthy\)/i)).toBeInTheDocument();
    expect(/\p{Extended_Pictographic}/u.test(container.innerHTML)).toBe(false);
    expect(/bg-gradient-to|linear-gradient/i.test(container.innerHTML)).toBe(false);
  });
});
