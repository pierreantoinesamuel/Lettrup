import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { startCheckout } from '../lib/stripeApi';
import { startExportCheckout, fetchPricingInfo, formatPrice, PricingInfo, DocumentType } from '../lib/exportApi';
import { useAuth } from '../contexts/AuthContext';
import { logUserActivity } from '../services/analytics';

export interface ExportPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  /** Optional: only used to tag the checkout metadata / analytics, never to change gating logic. */
  documentId?: string;
  /** Set when the user hit their Pro monthly quota rather than never having a subscription — swaps in different copy. */
  reason?: 'quota_exceeded' | 'no_subscription';
}

const COPY: Record<DocumentType, { title: string; subtitle: string }> = {
  cv: {
    title: 'Votre CV est prêt 🎉',
    subtitle: 'Choisissez la formule qui vous convient pour télécharger votre CV.',
  },
  cover_letter: {
    title: 'Votre lettre de motivation est prête 🎉',
    subtitle: 'Choisissez la formule qui vous convient pour la télécharger.',
  },
};

const PRO_QUOTA_EXCEEDED_SUBTITLE =
  'Vous avez utilisé vos 10 téléchargements ce mois-ci — passez à Max pour un accès illimité, ou achetez un crédit supplémentaire.';
const FREE_QUOTA_EXCEEDED_SUBTITLE =
  'Vous avez déjà utilisé votre CV gratuit ce mois-ci — passez à Pro pour 10 CV + 10 lettres/mois, ou achetez un crédit supplémentaire.';

const SUBSCRIPTION_FEATURES: Record<'pro' | 'max', string[]> = {
  pro: [
    '10 CV + 10 lettres de motivation / mois',
    'Recherche d\'emploi, LinkedIn & portfolio',
    'Job Match, historique & modèles',
    'Export PDF + DOCX',
    'Résiliable à tout moment',
  ],
  max: [
    'Téléchargements illimités',
    'CV et lettres de motivation illimités',
    'Tout Pro + Learning Hub inclus',
    'Export PDF + DOCX',
    'Résiliable à tout moment',
  ],
};

export default function ExportPaywallModal({ isOpen, onClose, documentType, reason }: ExportPaywallModalProps) {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<PricingInfo>({});
  const [loadingOption, setLoadingOption] = useState<'subscription' | 'one_time' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPricingInfo().then(setPricing);
      setError(null);
      setLoadingOption(null);
    }
  }, [isOpen]);

  // Focus trap + Escape-to-close + background scroll lock, standard modal a11y.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copy = COPY[documentType];
  // A Pro subscriber who exhausted their monthly quota is already on Pro —
  // offering "Commencer Pro" again would be nonsensical, so the upsell
  // becomes Max (unlimited). A free user who used their one free CV
  // download of the month gets pushed to Pro instead, its natural next
  // step up.
  const isProExhausted = reason === 'quota_exceeded' && (user?.plan === 'pro' || user?.plan === 'plus');
  const subtitle =
    reason === 'quota_exceeded'
      ? isProExhausted
        ? PRO_QUOTA_EXCEEDED_SUBTITLE
        : FREE_QUOTA_EXCEEDED_SUBTITLE
      : copy.subtitle;
  const subscriptionPlanId = isProExhausted ? 'max' : 'pro';
  const subscriptionPlanLabel = subscriptionPlanId === 'max' ? 'Max' : 'Pro';
  const subscriptionPriceLabel = formatPrice(
    subscriptionPlanId === 'max' ? pricing.maxMonthly : pricing.subscriptionMonthly
  );
  const oneTimePriceLabel = formatPrice(pricing.exportBundle);

  const handleSubscribe = async () => {
    setError(null);
    setLoadingOption('subscription');
    if (user?.id) logUserActivity(user.id, 'subscription_checkout_started', { documentType, planId: subscriptionPlanId });
    const { error: checkoutError } = await startCheckout(subscriptionPlanId, 'month');
    if (checkoutError) {
      setError('Impossible de démarrer le paiement. Réessayez dans un instant.');
      setLoadingOption(null);
    }
  };

  const handleOneTimePurchase = async () => {
    setError(null);
    setLoadingOption('one_time');
    if (user?.id) logUserActivity(user.id, 'one_time_checkout_started', { documentType });
    const { error: checkoutError } = await startExportCheckout(documentType);
    if (checkoutError) {
      setError('Impossible de démarrer le paiement. Réessayez dans un instant.');
      setLoadingOption(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-paywall-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto"
        >
          <div className="px-6 pt-6 pb-2 text-center relative">
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 id="export-paywall-title" className="text-lg sm:text-xl font-black text-slate-900">
              {copy.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">{subtitle}</p>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OPTION A — Subscription */}
            <div className="relative rounded-2xl border-2 border-sky-400 bg-sky-50/60 p-5 flex flex-col">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-sky-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                Recommandé
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-2">{subscriptionPlanLabel}</h3>
              <div className="mt-1 mb-3">
                <span className="text-2xl font-black text-slate-900">{subscriptionPriceLabel || '—'}</span>
                {subscriptionPriceLabel && <span className="text-xs text-slate-500"> / mois</span>}
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 flex-1">
                {SUBSCRIPTION_FEATURES[subscriptionPlanId].map((feat) => (
                  <li key={feat} className="flex items-start gap-1.5">
                    <Check size={13} className="text-sky-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-500 mt-3 mb-2">Sans engagement — résiliable à tout moment.</p>
              <button
                onClick={handleSubscribe}
                disabled={loadingOption !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {loadingOption === 'subscription' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Commencer {subscriptionPlanLabel}
              </button>
            </div>

            {/* OPTION B — One-time purchase */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
              <h3 className="text-sm font-black text-slate-900">Achat unique</h3>
              <div className="mt-1 mb-3">
                <span className="text-2xl font-black text-slate-900">{oneTimePriceLabel || '—'}</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 flex-1">
                {['1 CV + 1 lettre de motivation', 'Suivi des candidatures inclus', 'PDF haute qualité', 'Aucun abonnement', 'Aucun renouvellement automatique'].map(
                  (feat) => (
                    <li key={feat} className="flex items-start gap-1.5">
                      <Check size={13} className="text-slate-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  )
                )}
              </ul>
              <button
                onClick={handleOneTimePurchase}
                disabled={loadingOption !== null}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {loadingOption === 'one_time' ? <Loader2 size={14} className="animate-spin" /> : null}
                Télécharger{oneTimePriceLabel ? ` pour ${oneTimePriceLabel}` : ''}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-center text-[11px] text-[var(--status-red)] font-semibold px-6 -mt-2 mb-2">{error}</p>
          )}

          <div className="px-6 pb-6 pt-1 flex flex-col items-center gap-3">
            <p className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <ShieldCheck size={12} />
              Paiement sécurisé par Stripe
            </p>
            <p className="text-[11px] text-slate-500 text-center">
              Vous pourrez continuer à modifier votre document à tout moment.
            </p>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2"
            >
              Continuer la modification
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
