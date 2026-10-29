import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

import { supabase } from '../lib/supabase';
import posthog from '../lib/posthog';
import { hasAnalyticsConsent } from '../services/cookieConsent';
import { UserRole } from '../domain/user/UserRole';
import { deleteMyAccount } from '../lib/accountApi';

import { SITE_URL } from '../config/brand';
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  plan?: string;
  hasPaymentMethod?: boolean;
  // Not persisted server-side (no matching profiles column) — kept as
  // local-only preferences so the settings UI keeps working.
  language?: string;
  emailNotifications?: boolean;
  role: UserRole;
  isSuperAdmin?: boolean;
  companyName?: string;
  companyWebsite?: string;
  companyTitle?: string;
  sirenNumber?: string;
  targetTitle?: string;
  experienceLevel?: string;
  skills?: string[];
  primaryGoal?: string;
  opportunityType?: string;
  careerHorizon?: string;
  hasPortfolio?: boolean;
  portfolioDetails?: string;
  biggestObstacle?: string;
  weeklyTimeCommitment?: string;
  preferredSupport?: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role: 'job_seeker' | 'recruiter';
  companyName?: string;
  companyWebsite?: string;
  companyTitle?: string;
  sirenNumber?: string;
  targetTitle?: string;
  experienceLevel?: string;
  skills?: string[];
  primaryGoal?: string;
  opportunityType?: string;
  careerHorizon?: string;
  hasPortfolio?: boolean;
  portfolioDetails?: string;
  biggestObstacle?: string;
  weeklyTimeCommitment?: string;
  preferredSupport?: string;
}

type ProfileUpdatableFields = Pick<
  UserProfile,
  | 'name'
  | 'language'
  | 'emailNotifications'
  | 'companyName'
  | 'companyWebsite'
  | 'companyTitle'
  | 'sirenNumber'
  | 'targetTitle'
  | 'experienceLevel'
  | 'skills'
  | 'primaryGoal'
  | 'opportunityType'
  | 'careerHorizon'
  | 'hasPortfolio'
  | 'portfolioDetails'
  | 'biggestObstacle'
  | 'weeklyTimeCommitment'
  | 'preferredSupport'
>;

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsEmailConfirmation: boolean; alreadyRegistered?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<ProfileUpdatableFields>) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
}

const noSupabaseError = 'Supabase n\'est pas configuré (variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes).';
const networkError = 'Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.';
const genericSignUpError = 'La création du compte a échoué. Vérifiez les informations saisies, puis réessayez.';
const emailDeliveryConfigError =
  'La création du compte est temporairement indisponible. La configuration d’e-mail de confirmation doit être finalisée avant de pouvoir envoyer le message.';
const genericPasswordUpdateError = 'Le mot de passe n’a pas pu être mis à jour. Demandez un nouveau lien si le problème persiste.';

// Sign-in failures must never reveal whether an email address is registered
// (anti user-enumeration) — every credential-related Supabase error is
// collapsed to the same generic message before it reaches the UI.
const genericSignInError = 'Adresse e-mail ou mot de passe incorrect.';
const productionAuthOrigin = SITE_URL;

function mapSignUpError(error: { message?: string; code?: string; status?: number }): string {
  const message = (error.message || '').toLowerCase();
  if (error.code === 'user_already_exists' || message.includes('already registered') || message.includes('already been registered')) {
    return 'Un compte existe déjà avec cet e-mail. Connectez-vous ou utilisez « Mot de passe oublié ».';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('characters'))) {
    return 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.';
  }
  if (message.includes('invalid email') || message.includes('email address')) {
    return 'L’adresse e-mail saisie n’est pas valide.';
  }
  if (error.status === 429 || message.includes('rate limit') || message.includes('too many')) {
    return 'Trop de tentatives. Attendez quelques minutes avant de réessayer.';
  }
  if (error.status && error.status >= 500) return emailDeliveryConfigError;
  return genericSignUpError;
}

function getAuthRedirectUrl(path: '/login' | '/reset-password'): string {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : productionAuthOrigin;
  const allowedOrigins = new Set([
    productionAuthOrigin,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ]);
  const origin = allowedOrigins.has(currentOrigin) ? currentOrigin : productionAuthOrigin;
  return `${origin}${path}`;
}

