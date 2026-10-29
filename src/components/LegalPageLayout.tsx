import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Footer from './Footer';
import logoIcon from '../assets/logo-icon.png';
import { usePageSEO } from '../hooks/usePageSEO';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  canonicalPath: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, canonicalPath, children }: LegalPageLayoutProps) {
  usePageSEO({ title: `${title} — Lettrup`, canonicalPath });

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-tertiary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[#456071] hover:text-tertiary transition-colors text-sm font-semibold"
          >
            <ChevronLeft size={16} /> Retour à l'accueil
          </Link>
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Lettrup" className="w-10 h-10 object-contain" />
            <span className="font-black text-base tracking-tight text-tertiary">Lettrup</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-tertiary/10 p-6 sm:p-12">
          <h1 className="text-3xl sm:text-5xl font-black text-tertiary tracking-tight leading-[1.1] mb-3">{title}</h1>
          <p className="text-sm text-[#456071] mb-10">Dernière mise à jour : {lastUpdated}</p>

          <div className="space-y-8 text-sm text-[#244354] leading-relaxed [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-tertiary [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-[#244354] [&_a]:text-[#007568] [&_a]:underline [&_a]:underline-offset-4">
            {children}
          </div>
        </div>
      </div>

      <Footer light />
    </div>
  );
}
