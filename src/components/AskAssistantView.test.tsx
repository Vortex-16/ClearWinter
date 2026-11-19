import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REGIONAL_PRESETS } from '../data/presets';
import { AskAssistantView } from './AskAssistantView';

const preset = REGIONAL_PRESETS[0];

describe('AskAssistantView component', () => {
  it('shows validation error when submitting an empty question', async () => {
    const user = userEvent.setup();

    render(
      <AskAssistantView
        profile={preset.profile}
        adoptedTitles={['Bedroom Sanctuary']}
        messages={[]}
        onAppendMessages={vi.fn()}
      />,
    );

    expect(screen.getByText(/No questions asked yet for this session/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a question before sending.');
  });

  it('sends question to /api/ask and appends user + assistant takeaway messages', async () => {
    const user = userEvent.setup();
    const onAppendMessages = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          answer: 'Ventilate briefly between 1:30 PM and 2:15 PM.',
          personalTakeaway: 'Cuts indoor CO2 without letting evening soot inside.',
          communityTakeaway: 'Preserves indoor heat and lowers space-heater draw.',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    render(
      <AskAssistantView
        profile={preset.profile}
        adoptedTitles={['Bedroom Sanctuary']}
        messages={[]}
        onAppendMessages={onAppendMessages}
      />,
    );

    await user.type(
      screen.getByLabelText('Ask a winter smog question'),
      'When can we open windows?',
    );
    await user.click(screen.getByRole('button', { name: 'Ask Assistant' }));

    await vi.waitFor(() => {
      expect(onAppendMessages).toHaveBeenCalledTimes(1);
    });

    const [userMsg, assistantMsg] = onAppendMessages.mock.calls[0];
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toBe('When can we open windows?');
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toContain('1:30 PM');
    expect(assistantMsg.personalTakeaway).toContain('CO2');
  });

  it('surfaces honest static-host guidance when /api/ask returns HTML 404 and propagates server errors', async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<html>Not Found</html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      }),
    );

    render(
      <AskAssistantView
        profile={preset.profile}
        adoptedTitles={[]}
        messages={[
          {
            id: 'm1',
            role: 'assistant',
            content: 'Existing answer.',
            personalTakeaway: 'Lower PM2.5 dose.',
            communityTakeaway: 'Less idling.',
            timestamp: '09:00 AM',
          },
        ]}
        onAppendMessages={vi.fn()}
      />,
    );

    expect(screen.getByText('Existing answer.')).toBeInTheDocument();
    expect(screen.getByText(/Lower PM2.5 dose/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /When is the safest 30-minute window to open windows today\?/i,
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Live Gemini AI backend is unavailable on static hosting/i,
    );
  });
});