function logSafeAuthError(operation: string, error: { name?: string; status?: number; code?: string } | null | undefined) {
  if (!error) return;
  // Do not log raw provider messages here: SMTP/Auth errors can contain
  // user emails, domains, request metadata, or infrastructure details.
  console.warn('[Auth] Operation failed', {
    operation,
    name: error.name,
    status: error.status,
    code: error.code,
  });
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => ({ error: noSupabaseError, needsEmailConfirmation: false }),
  signIn: async () => ({ error: noSupabaseError }),
  requestPasswordReset: async () => ({ error: noSupabaseError }),
  updatePassword: async () => ({ error: noSupabaseError }),
  logout: async () => {},
  updateUser: async () => ({ error: noSupabaseError }),
  deleteAccount: async () => ({ error: noSupabaseError }),
  refreshUser: async () => {},
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfileRow(row: any, fallbackEmail: string): UserProfile {
  return {
    id: row.id,
    email: row.email || fallbackEmail,
    name: row.name || undefined,
    plan: row.plan || undefined,
    hasPaymentMethod: row.has_payment_method === true,
    role: (row.role as UserRole) || 'job_seeker',
    isSuperAdmin: row.is_super_admin === true,
    companyName: row.company_name || undefined,
    companyWebsite: row.company_website || undefined,
    companyTitle: row.company_title || undefined,
    sirenNumber: row.siren_number || undefined,
    targetTitle: row.target_title || undefined,
    experienceLevel: row.experience_level || undefined,
    skills: row.skills || undefined,
    primaryGoal: row.primary_goal || undefined,
    opportunityType: row.opportunity_type || undefined,
    careerHorizon: row.career_horizon || undefined,
    hasPortfolio: row.has_portfolio ?? undefined,
    portfolioDetails: row.portfolio_details || undefined,
    biggestObstacle: row.biggest_obstacle || undefined,
    weeklyTimeCommitment: row.weekly_time_commitment || undefined,
    preferredSupport: row.preferred_support || undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadProfileRef = useRef<((userId: string, fallbackEmail: string) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadProfile = async (userId: string, fallbackEmail: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!isMounted) return;
      if (!error && data) {
        setUser((prev) => {
          const mapped = mapProfileRow(data, fallbackEmail);
          // Preserve local-only preferences across profile refetches.
          return prev ? { ...mapped, language: prev.language, emailNotifications: prev.emailNotifications } : mapped;
        });
        // Identify the logged-in user to PostHog, respecting the same
        // cookie-consent gating as the rest of the analytics integration.
        if (hasAnalyticsConsent()) {
          posthog.identify(data.id);
        }
      }
    };

    loadProfileRef.current = loadProfile;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email || '');
      }
      if (isMounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email || '');
      } else {
        if (isMounted) setUser(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // The Stripe webhook writes profiles.plan asynchronously; nothing else in
  // this app re-reads that row after the initial session load, so a page
  // that returns from checkout must explicitly ask for a fresh profile (see
  // Dashboard.tsx's checkout=success handling) or the UI keeps gating
  // features against the pre-purchase plan.
  const refreshUser = async () => {
    if (!supabase || !loadProfileRef.current) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadProfileRef.current(session.user.id, session.user.email || '');
    }
  };

  const signUp: AuthContextType['signUp'] = async (input) => {
    if (!supabase) return { error: noSupabaseError, needsEmailConfirmation: false };

    let data: Awaited<ReturnType<typeof supabase.auth.signUp>>['data'];
    let error: Awaited<ReturnType<typeof supabase.auth.signUp>>['error'];
    try {
      ({ data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login'),
          data: {
            account_type_requested: input.role,
            name: input.name,
            company_name: input.companyName,
            company_website: input.companyWebsite,
            company_title: input.companyTitle,
            siren_number: input.sirenNumber,
            target_title: input.targetTitle,
            experience_level: input.experienceLevel,
            skills: input.skills,
            primary_goal: input.primaryGoal,
            opportunity_type: input.opportunityType,
            career_horizon: input.careerHorizon,
            has_portfolio: input.hasPortfolio,
            portfolio_details: input.portfolioDetails,
            biggest_obstacle: input.biggestObstacle,
            weekly_time_commitment: input.weeklyTimeCommitment,
            preferred_support: input.preferredSupport,
          },
        },
      }));
    } catch {
      return { error: networkError, needsEmailConfirmation: false };
    }

    if (error) {
      logSafeAuthError('signUp', error);
      return {
        error: error.code === 'unexpected_failure' || (error.status ?? 0) >= 500 ? emailDeliveryConfigError : mapSignUpError(error),
        needsEmailConfirmation: false,
      };
    }

    // Supabase returns a 200 with no error and no new identity when the email
    // is already registered (anti user-enumeration behavior) — no confirmation
    // email is sent in that case, so it must be surfaced distinctly.
    if (!data.session && data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        error: 'Un compte existe déjà avec cet e-mail. Connectez-vous ou utilisez "Mot de passe oublié" si besoin.',
        needsEmailConfirmation: false,
        alreadyRegistered: true,
      };
    }

    if (data.session && data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email || input.email,
        name: input.name,
        plan: 'free_trial',
        role: 'job_seeker',
        company_name: input.companyName || null,
        company_website: input.companyWebsite || null,
        company_title: input.companyTitle || null,
        siren_number: input.sirenNumber || null,
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (profileError) {
        logSafeAuthError('profileProvisioning', profileError);
        return { error: 'Compte créé, mais votre profil n’a pas pu être finalisé. Actualisez la page ou contactez le support.', needsEmailConfirmation: false };
      }
    }

    return { error: null, needsEmailConfirmation: !data.session };
  };

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    if (!supabase) return { error: noSupabaseError };

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: genericSignInError };
      return { error: null };
    } catch {
      return { error: networkError };
    }
  };

  const requestPasswordReset: AuthContextType['requestPasswordReset'] = async (email) => {
    if (!supabase) return { error: noSupabaseError };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthRedirectUrl('/reset-password'),
      });
      // Supabase itself avoids confirming whether the address is registered;
      // surface a network/config error but never the raw Supabase message.
      if (error) return { error: networkError };
      return { error: null };
    } catch {
      return { error: networkError };
    }
  };

  const updatePassword: AuthContextType['updatePassword'] = async (newPassword) => {
    if (!supabase) return { error: noSupabaseError };

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: genericPasswordUpdateError };
      return { error: null };
    } catch {
      return { error: networkError };
    }
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser: AuthContextType['updateUser'] = async (updates) => {
    if (!supabase || !user) return { error: 'Utilisateur non connecté.' };

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.companyName !== undefined) payload.company_name = updates.companyName;
    if (updates.companyWebsite !== undefined) payload.company_website = updates.companyWebsite;
    if (updates.companyTitle !== undefined) payload.company_title = updates.companyTitle;
    if (updates.sirenNumber !== undefined) payload.siren_number = updates.sirenNumber;
    if (updates.targetTitle !== undefined) payload.target_title = updates.targetTitle;
    if (updates.experienceLevel !== undefined) payload.experience_level = updates.experienceLevel;
    if (updates.skills !== undefined) payload.skills = updates.skills;
    if (updates.primaryGoal !== undefined) payload.primary_goal = updates.primaryGoal;
    if (updates.opportunityType !== undefined) payload.opportunity_type = updates.opportunityType;
    if (updates.careerHorizon !== undefined) payload.career_horizon = updates.careerHorizon;
    if (updates.hasPortfolio !== undefined) payload.has_portfolio = updates.hasPortfolio;
    if (updates.portfolioDetails !== undefined) payload.portfolio_details = updates.portfolioDetails;
    if (updates.biggestObstacle !== undefined) payload.biggest_obstacle = updates.biggestObstacle;
    if (updates.weeklyTimeCommitment !== undefined) payload.weekly_time_commitment = updates.weeklyTimeCommitment;
    if (updates.preferredSupport !== undefined) payload.preferred_support = updates.preferredSupport;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) return { error: error.message };
    }

    // language / emailNotifications are local-only preferences (no DB column).
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    return { error: null };
  };

  const deleteAccount = async () => {
    // Deletion runs server-side (service-role key never reaches the
    // browser) before the local session is torn down — see
    // handleDeleteAccountRoute for the cascade behavior.
    const { error } = await deleteMyAccount();
    if (error) return { error };
    await logout();
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, requestPasswordReset, updatePassword, logout, updateUser, deleteAccount, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
