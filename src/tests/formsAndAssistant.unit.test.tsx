import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestProfile } from '../test/factories';
import type { HouseholdProfile, ProfileValidationErrors } from '../types/air';

const { mockValidateProfileInput } = vi.hoisted(() => ({
  mockValidateProfileInput: vi.fn<(profile: HouseholdProfile) => ProfileValidationErrors>(),
}));

vi.mock('../utils/airImpact', () => ({
  validateProfileInput: mockValidateProfileInput,
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: Record<string, unknown> & { children?: ReactNode }) => {
      const domProps = Object.fromEntries(
        Object.entries(rest).filter(
          ([k]) => !['initial', 'animate', 'exit', 'transition'].includes(k),
        ),
      );
      return <div {...domProps}>{children}</div>;
    },
  },
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <svg data-testid={`icon-${name}`} {...props} />;
    };
  return {
    AlertCircle: icon('AlertCircle'),
    ArrowRight: icon('ArrowRight'),
    MessageSquareText: icon('MessageSquareText'),
    ShieldCheck: icon('ShieldCheck'),
    Sprout: icon('Sprout'),
    X: icon('X'),
  };
});

import { AskAssistantView } from '../components/AskAssistantView';
import { ProfileCustomizerModal } from '../components/ProfileCustomizerModal';

const MOCK_PROFILE = createTestProfile();

describe('AskAssistantView and ProfileCustomizerModal unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateProfileInput.mockReturnValue({});
  });

  describe('AskAssistantView', () => {
    it('validates blank submissions, sends starter/custom prompts, and surfaces server or static errors', async () => {
      const user = userEvent.setup();
      const onAppendMessages = vi.fn();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const { rerender } = render(
        <AskAssistantView
          profile={MOCK_PROFILE}
          adoptedTitles={['Sealed bedroom']}
          messages={[]}
          onAppendMessages={onAppendMessages}
        />,
      );

      expect(screen.getByText(/No questions asked yet for this session/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a question before sending.');
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockResolvedValueOnce(
        new Response('<!doctype html>', { status: 404, headers: { 'content-type': 'text/html' } }),
      );
      await user.click(
        screen.getByRole('button', {
          name: /When is the safest 30-minute window to open windows today\?/i,
        }),
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /Live Gemini AI backend is unavailable on static hosting/i,
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Rate limit reached.' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
      );
      await user.type(
        screen.getByLabelText('Ask a winter smog question'),
        'Can we run kitchen fan?',
      );
      await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Rate limit reached.');

      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: 'Ventilate briefly between 1:30 PM and 2:30 PM.',
            personalTakeaway: 'Cuts indoor CO2 buildup safely.',
            communityTakeaway: 'Avoids re-heating chilled masonry.',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
      await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));

      await waitFor(() => expect(onAppendMessages).toHaveBeenCalledTimes(1));
      const [userMsg, assistantMsg] = onAppendMessages.mock.calls[0];
      expect(userMsg.content).toBe('Can we run kitchen fan?');
      expect(assistantMsg.content).toBe('Ventilate briefly between 1:30 PM and 2:30 PM.');

      rerender(
        <AskAssistantView
          profile={MOCK_PROFILE}
          adoptedTitles={['Sealed bedroom']}
          messages={[userMsg, assistantMsg]}
          onAppendMessages={onAppendMessages}
        />,
      );
      expect(screen.getByText('Your Household Question')).toBeInTheDocument();
      expect(screen.getByText('ClearWinter Guidance')).toBeInTheDocument();
      expect(screen.getByText('Cuts indoor CO2 buildup safely.')).toBeInTheDocument();
    });
  });

  describe('ProfileCustomizerModal', () => {
    it('validates inputs, edits city/AQI, toggles priorities, and handles submit/close flows', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onGeneratePlan = vi.fn(async () => {});
      const onApplyLocalProfile = vi.fn();

      const { rerender } = render(
        <ProfileCustomizerModal
          open={false}
          initialProfile={MOCK_PROFILE}
          isGenerating={false}
          apiError={null}
          onClose={onClose}
          onGeneratePlan={onGeneratePlan}
          onApplyLocalProfile={onApplyLocalProfile}
        />,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <ProfileCustomizerModal
          open={true}
          initialProfile={MOCK_PROFILE}
          isGenerating={false}
          apiError="Previous backend error"
          onClose={onClose}
          onGeneratePlan={onGeneratePlan}
          onApplyLocalProfile={onApplyLocalProfile}
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Previous backend error');

      mockValidateProfileInput.mockReturnValue({
        city: 'Mock city validation failure',
        aqi: 'Mock AQI validation failure',
      });
      await user.click(screen.getByRole('button', { name: 'Apply Locally' }));
      expect(screen.getByText('Mock city validation failure')).toBeInTheDocument();
      expect(screen.getByText('Mock AQI validation failure')).toBeInTheDocument();
      expect(onApplyLocalProfile).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Generate Tailored Plan' }));
      expect(onGeneratePlan).not.toHaveBeenCalled();

      mockValidateProfileInput.mockReturnValue({});
      const cityInput = screen.getByLabelText('City or Neighborhood');
      const aqiInput = screen.getByLabelText(/Current Winter AQI/i);
      await user.clear(cityInput);
      await user.type(cityInput, 'Milan, Italy');
      await user.clear(aqiInput);
      await user.type(aqiInput, '185');

      await user.click(screen.getByLabelText('Low-cost DIY indoor hacks'));
      await user.click(screen.getByRole('button', { name: 'Apply Locally' }));
      expect(onApplyLocalProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Milan, Italy',
          aqi: 185,
          priorities: expect.arrayContaining([
            'Protect children & elders',
            'Low-cost DIY indoor hacks',
          ]),
        }),
      );

      await user.click(screen.getByRole('button', { name: 'Generate Tailored Plan' }));
      await waitFor(() =>
        expect(onGeneratePlan).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Milan, Italy', aqi: 185 }),
        ),
      );

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Close profile customizer' }));
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});
