import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, User, CreditCard, ShieldAlert, Bell, Check, Trash2, Download,
  Sparkles, RefreshCw, Globe, ChevronRight, Lock, Cookie
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { hasAnalyticsConsent, saveCookieConsent } from '../../services/cookieConsent';
import { openBillingPortal, startCheckout, startSetupSession } from '../../lib/stripeApi';
import { exportMyAccountData } from '../../lib/accountApi';
import PasswordStrengthIndicator, { passwordMeetsRules } from '../auth/PasswordStrengthIndicator';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'security' | 'plan' | 'preferences' | 'danger';

const PLAN_INFO: Record<string, { label: string; description: string; price: string }> = {
  free_trial: {
    label: 'GRATUIT',
    description: '1 CV + 1 lettre de motivation, Suivi de candidatures, 1 CV téléchargeable gratuitement/mois — plus de documents ou de lettres à 1,99 €.',
    price: '0,00 €'
  },
  pro: {
    label: 'PRO — Accélération Pro',
    description: '10 CV + 10 lettres/mois, Recherche d\'emploi, LinkedIn, Portfolio, Job Match, Historique & Modèles.',
    price: '9,99 €'
  },
  max: {
    label: 'MAX — Excellence Master',
    description: 'Tout illimité (CVs & Lettres), Simulateur d\'entretien, Stratégie Carrière & Learning Hub inclus.',
    price: '39,99 €'
  }
};

// Selectable in the inline plan switcher below, in ascending order. free_trial
// is excluded — it's never something a user "switches to", only a starting state.
const SELECTABLE_PLAN_IDS = ['pro', 'max'] as const;

