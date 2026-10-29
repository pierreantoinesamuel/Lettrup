import { Link } from 'react-router-dom';

interface PrivacyNoticeProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function PrivacyNotice({ id, checked, onChange }: PrivacyNoticeProps) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer leading-6">
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 rounded border-slate-300 bg-white accent-[#007568] shrink-0 focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2"
      />
      <span>
        J'accepte les{' '}
        <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#007568] hover:underline font-semibold">
          Conditions Générales d'Utilisation
        </Link>{' '}
        et la{' '}
        <Link
          to="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#007568] hover:underline font-semibold"
        >
          Politique de Confidentialité
        </Link>
        , notamment le traitement de mes données personnelles décrit dans cette dernière.
      </span>
    </label>
  );
}
