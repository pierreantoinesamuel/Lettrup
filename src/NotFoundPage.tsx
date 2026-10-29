import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-black text-[#007568] mb-4" aria-hidden="true">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Page introuvable</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#007568] text-white text-sm font-semibold hover:bg-tertiary transition-colors"
          >
            <Home size={16} aria-hidden="true" />
            Retour à l'accueil
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <Search size={16} aria-hidden="true" />
            Mon espace
          </Link>
        </div>
      </div>
    </main>
  );
}
