import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: Record<string, unknown> & { children?: ReactNode }) => <div {...rest}>{children}</div>,
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

const MOCK_PROFILE: HouseholdProfile = {
  city: 'Delhi NCR, India',
  aqi: 312,
  householdType: 'Family with young children & elders',
  heatingSource: 'Portable electric room heaters',
  commuteMode: 'Metro + short car school drop-off',
  housingType: 'Older apartment with drafty windows',
  priorities: ['Protect children & elders'],
};

describe('AskAssistantView and ProfileCustomizerModal unit tests (mocked fetch, motion, icons, utils)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateProfileInput.mockReturnValue({});
  });

  describe('AskAssistantView', () => {
    it('validates blank submissions without network calls, sends starter/custom prompts, and surfaces server or static errors', async () => {
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

      // Blank question validation
      await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a question before sending.');
      expect(fetchSpy).not.toHaveBeenCalled();

      // Static HTML fallback response error
      fetchSpy.mockResolvedValueOnce(
        new Response('<!doctype html>', {
          status: 404,
          headers: { 'content-type': 'text/html' },
        }),
      );
      await user.click(
        screen.getByRole('button', {
          name: /When is the safest 30-minute window to open windows today\?/i,
        }),
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /Live Gemini AI backend is unavailable on static hosting/i,
      );

      // Server JSON error
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Rate limit reached.' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
      );
      await user.type(screen.getByLabelText('Ask a winter smog question'), 'Can we run kitchen fan?');
      await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Rate limit reached.');

      // Successful JSON response
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
      expect(assistantMsg.personalTakeaway).toBe('Cuts indoor CO2 buildup safely.');

      // Renders populated message history
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
      expect(screen.getByText('Avoids re-heating chilled masonry.')).toBeInTheDocument();
    });
  });

  describe('ProfileCustomizerModal', () => {
    it('renders conditionally, validates inputs via mocked validator, toggles priorities, and handles submit/close flows', async () => {
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

      // Failed validation blocks Apply Locally & Submit
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

      // Valid submission and priority toggle
      mockValidateProfileInput.mockReturnValue({});
      await user.click(screen.getByLabelText('Low-cost DIY indoor hacks'));
      await user.click(screen.getByRole('button', { name: 'Apply Locally' }));
      expect(onApplyLocalProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          priorities: expect.arrayContaining([
            'Protect children & elders',
            'Low-cost DIY indoor hacks',
          ]),
        }),
      );

      await user.click(screen.getByRole('button', { name: 'Generate Tailored Plan' }));
      await waitFor(() => expect(onGeneratePlan).toHaveBeenCalledTimes(1));

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Close profile customizer' }));
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });
});
