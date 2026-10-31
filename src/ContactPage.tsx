import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logoIcon from './assets/logo-icon.png';
import {
  ArrowRight,
  Mail,
  Clock,
  LifeBuoy,
  ShieldCheck,
  Send,
  HelpCircle,
} from 'lucide-react';
import Footer from './components/Footer';
import { usePageSEO } from './hooks/usePageSEO';
import { sendContactMessage } from './lib/contactApi';
import FormField from './components/auth/FormField';
import TextInput from './components/auth/TextInput';
import LoadingButton from './components/auth/LoadingButton';
import FormError from './components/auth/FormError';
import FormSuccess from './components/auth/FormSuccess';

import { EMAILS } from './config/brand';
const ERROR_BANNER_ID = 'contact-form-error';

const TOPICS = [
  { value: 'technical', label: 'Support technique' },
  { value: 'billing', label: 'Facturation & Abonnements' },
  { value: 'privacy', label: 'RGPD & Confidentialité' },
  { value: 'partnership', label: 'Partenariats' },
  { value: 'other', label: 'Autre demande' },
];

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: 'Support & facturation',
    description:
      "Un bug, une question sur l'utilisation de Lettrup, votre formule, un paiement ou votre facture.",
    email: EMAILS.support,
  },
  {
    icon: ShieldCheck,
    title: 'Contact général, RGPD & partenariats',
    description:
      "Accès, rectification ou suppression de vos données, presse, partenariat ou toute autre demande. Vous pouvez aussi exporter ou supprimer votre compte directement depuis Paramètres > Zone de Danger.",
    email: EMAILS.contact,
  },
];