export default function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
  const { user, updateUser, deleteAccount, signIn, updatePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile state
  const [name, setName] = useState(user?.name || 'Jim Halpert');
  const [email, setEmail] = useState(user?.email || 'jim.halpert@cvpilot.fr');
  const [language, setLanguage] = useState(user?.language || 'fr');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security / change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Plan (read-only — real plan changes go through billing, not this modal)
  const currentPlanKey = user?.plan || 'free_trial';
  const currentPlanInfo = PLAN_INFO[currentPlanKey] || PLAN_INFO.free_trial;

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications ?? true);
  const [analyticsConsent, setAnalyticsConsent] = useState(hasAnalyticsConsent());

  // Delete modal confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Billing portal (Stripe-hosted, self-service upgrade/downgrade/cancel)
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleManageBilling = async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const { error } = await openBillingPortal();
      if (error) {
        setPortalError(error === 'not_authenticated' ? 'Veuillez vous reconnecter.' : error);
      }
    } catch (err) {
      console.error('[UserSettingsModal] Billing portal failed unexpectedly:', err);
      setPortalError('Impossible d\'ouvrir la gestion de facturation. Réessayez dans un instant.');
    } finally {
      setPortalLoading(false);
    }
  };

  // Inline plan switcher — starts Stripe Checkout for the selected plan
  // directly from this modal (monthly billing; the full Pricing page still
  // covers yearly billing and side-by-side feature comparison).
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleChangePlan = async (planId: string) => {
    setCheckoutError(null);
    setCheckoutLoadingPlanId(planId);
    try {
      const { error } = await startCheckout(planId, 'month');
      if (error) {
        // Surface the backend's actual reason instead of a generic message
        // that hides what really failed.
        setCheckoutError(error === 'not_authenticated' ? 'Veuillez vous reconnecter.' : error);
      }
    } catch (err) {
      console.error('[UserSettingsModal] Plan change failed unexpectedly:', err);
      setCheckoutError('Impossible de démarrer le paiement. Réessayez dans un instant.');
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  };

  // free_trial only: register a card via Stripe (setup, no charge) ahead of
  // subscribing — same Checkout redirect pattern as handleChangePlan/handleManageBilling.
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleAddPaymentMethod = async () => {
    setSetupError(null);
    setSetupLoading(true);
    try {
      const { error } = await startSetupSession();
      if (error) {
        setSetupError(error === 'not_authenticated' ? 'Veuillez vous reconnecter.' : error);
      }
    } catch (err) {
      console.error('[UserSettingsModal] Payment method setup failed unexpectedly:', err);
      setSetupError('Impossible d\'enregistrer votre carte. Réessayez dans un instant.');
    } finally {
      setSetupLoading(false);
    }
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, language });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordMeetsRules(newPassword)) {
      setPasswordError('Le nouveau mot de passe ne respecte pas encore les critères ci-dessous.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (!user?.email) {
      setPasswordError('Utilisateur non connecté.');
      return;
    }

    setPasswordSubmitting(true);
    // Re-verify the current password before changing it — a valid session
    // alone shouldn't be enough (e.g. an unlocked, unattended device).
    const { error: signInError } = await signIn(user.email, currentPassword);
    if (signInError) {
      setPasswordSubmitting(false);
      setPasswordError('Mot de passe actuel incorrect.');
      return;
    }

    const { error } = await updatePassword(newPassword);
    setPasswordSubmitting(false);
    if (error) {
      setPasswordError(error);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordSuccess(true);
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const handleExportData = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      const { data, error } = await exportMyAccountData();
      if (error || !data) {
        setExportError(error || "L'export des données a échoué.");
        return;
      }
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `cvpilot_user_data_${user?.id || 'export'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        setDeleteError(error);
        return;
      }
      onClose();
      window.location.href = '/';
    } catch (err) {
      console.error('[UserSettingsModal] Account deletion failed unexpectedly:', err);
      setDeleteError('La suppression du compte a échoué. Réessayez dans un instant.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // User initials
  const initials = (name || 'JH')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-settings-modal-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {initials}
              </div>
              <div>
                <h3 id="user-settings-modal-title" className="text-base font-bold text-gray-900">Paramètres du compte</h3>
                <p className="text-xs text-slate-500">Gérez votre profil, votre formule d'abonnement et vos préférences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Layout: Left Tabs + Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-56 bg-slate-50/50 border-r border-slate-200 p-4 space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <User size={16} />
                <span>Mon Profil</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'security'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Lock size={16} />
                <span>Sécurité</span>
              </button>

              <button
                onClick={() => setActiveTab('plan')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'plan'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <CreditCard size={16} />
                <span>Formule & Offre</span>
                <span className="ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--status-green)]/10 text-[var(--status-green)]">
                  {currentPlanKey.replace('_', ' ')}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'preferences'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Bell size={16} />
                <span>Préférences</span>
              </button>

              <div className="pt-4 mt-4 border-t border-slate-200">
                <button
                  onClick={() => setActiveTab('danger')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'danger'
                      ? 'bg-[var(--status-red)] text-white shadow-xs'
                      : 'text-[var(--status-red)] hover:bg-[var(--status-red)]/10'
                  }`}
                >
                  <ShieldAlert size={16} />
                  <span>Zone de Danger</span>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-white">
              {/* TAB 1: PROFILE */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Informations Personnelles</h4>
                    <p className="text-xs text-slate-500 mb-4">Ces détails seront affichés dans votre tableau de bord Lettrup.</p>
                  </div>

                  {saveSuccess && (
                    <div className="p-3 bg-[var(--status-green)]/10 border border-[var(--status-green)]/30 text-[var(--status-green)] rounded-xl text-xs flex items-center gap-2">
                      <Check size={16} className="text-[var(--status-green)] shrink-0" />
                      <span>Modifications enregistrées avec succès !</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-hidden transition-all"
                        placeholder="Ex: Jim Halpert"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse e-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full px-3.5 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-hidden transition-all"
                        placeholder="Ex: jim.halpert@cvpilot.fr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Langue de l'interface</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-hidden bg-white"
                      >
                        <option value="fr">🇫🇷 Français (Par défaut)</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="de">🇩🇪 Deutsch</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors shadow-xs"
                    >
                      Enregistrer les modifications
                    </button>
                  </div>
                </form>
              )}

              {/* TAB: SECURITY / CHANGE PASSWORD */}
              {activeTab === 'security' && (
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Changer mon mot de passe</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Confirmez votre mot de passe actuel puis choisissez-en un nouveau.
                    </p>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3 bg-[var(--status-green)]/10 border border-[var(--status-green)]/30 text-[var(--status-green)] rounded-xl text-xs flex items-center gap-2">
                      <Check size={16} className="text-[var(--status-green)] shrink-0" />
                      <span>Mot de passe mis à jour avec succès.</span>
                    </div>
                  )}

                  {passwordError && (
                    <div
                      id="password-change-error"
                      role="alert"
                      className="p-3 bg-[var(--status-red)]/10 border border-[var(--status-red)]/30 text-[var(--status-red)] rounded-xl text-xs"
                    >
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'password-change-error' : undefined}
                      className="w-full px-3.5 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'password-change-error' : undefined}
                      className="w-full px-3.5 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-hidden transition-all"
                    />
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? 'password-change-error' : undefined}
                      className="w-full px-3.5 py-2.5 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-hidden transition-all"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordSubmitting}
                      className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-wait"
                    >
                      {passwordSubmitting ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: PLAN & FORMULE */}
              {activeTab === 'plan' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Votre Formule d'Abonnement</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Vos avantages et crédits sont automatiquement synchronisés avec votre formule Lettrup.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-gray-900 bg-gray-50/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{currentPlanInfo.label}</span>
                        <span className="text-[10px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded-full">
                          Formule Actuelle
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{currentPlanInfo.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-sm font-extrabold text-gray-900">{currentPlanInfo.price}</span>
                      <span className="text-[10px] text-slate-500 block">/ mois</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-gray-900">Changer de formule</h5>
                      <Link to="/pricing" onClick={onClose} className="text-[11px] font-semibold text-slate-500 hover:text-gray-900 transition-colors">
                        Comparatif complet & facturation annuelle
                      </Link>
                    </div>

                    {checkoutError && (
                      <p className="text-[11px] text-[var(--status-red)] mb-2">{checkoutError}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SELECTABLE_PLAN_IDS.filter((planId) => planId !== currentPlanKey).map((planId) => {
                        const info = PLAN_INFO[planId];
                        const isLoading = checkoutLoadingPlanId === planId;
                        return (
                          <div key={planId} className="p-3.5 rounded-xl border border-gray-200 flex flex-col justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-bold text-gray-900 block">{info.label}</span>
                              <span className="text-sm font-extrabold text-gray-900 block mt-1">
                                {info.price} <span className="text-[10px] font-medium text-slate-500">/ mois</span>
                              </span>
                              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{info.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleChangePlan(planId)}
                              disabled={checkoutLoadingPlanId !== null}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg text-[11px] font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-wait"
                            >
                              <Sparkles size={12} />
                              {isLoading ? 'Redirection...' : 'Choisir cette formule'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {currentPlanKey !== 'free_trial' && (
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
                    >
                      <CreditCard size={14} />
                      {portalLoading ? 'Ouverture...' : 'Gérer ma facturation'}
                    </button>
                  )}

                  {portalError && (
                    <p className="text-[11px] text-[var(--status-red)] text-center">{portalError}</p>
                  )}

                  {currentPlanKey === 'free_trial' && (
                    user?.hasPaymentMethod ? (
                      <p className="flex items-center justify-center gap-2 text-[11px] font-semibold text-emerald-600">
                        <Check size={14} />
                        Carte de paiement enregistrée
                      </p>
                    ) : (
                      <button
                        onClick={handleAddPaymentMethod}
                        disabled={setupLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
                      >
                        <CreditCard size={14} />
                        {setupLoading ? 'Redirection...' : 'Enregistrer une carte de paiement'}
                      </button>
                    )
                  )}

                  {setupError && (
                    <p className="text-[11px] text-[var(--status-red)] text-center">{setupError}</p>
                  )}
                </div>
              )}

              {/* TAB 3: PREFERENCES & EXPORT */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Préférences & Données</h4>
                    <p className="text-xs text-slate-500 mb-4">Gérez la confidentialité et les alertes de votre compte.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">Notifications e-mail</h5>
                        <p className="text-[11px] text-slate-500">Recevez les rapports hebdomadaires et recommandations IA.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => {
                          setEmailNotifications(e.target.checked);
                          updateUser({ emailNotifications: e.target.checked });
                        }}
                        className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <Cookie size={13} className="text-[var(--status-orange)]" />
                          Cookies de mesure d'audience
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Autorisez-nous à mesurer l'usage du site pour l'améliorer. Désactivé par défaut.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={analyticsConsent}
                        onChange={(e) => {
                          setAnalyticsConsent(e.target.checked);
                          saveCookieConsent(e.target.checked);
                        }}
                        className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">Exporter mes données (RGPD)</h5>
                        <p className="text-[11px] text-slate-500">Téléchargez une copie complète de vos données au format JSON : profil, CVs, lettres de motivation, portfolios, historique de scans ATS, simulations d'entretien, audits LinkedIn et candidatures.</p>
                        {exportError && <p className="text-[11px] text-[var(--status-red)] mt-1">{exportError}</p>}
                      </div>
                      <button
                        onClick={handleExportData}
                        disabled={isExporting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Download size={14} />
                        {isExporting ? 'Export en cours…' : 'Exporter'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DANGER ZONE */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--status-red)] mb-1">Zone de Danger</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Les actions dans cette section ont un impact irréversible sur votre compte.
                    </p>
                  </div>

                  <div className="p-4 bg-[var(--status-red)]/10 border border-[var(--status-red)]/30 rounded-xl space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={20} className="text-[var(--status-red)] shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-[var(--status-red)]">Supprimer mon compte définitivement</h5>
                        <p className="text-[11px] text-[var(--status-red)] mt-1">
                          Toutes vos données seront définitivement effacées de nos serveurs : profil, CVs, lettres de motivation, portfolios, historique de scans ATS, simulations d'entretien, audits LinkedIn et candidatures envoyées. Cette action est irréversible.
                        </p>
                      </div>
                    </div>

                    {deleteError && (
                      <div
                        id="delete-account-error"
                        role="alert"
                        className="p-3 bg-white border border-[var(--status-red)]/40 text-[var(--status-red)] rounded-xl text-xs"
                      >
                        {deleteError}
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-[var(--status-red)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                        >
                          Supprimer mon compte
                        </button>
                      ) : (
                        <div className="bg-white p-3 rounded-xl border border-[var(--status-red)]/40 shadow-sm space-y-2 text-right w-full">
                          <p className="text-xs font-bold text-[var(--status-red)] text-left">
                            Êtes-vous absolument sûr ? Cette opération ne peut pas être annulée.
                          </p>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              disabled={deleteSubmitting}
                              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold disabled:opacity-60"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleDelete}
                              disabled={deleteSubmitting}
                              className="px-3 py-1.5 bg-[var(--status-red)] text-white hover:opacity-90 rounded-lg text-xs font-bold disabled:opacity-60 disabled:cursor-wait"
                            >
                              {deleteSubmitting ? 'Suppression...' : 'Oui, tout supprimer'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
