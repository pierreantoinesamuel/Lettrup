import { Eye, EyeOff } from 'lucide-react';

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
  controls: string;
}

export default function PasswordVisibilityToggle({ visible, onToggle, controls }: PasswordVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-controls={controls}
      aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 focus:ring-2 focus:ring-[#bcefe4] outline-hidden transition-colors cursor-pointer"
    >
      {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );
}
