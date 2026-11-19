import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGIONAL_PRESETS } from '../data/presets';
import { ProfileCustomizerModal } from './ProfileCustomizerModal';

const preset = REGIONAL_PRESETS[0];

describe('ProfileCustomizerModal component', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ProfileCustomizerModal
        open={false}
        initialProfile={preset.profile}
        isGenerating={false}
        apiError={null}
        onClose={vi.fn()}
        onGeneratePlan={vi.fn()}
        onApplyLocalProfile={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('validates invalid city and out-of-range AQI before submitting or applying locally', async () => {
    const user = userEvent.setup();
    const onGeneratePlan = vi.fn().mockResolvedValue(undefined);
    const onApplyLocalProfile = vi.fn();

    render(
      <ProfileCustomizerModal
        open={true}
        initialProfile={preset.profile}
        isGenerating={false}
        apiError={null}
        onClose={vi.fn()}
        onGeneratePlan={onGeneratePlan}
        onApplyLocalProfile={onApplyLocalProfile}
      />,
    );

    const cityInput = screen.getByLabelText('City or Neighborhood');
    const aqiInput = screen.getByLabelText(/Current Winter AQI/i);

    await user.clear(cityInput);
    await user.clear(aqiInput);
    await user.type(aqiInput, '700');
    await user.click(screen.getByRole('button', { name: 'Generate Tailored Plan' }));

    expect(screen.getByText(/Enter a city or neighborhood name/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter a valid AQI value between 1 and 500/i)).toBeInTheDocument();
    expect(onGeneratePlan).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Apply Locally' }));
    expect(onApplyLocalProfile).not.toHaveBeenCalled();
  });

  it('submits sanitized profile via Apply Locally and Generate Tailored Plan, and closes on Escape', async () => {
    const user = userEvent.setup();
    const onGeneratePlan = vi.fn().mockResolvedValue(undefined);
    const onApplyLocalProfile = vi.fn();
    const onClose = vi.fn();

    render(
      <ProfileCustomizerModal
        open={true}
        initialProfile={preset.profile}
        isGenerating={false}
        apiError="Server unavailable"
        onClose={onClose}
        onGeneratePlan={onGeneratePlan}
        onApplyLocalProfile={onApplyLocalProfile}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');

    const cityInput = screen.getByLabelText('City or Neighborhood');
    const aqiInput = screen.getByLabelText(/Current Winter AQI/i);
    await user.clear(cityInput);
    await user.type(cityInput, 'Milan, Italy');
    await user.clear(aqiInput);
    await user.type(aqiInput, '185');

    const diyCheckbox = screen.getByRole('checkbox', { name: 'Low-cost DIY indoor hacks' });
    await user.click(diyCheckbox);
    expect(diyCheckbox).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Apply Locally' }));
    expect(onApplyLocalProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Milan, Italy',
        aqi: 185,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Generate Tailored Plan' }));
    expect(onGeneratePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Milan, Italy',
        aqi: 185,
      }),
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
