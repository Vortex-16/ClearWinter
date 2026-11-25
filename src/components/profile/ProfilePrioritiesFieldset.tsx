import { PRIORITY_OPTIONS } from './profileFormConstants';

interface ProfilePrioritiesFieldsetProps {
  selectedPriorities: string[];
  onTogglePriority: (priority: string) => void;
}

/**
 * Checkbox fieldset allowing households to select top winter smog mitigation priorities.
 */
export function ProfilePrioritiesFieldset({
  selectedPriorities,
  onTogglePriority,
}: ProfilePrioritiesFieldsetProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-slate-700">Top Priorities for This Plan</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRIORITY_OPTIONS.map((priority) => {
          const checked = selectedPriorities.includes(priority);
          return (
            <label
              key={priority}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                checked
                  ? 'border-teal-600 bg-teal-50 text-teal-900 font-medium'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onTogglePriority(priority)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              />
              <span>{priority}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
