import React, { useState } from 'react';
import logoIcon from './assets/logo-icon.png';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FAQSection from './components/FAQSection';
import Footer from './components/Footer';
import { useAuth } from './contexts/AuthContext';
import { startCheckout } from './lib/stripeApi';
import { canAccessTab } from './domain/billing/PlanAccess';
import type { DashboardTab } from './components/dashboard/Sidebar';
import {
  buildCheckoutCancelPath,
  buildCheckoutSuccessPath,
  CheckoutIntent,
  isCheckoutPlanId,
  savePendingCheckoutIntent,
} from './lib/checkoutIntent';
import { usePageSEO } from './hooks/usePageSEO';
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  Zap,
  ShieldCheck,
  ChevronDown,
  HelpCircle,
  Award,
  Lock,
  Bot,
  FileText,
  Mail,
  GraduationCap,
  Layers,
  CheckCircle2,
  Star
} from 'lucide-react';

export default function PricingPage() {
  usePageSEO({
    title: 'Tarifs & Offres — Lettrup PRO',
    description: 'Offres et abonnements Lettrup : commencez gratuitement avec notre essai de 7 jours, puis débloquez les générations illimitées de CV adaptés, scans ATS et coaching IA.',
    canonicalPath: '/pricing',
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const requestedFeature = (searchParams.get('feature') || undefined) as DashboardTab | undefined;
  const [checkoutError, setCheckoutError] = useState<string | null>(
    searchParams.get('checkout') === 'cancelled' ? 'Paiement annulé. Aucune formule n\'a été modifiée.' : null
  );

  const handleSubscribe = async (planId: string) => {
    if (!isCheckoutPlanId(planId)) {
      setCheckoutError('Formule invalide.');
      return;
    }

    const intent: CheckoutIntent = {
      planId,
      interval: billingCycle === 'yearly' ? 'year' : 'month',
      featureTab: requestedFeature as CheckoutIntent['featureTab'],
    };

    if (!user) {
      savePendingCheckoutIntent(intent);
      const params = new URLSearchParams({ mode: 'signup', plan: intent.planId, interval: intent.interval });
      if (intent.featureTab) params.set('feature', intent.featureTab);
      navigate(`/auth?${params.toString()}`);
      return;
    }
    setCheckoutError(null);
    setCheckoutLoadingPlanId(planId);
    try {
      const { error } = await startCheckout(planId, intent.interval, {
        successPath: buildCheckoutSuccessPath(intent),
        cancelPath: buildCheckoutCancelPath(intent),
      });
      if (error === 'not_authenticated') {
        navigate('/auth');
      } else if (error) {
        // Surface the backend's actual reason (e.g. a misconfigured Stripe
        // key/price in this environment) instead of a generic message that
        // hides what really failed — this was previously always overwritten.
        setCheckoutError(error);
      }
    } catch (err) {
      console.error('[PricingPage] Checkout failed unexpectedly:', err);
      setCheckoutError('Impossible de démarrer le paiement. Réessayez dans un instant.');
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  };

  // Discount factor for yearly billing
  const discount = billingCycle === 'yearly' ? 0.8 : 1;

  const plans = [
    {
      id: 'pro',
      technicalName: 'PRO',
      name: 'Accélération Pro',
      positioning: 'La solution complète pour décrocher le poste idéal.',
      priceMonthly: 9.99,
      badge: 'Le plus populaire',
      isRecommended: true,
      features: [
        { text: 'Créateur de CV & Lettres IA', included: true },
        { text: 'Suivi des candidatures (Kanban)', included: true },
        { text: '10 CV + 10 lettres de motivation / mois', included: true },
        { text: 'Trouver un Emploi & Scan LinkedIn', included: true },
        { text: 'Site Personnel (Portfolio Web)', included: true },
        { text: 'Job Match, Historique des scans & Galerie de modèles', included: true },
        { text: 'Simulateur d\'entretien & Stratégie Carrière', included: true },
        { text: 'Learning Hub statique (€0 token)', included: false },
      ],
      cta: 'Choisir la Formule Pro',
      ctaVariant: 'primary',
    },
    {
      id: 'max',
      technicalName: 'MAX',
      name: 'Excellence Master',
      positioning: 'Accompagnement illimité et coaching carrière complet.',
      priceMonthly: 39,
      badge: 'Offre ultime',
      isRecommended: false,
      features: [
        { text: 'Tout illimité (CVs & Lettres)', included: true },
        { text: 'Téléchargements illimités', included: true },
        { text: 'Simulateur d\'entretien & Stratégie Carrière illimités', included: true },
        { text: 'Learning Hub inclus — Prix figé', included: true, highlight: 'Coût tokens = €0 (Statique)' },
        { text: 'Audit ATS prioritaire & Coaching IA', included: true },
        { text: 'Génération de Portfolio Web illimitée', included: true },
        { text: 'Support VIP 7j/7 & Révisions', included: true },
        { text: 'Garantie tarifaire à vie', included: true },
      ],
      cta: 'Souscrire à l\'Offre Max',
      ctaVariant: 'secondary',
    }
  ];

  const faqs = [
    {
      q: "Je n'ai pas besoin d'un abonnement — puis-je payer une seule fois ?",
      a: "Oui. Le compte gratuit vous permet de créer 1 CV et 1 lettre de motivation, avec 1 téléchargement de CV offert chaque mois. Pour créer plusieurs CV/lettres ou télécharger davantage, vous pouvez soit vous abonner, soit acheter un pack unique à 1,99€ qui débloque le téléchargement d'un CV et d'une lettre de motivation."
    },
    {
      q: "Pourquoi le Learning Hub ne génère-t-il aucun surcoût (€0 token) ?",
      a: "Le Learning Hub repose sur une architecture de contenu structuré et statique optimisé. Les modules de formation, fiches méthodologiques et guides d'entretien sont pré-compilés, ce qui permet un accès illimité sans aucune consommation de jetons IA."
    },
    {
      q: "Puis-je changer ou résilier mon abonnement à tout moment ?",
      a: "Absolument. Nos abonnements sont sans aucun engagement de durée. Vous pouvez surclasser, rétrograder ou annuler votre formule en un seul clic depuis votre espace administrateur."
    },
    {
      q: "Que se passe-t-il si je dépasse mon quota mensuel de 10 CV ou lettres ?",
      a: "Vous conservez un accès complet à tous vos documents déjà générés. Une fois les 10 téléchargements du mois utilisés, vous pouvez soit acheter un pack supplémentaire à 1,99€, soit passer à la formule Max pour un accès illimité — c'est vous qui choisissez."
    },
    {
      q: "Les modèles de CV sont-ils certifiés compatibles ATS ?",
      a: "Oui. Tous les modèles générés sur Lettrup respectent les normes de lecture optique des logiciels ATS (Applicant Tracking Systems), utilisés en standard par la grande majorité des grands groupes et cabinets de recrutement."
    }
  ];

  const comparisonCategories = [
    {
      title: "Génération CV & Lettres",
      rows: [
        { feature: "Créateur de CV IA", pro: "✓", max: "Illimité" },
        { feature: "Lettres de motivation IA", pro: "✓", max: "Illimité" },
        { feature: "Téléchargements / mois", pro: "10 CV + 10 lettres", max: "Illimité" },
        { feature: "Exportation PDF HD sans décalage", pro: "✓", max: "✓" },
      ]
    },
    {
      title: "Candidature & Suivi",
      rows: [
        { feature: "Tableau de suivi des candidatures (Kanban)", pro: "✓", max: "✓" },
        { feature: "Trouver un Emploi & Scan LinkedIn", pro: "✓", max: "✓" },
        { feature: "Job Match — Score ATS & Recommandations", pro: "Inclus", max: "Avancé + Audit" },
        { feature: "Historique des scans ATS & Galerie de modèles", pro: "✓", max: "✓" },
        { feature: "Site Personnel (Portfolio Web)", pro: "✓", max: "✓ (Illimité)" },
      ]
    },
    {
      title: "Coaching & Entretien",
      rows: [
        { feature: "Simulateur d'entretien IA (STAR)", pro: "✓", max: "Illimité" },
        { feature: "Stratégie Carrière", pro: "✓", max: "Illimité" },
        { feature: "Learning Hub (Modules & Fiches)", pro: "✗", max: "✓ Inclus (€0 token)" },
        { feature: "Support & Assistance", pro: "Prioritaire", max: "VIP 7j/7" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#007568] selection:text-white antialiased">

      {/* Top Bar Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoIcon} alt="Lettrup" className="w-12 h-12 object-contain group-hover:scale-105 transition-transform" />
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">Lettrup</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">PRO</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-slate-100 border border-slate-200 p-1.5 rounded-full text-xs font-semibold text-slate-600">
            <Link to="/" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Accueil</Link>
            <Link to="/#features" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Fonctionnalités</Link>
            <a href="#plans" className="px-4 py-2 rounded-full bg-primary-container/40 text-tertiary border border-tertiary/20 font-bold">Tarifs</a>
            <Link to="/blog" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Blog & Guides</Link>
            <a href="#matrix" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Comparatif</a>
            <a href="#faq" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95"
            >
              <span>Lancer l'App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Hero Header */}
      <header className="relative bg-transparent pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary-container/50 blur-[140px] rounded-full pointer-events-none" />

        <div className="relative inline-flex items-center gap-2 text-sm font-bold text-[#007568] mb-6">
          <Zap size={14} className="text-[#007568] animate-pulse" />
          Offres transparentes
        </div>

        <h1 className="relative text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-[1.1]">
          Des Formules Adaptées à vos <span className="text-[#007568]">Ambitions</span>
        </h1>

        <p className="relative max-w-2xl mx-auto text-sm sm:text-base text-slate-500 leading-relaxed mb-10">
          Commencez rapidement, puis passez aux outils professionnels lorsque votre recherche d'emploi prend de l'ampleur.
        </p>

        {/* Toggle Billing Period */}
        <div id="plans" className="relative inline-flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-full shadow-xl">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            aria-pressed={billingCycle === 'monthly'}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[#007568] text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Facturation Mensuelle
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            aria-pressed={billingCycle === 'yearly'}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
              billingCycle === 'yearly'
                ? 'bg-[#007568] text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Facturation Annuelle</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs">
              Economisez 20%
            </span>
          </button>
        </div>
      </header>

      {/* Pricing Cards Grid */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {checkoutError && (
          <div className="max-w-xl mx-auto mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-semibold">
            {checkoutError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const calculatedPrice = (plan.priceMonthly * discount).toFixed(2).replace('.', ',');
            const isHighlighted = plan.isRecommended;
            const unlocksRequestedFeature = !requestedFeature || canAccessTab(plan.id, requestedFeature);

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-white border-2 border-[#007568] lg:-translate-y-3'
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Popular / Badge banner */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-tertiary text-white text-xs font-extrabold flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div>
                  {/* Plan header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-tertiary">
                      {plan.technicalName}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-1.5">{plan.name}</h3>

                  {/* Positionnement (max 8 mots) */}
                  <p className="text-xs text-slate-500 italic mb-6 min-h-[32px] leading-snug">
                    « {plan.positioning} »
                  </p>

                  {/* Price display */}
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">{calculatedPrice} €</span>
                      <span className="text-xs text-slate-500 font-semibold">/mois</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <span className="text-xs text-emerald-600 block mt-1">
                        Facturé annuellement (20% d'économie)
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <p className="text-xs text-slate-500 font-bold">Inclus dans l'offre :</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        {feat.included ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 mt-0.5 border border-slate-100">
                            <X size={11} strokeWidth={2} />
                          </div>
                        )}
                        <div className="flex-1">
                          <span className={feat.included ? 'text-slate-700 font-medium' : 'text-slate-400 line-through'}>
                            {feat.text}
                          </span>
                          {feat.highlight && (
                            <span className="block text-xs text-tertiary mt-0.5">
                              ★ {feat.highlight}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer & CTA */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={checkoutLoadingPlanId === plan.id || !unlocksRequestedFeature}
                    className={`w-full py-3.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-wait ${
                      isHighlighted
                        ? 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                        : 'text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95'
                    }`}
                  >
                    <span>
                      {checkoutLoadingPlanId === plan.id
                        ? 'Redirection...'
                        : unlocksRequestedFeature
                        ? plan.cta
                        : 'Formule supérieure requise'}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Pay-per-document option — not a subscription card, a lightweight callout */}
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-sm font-bold text-slate-900">Pas prêt à vous abonner ?</p>
            <p className="text-xs text-slate-500 mt-1">
              Créez votre compte gratuitement — 1 CV + 1 lettre de motivation, avec 1 téléchargement de CV offert chaque mois. Besoin de plus ? CV + Lettre pour 1,99€, sans engagement.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            <span>Essayer gratuitement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Detailed Matrix Comparison Section */}
      <section id="matrix" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Matrice Comparative Détaillée</h2>
          <p className="text-sm text-slate-500 mt-2">Comparez toutes les fonctionnalités incluses dans nos 2 formules.</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="py-4 px-6 text-xs font-bold text-slate-500">Fonctionnalité</th>
                <th className="py-4 px-4 text-xs font-bold text-tertiary text-center bg-primary-container/40 border-x border-tertiary/20">
                  PRO (€9,99)
                </th>
                <th className="py-4 px-4 text-xs font-bold text-slate-600 text-center">MAX (€39)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {comparisonCategories.map((cat, catIdx) => (
                <React.Fragment key={catIdx}>
                  <tr className="bg-slate-50">
                    <td colSpan={3} className="py-3 px-6 text-xs font-bold text-tertiary">
                      {cat.title}
                    </td>
                  </tr>
                  {cat.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-slate-800">{row.feature}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 bg-primary-container/60 border-x border-primary-container">
                        {row.pro}
                      </td>
                      <td className="py-3.5 px-4 text-center text-emerald-600 font-extrabold">{row.max}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <FAQSection light />

      {/* Bottom Final CTA Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center relative overflow-hidden">
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Prêt à Décrocher votre Prochain Poste ?
        </h2>
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
          Inscrivez-vous en 30 secondes et découvrez la puissance de Lettrup pour optimiser l'ensemble de votre candidature.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-xl hover:shadow-slate-900/30 transition-all active:scale-95"
        >
          <span>Créer mon Compte Gratuit</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <Footer light />

    </div>
  );
}
