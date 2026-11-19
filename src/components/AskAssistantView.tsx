import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, MessageSquareText, ShieldCheck, Sprout } from 'lucide-react';
import type { AssistantMessage, HouseholdProfile } from '../types/air';

interface AskAssistantViewProps {
  profile: HouseholdProfile;
  adoptedTitles: string[];
  messages: AssistantMessage[];
  onAppendMessages: (userMsg: AssistantMessage, assistantMsg: AssistantMessage) => void;
}

const STARTER_PROMPTS = [
  'When is the safest 30-minute window to open windows today?',
  'How do we set up a low-cost filter box for our kids bedroom?',
  'What is the highest-impact commute swap our neighborhood can coordinate?',
  'How should we handle evening cooking without spiking indoor PM2.5?',
];

export function AskAssistantView({
  profile,
  adoptedTitles,
  messages,
  onAppendMessages,
}: AskAssistantViewProps) {
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setErrorMessage('Enter a question before sending.');
      return;
    }

    setErrorMessage(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          profile,
          adoptedTitles,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'Live Gemini AI backend is unavailable on static hosting. Run the Express server with GEMINI_API_KEY configured to use interactive Q&A.',
        );
      }

      const data = (await response.json()) as {
        answer?: string;
        personalTakeaway?: string;
        communityTakeaway?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Unable to get a response from ClearWinter assistant.');
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMessage: AssistantMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: now,
      };
      const assistantMessage: AssistantMessage = {
        id: `a-${Date.now() + 1}`,
        role: 'assistant',
        content: data.answer || '',
        personalTakeaway: data.personalTakeaway,
        communityTakeaway: data.communityTakeaway,
        timestamp: now,
      };

      onAppendMessages(userMessage, assistantMessage);
      setQuestion('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network request failed.');
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submitQuestion(question);
  }

  return (
    <section aria-label="Ask ClearWinter Assistant" className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Tailored Winter Smog Q&amp;A
          </h2>
          <p className="text-sm text-slate-600">
            Ask specific questions for {profile.city} (AQI {profile.aqi}) · {profile.householdType} ·{' '}
            {profile.heatingSource}. Responses explain both personal protection and neighborhood emissions impact.
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500">Suggested questions</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {STARTER_PROMPTS.map((promptText) => (
              <button
                key={promptText}
                type="button"
                disabled={isSending}
                onClick={() => void submitQuestion(promptText)}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                <span>{promptText}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900"
        >
          <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold">Assistant Error: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        {messages.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <MessageSquareText
              className="h-6 w-6 text-slate-400 mx-auto"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-slate-900">
              No questions asked yet for this session.
            </p>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Select a suggested prompt above or type your own household scenario below to receive tailored guidance.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-5 space-y-3 ${msg.role === 'user' ? 'bg-slate-50' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">
                    {msg.role === 'user' ? 'Your Household Question' : 'ClearWinter Guidance'}
                  </span>
                  <span className="font-mono tabular-nums">{msg.timestamp}</span>
                </div>

                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {msg.content}
                </p>

                {msg.role === 'assistant' && (msg.personalTakeaway || msg.communityTakeaway) && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {msg.personalTakeaway && (
                      <div className="flex items-start gap-2 text-slate-700">
                        <ShieldCheck
                          className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          <strong className="text-slate-900">Personal Impact: </strong>
                          {msg.personalTakeaway}
                        </span>
                      </div>
                    )}
                    {msg.communityTakeaway && (
                      <div className="flex items-start gap-2 text-slate-700">
                        <Sprout
                          className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          <strong className="text-slate-900">Community Impact: </strong>
                          {msg.communityTakeaway}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 bg-slate-50 rounded-b-xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="assistant-question-input" className="sr-only">
              Ask a winter smog question
            </label>
            <input
              id="assistant-question-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isSending}
              placeholder="Ask about school commutes, mask fit, DIY filters, or heating alternatives..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              {isSending ? 'Analyzing...' : 'Ask Assistant'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