type FieldErrors = Partial<Record<'name' | 'email' | 'message', string>>;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function ContactPage() {
  usePageSEO({
    title: 'Contact & Support — Lettrup',
    description:
      "Une question sur Lettrup, votre abonnement ou vos données personnelles ? Contactez notre équipe support, facturation ou confidentialité.",
    canonicalPath: '/contact',
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0].value);
  const [message, setMessage] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Veuillez renseigner votre nom.';
    if (!isValidEmail(email)) errors.email = 'L’adresse e-mail doit contenir un format valide, par exemple nom@exemple.com.';
    if (!message.trim()) errors.message = 'Veuillez renseigner votre message.';

    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0] as keyof FieldErrors | undefined;
    if (firstError) {
      setErrorMsg(errors[firstError] || 'Veuillez corriger les champs indiqués.');
      if (firstError === 'name') nameRef.current?.focus();
      if (firstError === 'email') emailRef.current?.focus();
      if (firstError === 'message') messageRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const { error } = await sendContactMessage({ name: name.trim(), email: email.trim(), topic, message: message.trim() });
    setIsSubmitting(false);

    if (error) {
      setErrorMsg(error);
      return;
    }

    setName('');
    setEmail('');
    setTopic(TOPICS[0].value);
    setMessage('');
    setSuccessMsg('Votre message a bien été envoyé. Notre équipe vous répondra sous 24 à 48h ouvrées.');
  };

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
            <Link to="/pricing" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Tarifs</Link>
            <Link to="/blog" className="px-4 py-2 rounded-full hover:text-slate-900 hover:bg-white transition-colors">Blog & Guides</Link>
            <Link to="/contact" className="px-4 py-2 rounded-full bg-primary-container/40 text-tertiary border border-tertiary/20 font-bold">Contact & Support</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              to="/signup"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-tertiary hover:bg-[#093b50] transition-colors"
            >
              <span>Créer un compte</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative bg-transparent pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <p className="relative text-sm font-bold text-[#007568] mb-5">
          Nous sommes là pour vous aider
        </p>

        <h1 className="relative text-4xl sm:text-6xl font-black text-tertiary tracking-tight mb-6 leading-[1.1]">
          Contact & <span className="text-[#007568]">Support</span>
        </h1>

        <p className="relative max-w-2xl mx-auto text-sm sm:text-base text-slate-500 leading-relaxed">
          Une question, un problème technique ou une demande sur vos données personnelles ? Écrivez-nous, notre équipe vous répond sous 24 à 48h ouvrées.
        </p>
      </header>

      {/* Content: channels + form */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Support channels */}
          <div className="lg:col-span-2 space-y-4">
            {CHANNELS.map((channel) => (
              <div key={channel.title} className="p-5 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <channel.icon size={18} className="text-[#007568]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">{channel.title}</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{channel.description}</p>
                    <a
                      href={`mailto:${channel.email}`}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-tertiary hover:text-tertiary hover:underline"
                    >
                      <Mail size={13} aria-hidden="true" />
                      {channel.email}
                    </a>
                  </div>
                </div>
              </div>
            ))}

            <div className="p-5 rounded-lg border border-slate-200 flex items-start gap-3">
              <Clock size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Délai de réponse habituel : <strong className="text-slate-700">24 à 48h ouvrées</strong>. Pour les demandes RGPD, vous disposez d'un délai de réponse légal d'un mois.
              </p>
            </div>

            <Link
              to="/#faq"
              className="flex items-center justify-between p-5 rounded-lg border border-slate-200 hover:border-tertiary/30 hover:bg-primary-container/40 transition-colors group"
            >
              <span className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                <HelpCircle size={18} className="text-[#007568]" aria-hidden="true" />
                Consultez notre FAQ avant d'écrire — la réponse s'y trouve peut-être déjà
              </span>
              <ArrowRight size={16} className="text-[#007568] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
            </Link>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="p-6 sm:p-8 rounded-lg border border-slate-200 bg-white">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Envoyez-nous un message</h2>
              <p className="text-xs text-slate-500 mb-6">Nous vous répondrons directement à l'adresse e-mail que vous indiquez ci-dessous.</p>

              {errorMsg && (
                <FormError ref={errorRef} id={ERROR_BANNER_ID}>
                  {errorMsg}
                </FormError>
              )}
              {successMsg && <FormSuccess>{successMsg}</FormSuccess>}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Nom et prénom" htmlFor="contact-name" required error={fieldErrors.name}>
                    <TextInput
                      ref={nameRef}
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Pierre Martin"
                      invalid={!!fieldErrors.name}
                      aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                    />
                  </FormField>

                  <FormField label="Adresse e-mail" htmlFor="contact-email" required error={fieldErrors.email}>
                    <TextInput
                      ref={emailRef}
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      icon={<Mail size={18} aria-hidden="true" />}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      invalid={!!fieldErrors.email}
                      aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                    />
                  </FormField>
                </div>

                <FormField label="Sujet" htmlFor="contact-topic">
                  <select
                    id="contact-topic"
                    name="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full min-h-12 px-4 py-3 rounded-xl bg-white border border-slate-300 text-base leading-6 text-slate-950 focus:ring-2 focus:ring-[#bcefe4] focus:border-[#007568] outline-hidden transition-colors"
                  >
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Message" htmlFor="contact-message" required error={fieldErrors.message}>
                  <textarea
                    ref={messageRef}
                    id="contact-message"
                    name="message"
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre demande en quelques lignes..."
                    aria-invalid={!!fieldErrors.message || undefined}
                    aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                    className={`w-full px-4 py-3 rounded-xl bg-white border text-base leading-6 text-slate-950 placeholder:text-slate-500 focus:ring-2 focus:ring-[#bcefe4] outline-hidden transition-colors resize-y ${
                      fieldErrors.message ? 'border-red-500 focus:border-red-600' : 'border-slate-300 focus:border-[#007568]'
                    }`}
                  />
                </FormField>

                <LoadingButton loading={isSubmitting} loadingText="Envoi en cours..." className="w-full sm:w-auto">
                  <span>Envoyer le message</span>
                  <Send size={16} aria-hidden="true" />
                </LoadingButton>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer light />
    </div>
  );
}
