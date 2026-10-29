import { Check, X } from 'lucide-react';

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'Au moins 8 caractères', test: (pw) => pw.length >= 8 },
  { label: 'Une majuscule et une minuscule', test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: 'Au moins un chiffre', test: (pw) => /\d/.test(pw) },
];

export function passwordMeetsRules(password: string): boolean {
  return RULES.every((rule) => rule.test(password));
}

export default function PasswordStrengthIndicator({ password }: { password: string }) {
  const passedCount = RULES.filter((rule) => rule.test(password)).length;
  const strengthLabel = passedCount <= 1 ? 'Faible' : passedCount === 2 ? 'Moyen' : 'Solide';
  const barColor = passedCount <= 1 ? 'bg-red-500' : passedCount === 2 ? 'bg-amber-500' : 'bg-emerald-600';

  return (
    <div className="mt-3 space-y-2" aria-label="Règles de mot de passe">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${(passedCount / RULES.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-slate-700 shrink-0" aria-live="polite">
          {password ? strengthLabel : ''}
        </span>
      </div>
      <ul className="space-y-1">
        {RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`text-sm leading-5 flex items-center gap-1.5 ${passed ? 'text-emerald-700' : 'text-slate-600'}`}
            >
              {passed ? (
                <Check size={14} className="shrink-0" aria-hidden="true" />
              ) : (
                <X size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
