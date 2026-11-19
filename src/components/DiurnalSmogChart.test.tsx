import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DiurnalSmogChart } from './DiurnalSmogChart';

describe('DiurnalSmogChart component', () => {
  it('renders 24 interactive hourly bars defaulting to 2 PM midday ventilation window', () => {
    render(
      <DiurnalSmogChart
        aqi={280}
        bestVentilationWindow="1:30 PM – 3:30 PM (peak solar mixing)"
      />,
    );

    const bars = screen.getAllByRole('button');
    expect(bars).toHaveLength(24);
    expect(screen.getByText(/Best Window: 1:30 PM – 3:30 PM/i)).toBeInTheDocument();

    const defaultHourButton = screen.getByRole('button', { name: /^2 PM:/i });
    expect(defaultHourButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Peak solar mixing · Best ventilation window')).toBeInTheDocument();
  });

  it('updates the active hour inspection readout when clicking an inversion peak bar', async () => {
    const user = userEvent.setup();

    render(
      <DiurnalSmogChart
        aqi={280}
        bestVentilationWindow="1:30 PM – 3:30 PM (peak solar mixing)"
      />,
    );

    const morningBar = screen.getByRole('button', { name: /^8 AM:/i });
    await user.click(morningBar);

    expect(morningBar).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Morning commute + shallow cold trap')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^2 PM:/i })).toHaveAttribute('aria-pressed', 'false');
  });
});
