import React, { useRef, useState } from 'react';
import { OutreachChannel, LINKEDIN_CONNECTION_NOTE_MAX_LENGTH } from '../../domain/outreach/OutreachMessage';
import { GenerateOutreachApiResponse } from '../../infrastructure/routes/outreachApi';
import { X, Copy, Check, Send, Loader2, Linkedin, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface OutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
}

export const OutreachModal: React.FC<OutreachModalProps> = ({
  isOpen,
  onClose,
  jobTitle = '',
  companyName = '',
  jobDescription = '',
}) => {
  const [channel, setChannel] = useState<OutreachChannel>('linkedin_connection_note');
  const [jobOfferInput, setJobOfferInput] = useState(
    jobDescription || (jobTitle && companyName ? `${jobTitle} chez ${companyName}` : '')
  );
  const [cvSummary, setCvSummary] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogA11y(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!jobOfferInput.trim()) {
      toast.error('Veuillez renseigner les détails de l\'offre ou du poste.');
      return;
    }

    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobOfferInput,
          cvSummary: cvSummary || 'Développeur expérimenté, motivé et réactif.',
          channel,
          language,
        }),
      });
      const response: GenerateOutreachApiResponse = await res.json();

      if (response.success && response.content) {
        setGeneratedContent(response.content);
        toast.success('Message généré avec succès !');
      } else {
        toast.error(response.error || 'Échec de la génération du message.');
      }
    } catch (err: any) {
      toast.error('Erreur lors de la communication avec le service.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.info('Message copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2500);
  };

  const charCount = generatedContent.length;
  const isOverLimit = channel === 'linkedin_connection_note' && charCount > LINKEDIN_CONNECTION_NOTE_MAX_LENGTH;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outreach-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Send size={18} />
            </div>
            <div>
              <h2 id="outreach-modal-title" className="text-base font-bold text-slate-900">Assistant de Prise de Contact Recruteur</h2>
              <p className="text-xs text-slate-500">Générez un message d'accroche personnalisé pour vos démarches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Canal de prise de contact
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('linkedin_connection_note')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  channel === 'linkedin_connection_note'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Linkedin size={18} className={channel === 'linkedin_connection_note' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Note LinkedIn (≤300 car.)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('linkedin_message')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  channel === 'linkedin_message'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <MessageSquare size={18} className={channel === 'linkedin_message' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Message InMail / Direct</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('cold_email')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  channel === 'cold_email'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Mail size={18} className={channel === 'cold_email' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Email à froid</span>
              </button>
            </div>
          </div>

          {/* Form Options */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">Offre d'emploi ou poste visé</label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Langue:</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                    className="text-base font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5"
                  >
                    <option value="fr">Français (Registre professionnel)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <textarea
                value={jobOfferInput}
                onChange={(e) => setJobOfferInput(e.target.value)}
                placeholder="ex: Développeur React chez Doctolib, recherche un profil 3-5 ans d'expérience..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contexte candidat / Points clés de votre CV (optionnel)
              </label>
              <input
                type="text"
                value={cvSummary}
                onChange={(e) => setCvSummary(e.target.value)}
                placeholder="ex: 5 ans XP React/Node, passionné par le domaine de la santé..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Génération du message en cours...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Générer l'accroche</span>
              </>
            )}
          </button>

          {/* Generated Result Textarea */}
          {generatedContent && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  Message généré
                  {channel === 'linkedin_connection_note' && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isOverLimit ? 'bg-[var(--status-red)]/20 text-[var(--status-red)] font-bold' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {charCount} / {LINKEDIN_CONNECTION_NOTE_MAX_LENGTH} car.
                    </span>
                  )}
                </label>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-[var(--status-green)]" /> : <Copy size={14} />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>

              {isOverLimit && (
                <div className="p-2.5 bg-[var(--status-red)]/10 border border-[var(--status-red)]/30 rounded-lg flex items-center gap-2 text-xs text-[var(--status-red)]">
                  <AlertCircle size={14} />
                  <span>
                    La note LinkedIn dépasse 300 caractères ({charCount} car.). Ajustez ou réduisez le texte ci-dessous.
                  </span>
                </div>
              )}

              <textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={channel === 'linkedin_connection_note' ? 4 : 7}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-base text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
