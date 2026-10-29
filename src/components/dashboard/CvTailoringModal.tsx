import React, { useRef, useState } from 'react';
import { Sparkles, CheckCircle2, X, ShieldCheck, Link2, FileText } from 'lucide-react';
import { TailorCvApiResponse } from '../../infrastructure/routes/cvTailorApi';
import { SavedResume } from '../../types';
import { supabase } from '../../lib/supabase';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import TailorResultPanel from '../cv-tailoring/TailorResultPanel';

interface CvTailoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseCv: SavedResume;
  jobOfferText?: string;
  jobOfferTitle?: string;
  onSaveTailoredCv?: (tailoredCv: any) => void;
}

type InputMode = 'text' | 'url';

export default function CvTailoringModal({
  isOpen,
  onClose,
  baseCv,
  jobOfferText = '',
  jobOfferTitle = 'Poste Cible',
  onSaveTailoredCv,
}: CvTailoringModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState(jobOfferText);
  const [inputUrl, setInputUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TailorCvApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogA11y(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const canSubmit =
    !isProcessing &&
    (inputMode === 'text' ? inputText.trim().length > 0 : inputUrl.trim().length > 0);

  const handleRunTailoring = async () => {
    if (!canSubmit) return;
    setIsProcessing(true);
    setError(null);

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;

      const body: Record<string, unknown> = {
        cvId: baseCv.id,
        task: 'full_pipeline',
      };

      if (inputMode === 'text') {
        body.jobOfferText = inputText;
      } else {
        body.jobPostingUrl = inputUrl;
      }

      const res = await fetch('/api/cv/tailor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const response: TailorCvApiResponse = await res.json();

      if (response.success) {
        setResult(response);
      } else {
        setError(response.error ?? 'Une erreur est survenue.');
      }
    } catch (err: any) {
      setError(err.message ?? 'Erreur réseau.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-tailoring-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="cv-tailoring-modal-title" className="text-lg font-extrabold text-gray-900">
                Adaptation IA de votre CV
              </h2>
              <p className="text-xs text-gray-500">
                Optimisez pour : <span className="font-semibold text-gray-800">{jobOfferTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!result ? (
            <div className="space-y-4">
              {/* No-fabrication banner */}
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
                <ShieldCheck size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-700 font-medium leading-relaxed">
                  <strong>Garantie Sans Inventions :</strong> L'IA réorganise et reformule vos expériences existantes. Aucun fait, diplôme ou compétence inventé.
                </p>
              </div>

              {/* Input mode toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInputMode('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    inputMode === 'text'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                  }`}
                >
                  <FileText size={13} /> Coller le texte
                </button>
                <button
                  onClick={() => setInputMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    inputMode === 'url'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                  }`}
                >
                  <Link2 size={13} /> Lien URL
                </button>
              </div>

              {/* Input field */}
              {inputMode === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texte de la Fiche de Poste
                  </label>
                  <textarea
                    rows={6}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Collez les exigences du poste ici..."
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-800 bg-gray-50"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de l'offre d'emploi
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-800 bg-gray-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Le contenu sera extrait automatiquement depuis la page.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleRunTailoring}
                disabled={!canSubmit}
                className="w-full bg-gray-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Sparkles size={16} className="animate-spin" /> Analyse en cours (extraction → analyse → génération)…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Lancer le pipeline complet
                  </>
                )}
              </button>
            </div>
          ) : (
            <TailorResultPanel
              pipelineResult={result.pipelineResult ?? {}}
              matchScore={result.matchScore}
              changeSummary={result.changeSummary ?? []}
              diffPreview={result.diffPreview ?? { originalSummary: '', tailoredSummary: '' }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => { setResult(null); setError(null); }}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 px-4 py-2 rounded-xl"
          >
            {result ? '← Nouvelle analyse' : 'Annuler'}
          </button>

          {result && (
            <button
              onClick={() => {
                if (onSaveTailoredCv) onSaveTailoredCv(result.tailoredCv);
                onClose();
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 size={16} /> Enregistrer ce CV adapté
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
