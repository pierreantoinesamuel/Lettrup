import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Check,
  Lock,
  Bell,
  Globe,
  CreditCard,
  Download,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Cookie,
  User as UserIcon,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnalyticsConsent, saveCookieConsent } from '../../services/cookieConsent';
import { openBillingPortal, startCheckout } from '../../lib/stripeApi';
import { exportMyAccountData } from '../../lib/accountApi';
import PasswordStrengthIndicator, { passwordMeetsRules } from '../auth/PasswordStrengthIndicator';

type ProfileSubTab = 'informations' | 'preferences' | 'securite';

const LOCATION_OPTIONS = [
  'Paris, France',
  'Lyon, France',
  'Marseille, France',
  'Bordeaux, France',
  'Toulouse, France',
  'Nantes, France',
  'Lille, France',
  'Strasbourg, France',
  'Rennes, France',
  'Nice, France',
  'Montpellier, France',
  'Télétravail / France',
];

function splitFullName(fullName?: string): { firstName: string; lastName: string } {
  const trimmed = (fullName || '').trim();
  if (!trimmed) {
    return { firstName: 'Thomas', lastName: 'Martin' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export default function UserProfileView() {
  const { user, updateUser, deleteAccount, signIn, updatePassword } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('informations');

  const avatarStorageKey = `cvpilot_user_avatar_${user?.id || 'default'}`;
  const locationStorageKey = `cvpilot_user_location_${user?.id || 'default'}`;

  const initialNames = splitFullName(user?.name);
  const [firstName, setFirstName] = useState(initialNames.firstName);
  const [lastName, setLastName] = useState(initialNames.lastName);
  const [email, setEmail] = useState(user?.email || 'thomas.martin@email.com');
  const [location, setLocation] = useState<string>(() => {
    try {
      return localStorage.getItem(locationStorageKey) || 'Paris, France';
    } catch {
      return 'Paris, France';
    }
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(avatarStorageKey);
    } catch {
      return null;
    }
  });

  const [targetTitle, setTargetTitle] = useState(user?.targetTitle || 'Data Analyst');
  const [language, setLanguage] = useState(user?.language || 'fr');
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications ?? true);
  const [analyticsConsent, setAnalyticsConsent] = useState(hasAnalyticsConsent());

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Export & Delete
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Billing
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.name) {
      const parsed = splitFullName(user.name);
      setFirstName(parsed.firstName);
      setLastName(parsed.lastName);
    }
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.targetTitle) {
      setTargetTitle(user.targetTitle);
    }
  }, [user?.name, user?.email, user?.targetTitle]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        try {
          localStorage.setItem(avatarStorageKey, reader.result);
          window.dispatchEvent(new CustomEvent('cvpilot-profile-updated'));
        } catch {
          // Ignore storage quota issues
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveInformation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Utilisateur';
    try {
      try {
        localStorage.setItem(locationStorageKey, location);
        window.dispatchEvent(new CustomEvent('cvpilot-profile-updated'));
      } catch {
        // Ignore storage errors
      }
      const { error } = await updateUser({
        name: fullName,
        targetTitle: targetTitle.trim() || undefined,
        language,
        emailNotifications,
      });
      if (error && !error.includes('Supabase n\'est pas configuré')) {
        setSaveError(error);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwordMeetsRules(newPassword)) {
      setPasswordError('Le nouveau mot de passe ne respecte pas les critères requis.');
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

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        setDeleteError(error);
        return;
      }
      window.location.href = '/';
    } catch {
      setDeleteError('La suppression du compte a échoué. Réessayez dans un instant.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgradePro = async () => {
    setCheckoutLoading(true);
    try {
      await startCheckout('pro', 'month');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'TM';

  return (
    <div className="space-y-6 pb-20 md:pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102d3e] tracking-tight">
          Mon profil
        </h1>
        <p className="text-sm text-[#456071] mt-1">
          Gérez vos informations personnelles et vos préférences.
        </p>
      </div>

      {/* Horizontal Tabs (Informations | Préférences | Sécurité) */}
      <div className="border-b border-[#dce7ed]">
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            type="button"
            onClick={() => setActiveSubTab('informations')}
            className={`pb-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'informations'
                ? 'border-[#007568] text-[#007568]'
                : 'border-transparent text-[#456071] hover:text-[#102d3e]'
            }`}
          >
            Informations
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('preferences')}
            className={`pb-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'preferences'
                ? 'border-[#007568] text-[#007568]'
                : 'border-transparent text-[#456071] hover:text-[#102d3e]'
            }`}
          >
            Préférences
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('securite')}
            className={`pb-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'securite'
                ? 'border-[#007568] text-[#007568]'
                : 'border-transparent text-[#456071] hover:text-[#102d3e]'
            }`}
          >
            Sécurité
          </button>
        </div>
      </div>

      {/* TAB 1: INFORMATIONS */}
      {activeSubTab === 'informations' && (
        <div className="bg-white border border-[#dce7ed] rounded-2xl p-6 sm:p-8 shadow-xs max-w-4xl">
          <form onSubmit={handleSaveInformation} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Avatar Photo */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="w-full max-w-[220px] bg-[#f8fafc] border border-[#e3edf2] rounded-2xl p-6 flex flex-col items-center gap-4">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-[#062b3b] flex items-center justify-center text-white text-3xl font-extrabold select-none">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${firstName} ${lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-white hover:bg-[#edf3f6] text-xs font-bold text-[#102d3e] transition-colors cursor-pointer shadow-2xs"
                >
                  <Camera size={14} className="text-[#007568]" />
                  <span>Changer la photo</span>
                </button>
              </div>
            </div>

            {/* Right Column: Personal Information Fields */}
            <div className="md:col-span-8 space-y-5">
              {saveError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <Check size={15} className="text-emerald-600 shrink-0" />
                  <span>Vos informations ont été enregistrées avec succès.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5">
                  Prénom
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Thomas"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:ring-2 focus:ring-[#007568]/25 focus:border-[#007568] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Martin"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:ring-2 focus:ring-[#007568]/25 focus:border-[#007568] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="thomas.martin@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:ring-2 focus:ring-[#007568]/25 focus:border-[#007568] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5">
                  Localisation
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#456071] pointer-events-none" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:ring-2 focus:ring-[#007568]/25 focus:border-[#007568] transition-all cursor-pointer"
                  >
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto min-w-[200px] px-8 py-3 rounded-xl bg-[#007568] hover:bg-[#006257] text-white font-bold text-sm shadow-md shadow-[#007568]/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PRÉFÉRENCES */}
      {activeSubTab === 'preferences' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl">
          <div className="lg:col-span-7 bg-white border border-[#dce7ed] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#102d3e] flex items-center gap-2">
                <Bell size={18} className="text-[#007568]" />
                Préférences de l'application
              </h2>
              <p className="text-xs text-[#456071] mt-1">
                Personnalisez votre expérience Lettrup et vos alertes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5 flex items-center gap-1.5">
                  <UserIcon size={14} className="text-[#007568]" />
                  Poste cible principal
                </label>
                <input
                  type="text"
                  value={targetTitle}
                  onChange={(e) => setTargetTitle(e.target.value)}
                  placeholder="ex: Data Analyst, Chef de Projet..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:border-[#007568]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5 flex items-center gap-1.5">
                  <Globe size={14} className="text-[#007568]" />
                  Langue de l'interface et de l'IA
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:border-[#007568]"
                >
                  <option value="fr">Français (FR)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#f8fafc] border border-[#dce7ed]">
                <div>
                  <p className="text-sm font-bold text-[#102d3e]">Notifications par email</p>
                  <p className="text-xs text-[#456071] mt-0.5">
                    Recevoir des conseils carrière et rappels de suivi de candidatures.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-5 h-5 accent-[#007568] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-[#f8fafc] border border-[#dce7ed]">
                <div>
                  <p className="text-sm font-bold text-[#102d3e] flex items-center gap-1.5">
                    <Cookie size={15} className="text-[#007568]" />
                    Mesure d'audience (RGPD)
                  </p>
                  <p className="text-xs text-[#456071] mt-0.5">
                    Autoriser les cookies analytiques anonymisés pour améliorer Lettrup.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsConsent}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setAnalyticsConsent(next);
                    saveCookieConsent(next);
                  }}
                  className="w-5 h-5 accent-[#007568] rounded cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveInformation}
                className="px-6 py-2.5 rounded-xl bg-[#007568] hover:bg-[#006257] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Enregistrer les préférences
              </button>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="lg:col-span-5 bg-white border border-[#dce7ed] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d2f3eb] text-[#007568] text-xs font-extrabold uppercase">
                <CreditCard size={13} />
                Formule actuelle : {(user?.plan || 'free_trial').replace('_', ' ')}
              </div>
              <h3 className="text-lg font-extrabold text-[#102d3e]">
                Abonnement & Facturation
              </h3>
              <p className="text-xs text-[#456071] leading-relaxed">
                Accédez à tous les outils IA illimités, modèles premium et analyses ATS avancées pour booster votre carrière.
              </p>
            </div>

            <div className="space-y-2.5">
              {(!user?.plan || user.plan === 'free_trial') && (
                <button
                  type="button"
                  onClick={handleUpgradePro}
                  disabled={checkoutLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#007568] hover:bg-[#006257] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles size={15} />
                  <span>{checkoutLoading ? 'Redirection...' : 'Passer à la formule Pro'}</span>
                </button>
              )}

              {user?.plan && user.plan !== 'free_trial' && (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#062b3b] hover:bg-[#093b50] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw size={14} className={portalLoading ? 'animate-spin' : ''} />
                  <span>Gérer mon abonnement Stripe</span>
                </button>
              )}

              <Link
                to="/pricing"
                className="w-full py-2.5 px-4 rounded-xl border border-[#dce7ed] hover:bg-[#edf3f6] text-[#102d3e] font-bold text-xs flex items-center justify-center transition-colors"
              >
                Comparer toutes les formules
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SÉCURITÉ */}
      {activeSubTab === 'securite' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl">
          {/* Change Password Card */}
          <div className="lg:col-span-7 bg-white border border-[#dce7ed] rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-extrabold text-[#102d3e] flex items-center gap-2">
                <Lock size={18} className="text-[#007568]" />
                Modifier le mot de passe
              </h2>
              <p className="text-xs text-[#456071] mt-1">
                Utilisez un mot de passe robuste d'au moins 8 caractères.
              </p>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <Check size={15} />
                <span>Votre mot de passe a été mis à jour.</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:border-[#007568]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:border-[#007568]"
                />
                <div className="mt-2">
                  <PasswordStrengthIndicator password={newPassword} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#456071] mb-1.5">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dce7ed] bg-[#f8fafc] focus:bg-white text-sm font-semibold text-[#102d3e] focus:outline-none focus:border-[#007568]"
                />
              </div>

              <button
                type="submit"
                disabled={passwordSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#007568] hover:bg-[#006257] text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {passwordSubmitting ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </div>

          {/* Data Export & Account Deletion */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#dce7ed] rounded-2xl p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-extrabold text-[#102d3e] flex items-center gap-2">
                <Download size={16} className="text-[#007568]" />
                Portabilité des données (RGPD)
              </h3>
              <p className="text-xs text-[#456071] leading-relaxed">
                Téléchargez une copie complète de vos CVs, lettres de motivation et analyses au format JSON.
              </p>
              {exportError && (
                <p className="text-xs font-semibold text-red-600">{exportError}</p>
              )}
              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full py-2.5 px-4 rounded-xl border border-[#dce7ed] hover:bg-[#edf3f6] text-[#102d3e] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>{isExporting ? 'Export en cours...' : 'Exporter mes données'}</span>
              </button>
            </div>

            <div className="bg-red-50/60 border border-red-200 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-extrabold text-red-800 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-600" />
                Zone de danger
              </h3>
              <p className="text-xs text-red-700/90 leading-relaxed">
                La suppression de votre compte efface définitivement vos CVs, candidatures et historiques.
              </p>
              {deleteError && (
                <p className="text-xs font-semibold text-red-700">{deleteError}</p>
              )}
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Supprimer mon compte
                </button>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-red-800">
                    Confirmer la suppression définitive ?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteSubmitting}
                      className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
                    >
                      {deleteSubmitting ? 'Suppression...' : 'Oui, supprimer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white border border-red-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
