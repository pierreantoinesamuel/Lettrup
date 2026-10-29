import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { UserRole } from './domain/user/UserRole';
import AuthLayout from './components/auth/AuthLayout';
import PasswordField from './components/auth/PasswordField';
import PasswordStrengthIndicator, { passwordMeetsRules } from './components/auth/PasswordStrengthIndicator';
import LoadingButton from './components/auth/LoadingButton';
import FormError from './components/auth/FormError';
import FormSuccess from './components/auth/FormSuccess';
import AuthFooter from './components/auth/AuthFooter';

import { SITE_DOMAIN } from './config/brand';
type LinkStatus = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();

  const [linkStatus, setLinkStatus] = useState<LinkStatus>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) {
      setLinkStatus('invalid');
      return;
    }

    let mounted = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) setLinkStatus('ready');
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session) setLinkStatus('ready');
    });

    const timeout = setTimeout(() => {
      if (mounted) setLinkStatus((current) => (current === 'checking' ? 'invalid' : current));
    }, 2500);

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (errorMsg) errorRef.current?.focus();
  }, [errorMsg]);

  const redirectByRole = (userRole: UserRole) => {
    switch (userRole) {
      case 'admin':
        navigate('/admin');
        break;
      case 'recruiter':
        navigate('/recruiter');
        break;
      case 'job_seeker':
      default:
        navigate('/dashboard');
        break;
    }
  };

  const focusNewPassword = () => document.getElementById('new-password')?.focus();
  const focusConfirmPassword = () => document.getElementById('confirm-password')?.focus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passwordMeetsRules(newPassword)) {
      setErrorMsg('Le mot de passe ne respecte pas encore les critères ci-dessous.');
      focusNewPassword();
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      focusConfirmPassword();
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    setSuccess(true);
  };

  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <AuthLayout
      title="Réinitialiser votre mot de passe"
      subtitle={`Choisissez un nouveau mot de passe pour votre compte ${SITE_DOMAIN}.`}
      icon={<ShieldCheck size={24} aria-hidden="true" />}
    >
      {linkStatus === 'checking' && (
        <div className="flex flex-col items-center gap-3 py-6 text-slate-700" role="status" aria-live="polite">
          <Loader2 size={24} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-sm leading-6">Vérification de votre lien de réinitialisation...</p>
        </div>
      )}

      {linkStatus === 'invalid' && (
        <>
          <FormError>
            Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien pour continuer.
          </FormError>
          <AuthFooter
            prompt="Besoin d'un nouveau lien ?"
            linkTo="/forgot-password"
            linkLabel="Demander un lien de réinitialisation"
          />
        </>
      )}

      {linkStatus === 'ready' && !success && (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMsg && (
            <FormError ref={errorRef} id="reset-password-error">
              {errorMsg}
            </FormError>
          )}

          <PasswordField
            id="new-password"
            label="Nouveau mot de passe"
            required
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            invalid={!!errorMsg && /critères|mot de passe/i.test(errorMsg)}
            describedBy={errorMsg ? 'reset-password-error' : undefined}
          >
            <PasswordStrengthIndicator password={newPassword} />
          </PasswordField>

          <PasswordField
            id="confirm-password"
            label="Confirmer le nouveau mot de passe"
            required
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            invalid={passwordsMismatch}
            error={passwordsMismatch ? 'Les deux mots de passe ne correspondent pas.' : undefined}
          />

          <LoadingButton loading={isSubmitting} loadingText="Mise à jour du mot de passe..." className="w-full mt-2">
            <span>Réinitialiser le mot de passe</span>
            <ArrowRight size={18} aria-hidden="true" />
          </LoadingButton>
        </form>
      )}

      {success && (
        <>
          <FormSuccess>Votre mot de passe a été mis à jour avec succès.</FormSuccess>
          <LoadingButton
            type="button"
            loading={false}
            loadingText=""
            className="w-full mt-2"
            onClick={() => redirectByRole(user?.role || 'job_seeker')}
          >
            <span>Accéder à mon espace</span>
            <ArrowRight size={18} aria-hidden="true" />
          </LoadingButton>
        </>
      )}
    </AuthLayout>
  );
}
