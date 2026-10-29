import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building,
  CheckCircle2,
  FileText,
  Globe,
  Mail,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './domain/user/UserRole';
import AuthLayout from './components/auth/AuthLayout';
import FormField from './components/auth/FormField';
import TextInput from './components/auth/TextInput';
import PasswordField from './components/auth/PasswordField';
import PasswordStrengthIndicator, { passwordMeetsRules } from './components/auth/PasswordStrengthIndicator';
import LoadingButton from './components/auth/LoadingButton';
import FormError from './components/auth/FormError';
import FormSuccess from './components/auth/FormSuccess';
import PrivacyNotice from './components/auth/PrivacyNotice';
import {
  buildCheckoutCancelPath,
  buildCheckoutSuccessPath,
  clearPendingCheckoutIntent,
  CheckoutIntent,
  getPendingCheckoutIntent,
  isCheckoutBillingInterval,
  isCheckoutPlanId,
  savePendingCheckoutIntent,
} from './lib/checkoutIntent';
import { startCheckout } from './lib/stripeApi';

const ERROR_BANNER_ID = 'auth-form-error';

type FieldErrors = Partial<
  Record<'name' | 'email' | 'password' | 'confirmPassword' | 'terms' | 'siren' | 'companyName', string>
>;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function AuthPage() {
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // /signup (and ?mode=signup on /auth) open the sign-up tab; every other
  // route/param combination — including /login — opens sign-in.
  const modeParam =
    searchParams.get('mode') === 'signup' || location.pathname === '/signup' ? 'signup' : 'signin';
  const [isSignUp, setIsSignUp] = useState(modeParam === 'signup');
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'job_seeker' | 'recruiter'>('job_seeker');
  const [sirenNumber, setSirenNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutRedirecting, setIsCheckoutRedirecting] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const sirenRef = useRef<HTMLInputElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (errorMsg) errorRef.current?.focus();
  }, [errorMsg]);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    const intervalParam = searchParams.get('interval');
    if (isCheckoutPlanId(planParam) && isCheckoutBillingInterval(intervalParam)) {
      savePendingCheckoutIntent({
        planId: planParam,
        interval: intervalParam,
        featureTab: searchParams.get('feature') as CheckoutIntent['featureTab'],
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || isCheckoutRedirecting) return;

    const pendingCheckout = getPendingCheckoutIntent();
    if (!pendingCheckout) {
      redirectByRole(user.role || 'job_seeker');
      return;
    }

    if ((user.role || 'job_seeker') !== 'job_seeker') {
      clearPendingCheckoutIntent();
      redirectByRole(user.role || 'job_seeker');
      return;
    }

    setIsCheckoutRedirecting(true);
    setSuccessMsg('Connexion rÃ©ussie. Redirection vers le paiement...');
    startCheckout(pendingCheckout.planId, pendingCheckout.interval, {
      successPath: buildCheckoutSuccessPath(pendingCheckout),
      cancelPath: buildCheckoutCancelPath(pendingCheckout),
    }).then(({ error }) => {
      if (error) {
        clearPendingCheckoutIntent();
        setIsCheckoutRedirecting(false);
        setErrorMsg(error === 'not_authenticated' ? 'Veuillez vous reconnecter.' : error);
        return;
      }
      clearPendingCheckoutIntent();
    });
  }, [user, isCheckoutRedirecting]);

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

  const validateSiren = (siren: string): boolean => {
    const cleaned = siren.replace(/\s/g, '');
    return /^\d{9}$/.test(cleaned) || /^\d{14}$/.test(cleaned);
  };

  const switchMode = (nextIsSignUp: boolean) => {
    setIsSignUp(nextIsSignUp);
    setStep(1);
    setFieldErrors({});
    setErrorMsg('');
    setSuccessMsg('');
  };

  const focusPassword = () => document.getElementById('auth-password')?.focus();
  const focusConfirmPassword = () => document.getElementById('auth-confirm-password')?.focus();

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const errors: FieldErrors = {};
    if (isSignUp && !name.trim()) {
      errors.name = 'Veuillez renseigner votre nom et prénom.';
    }
    if (!isValidEmail(email)) {
      errors.email = 'L’adresse e-mail doit contenir un format valide, par exemple nom@exemple.com.';
    }
    if (isSignUp && !passwordMeetsRules(password)) {
      errors.password = 'Le mot de passe ne respecte pas encore les critères ci-dessous.';
    }
    if (isSignUp && !confirmPassword.trim()) {
      errors.confirmPassword = 'Veuillez confirmer votre mot de passe.';
    }
    if (isSignUp && confirmPassword.trim() && password !== confirmPassword) {
      errors.confirmPassword = 'Les deux mots de passe ne correspondent pas.';
    }
    if (!isSignUp && !password.trim()) {
      errors.password = 'Veuillez saisir votre mot de passe.';
    }

    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0] as keyof FieldErrors | undefined;
    if (firstError) {
      setErrorMsg(errors[firstError] || 'Veuillez corriger les champs indiqués.');
      if (firstError === 'name') nameRef.current?.focus();
      if (firstError === 'email') emailRef.current?.focus();
      if (firstError === 'password') focusPassword();
      if (firstError === 'confirmPassword') focusConfirmPassword();
      return;
    }

    if (isSignUp) {
      setStep(2);
      return;
    }

    handleSignInSubmit();
  };

  const handleSignInSubmit = async () => {
    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error);
      focusPassword();
      return;
    }

    setSuccessMsg('Connexion réussie. Redirection vers votre espace...');
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const errors: FieldErrors = {};
    if (!acceptedTerms) {
      errors.terms = 'Veuillez accepter les Conditions Générales d’Utilisation et la Politique de Confidentialité.';
    }
    if (accountType === 'recruiter') {
      if (!sirenNumber.trim() || !validateSiren(sirenNumber)) {
        errors.siren = 'Le numéro SIREN doit comporter 9 chiffres, ou 14 chiffres pour un SIRET.';
      }
      if (!companyName.trim()) {
        errors.companyName = 'Veuillez saisir le nom de votre entreprise.';
      }
    }

    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0] as keyof FieldErrors | undefined;
    if (firstError) {
      setErrorMsg(errors[firstError] || 'Veuillez corriger les champs indiqués.');
      if (firstError === 'siren') sirenRef.current?.focus();
      if (firstError === 'companyName') companyNameRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const { error, needsEmailConfirmation, alreadyRegistered } =
      accountType === 'recruiter'
        ? await signUp({
            email: email.trim(),
            password,
            name: name.trim(),
            role: 'recruiter',
            companyName: companyName.trim(),
            companyWebsite: companyWebsite.trim() || undefined,
            companyTitle: companyTitle.trim() || undefined,
            sirenNumber: sirenNumber.replace(/\s/g, ''),
          })
        : await signUp({
            email: email.trim(),
            password,
            name: name.trim(),
            role: 'job_seeker',
          });
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error);
      if (alreadyRegistered) switchMode(false);
      return;
    }

    // A "recruiter" signup never grants the recruiter role directly — it only
    // records the application (company fields) for admin review, so the
    // account stays 'job_seeker' (candidate access) until approved.
    // See handleEmployerVerificationRoute for the approval step.
    const recruiterPendingNotice =
      ' Votre demande d’accès Recruteur sera examinée par notre équipe ; vous serez notifié(e) par e-mail dès son approbation. En attendant, vous avez accès à votre espace Candidat.';

    if (needsEmailConfirmation) {
      switchMode(false);
      setSuccessMsg(
        'Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.' +
          (accountType === 'recruiter' ? recruiterPendingNotice : '')
      );
      return;
    }

    setSuccessMsg(
      accountType === 'recruiter'
        ? 'Compte créé avec succès.' + recruiterPendingNotice
        : 'Compte créé avec succès. Redirection vers votre espace...'
    );
  };

  const headerTitle = !isSignUp
    ? 'Connexion à votre espace'
    : step === 1
    ? 'Créer votre compte'
    : 'Finaliser la création';

  const headerSubtitle = !isSignUp
    ? 'Accédez à votre tableau de bord Candidat, RH ou Administrateur.'
    : step === 1
    ? 'Renseignez uniquement les informations nécessaires à la création de votre compte.'
    : 'Choisissez le type de compte et validez les informations légales nécessaires.';

  const progress = isSignUp ? (
    <div className="flex items-center justify-center gap-2 mt-5" aria-hidden="true">
      <div className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-12 bg-[#007568]' : 'w-4 bg-slate-300'}`} />
      <div className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-12 bg-[#007568]' : 'w-4 bg-slate-300'}`} />
    </div>
  ) : undefined;

  return (
    <AuthLayout title={headerTitle} subtitle={headerSubtitle} icon={<Sparkles size={24} aria-hidden="true" />} progress={progress}>
      <div
        className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-6 text-sm font-semibold"
        role="tablist"
        aria-label="Connexion ou inscription"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isSignUp}
          onClick={() => switchMode(false)}
          className={`min-h-11 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2 ${
            !isSignUp ? 'bg-tertiary text-white' : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignUp}
          onClick={() => switchMode(true)}
          className={`min-h-11 rounded-lg transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2 ${
            isSignUp ? 'bg-tertiary text-white' : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          Créer un compte
        </button>
      </div>

      {errorMsg && (
        <FormError ref={errorRef} id={ERROR_BANNER_ID}>
          {errorMsg}
        </FormError>
      )}
      {successMsg && <FormSuccess>{successMsg}</FormSuccess>}

      {(step === 1 || !isSignUp) && (
        <form onSubmit={handleStep1Submit} className="space-y-4" noValidate>
          {isSignUp && (
            <FormField label="Nom et prénom" htmlFor="signup-name" required error={fieldErrors.name}>
              <TextInput
                ref={nameRef}
                id="signup-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                icon={<UserCheck size={18} aria-hidden="true" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pierre Martin"
                invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
              />
            </FormField>
          )}

          <FormField label="Adresse e-mail" htmlFor="auth-email" required error={fieldErrors.email}>
            <TextInput
              ref={emailRef}
              id="auth-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              icon={<Mail size={18} aria-hidden="true" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.com"
              invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
            />
          </FormField>

          <PasswordField
            id="auth-password"
            label="Mot de passe"
            required
            value={password}
            onChange={setPassword}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            error={fieldErrors.password}
          >
            {isSignUp && <PasswordStrengthIndicator password={password} />}
          </PasswordField>

          {isSignUp && (
            <PasswordField
              id="auth-confirm-password"
              label="Confirmer le mot de passe"
              required
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
            />
          )}

          {!isSignUp && (
            <div className="flex justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-[#007568] hover:text-[#005d52] hover:underline rounded outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          )}

          <LoadingButton
            loading={isSubmitting}
            loadingText={isSignUp ? 'Vérification en cours...' : 'Connexion en cours...'}
            className="w-full mt-2"
          >
            <span>{isSignUp ? 'Continuer vers le type de compte' : 'Se connecter'}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </LoadingButton>

          {isSignUp && (
            <p className="text-center text-sm text-slate-500">
              En continuant, vous acceptez notre{' '}
              <Link
                to="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007568] hover:underline font-semibold"
              >
                Politique de Confidentialité
              </Link>
              .
            </p>
          )}
        </form>
      )}

      {isSignUp && step === 2 && (
        <form onSubmit={handleSignUpSubmit} className="space-y-5" noValidate>
          <fieldset className="space-y-3">
            <legend className="block text-[0.9375rem] leading-5 font-semibold text-slate-800">
              Type de compte
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={accountType === 'job_seeker'}
                onClick={() => setAccountType('job_seeker')}
                className={`min-h-28 p-4 rounded-xl border text-left transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2 ${
                  accountType === 'job_seeker'
                    ? 'bg-[#eaf7f4] border-[#007568] text-slate-950'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <User size={19} aria-hidden="true" />
                  {accountType === 'job_seeker' && <CheckCircle2 size={18} className="text-[#007568]" aria-hidden="true" />}
                </div>
                <div className="mt-3 text-sm font-semibold">Candidat</div>
                <div className="mt-1 text-sm leading-5 text-slate-600">Compte personnel pour créer et améliorer vos candidatures.</div>
              </button>

              <button
                type="button"
                aria-pressed={accountType === 'recruiter'}
                onClick={() => setAccountType('recruiter')}
                className={`min-h-28 p-4 rounded-xl border text-left transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[#007568] focus-visible:ring-offset-2 ${
                  accountType === 'recruiter'
                    ? 'bg-[#eaf7f4] border-[#007568] text-slate-950'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Briefcase size={19} aria-hidden="true" />
                  {accountType === 'recruiter' && <CheckCircle2 size={18} className="text-[#007568]" aria-hidden="true" />}
                </div>
                <div className="mt-3 text-sm font-semibold">Entreprise / RH</div>
                <div className="mt-1 text-sm leading-5 text-slate-600">Compte professionnel pour publier et gérer des offres.</div>
              </button>
            </div>
          </fieldset>

          {accountType === 'recruiter' && (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Building size={18} aria-hidden="true" /> Informations légales d'entreprise
              </div>

              <FormField
                label="Numéro SIREN ou SIRET"
                htmlFor="siren-number"
                required
                error={fieldErrors.siren}
                helperText="Nécessaire pour vérifier l'entreprise avant publication d'offres recruteur."
              >
                <TextInput
                  ref={sirenRef}
                  id="siren-number"
                  name="sirenNumber"
                  type="text"
                  inputMode="numeric"
                  required
                  icon={<FileText size={16} aria-hidden="true" />}
                  value={sirenNumber}
                  onChange={(e) => setSirenNumber(e.target.value)}
                  placeholder="802123456"
                  className="font-mono"
                  invalid={!!fieldErrors.siren}
                  aria-describedby={fieldErrors.siren ? 'siren-number-error' : 'siren-number-helper'}
                />
              </FormField>

              <FormField label="Nom de l'entreprise" htmlFor="company-name" required error={fieldErrors.companyName}>
                <TextInput
                  ref={companyNameRef}
                  id="company-name"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Tech Startup SAS"
                  invalid={!!fieldErrors.companyName}
                  aria-describedby={fieldErrors.companyName ? 'company-name-error' : undefined}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4">
                <FormField label="Site web entreprise" htmlFor="company-website">
                  <TextInput
                    id="company-website"
                    name="companyWebsite"
                    type="url"
                    icon={<Globe size={16} aria-hidden="true" />}
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://entreprise.fr"
                  />
                </FormField>
                <FormField label="Votre intitulé de poste" htmlFor="company-title">
                  <TextInput
                    id="company-title"
                    name="companyTitle"
                    type="text"
                    value={companyTitle}
                    onChange={(e) => setCompanyTitle(e.target.value)}
                    placeholder="Responsable RH"
                  />
                </FormField>
              </div>
            </div>
          )}

          <PrivacyNotice id="accept-terms" checked={acceptedTerms} onChange={setAcceptedTerms} />
          {fieldErrors.terms && <p className="text-sm leading-5 font-medium text-red-700">{fieldErrors.terms}</p>}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <LoadingButton type="button" variant="secondary" loading={false} loadingText="" onClick={() => setStep(1)}>
              Précédent
            </LoadingButton>
            <LoadingButton loading={isSubmitting} loadingText="Création du compte..." className="flex-1">
              <span>Créer mon compte</span>
              <ArrowRight size={18} aria-hidden="true" />
            </LoadingButton>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
