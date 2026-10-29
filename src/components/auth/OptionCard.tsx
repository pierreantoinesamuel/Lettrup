import { CheckCircle2 } from 'lucide-react';

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}

export default function OptionCard({ selected, onClick, title, desc }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full min-h-11 p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 focus-visible:ring-2 focus-visible:ring-sky-400 outline-hidden ${
        selected
          ? 'bg-sky-50 border-sky-400 text-slate-900 shadow-md'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
      }`}
    >
      <div>
        <div className="text-sm font-bold">{title}</div>
        {desc && <div className="text-xs text-slate-600 mt-0.5">{desc}</div>}
      </div>
      {selected && <CheckCircle2 size={18} className="text-sky-700 shrink-0" aria-hidden="true" />}
    </button>
  );
}
