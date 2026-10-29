import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { getCookieConsent, saveCookieConsent } from '../services/cookieConsent';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // No stored decision yet: nothing beyond strictly necessary cookies runs
    // until the user actively chooses here.
    setVisible(getCookieConsent() === null);
  }, []);

  // Trap focus inside the banner while it is visible
  useEffect(() => {
    if (!visible) return;
    const el = bannerRef.current;
    if (!el) return;
    const focusable = (): HTMLElement[] => Array.from(el.querySelectorAll(FOCUSABLE)) as HTMLElement[];
    // Auto-focus first element
    focusable()[0]?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, expanded]);

  const acceptAll = () => {
    saveCookieConsent(true);
    setVisible(false);
  };

  const rejectNonEssential = () => {
    saveCookieConsent(false);
    setVisible(false);
  };

  const saveCustomChoices = () => {
    saveCookieConsent(analyticsChecked);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Préférences relatives aux cookies"
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="max-w-3xl mx-auto bg-[#0B0B10] border border-slate-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-300">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-[#007568]/30 border border-blue-400/20 flex items-center justify-center">
            <Cookie size={18} className="text-[#D97706]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white mb-1.5">Votre choix concernant les cookies</h2>
            <p className="text-xs leading-relaxed text-slate-400">
              Nous utilisons des cookies strictement nécessaires au fonctionnement de Lettrup (connexion, sécurité).
              Avec votre accord, nous utilisons aussi des cookies de mesure d'audience pour comprendre l'usage du
              site. Aucune donnée de mesure d'audience n'est collectée avant votre validation. Consultez notre{' '}
              <Link to="/cookie-policy" className="text-amber-400 hover:underline">
                politique de cookies
              </Link>
              {' '}et notre{' '}
              <Link to="/privacy" className="text-amber-400 hover:underline">
                politique de confidentialité
              </Link>
              .
            </p>

            {expanded && (
              <div className="mt-4 space-y-2.5 border-t border-slate-800 pt-4">
                <label className="flex items-start gap-3 text-xs cursor-not-allowed opacity-70">
                  <input type="checkbox" checked disabled className="mt-0.5 accent-[#007568]" />
                  <span>
                    <span className="font-bold text-slate-200">Cookies strictement nécessaires</span>
                    <span className="block text-slate-500">
                      Toujours actifs — indispensables à la connexion et à la sécurité du site.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analyticsChecked}
                    onChange={(e) => setAnalyticsChecked(e.target.checked)}
                    className="mt-0.5 accent-[#007568]"
                  />
                  <span>
                    <span className="font-bold text-slate-200">Mesure d'audience</span>
                    <span className="block text-slate-500">
                      Nous aide à comprendre l'utilisation du site pour l'améliorer. Désactivé par défaut.
                    </span>
                  </span>
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              {expanded ? 'Masquer les détails' : 'Personnaliser mes choix'}
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          {expanded ? (
            <button
              type="button"
              onClick={saveCustomChoices}
              className="px-4 py-2.5 rounded-xl bg-[#007568] hover:bg-blue-900 border border-blue-400/30 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              Enregistrer mes choix
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-white/5 font-bold text-xs transition-colors"
              >
                Refuser les cookies non essentiels
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-4 py-2.5 rounded-xl bg-[#007568] hover:bg-blue-900 border border-blue-400/30 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={14} className="text-[#D97706]" />
                Accepter tout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
