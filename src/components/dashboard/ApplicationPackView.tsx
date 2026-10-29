import React, { useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, Lock, Download, CheckCircle2, FileText, Mail, MessagesSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listUserResumes, ResumeListItem } from '../../lib/resumeStore';
import {
  generateApplicationPack,
  ApplicationPack,
  downloadApplicationPack,
  savePendingPack,
  loadPendingPack,
  clearPendingPack,
} from '../../lib/applicationPackApi';
import { downloadApplicationPackPdf } from '../../lib/applicationPackPdf';
import { fetchPricingInfo, formatPrice } from '../../lib/exportApi';
import ExportPaywallModal from '../ExportPaywallModal';

type PackTab = 'cv' | 'letter' | 'star';

interface PackHeader {
  name: string;
  contact: string[];
}

// Saved resumes come from two generations of the builder (flat profile and the
// older "coordonnees" shape): read whichever is present.
function headerFromResume(item: ResumeListItem | undefined): PackHeader {
  const data = item?.resumeData || {};
  const c = data.coordonnees || {};
  const name = data.fullName || c.name || item?.name || '';
  const contact = [
    data.email || c.email,
    data.phone || c.phone,
    data.location || c.location,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return { name, contact };
}

const LockedLines: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div aria-hidden className="space-y-2 mt-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-2.5 rounded bg-tertiary/10" style={{ width: `${92 - i * 14}%` }} />
    ))}
  </div>
);

const LockNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#456071]">
    <Lock size={13} /> {children}
  </p>
);

