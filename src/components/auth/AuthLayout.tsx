import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import logoIcon from '../../assets/logo-icon.png';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  progress?: React.ReactNode;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, icon, progress, children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-[#f3f7fa] text-slate-950 flex flex-col justify-between px-4 py-5 sm:px-6 sm:py-6 selection:bg-[#007568] selection:text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-slate-950 focus:text-white focus:text-sm focus:font-semibold outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2"
      >
        Aller au contenu principal
      </a>
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-slate-700 hover:text-slate-950 transition-colors text-sm font-semibold rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2"
        >
          <ChevronLeft size={16} aria-hidden="true" /> Retour à l'accueil
        </Link>
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="Lettrup" className="w-10 h-10 object-contain" />
          <span className="font-bold text-sm text-slate-950">Lettrup</span>
        </div>
      </div>

      <main id="main-content" className="w-full max-w-[30rem] mx-auto my-6 sm:my-10">
        <div className="bg-white rounded-lg border border-tertiary/10 p-6 sm:p-10 shadow-[0_30px_80px_-40px_rgba(11,64,86,0.35)]">
          <div className="text-center mb-8">
            <h1 className="text-[clamp(1.9rem,4.5vw,2.6rem)] leading-[1.1] font-black tracking-tight text-tertiary">
              {title}
            </h1>
            <p className="text-base leading-6 text-[#456071] mt-3">{subtitle}</p>
            {progress}
          </div>
          {children}
        </div>
      </main>

      <div className="text-center text-sm leading-6 text-slate-600">
        &copy; {new Date().getFullYear()} Lettrup - Plateforme d'optimisation de carrière &amp; recrutement par IA.
      </div>
    </div>
  );
}
