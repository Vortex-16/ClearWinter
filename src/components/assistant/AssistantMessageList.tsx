import { MessageSquareText, ShieldCheck, Sprout } from 'lucide-react';
import type { AssistantMessage } from '../../types/air';

interface AssistantMessageListProps {
  messages: AssistantMessage[];
}

/**
 * Renders the assistant empty state or accessible conversation log with
 * separate personal and community impact takeaway callouts per assistant turn.
 */
export function AssistantMessageList({ messages }: AssistantMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <MessageSquareText className="h-6 w-6 text-slate-500 mx-auto" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900">
          No questions asked yet for this session.
        </p>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Select a suggested prompt above or type your own household scenario below to receive
          tailored guidance.
        </p>
      </div>
    );
  }

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Assistant conversation history"
      className="divide-y divide-slate-200"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`p-5 space-y-3 ${msg.role === 'user' ? 'bg-slate-50' : 'bg-white'}`}
        >
          <div className="flex items-center justify-between text-xs text-slate-600">
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
  );
}