export default function ApplicationPackView() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [resumesLoaded, setResumesLoaded] = useState(false);
  const [cvId, setCvId] = useState('');
  const [url, setUrl] = useState('');
  const [offerText, setOfferText] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // pack = redacted preview; fullPack = only set once the server released it after payment.
  const [pack, setPack] = useState<ApplicationPack | null>(null);
  const [fullPack, setFullPack] = useState<ApplicationPack | null>(null);
  const [packToken, setPackToken] = useState('');
  const [header, setHeader] = useState<PackHeader>({ name: '', contact: [] });
  const [tab, setTab] = useState<PackTab>('cv');

  const [paid, setPaid] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paywall, setPaywall] = useState<{ open: boolean; reason?: 'quota_exceeded' | 'no_subscription' }>({ open: false });
  const [returnedFromCheckout, setReturnedFromCheckout] = useState(false);
  const [priceLabel, setPriceLabel] = useState('1,99 €');

  useEffect(() => {
    fetchPricingInfo().then((info) => {
      const label = formatPrice(info.exportBundle);
      if (label) setPriceLabel(label);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setResumesLoaded(true);
      return;
    }
    listUserResumes(user.id).then((items) => {
      if (cancelled) return;
      setResumes(items);
      const primary = items.find((r) => r.isPrimary) || items[0];
      setCvId((current) => current || primary?.id || '');
      setResumesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Back from Stripe: the generated pack was parked in sessionStorage.
  useEffect(() => {
    const pending = loadPendingPack();
    if (!pending) return;
    setPack(pending.pack);
    setPackToken(pending.token);
    setHeader(pending.header);
    setReturnedFromCheckout(true);
  }, []);

  const selectedResume = useMemo(() => resumes.find((r) => r.id === cvId), [resumes, cvId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating) return;
    if (!cvId) {
      setError("Créez d'abord un CV : le pack s'appuie sur votre CV réel.");
      return;
    }
    if (!url.trim() && offerText.trim().length < 250) {
      setError(showPaste ? "Collez le texte complet de l'offre (au moins quelques lignes)." : "Ajoutez le lien de l'offre.");
      return;
    }

    setGenerating(true);
    setError(null);
    setPack(null);
    setFullPack(null);
    setPackToken('');
    setPaid(false);
    setReturnedFromCheckout(false);
    clearPendingPack();

    const result = await generateApplicationPack({
      cvId,
      jobPostingUrl: url.trim() || undefined,
      jobOfferText: offerText.trim() || undefined,
    });
    setGenerating(false);

    if (result.ok === false) {
      if (result.code === 'offer_unreadable') setShowPaste(true);
      setError(result.error);
      return;
    }
    setPack(result.pack);
    setPackToken(result.token);
    setHeader(headerFromResume(selectedResume));
    setTab('cv');
  };

  const handleDownload = async () => {
    if (!pack || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      // Re-downloading a pack already released in this session costs nothing more.
      let full = fullPack;
      if (!full) {
        let released = await downloadApplicationPack(packToken);
        // Back from Stripe, the webhook that grants the credits can lag a few
        // seconds behind the redirect: wait for it instead of showing the
        // paywall again (a second purchase for the same pack).
        for (let attempt = 0; returnedFromCheckout && released.ok === false && released.code === 'payment_required' && attempt < 5; attempt++) {
          setError('Paiement reçu, validation en cours…');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          released = await downloadApplicationPack(packToken);
        }
        if (released.ok === false) {
          if (released.code === 'payment_required' && returnedFromCheckout) {
            setError("Votre paiement est en cours de validation. Réessayez dans une minute : ne payez pas une seconde fois.");
          } else if (released.code === 'payment_required') {
            savePendingPack({ pack, token: packToken, header });
            setPaywall({ open: true, reason: released.reason });
          } else {
            setError(released.error);
          }
          return;
        }
        full = released.pack;
        setFullPack(full);
        setPaid(true);
        clearPendingPack();
      }
      await downloadApplicationPackPdf(full, header);
      setReturnedFromCheckout(false);
    } finally {
      setDownloading(false);
    }
  };

  const tabs: Array<{ id: PackTab; label: string; icon: React.ElementType }> = [
    { id: 'cv', label: 'CV adapté', icon: FileText },
    { id: 'letter', label: 'Lettre de motivation', icon: Mail },
    { id: 'star', label: `Fiches STAR (${pack?.starSheets.length ?? 0})`, icon: MessagesSquare },
  ];

  const shown = fullPack ?? pack;
  const letterParagraphs = shown ? shown.coverLetter.body.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      <header>
        <p className="text-sm font-bold text-[#007568] mb-1">Offre ➔ CV</p>
        <h1 className="text-3xl sm:text-5xl font-black text-tertiary tracking-tight leading-tight">Objectifs &amp; CV IA</h1>
        <p className="mt-2 text-sm text-[#456071] max-w-2xl leading-relaxed">
          Collez une offre : l&apos;IA adapte votre CV, rédige la lettre et prépare les fiches STAR de l&apos;entretien pour ce poste.
          Un pack = <strong className="text-tertiary">{priceLabel}</strong>, sans abonnement.
        </p>
      </header>

      {/* Step 1: the offer */}
      <form onSubmit={handleGenerate} className="bg-white border border-tertiary/10 rounded-lg p-5 sm:p-7 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label htmlFor="pack-cv" className="block text-sm font-medium text-gray-700 mb-1">Votre CV de départ</label>
            <select
              id="pack-cv"
              value={cvId}
              onChange={(e) => setCvId(e.target.value)}
              disabled={!resumes.length}
              className="w-full border border-tertiary/20 rounded-lg px-3 py-2.5 text-sm font-medium bg-white text-tertiary focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 disabled:bg-slate-50"
            >
              {!resumes.length && <option value="">{resumesLoaded ? 'Aucun CV enregistré' : 'Chargement…'}</option>}
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-8">
            <label htmlFor="pack-url" className="block text-sm font-medium text-gray-700 mb-1">Lien de l&apos;offre</label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-tertiary/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pack-url"
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://candidat.francetravail.fr/offres/recherche/detail/…"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-tertiary/20 text-sm text-tertiary placeholder:text-slate-400 focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowPaste((v) => !v)}
            className="text-sm font-bold text-tertiary underline underline-offset-4 decoration-tertiary/30 hover:decoration-tertiary cursor-pointer"
            aria-expanded={showPaste}
          >
            {showPaste ? "Masquer le texte de l'offre" : "Ou coller le texte de l'offre"}
          </button>
          <p className="mt-1.5 text-xs text-[#456071] max-w-2xl">
            Les liens France Travail sont lus directement. LinkedIn, Indeed et la plupart des autres sites bloquent la lecture automatique :
            copiez le texte de l&apos;annonce et collez-le ici.
          </p>
          {showPaste && (
            <textarea
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              rows={8}
              placeholder="Collez ici le texte complet de l'annonce (missions, profil recherché, compétences)…"
              className="mt-3 w-full border border-tertiary/20 rounded-lg px-3 py-2.5 text-sm text-tertiary placeholder:text-slate-400 focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 resize-y"
            />
          )}
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-4 py-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={generating || !resumes.length}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#007568] hover:bg-[#006257] text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {generating ? (<><Loader2 size={16} className="animate-spin" /> Analyse de l&apos;offre en cours…</>) : 'Générer mon pack'}
          </button>
          <p className="text-xs text-[#456071]">La génération est gratuite : vous ne payez que pour télécharger.</p>
        </div>
        {resumesLoaded && !resumes.length && (
          <p className="text-sm text-[#456071]">
            Vous n&apos;avez pas encore de CV. Créez-en un dans « Mes CV », puis revenez ici.
          </p>
        )}
      </form>

      {/* Step 2: the pack */}
      {pack && (
        <section aria-label="Votre pack" className="space-y-5">
          {returnedFromCheckout && (
            <p className="flex items-start gap-2 text-sm font-semibold text-[#063e3a] bg-primary-container/60 rounded-lg px-4 py-3">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              Votre pack vous attend. Si le paiement est validé, cliquez sur « Télécharger mon pack ».
            </p>
          )}

          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-tertiary pb-3">
            <div>
              <p className="text-sm font-bold text-[#007568]">{pack.companyName || 'Entreprise non précisée'}</p>
              <h2 className="text-2xl sm:text-3xl font-black text-tertiary tracking-tight">{pack.jobTitle || 'Poste visé'}</h2>
            </div>
            {typeof pack.matchScore === 'number' && (
              <p className="text-sm text-[#456071]">
                Correspondance avec votre CV : <strong className="text-tertiary tabular-nums">{Math.round(pack.matchScore)} %</strong>
              </p>
            )}
          </div>

          {pack.missingKeywords.length > 0 && (
            <p className="text-sm text-[#456071] leading-relaxed">
              Mots-clés de l&apos;offre absents de votre CV : <span className="font-semibold text-tertiary">{pack.missingKeywords.slice(0, 8).join(', ')}</span>.
              Le pack ne les invente pas : ajoutez-les à votre CV seulement s&apos;ils correspondent à votre expérience réelle.
            </p>
          )}

          <div role="tablist" aria-label="Documents du pack" className="flex gap-5 sm:gap-7 border-b border-tertiary/15 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={`-mb-px pb-2.5 inline-flex items-center gap-2 text-sm whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                    active ? 'border-tertiary text-tertiary font-black' : 'border-transparent text-[#456071] hover:text-tertiary font-semibold'
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-tertiary/10 rounded-lg p-5 sm:p-8 text-sm text-tertiary leading-relaxed">
            {tab === 'cv' && (
              <div className="space-y-6">
                <div>
                  <p className="text-xl font-black">{header.name || 'Votre nom'}</p>
                  {shown.tailoredCv.headline && <p className="font-semibold text-[#007568]">{shown.tailoredCv.headline}</p>}
                  {header.contact.length > 0 && <p className="text-xs text-[#456071] mt-1">{header.contact.join('  ·  ')}</p>}
                </div>
                {shown.tailoredCv.summary && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#007568] mb-1.5">Profil</h3>
                    <p>{shown.tailoredCv.summary}</p>
                  </div>
                )}
                {shown.tailoredCv.experience.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#007568] mb-2">Expérience</h3>
                    <ul className="space-y-4">
                      {shown.tailoredCv.experience.map((exp, i) => (
                        <li key={`${exp.company}-${i}`}>
                          <p className="font-bold">{exp.title}{exp.company ? ` — ${exp.company}` : ''}</p>
                          {exp.dates && <p className="text-xs text-[#456071]">{exp.dates}</p>}
                          {i === 0 || paid ? (
                            <ul className="mt-1.5 list-disc ml-5 space-y-1">
                              {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                            </ul>
                          ) : (
                            <LockedLines count={2} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {paid && shown.tailoredCv.skills.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#007568] mb-1.5">Compétences</h3>
                    <p>{shown.tailoredCv.skills.join(' · ')}</p>
                  </div>
                )}
                {!paid && <LockNote>Formation, compétences et le reste des expériences sont dans le pack téléchargé.</LockNote>}
              </div>
            )}

            {tab === 'letter' && (
              <div>
                {shown.coverLetter.subject && <p className="font-black mb-4">Objet : {shown.coverLetter.subject}</p>}
                <div className="space-y-3">
                  {(paid ? letterParagraphs : letterParagraphs.slice(0, 1)).map((p, i) => <p key={i}>{p}</p>)}
                </div>
                {!paid && letterParagraphs.length > 1 && (
                  <>
                    <LockedLines count={4} />
                    <LockNote>La lettre complète est dans le pack téléchargé.</LockNote>
                  </>
                )}
              </div>
            )}

            {tab === 'star' && (
              <div className="space-y-6">
                <p className="text-xs text-[#456071] max-w-2xl">
                  Méthode STAR : Situation, Tâche, Action, Résultat. Les fiches « À compléter » n&apos;ont pas d&apos;exemple dans votre CV :
                  elles vous guident, sans inventer d&apos;histoire.
                </p>
                {shown.starSheets.length === 0 && (
                  <p className="text-[#456071]">Aucune fiche n&apos;a pu être générée pour cette offre. Relancez la génération.</p>
                )}
                {shown.starSheets.map((sheet, i) => {
                  const open = i === 0 || paid;
                  return (
                    <article key={i} className="border-t border-tertiary/10 pt-5 first:border-t-0 first:pt-0">
                      <h3 className="font-black text-base">{i + 1}. {sheet.question}</h3>
                      {!sheet.basedOnCv && (
                        <p className="mt-1 inline-block text-xs font-bold text-amber-800 bg-amber-100 rounded px-2 py-0.5">À compléter avec votre expérience</p>
                      )}
                      {open ? (
                        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2">
                          {([['Situation', sheet.situation], ['Tâche', sheet.task], ['Action', sheet.action], ['Résultat', sheet.result]] as const).map(
                            ([label, value]) => value ? (
                              <React.Fragment key={label}>
                                <dt className="text-xs font-black uppercase tracking-widest text-[#007568] pt-0.5">{label}</dt>
                                <dd>{value}</dd>
                              </React.Fragment>
                            ) : null
                          )}
                          {sheet.tip && (
                            <>
                              <dt className="text-xs font-black uppercase tracking-widest text-[#456071] pt-0.5">Conseil</dt>
                              <dd className="text-[#456071]">{sheet.tip}</dd>
                            </>
                          )}
                        </dl>
                      ) : (
                        <LockedLines count={2} />
                      )}
                    </article>
                  );
                })}
                {!paid && shown.starSheets.length > 1 && <LockNote>Les autres fiches sont débloquées avec le pack.</LockNote>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-tertiary hover:bg-[#093b50] text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-60"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {paid ? 'Télécharger à nouveau (PDF)' : `Télécharger mon pack, ${priceLabel}`}
            </button>
            <p className="text-xs text-[#456071] max-w-md">
              Un PDF avec le CV, la lettre et les fiches STAR. Relisez tout avant d&apos;envoyer : le contenu vient de votre CV, mais c&apos;est vous qui validez.
            </p>
          </div>
        </section>
      )}

      <ExportPaywallModal
        isOpen={paywall.open}
        onClose={() => setPaywall({ open: false })}
        documentType="cover_letter"
        reason={paywall.reason}
      />
    </div>
  );
}
