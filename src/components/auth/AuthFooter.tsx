import { Link } from 'react-router-dom';

interface AuthFooterProps {
  prompt: string;
  linkTo: string;
  linkLabel: string;
}

export default function AuthFooter({ prompt, linkTo, linkLabel }: AuthFooterProps) {
  return (
    <p className="mt-6 text-center text-sm leading-6 text-slate-700">
      {prompt}{' '}
      <Link
        to={linkTo}
        className="font-semibold text-[#007568] hover:text-[#005d52] hover:underline rounded outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2"
      >
        {linkLabel}
      </Link>
    </p>
  );
}
