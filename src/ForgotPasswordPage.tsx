import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AuthLayout from './components/auth/AuthLayout';
import FormField from './components/auth/FormField';
import TextInput from './components/auth/TextInput';
import LoadingButton from './components/auth/LoadingButton';
import FormError from './components/auth/FormError';
import FormSuccess from './components/auth/FormSuccess';
import AuthFooter from './components/auth/AuthFooter';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errorMsg) errorRef.current?.focus();
  }, [errorMsg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidEmail(email)) {
      setErrorMsg('L’adresse e-mail doit contenir un format valide, par exemple nom@exemple.com.');
      emailRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const { error } = await requestPasswordReset(email.trim());
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    setSubmitted(true);
  };

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Entrez l'adresse e-mail associée à votre compte. Si un compte correspondant existe, vous recevrez un lien pour réinitialiser votre mot de passe."
      icon={<KeyRound size={24} aria-hidden="true" />}
    >
      {errorMsg && (
        <FormError ref={errorRef} id="forgot-password-error">
          {errorMsg}
        </FormError>
      )}

      {submitted ? (
        <>
          <FormSuccess>
            Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d'être envoyé. Pensez à
            vérifier vos courriers indésirables si vous ne le voyez pas d'ici quelques minutes.
          </FormSuccess>
          <AuthFooter prompt="Vous vous souvenez de votre mot de passe ?" linkTo="/login" linkLabel="Se connecter" />
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField label="Adresse e-mail" htmlFor="forgot-email" required error={errorMsg}>
              <TextInput
                ref={emailRef}
                id="forgot-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                invalid={!!errorMsg}
                aria-describedby={errorMsg ? 'forgot-email-error' : undefined}
              />
            </FormField>

            <LoadingButton loading={isSubmitting} loadingText="Envoi de l'e-mail..." className="w-full mt-2">
              <span>Envoyer le lien de réinitialisation</span>
              <ArrowRight size={18} aria-hidden="true" />
            </LoadingButton>
          </form>

          <AuthFooter prompt="Vous vous souvenez de votre mot de passe ?" linkTo="/login" linkLabel="Se connecter" />
        </>
      )}
    </AuthLayout>
  );
}
