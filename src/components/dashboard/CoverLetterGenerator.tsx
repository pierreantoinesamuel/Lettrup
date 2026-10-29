import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ResumeProfile, CoverLetterTemplate, SavedResume, ResumeTemplate, JobApplication } from '../../types';
import { generateOutreachMessage, generateCoverLetterAdvanced } from '../../services/ai/aiService';
import { getUserJobApplications } from '../../services/jobTracker';
import { listUserResumes } from '../../lib/resumeStore';
import { adaptResumeDataToProfile } from '../../lib/resumeAdapter';
import { resolvePrimaryResume } from '../../domain/user/PrimaryResume';
import {
  Sparkles, Copy, Maximize2, Minimize2, Check, Loader2, FileText,
  Briefcase, Heart, Zap, PenTool, Crown, Code, LayoutGrid, Lock, X,
  ChevronRight, ChevronDown, Lightbulb, ShieldCheck, Building2, MessageSquare, AlignLeft,
  Eye, RefreshCw, Layers, CheckCircle2, SlidersHorizontal, Wand2, FileCheck, MapPin, Mail, Phone,
  History, Trash2
} from 'lucide-react';
import { translations, Language } from '../../utils/translations';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logUserActivity } from '../../services/analytics';
import { checkExportEntitlement, consumeExportEntitlement } from '../../lib/exportApi';
import ExportPaywallModal from '../ExportPaywallModal';
import { getAllCoverLetterTemplates, canAccessCoverLetterTemplate, CoverLetterTemplateInfo } from './templates/coverLetterRegistry';
import CompactCoverLetterSample from './CompactCoverLetterSample';
import { toCanvas } from 'html-to-image';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { ToneId, CoverLetterHistoryItem, mapCoverLetterRow, COVER_LETTER_MAX } from '../../lib/coverLetterStore';

interface ApplicationKitProps {
  resume?: ResumeProfile;
  setResume?: React.Dispatch<React.SetStateAction<ResumeProfile>>;
  jobDescription?: string;
  setJobDescription?: (val: string) => void;
  lang?: Language;
  onSaveResume?: (resume: SavedResume) => void;
  userPlan?: string;
  onRequireUpgrade?: () => void;
  onRedirectToCoverLetter?: (jobDesc: string, resumeData: ResumeProfile, template: CoverLetterTemplate) => void;
  applications?: JobApplication[];
  savedResumes?: SavedResume[];
  initialData?: CoverLetterHistoryItem;
  initialTemplateId?: string;
  onBack?: () => void;
  onLetterSaved?: (item: CoverLetterHistoryItem) => void;
}

const TONES: {
  id: ToneId;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { id: 'professionnel', label: 'Professionnel', description: 'Formel, rigoureux et structuré', icon: Briefcase, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'enthousiaste', label: 'Enthousiaste', description: 'Chaleureux, passionné et engagé', icon: Heart, color: 'text-[var(--status-red)] bg-[var(--status-red)]/10 border-[var(--status-red)]/30' },
  { id: 'concis', label: 'Concis', description: 'Direct, synthétique et percutant', icon: Zap, color: 'text-[var(--status-green)] bg-[var(--status-green)]/10 border-[var(--status-green)]/30' },
  { id: 'creatif', label: 'Créatif', description: 'Original, audacieux et mémorable', icon: PenTool, color: 'text-[var(--status-purple)] bg-[var(--status-purple)]/10 border-[var(--status-purple)]/30' },
];

const LENGTHS = [100, 130, 150] as const;
type LengthValue = (typeof LENGTHS)[number];

const PAPER_COLOR_OPTIONS: { id: string; label: string; hex: string }[] = [
  { id: 'white', label: 'Blanc', hex: '#ffffff' },
  { id: 'gris-clair', label: 'Gris clair', hex: '#ececec' },
  { id: 'gris-perle', label: 'Gris perle', hex: '#f2f2f2' },
];


// Strips stray markdown (**, #, ...) some providers add despite the plain-text instruction.
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[*]\s+/gm, '- ');
}

// Safety net: some providers ignore the "body only" instruction and still return a full
// letter (name/contact/date/recipient/object line, and a closing formula + signature).
// Since the A4 template already renders all of those around the AI text, we strip any
// duplicate leading/trailing block so the letter isn't shown twice.
function sanitizeCoverLetterBody(raw: string): string {
  const cleaned = stripMarkdown(raw.trim());
  const paragraphs = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return cleaned;

  const salutationRegex = /^(madame|monsieur|ch[eè]re?|bonjour|à qui de droit)/i;
  let startIdx = paragraphs.findIndex(p => salutationRegex.test(p) && p.length < 120);
  if (startIdx === -1) startIdx = 0;

  let endIdx = paragraphs.length;
  const closingRegex = /(je vous prie|veuillez agr[ée]er|dans l'attente|restant à votre disposition|je reste à votre disposition).*(agr[ée]er|dispon)/i;

  // Drop a trailing signature-only line (short, no ending punctuation).
  if (endIdx - startIdx > 1) {
    const last = paragraphs[endIdx - 1];
    const wordCount = last.split(/\s+/).length;
    if (wordCount <= 6 && !/[.:]$/.test(last)) {
      endIdx -= 1;
    }
  }
  // Drop a trailing closing formula paragraph.
  if (endIdx - startIdx > 1 && closingRegex.test(paragraphs[endIdx - 1])) {
    endIdx -= 1;
  }

  return paragraphs.slice(startIdx, Math.max(endIdx, startIdx + 1)).join('\n\n');
}

const DEFAULT_RESUME: ResumeProfile = {
  fullName: 'Alexandre Martin',
  email: 'alexandre.martin@techcorp.io',
  phone: '+33 6 12 34 56 78',
  location: 'Paris, France',
  summary: 'Architecte logiciel & Staff Engineer passionné avec plus de 8 ans d\'expérience.',
  skills: ['React', 'TypeScript', 'Node.js', 'Go', 'Docker', 'Kubernetes'],
  experience: [
    {
      id: 'exp-1',
      company: 'TechCorp Solutions',
      role: 'Staff Engineer',
      startDate: '2022',
      endDate: 'Présent',
      current: true,
      description: 'Direction technique de la migration d\'une architecture monolithique vers des microservices.'
    }
  ]
};

export function ApplicationKit({
  resume: propResume,
  setResume: propSetResume,
  jobDescription: propJobDescription,
  setJobDescription: propSetJobDescription,
  lang = 'fr',
  userPlan = 'free_trial',
  onRequireUpgrade,
  applications = [],
  savedResumes = [],
  onRedirectToCoverLetter,
  initialData,
  initialTemplateId,
  onBack,
  onLetterSaved,
}: ApplicationKitProps) {
  const { user } = useAuth();
  const [internalResume, setInternalResume] = useState<ResumeProfile>(propResume || DEFAULT_RESUME);
  const [internalJobDesc, setInternalJobDesc] = useState(propJobDescription || '');

  const resume = propResume || internalResume;
  const setResume = propSetResume || setInternalResume;
  const jobDescription = propJobDescription !== undefined ? propJobDescription : internalJobDesc;
  const setJobDescription = propSetJobDescription || setInternalJobDesc;

  const [fetchedApplications, setFetchedApplications] = useState<JobApplication[]>([]);

  useEffect(() => {
    if (propResume || !user?.id) return;
    let cancelled = false;
    listUserResumes(user.id).then((resumes) => {
      if (cancelled) return;
      const primary = resolvePrimaryResume(resumes);
      const profile = primary ? adaptResumeDataToProfile(primary.resumeData) : null;
      if (profile) setInternalResume(profile);
    }).catch((err) => console.error('Error loading saved resume in CoverLetterGenerator:', err));
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (applications && applications.length > 0) return;

    const userId = user?.id || 'demo_user';
    getUserJobApplications(userId)
      .then((list) => {
        const mapped: JobApplication[] = list.map((item) => ({
          id: item.id,
          company: item.company,
          role: item.role,
          status: item.status,
          location: item.location,
          salary: item.salary,
          url: item.url,
          logo: item.logo,
          notes: item.notes,
          dateAdded: item.date_added,
          is_internal: item.is_internal,
          job_id: item.job_id,
        }));
        setFetchedApplications(mapped);
      })
      .catch((err) => console.error('Error fetching applications in CoverLetterGenerator:', err));
  }, [user?.id, applications?.length]);

  const safeApplications = (applications && applications.length > 0) ? applications : fetchedApplications;

  const [posteVise, setPosteVise] = useState(initialData?.posteVise || '');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedCLTemplate, setSelectedCLTemplate] = useState<string>(initialData?.template || initialTemplateId || 'candidature-spontanee');
  const [paperColor, setPaperColor] = useState<string>('#ececec');
  const [company, setCompany] = useState(initialData?.company || '');
  const [recruiter, setRecruiter] = useState(initialData?.recruiter || '');
  const [tone, setTone] = useState<ToneId>(initialData?.tone || 'professionnel');
  const [length, setLength] = useState<LengthValue>(200);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedCLTemplate(tplId);
    if (window.innerWidth < 1024) {
      setActiveTab('preview');
    }
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(initialData?.content || '');
  const [generatedFor, setGeneratedFor] = useState<{ company: string; posteVise: string; recruiter: string } | null>(
    initialData ? { company: initialData.company, posteVise: initialData.posteVise, recruiter: initialData.recruiter } : null
  );
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'docx' | null>(null);
  const [isExportPaywallOpen, setIsExportPaywallOpen] = useState(false);
  const [exportPaywallReason, setExportPaywallReason] = useState<'quota_exceeded' | 'no_subscription' | undefined>(undefined);
  const a4SheetRef = useRef<HTMLDivElement>(null);

  const [letterHistory, setLetterHistory] = useState<CoverLetterHistoryItem[]>([]);

  useEffect(() => {
    if (!user?.id || !supabase) {
      setLetterHistory([]);
      return;
    }
    supabase
      .from('user_cover_letters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(COVER_LETTER_MAX)
      .then(({ data, error }) => {
        if (!error && data) setLetterHistory(data.map(mapCoverLetterRow));
      });
  }, [user?.id]);

  // Free tier: 1 saved cover letter total, same "block a 2nd one" rule as
  // the CV limit in ResumeBuilder.tsx (see resumeStore.ts's
  // FREE_TIER_CV_LIMIT_ERROR). Checked against the already-loaded history
  // (capped at COVER_LETTER_HISTORY_LIMIT, well above 1) rather than a
  // separate count query.
  const isFreeTier = user?.plan !== 'pro' && user?.plan !== 'plus' && user?.plan !== 'max';
  const maxLimitReached = letterHistory.length >= COVER_LETTER_MAX;
  const letterLimitReached = (isFreeTier && letterHistory.length >= 1) || maxLimitReached;
  const canGenerate = (posteVise.trim().length > 0 || jobDescription.trim().length > 0) && !isGenerating && !letterLimitReached;

  const mapTone = (t: ToneId): 'professional' | 'enthusiastic' | 'concise' | 'creative' =>
    t === 'enthousiaste' ? 'enthusiastic' : t === 'concis' ? 'concise' : t === 'creatif' ? 'creative' : 'professional';
  const mapLength = (l: LengthValue): 'short' | 'medium' | 'long' =>
    l === 130 ? 'medium' : 'short';

  const handleSelectResume = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    const saved = (savedResumes || []).find(r => r.id === resumeId);
    if (saved && setResume) {
      setResume(saved.data);
    }
  };

  const recentResumes = React.useMemo(() => {
    return [...(savedResumes || [])]
      .sort((a, b) => new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime())
      .slice(0, 3);
  }, [savedResumes]);

  const handleSelectTrackedJob = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) return;

    const job = safeApplications.find(a => a.id === jobId);
    if (!job) return;

    setPosteVise(job.role || '');
    if (job.company) setCompany(job.company);

    const descParts: string[] = [];
    if (job.role && job.company) descParts.push(`Poste : ${job.role} chez ${job.company}`);
    if (job.location) descParts.push(`Localisation : ${job.location}`);
    if (job.salary) descParts.push(`Rémunération : ${job.salary}`);
    if (job.notes) descParts.push(`Notes & Détails :\n${job.notes}`);

    setJobDescription(descParts.join('\n\n'));
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setCopied(false);

    const toneLabel = TONES.find(t => t.id === tone)?.label ?? 'Professionnel';
    const context = [
      posteVise.trim() && `Poste visé : ${posteVise.trim()}`,
      `Ton souhaité : ${toneLabel}`,
      `Longueur cible : ~${length} mots`,
      jobDescription.trim() && `Description du poste :\n${jobDescription.trim()}`,
    ].filter(Boolean).join('\n\n');

    try {
      if (user?.id) {
        logUserActivity(user.id, 'application_kit_generate', {
          page: 'application_kit',
          tone,
          length,
          template: selectedCLTemplate,
          has_job_description: !!jobDescription.trim(),
        });
      }

      const rawContent = await generateOutreachMessage(
        resume,
        recruiter || 'Responsable du Recrutement',
        company || 'Entreprise',
        context,
        undefined,
        lang
      );
      const content = sanitizeCoverLetterBody(rawContent);
      const snapshot = {
        company: company || 'Entreprise',
        posteVise: posteVise || 'Poste visé',
        recruiter: recruiter || 'Responsable du Recrutement',
      };

      setGeneratedContent(content);
      setGeneratedFor(snapshot);
      setActiveTab('preview');

      if (user?.id && supabase) {
        const { data, error } = await supabase
          .from('user_cover_letters')
          .insert({
            user_id: user.id,
            name: `${snapshot.posteVise} - ${snapshot.company}`,
            type: 'ai_generated',
            job_title: snapshot.posteVise,
            company: snapshot.company,
            template: selectedCLTemplate,
            content,
            resume_snapshot: { recruiter: snapshot.recruiter, tone },
          })
          .select()
          .single();

        if (!error && data) {
          const saved = mapCoverLetterRow(data);
          setLetterHistory(prev => [saved, ...prev].slice(0, COVER_LETTER_MAX));
          onLetterSaved?.(saved);
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedContent(
        lang === 'fr'
          ? 'Une erreur est survenue lors de la génération. Veuillez réessayer.'
          : 'An error occurred while generating content. Please try again.'
      );
    }

    setIsGenerating(false);
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportFileName = () => `Lettre_de_motivation_${(company || 'Candidature').replace(/\s+/g, '_')}`;

  // The A4 preview renders header/date/object/closing around the AI body separately;
  // the .txt export has no such surrounding template, so it must assemble the full letter itself.
  const buildFullLetterText = (item: { content: string; company: string; posteVise: string; recruiter: string }) => {
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return [
      resume.fullName || 'Candidat',
      [resume.email, resume.phone, resume.location].filter(Boolean).join(' | '),
      '',
      item.company || 'Entreprise',
      `À l'attention de : ${item.recruiter || 'Responsable du Recrutement'}`,
      `Fait à ${resume.location?.split(',')[0] || 'Paris'}, le ${today}`,
      '',
      `Objet : Candidature au poste de ${item.posteVise || '[Intitulé du poste]'}`,
      '',
      item.content.trim(),
      '',
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      '',
      resume.fullName || 'Candidat',
    ].join('\n');
  };

  const handleExportTXT = () => {
    if (!generatedContent) return;
    const fullText = buildFullLetterText({ content: generatedContent, company, posteVise, recruiter });
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${exportFileName()}.txt`);
  };

  const performExportPDF = async () => {
    if (!generatedContent || !a4SheetRef.current) return;
    setIsExporting('pdf');
    try {
      // Render the full sheet to a canvas, then slice it across as many A4 pages
      // as needed so long letters are never cut off at the bottom of one page.
      const canvas = await toCanvas(a4SheetRef.current, { quality: 0.98, pixelRatio: 2, backgroundColor: paperColor });

      // Deferred to export time — never needed just for viewing/editing the letter.
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const pageHeightPx = (pdfPageHeight * canvas.width) / pdfWidth;

      let renderedHeightPx = 0;
      let pageIndex = 0;
      while (renderedHeightPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) break;
        ctx.drawImage(canvas, 0, renderedHeightPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        const sliceHeightMm = (sliceHeightPx * pdfWidth) / canvas.width;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, pdfWidth, sliceHeightMm);

        renderedHeightPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save(`${exportFileName()}.pdf`);
    } catch (error) {
      console.error('Error generating cover letter PDF:', error);
      alert(lang === 'fr' ? 'Une erreur est survenue lors de la génération du PDF.' : 'An error occurred while generating the PDF.');
    } finally {
      setIsExporting(null);
    }
  };

  const performExportDOCX = () => {
    if (!generatedContent) return;
    setIsExporting('docx');

    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const bodyParagraphs = generatedContent
      .split(/\n+/)
      .filter(line => line.trim().length > 0)
      .map(line => new Paragraph({ children: [new TextRun(line.trim())], spacing: { after: 200 } }));

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: resume.fullName || 'Candidat', bold: true, size: 28 })],
          }),
          new Paragraph({
            children: [new TextRun({ text: posteVise || resume.summary || '', size: 20, color: '2563eb' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: [resume.email, resume.phone, resume.location].filter(Boolean).join(' | '), size: 18 })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: company || 'Entreprise', bold: true })],
          }),
          new Paragraph({
            children: [new TextRun(`À l'attention de : ${recruiter || 'Responsable du Recrutement'}`)],
            spacing: { after: 100 },
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Fait à ${resume.location?.split(',')[0] || 'Paris'}, le ${today}`, italics: true })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Objet : Candidature au poste de ${posteVise || '[Intitulé du poste]'}`, bold: true })],
            spacing: { after: 300 },
          }),
          ...bodyParagraphs,
          new Paragraph({
            children: [new TextRun({ text: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.", italics: true })],
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: resume.fullName || 'Alexandre Martin', bold: true })],
          }),
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${exportFileName()}.docx`);
      setIsExporting(null);
    });
  };

  // Same download-time paywall as ResumeBuilder.tsx's CV export: only Max is
  // truly unlimited (checked off AuthContext, no server round trip). Pro is
  // capped at 10/month; free users get no free cover-letter quota at all
  // (unlike the 1 free CV/month) and always need a one-time
  // export_entitlements credit — all of that is only knowable server-side.
  const attemptExport = async (format: 'pdf' | 'docx') => {
    if (!generatedContent || !user?.id) return;
    logUserActivity(user.id, 'cover_letter_download_clicked', { format });

    const isUnlimitedSubscriber = user.plan === 'max';
    let entitled = isUnlimitedSubscriber;
    let usedServerCheck = false;

    if (!entitled) {
      const result = await checkExportEntitlement('cover_letter');
      entitled = result.entitled;
      usedServerCheck = true;
      if (!entitled) {
        setExportPaywallReason(result.reason);
      }
    }

    if (!entitled) {
      logUserActivity(user.id, 'cover_letter_paywall_opened', { format });
      setIsExportPaywallOpen(true);
      return;
    }

    if (format === 'pdf') {
      await performExportPDF();
    } else {
      performExportDOCX();
    }

    if (usedServerCheck) {
      await consumeExportEntitlement('cover_letter', format);
    }
    logUserActivity(user.id, 'cover_letter_export_completed', { format });
  };

  const handleExportPDF = () => attemptExport('pdf');
  const handleExportDOCX = () => attemptExport('docx');

  const handleRestoreFromHistory = (item: CoverLetterHistoryItem) => {
    setGeneratedContent(item.content);
    setGeneratedFor({ company: item.company, posteVise: item.posteVise, recruiter: item.recruiter });
    setCompany(item.company);
    setPosteVise(item.posteVise);
    setRecruiter(item.recruiter);
    setTone(item.tone);
    setSelectedCLTemplate(item.template);
    setActiveTab('preview');
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDeleteFromHistory = async (id: string) => {
    setLetterHistory(prev => prev.filter(item => item.id !== id));
    if (user?.id && supabase) {
      await supabase.from('user_cover_letters').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  const handleExportHistoryTXT = (item: CoverLetterHistoryItem) => {
    const fullText = buildFullLetterText(item);
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `Lettre_de_motivation_${(item.company || 'Candidature').replace(/\s+/g, '_')}.txt`);
  };

  const allTemplates = getAllCoverLetterTemplates();
  const currentTemplateObj = allTemplates.find(t => t.id === selectedCLTemplate) || allTemplates[0];

  const isContentStale = !!generatedContent && !!generatedFor && (
    generatedFor.company !== (company || 'Entreprise') ||
    generatedFor.posteVise !== (posteVise || 'Poste visé') ||
    generatedFor.recruiter !== (recruiter || 'Responsable du Recrutement')
  );

  return (
    // min-h-full (not min-h-screen): this renders as page *content* inside
    // Dashboard's <main>, which is already the app shell's scroll container
    // with its own height — min-h-screen here would claim a full extra
    // viewport height nested inside main and reintroduce page-level scroll.
    <div className="min-h-full bg-gray-50 text-slate-900 flex flex-col font-sans">
      {/* Back to library button */}
      {onBack && (
        <div className="px-4 sm:px-6 pt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#007568] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Retour à mes lettres
          </button>
        </div>
      )}

      <ExportPaywallModal
        isOpen={isExportPaywallOpen}
        onClose={() => setIsExportPaywallOpen(false)}
        documentType="cover_letter"
        reason={exportPaywallReason}
      />

      {letterLimitReached && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-3 text-xs text-amber-800 text-center">
          {maxLimitReached ? (
            <span>Vous avez atteint la limite de <strong>{COVER_LETTER_MAX} lettres</strong>. Supprimez une lettre depuis la bibliothèque pour en créer une nouvelle.</span>
          ) : (
            <>
              <span>La formule Gratuite est limitée à 1 lettre de motivation. Passez à Pro pour en générer plusieurs.</span>
              <Link to="/pricing" className="font-bold underline underline-offset-2 shrink-0">
                Voir les formules
              </Link>
            </>
          )}
        </div>
      )}

      {/* Page header — matching Mes CV visual style */}
      <div className="px-4 lg:px-8 pt-6 pb-2">
        <div className="max-w-[1500px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Lettre de Motivation</h1>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">
                Rédigez instantanément une lettre sur-mesure superposée sur un modèle A4 professionnel, adaptée au poste et aux exigences du recruteur.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Mobile tabs */}
              <div className="md:hidden flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'form' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Formulaire
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'preview' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Aperçu A4
                  {generatedContent && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="hidden sm:inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-[#007568] text-white hover:bg-[#006257] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {isGenerating ? 'Génération en cours…' : 'Générer la Lettre par IA'}
              </button>
            </div>
          </div>

          {/* Recent Resumes Quick Fill Pills */}
          {recentResumes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mr-1">
                <FileText size={13} className="text-[#007568]" />
                Derniers CV :
              </span>
              {recentResumes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectResume(r.id)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-[#007568] border border-gray-200 hover:border-blue-200 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <span>{r.name}</span>
                  {r.jobTitle && <span className="text-xs text-gray-400">({r.jobTitle})</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile/Tablet Navigation Bar when scrolling */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 border-b border-gray-200 p-2.5 backdrop-blur-md flex items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'form' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Formulaire & Modèles</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('preview');
              setTimeout(() => {
                previewRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'preview' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={13} />
            <span>Aperçu A4</span>
            {generatedContent && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          </button>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-[#007568] hover:bg-[#006257] disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
        >
          {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          <span>Générer IA</span>
        </button>
      </div>

      {/* Main Split Workbench Container */}
      <div className="flex-1 max-w-[1500px] w-full mx-auto px-4 lg:px-8 py-6">
        <div className={`grid gap-8 items-start ${expanded ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-12'}`}>

          {/* LEFT COLUMN: Modern Form Controls with internal scroll (5 cols on md/lg) */}
          <div className={`md:col-span-5 space-y-6 md:sticky md:top-4 lg:top-6 md:max-h-[calc(100vh-2.5rem)] md:overflow-y-auto custom-scrollbar pr-1.5 ${activeTab === 'preview' ? 'hidden md:block' : 'block'}`}>

            {/* Quick Step Jump Sticky Navigation Bar */}
            <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-1.5 overflow-x-auto">
              <a
                href="#section-poste"
                className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <span className="w-4 h-4 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">1</span>
                <span className="truncate">Poste & Recruteur</span>
              </a>
              <a
                href="#section-ton"
                className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded-xl bg-primary-container/40 hover:bg-primary-container text-tertiary border border-tertiary/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <span className="w-4 h-4 rounded-md bg-primary-container text-tertiary flex items-center justify-center text-xs font-black">2</span>
                <span className="truncate">Ton & Rédaction</span>
              </a>
              <a
                href="#section-modeles"
                className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-center"
              >
                <span className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">3</span>
                <span className="truncate">{allTemplates.length} modèles</span>
              </a>
            </div>

            {/* Section 1: Offre & Recruteur */}
            <div id="section-poste" className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 font-bold text-sm flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Poste & Recruteur</h3>
                    <p className="text-xs text-slate-500">Informations clés pour le ciblage IA</p>
                  </div>
                </div>
                <span className="text-xs bg-blue-500/20 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-500/30 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${posteVise ? 'bg-[var(--status-green)]' : 'bg-[var(--status-orange)] animate-pulse'}`} />
                  <span>{posteVise ? (company ? `${posteVise} (${company})` : posteVise) : 'Remplir le poste'}</span>
                </span>
              </div>

              {/* Selection depuis le Suivi de Candidatures */}
              <div className="bg-tertiary p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-blue-700">
                    <Briefcase size={15} className="text-[var(--status-orange)]" />
                    Choisir une candidature du Suivi ({safeApplications.length})
                  </label>
                  {selectedJobId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJobId('');
                        setPosteVise('');
                        setCompany('');
                        setJobDescription('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-[var(--status-red)] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <X size={12} /> Réinitialiser
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedJobId}
                    onChange={(e) => handleSelectTrackedJob(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-base font-semibold text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer pr-10"
                  >
                    <option value="">— Sélectionner n'importe quelle candidature sauvegardée —</option>
                    {safeApplications.map((app) => (
                      <option key={app.id} value={app.id}>
                        [{app.status === 'Saved' ? 'Sauvegardé' : app.status === 'Applied' ? 'Postulé' : app.status === 'Interview' ? 'Entretien' : app.status === 'Offer' ? 'Offre' : 'Refusé'}] {app.role}{app.company ? ` chez ${app.company}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {selectedJobId && (
                  <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 p-2.5 rounded-lg text-xs text-blue-800">
                    <span className="flex items-center gap-2 font-medium">
                      <CheckCircle2 size={14} className="text-[var(--status-green)]" />
                      Offre liée avec succès au générateur
                    </span>
                    <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded font-bold">
                      {safeApplications.find(a => a.id === selectedJobId)?.company || 'Entreprise'}
                    </span>
                  </div>
                )}
              </div>

              {/* Poste visé */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Poste visé <span className="text-blue-600">*</span>
                </label>
                <input
                  type="text"
                  value={posteVise}
                  onChange={(e) => { setPosteVise(e.target.value); setSelectedJobId(''); }}
                  placeholder="Ex: Data Analyst, Lead Developpeur, Chef de Projet..."
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              {/* Saved Resume Selector */}
              {savedResumes && savedResumes.length > 0 && (
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-blue-600" />
                      Profil CV source pour la rédaction
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedResumeId}
                      onChange={(e) => handleSelectResume(e.target.value)}
                      className="w-full appearance-none px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-base text-slate-700 focus:border-blue-500 outline-none cursor-pointer pr-8"
                    >
                      <option value="">— Utiliser le CV par défaut —</option>
                      {savedResumes.map((resItem) => (
                        <option key={resItem.id} value={resItem.id}>
                          {resItem.name} {resItem.jobTitle ? `(${resItem.jobTitle})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Entreprise & Recruteur inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Entreprise
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nom de l'entreprise"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Recruteur / Contact
                  </label>
                  <input
                    type="text"
                    value={recruiter}
                    onChange={(e) => setRecruiter(e.target.value)}
                    placeholder="Ex: Responsable RH, Prénom Nom"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description de l'offre */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Description de l'offre d'emploi
                  </label>
                  <span className="text-xs text-slate-500">{jobDescription.length}/3000 car.</span>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value.slice(0, 3000))}
                  placeholder="Collez ici les missions, compétences recherchées, exigences de l'annonce..."
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-white border border-slate-300 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
                />
              </div>
            </div>

            {/* Section 2: Ton & Longueur */}
            <div id="section-ton" className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--status-purple)]/10 border border-[var(--status-purple)]/30 text-[var(--status-purple)] font-bold text-sm flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Ton & Style de Rédaction</h3>
                    <p className="text-xs text-slate-500">Ajustez la posture rédactionnelle</p>
                  </div>
                </div>
                <span className="text-xs bg-[var(--status-purple)]/20 text-[var(--status-purple)] font-bold px-2.5 py-1 rounded-full border border-[var(--status-purple)]/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--status-purple)]" />
                  <span>{TONES.find(t => t.id === tone)?.label || 'Professionnel'} • ~{length} mots • 1 page max</span>
                </span>
              </div>

              {/* Tones Selection Grid */}
              <div className="grid grid-cols-2 gap-3">
                {TONES.map(({ id, label, description, icon: Icon }) => {
                  const active = tone === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTone(id)}
                      className={`text-left p-3.5 rounded-xl border transition-all relative overflow-hidden ${
                        active
                          ? 'bg-blue-600/10 border-blue-500 text-blue-900'
                          : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {active && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      )}
                      <Icon size={18} className={`mb-2 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="text-xs font-bold">{label}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-snug">{description}</div>
                    </button>
                  );
                })}
              </div>

              {/* Longueur */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Longueur cible
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LENGTHS.map((l) => {
                    const selected = length === l;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLength(l)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          selected
                            ? 'bg-[#007568] border-[#007568] text-white'
                            : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        ~{l} mots
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Modèles de Lettre */}
            <div id="section-modeles" className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--status-green)]/10 border border-[var(--status-green)]/30 text-[var(--status-green)] font-bold text-sm flex items-center justify-center">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Modèles de Lettre</h3>
                    <p className="text-xs text-slate-500">Cliquez sur un modèle pour l'appliquer en temps réel sur le document A4</p>
                  </div>
                </div>
                <span className="text-xs bg-blue-500/20 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-500/30">
                  {allTemplates.length} modèles
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {allTemplates.map((tpl) => {
                  const active = selectedCLTemplate === tpl.id;
                  const accessible = canAccessCoverLetterTemplate(tpl.id, userPlan || 'free');
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => accessible ? handleSelectTemplate(tpl.id) : onRequireUpgrade?.()}
                      disabled={!accessible}
                      aria-pressed={active}
                      className={`rounded-lg border text-left transition-all relative group cursor-pointer active:scale-[0.98] overflow-hidden ${
                        active
                          ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      } ${!accessible ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <div className="bg-slate-100 p-3 border-b border-slate-200">
                        <CoverLetterTemplatePreview template={tpl} active={active} />
                      </div>

                      <div className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-900 leading-tight line-clamp-2">
                              {lang === 'fr' ? tpl.nameFr : tpl.name}
                            </div>
                            <div className="text-xs text-slate-500 leading-snug mt-1 line-clamp-2">
                              {lang === 'fr' ? tpl.descriptionFr : tpl.description}
                            </div>
                          </div>
                          {active ? (
                            <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                          ) : !accessible ? (
                            <Lock size={15} className="text-slate-400 shrink-0" />
                          ) : (
                            <Eye size={15} className="text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <span
                            className="h-2 w-10 rounded-full"
                            style={{ backgroundColor: tpl.previewColor }}
                          />
                          <span className={`text-xs font-bold ${
                            active ? 'text-blue-700' : accessible ? 'text-slate-500 group-hover:text-blue-600' : 'text-slate-400'
                          }`}>
                            {active ? 'Actif' : accessible ? 'Appliquer' : 'Premium'}
                          </span>
                        </div>
                      </div>

                      {!accessible && (
                        <div className="absolute inset-x-3 top-3 flex justify-end">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                            <Crown size={11} />
                            Pro
                          </span>
                        </div>
                      )}

                    </button>
                  );
                })}
              </div>
            </div>

            {/* Floating Action Button for Mobile */}
            <div className="block sm:hidden pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-extrabold text-white bg-[#007568] hover:bg-[#006257] disabled:opacity-50 transition-colors text-sm"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                {isGenerating ? 'Génération en cours…' : 'Générer la Lettre par IA'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive A4 Document Canvas with Live Overlay (7 cols on md/lg) */}
          <div
            ref={previewRef}
            className={`md:col-span-7 md:sticky md:top-4 lg:top-6 ${activeTab === 'form' ? 'hidden md:block' : 'block'}`}
          >
            <div className="space-y-4">

              {isContentStale && (
                <div className="flex items-center justify-between gap-3 bg-[var(--status-orange)]/10 border border-[var(--status-orange)]/30 rounded-lg px-4 py-3 text-xs text-[var(--status-orange)]">
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--status-orange)] shrink-0" />
                    Le poste, l'entreprise ou le recruteur ont changé depuis la génération : le texte n'est plus à jour.
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--status-orange)]/20 hover:bg-[var(--status-orange)]/30 border border-[var(--status-orange)]/40 font-bold text-[var(--status-orange)] disabled:opacity-40 transition-all"
                  >
                    Régénérer
                  </button>
                </div>
              )}

              {/* Floating Overlay Controls Bar */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 hidden sm:inline">Aperçu A4 :</span>

                  {/* Template Quick Selector Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedCLTemplate}
                      onChange={(e) => setSelectedCLTemplate(e.target.value)}
                      className="appearance-none bg-slate-50 text-slate-800 border border-slate-300 hover:border-blue-400 text-base font-bold px-3 py-1.5 pr-8 rounded-lg outline-none cursor-pointer"
                    >
                      {allTemplates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          Modèle : {lang === 'fr' ? tpl.nameFr : tpl.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>

                  {/* Paper Background Color Swatches */}
                  <div className="flex items-center gap-1.5 pl-1">
                    {PAPER_COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaperColor(opt.hex)}
                        title={opt.label}
                        aria-label={opt.label}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          paperColor === opt.hex ? 'border-blue-500 scale-110' : 'border-slate-300 hover:border-slate-400'
                        }`}
                        style={{ backgroundColor: opt.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!generatedContent}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border disabled:opacity-30 disabled:cursor-not-allowed ${
                      copied
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={!generatedContent || !!isExporting}
                    title="Télécharger en PDF"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {isExporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} className="text-red-500" />}
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDOCX}
                    disabled={!generatedContent || !!isExporting}
                    title="Télécharger en Word (.docx)"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    {isExporting === 'docx' ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} className="text-blue-500" />}
                    <span className="hidden sm:inline">DOCX</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportTXT}
                    disabled={!generatedContent || !!isExporting}
                    title="Télécharger en texte brut (.txt)"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <AlignLeft size={14} className="text-slate-500" />
                    <span className="hidden sm:inline">TXT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition-all"
                    title={expanded ? 'Réduire le panneau' : 'Agrandir le panneau'}
                  >
                    {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Modern A4 Paper Document Canvas with Styled Text Overlay */}
              <div className="bg-slate-100 p-4 sm:p-8 rounded-lg border border-slate-200 flex justify-center items-start overflow-x-auto relative">

                {/* Styled A4 Sheet — fixed A4 ratio (210×297 mm), overflow hidden = hard one-page limit */}
                <div
                  ref={a4SheetRef}
                  className="w-full max-w-[650px] text-slate-900 rounded-lg shadow-2xl p-8 sm:p-10 relative flex flex-col overflow-hidden select-text transition-all duration-300"
                  style={{ backgroundColor: paperColor, aspectRatio: '210 / 297' }}
                >

                  {/* Top Render Overlay according to Selected Template */}
                  <TemplateDocumentHeader
                    templateId={selectedCLTemplate}
                    candidateName={resume.fullName || 'Alexandre Martin'}
                    candidateTitle={posteVise || resume.jobTitle || ''}
                    email={resume.email || 'alexandre.martin@email.fr'}
                    phone={resume.phone || '+33 6 12 34 56 78'}
                    location={resume.location || 'Paris, France'}
                    company={company || 'Entreprise Cible'}
                    recruiter={recruiter || 'Responsable du Recrutement'}
                  />

                  {/* Document Body Content / Text Overlayed */}
                  <div className="flex-1 min-h-0 overflow-hidden my-3 space-y-3">

                    {/* Date and Recruiter Recipient Block */}
                    <div className="flex justify-between items-start text-xs text-slate-600 mb-2 font-sans leading-snug">
                      <div>
                        <div className="font-semibold text-slate-800">{company || 'Entreprise'}</div>
                        <div className="mt-0.5">À l'attention de : {recruiter || 'Responsable du Recrutement'}</div>
                      </div>
                      <div className="text-right italic text-slate-500 shrink-0 ml-4">
                        Fait à {resume.location?.split(',')[0] || 'Paris'}, le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Object Line Overlay */}
                    <div className="bg-slate-50 border-l-4 border-blue-600 px-3 py-2 text-xs font-bold text-slate-900 mb-3">
                      Objet : Candidature au poste de {posteVise || '[Intitulé du poste]'}
                    </div>

                    {/* Main Text Content */}
                    {isGenerating ? (
                      <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 size={36} className="animate-spin text-blue-600" />
                        <p className="text-sm font-semibold text-slate-700 animate-pulse">
                          Rédaction intelligente de la lettre en cours...
                        </p>
                        <p className="text-xs text-slate-400 max-w-xs">
                          Alignement des compétences avec l'offre d'emploi et structuration du ton.
                        </p>
                      </div>
                    ) : generatedContent ? (
                      <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                        {generatedContent}
                      </div>
                    ) : (
                      /* Placeholder Overlay State when text is not yet generated */
                      <div className="py-8 space-y-4 relative group">
                        <div className="absolute inset-0 bg-tertiary flex flex-col items-center justify-center text-center z-10 p-6 backdrop-blur-[1px]">
                          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3">
                            <Wand2 size={24} />
                          </div>
                          <h4 className="text-base font-bold text-slate-900">
                            Votre texte s'affichera superposé ici
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                            Remplissez l'intitulé du poste et cliquez sur <span className="font-bold text-blue-600">Générer la Lettre par IA</span> pour voir la magie opérer.
                          </p>
                          <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className="mt-4 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#007568] hover:bg-[#006257] disabled:opacity-40 transition-colors flex items-center gap-2"
                          >
                            <Sparkles size={14} />
                            Lancer la génération
                          </button>
                        </div>

                        {/* Realistic Sample Text behind the overlay to show letter layout */}
                        <div className="space-y-2.5 opacity-45 select-none text-xs text-slate-700 leading-relaxed text-justify">
                          <p className="font-semibold text-slate-900">Madame, Monsieur,</p>
                          {(currentTemplateObj?.paragraphs || []).map((para, idx) => (
                            <p key={idx}>{para}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sign-off Overlay */}
                  <div className="mt-2 shrink-0">
                    <p className="font-serif italic text-slate-400 text-xs leading-snug">
                      Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.
                    </p>
                    <p className="font-bold text-xs text-slate-900 mt-2">{resume.fullName || 'Alexandre Martin'}</p>
                  </div>

                </div>
              </div>

              {/* Cover Letter History: last 3 generated letters */}
              {letterHistory.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-blue-500" />
                    <h4 className="text-sm font-bold text-slate-800">Lettres récentes ({letterHistory.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {letterHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.posteVise}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {item.company} • {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreFromHistory(item)}
                            title="Recharger cette lettre dans l'aperçu"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 transition-all"
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportHistoryTXT(item)}
                            title="Télécharger en .txt"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all"
                          >
                            <AlignLeft size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFromHistory(item.id)}
                            title="Supprimer de l'historique"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Cliquez sur <RefreshCw size={11} className="inline -mt-0.5" /> pour la recharger dans l'aperçu, puis téléchargez-la en PDF ou Word.
                  </p>
                </div>
              )}

              {/* Pro Tip Callout Card */}
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 flex items-start gap-3">
                <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">Conseil RH :</span> Une lettre de motivation ne doit jamais dépasser une page A4 (~200-250 mots). Soyez concis et percutant : les recruteurs lisent rarement plus d'une page.
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Helper Subcomponent to render realistic miniature A4 cover letters for each template
function CoverLetterTemplatePreview({ template, active }: { template: CoverLetterTemplateInfo; active: boolean }) {
  return (
    <div
      className={`mx-auto aspect-[210/297] w-full max-w-[136px] overflow-hidden rounded-xs bg-white ring-1 ${
        active ? 'ring-blue-500' : 'ring-slate-200'
      }`}
    >
      <CompactCoverLetterSample template={template} accentColor={template.previewColor} size="xs" />
    </div>
  );
}

function TemplateDocumentHeader({
  templateId,
  candidateName,
  candidateTitle,
  email,
  phone,
  location,
  company,
  recruiter
}: {
  templateId: string;
  candidateName: string;
  candidateTitle: string;
  email: string;
  phone: string;
  location: string;
  company: string;
  recruiter: string;
}) {
  // 1. Candidature Spontanée (Manon Cochet)
  if (templateId === 'candidature-spontanee' || templateId === 'formelle') {
    return (
      <div className="border-b-2 border-blue-600 pb-4 mb-5 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{candidateName}</h2>
          <p className="text-xs font-bold text-blue-600 mt-0.5">{candidateTitle}</p>
        </div>
        <div className="text-right text-xs text-slate-500 space-y-0.5 font-medium">
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
        </div>
      </div>
    );
  }

  // 2. Artistique (Julien Armand)
  if (templateId === 'artistique') {
    return (
      <div className="text-center pb-4 mb-5 border-b border-sky-200 font-serif">
        <h2 className="text-2xl font-black text-sky-950">{candidateName}</h2>
        <div className="w-16 h-0.5 bg-sky-500 mx-auto my-1.5" />
        <p className="text-xs font-bold text-sky-600">{candidateTitle}</p>
        <div className="flex justify-center flex-wrap gap-x-4 text-xs text-slate-600 font-sans mt-2 font-medium">
          <span>{email}</span> • <span>{phone}</span> • <span>{location}</span>
        </div>
      </div>
    );
  }

  // 3. Assistant Dentaire (Georges Costa)
  if (templateId === 'assistant-dentaire') {
    return (
      <div className="-mx-8 sm:-mx-12 -mt-8 sm:-mt-12 bg-slate-900 text-white p-6 sm:p-7 mb-6 rounded-t-lg text-center border-t-4 border-blue-500">
        <h2 className="text-2xl font-black">{candidateName}</h2>
        <p className="text-xs font-bold text-blue-300 mt-1">{candidateTitle}</p>
        <div className="flex justify-center flex-wrap gap-x-4 text-xs text-slate-300 mt-2.5 pt-2 border-t border-slate-800 font-medium">
          <span>{email}</span> • <span>{phone}</span> • <span>{location}</span>
        </div>
      </div>
    );
  }

  // 4. Assistant Administratif (Jean Dufour)
  if (templateId === 'assistant-administratif') {
    return (
      <div className="border-b border-slate-300 pb-4 mb-5">
        <h2 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">{candidateName}</h2>
        <p className="text-xs italic text-slate-600 mt-0.5">{candidateTitle}</p>
        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500 mt-2 font-medium">
          <span>{email}</span> • <span>{phone}</span> • <span>{location}</span>
        </div>
      </div>
    );
  }

  // 5. Infirmière & Soignant (Bruno Arnaud)
  if (templateId === 'infirmiere' || templateId === 'rafraichissant') {
    return (
      <div className="pt-2 border-t-4 border-emerald-600 text-center pb-4 mb-5 border-b border-emerald-100">
        <h2 className="text-2xl font-black text-slate-900">{candidateName}</h2>
        <p className="text-xs font-bold text-emerald-700 mt-1">{candidateTitle}</p>
        <div className="flex justify-center flex-wrap gap-x-4 text-xs text-slate-600 mt-2 font-medium">
          <span>{email}</span> • <span>{phone}</span> • <span>{location}</span>
        </div>
      </div>
    );
  }

  // 6. Police & Sécurité (Thomas Ouakrim)
  if (templateId === 'police') {
    return (
      <div className="border-l-4 border-cyan-600 pl-4 py-2 mb-5 flex justify-between items-start bg-cyan-50/50 rounded-r-lg">
        <div>
          <h2 className="text-2xl font-black text-cyan-950 tracking-tight">{candidateName}</h2>
          <p className="text-xs font-extrabold text-cyan-700 mt-0.5">{candidateTitle}</p>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5 font-medium">
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
        </div>
      </div>
    );
  }

  // 7. Cadre Dirigeant (Adrien Hamel)
  if (templateId === 'cadre-dirigeant') {
    return (
      <div className="-mx-8 sm:-mx-12 -mt-8 sm:-mt-12 bg-slate-800 text-white p-6 sm:p-7 mb-6 rounded-t-lg border-b-2 border-amber-500 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold tracking-wide text-amber-100">{candidateName}</h2>
          <p className="text-xs font-mono text-amber-400 mt-1">{candidateTitle}</p>
        </div>
        <div className="text-right text-xs text-slate-300 space-y-0.5 font-medium">
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
        </div>
      </div>
    );
  }

  // 8. Association & Social (Véronique Rameau)
  if (templateId === 'association') {
    return (
      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl mb-5 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-amber-950">{candidateName}</h2>
          <p className="text-xs font-bold text-amber-700 mt-0.5">{candidateTitle}</p>
        </div>
        <div className="text-right text-xs text-amber-900/80 space-y-0.5 font-medium">
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
        </div>
      </div>
    );
  }

  // 9. Secrétaire & Accueil (Prénom Nom)
  if (templateId === 'secretaire') {
    return (
      <div className="text-center pb-4 mb-5 border-b border-tertiary/20">
        <h2 className="text-2xl font-serif font-bold text-tertiary tracking-wide">{candidateName}</h2>
        <p className="text-xs font-bold text-tertiary my-1">{candidateTitle}</p>
        <div className="flex justify-center items-center gap-2 text-[#007568] text-xs my-1 font-bold">• • •</div>
        <div className="flex justify-center flex-wrap gap-x-4 text-xs text-slate-600 font-medium">
          <span>{email}</span> • <span>{phone}</span> • <span>{location}</span>
        </div>
      </div>
    );
  }

  // 10. Audacieux & Direct (Déborah Vautier)
  if (templateId === 'audacieux-spontanee') {
    return (
      <div className="border-b-4 border-rose-600 pb-4 mb-5 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-rose-950 tracking-tighter">{candidateName}</h2>
          <p className="text-xs font-black text-rose-600 mt-0.5">{candidateTitle}</p>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5 font-bold">
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
        </div>
      </div>
    );
  }

  // 11. Corporate Ardoise (Sophie Lavitry)
  if (templateId === 'corporate-slate' || templateId === 'minimaliste') {
    return (
      <div className="-mx-8 sm:-mx-12 -mt-8 sm:-mt-12 bg-slate-900 text-white p-6 sm:p-7 mb-6 rounded-t-lg flex justify-between items-center border-b-2 border-blue-400">
        <div>
          <h2 className="text-2xl font-black">{candidateName}</h2>
          <p className="text-xs font-bold text-blue-400 mt-1">{candidateTitle}</p>
        </div>
        <div className="text-right text-xs text-slate-300 space-y-0.5 font-medium">
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
        </div>
      </div>
    );
  }

  // 12. Classique Chic (Dominique Bailly)
  if (templateId === 'classique-chic') {
    return (
      <div className="text-center pb-4 mb-5 border-b border-amber-300 font-serif">
        <h2 className="text-2xl font-serif text-slate-900 font-bold">{candidateName}</h2>
        <p className="text-xs text-amber-800 italic mt-1">{candidateTitle}</p>
        <div className="flex justify-center flex-wrap gap-x-4 text-xs text-slate-500 font-sans mt-2 font-medium">
          <span>{email}</span> • <span>{phone}</span> • <span>{location}</span>
        </div>
      </div>
    );
  }

  if (templateId === 'date-badge-classic') {
    return (
      <div className="pb-5 mb-6 border-b border-stone-300">
        <div className="flex justify-between text-xs text-slate-600">
          <div className="font-medium">{candidateName}<br />{location}</div>
          <div className="text-right">{phone}<br />{email}</div>
        </div>
        <div className="mx-auto mt-4 w-28 bg-stone-700 text-white text-center text-xs py-1 font-serif">
          {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="mt-4 text-center text-xs font-bold text-slate-900">
          {recruiter || 'Responsable recrutement'}<br />
          <span className="font-normal text-slate-600">{company || 'Entreprise'}</span>
        </div>
      </div>
    );
  }

  if (templateId === 'blue-rule-modern') {
    return (
      <div className="pb-4 mb-6 border-b-2 border-blue-500">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-sm font-black text-blue-600">{candidateName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{location}</p>
          </div>
          <div className="text-right text-xs text-blue-600 font-medium">
            <div>{phone}</div>
            <div>{email}</div>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === 'left-blue-rail' || templateId === 'formal-blue-sidebar') {
    return (
      <div className="-mx-8 sm:-mx-10 -mt-8 sm:-mt-10 mb-6 flex">
        <div className="w-4 bg-blue-600" />
        <div className="flex-1 pl-6 pr-8 py-7 border-b border-slate-200">
          <h2 className="text-2xl font-black text-slate-800 tracking-wide">{candidateName}</h2>
          <p className="text-xs font-bold text-blue-600 mt-1">{candidateTitle}</p>
          <div className="mt-4 grid grid-cols-[140px_1fr] gap-5 text-xs text-slate-600">
            <div className="font-bold text-slate-900">{recruiter || 'Responsable recrutement'}<br />{company || 'Entreprise'}</div>
            <div>{email}<br />{phone}<br />{location}</div>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === 'elegant-gray-serif') {
    return (
      <div className="pb-6 mb-6 border-b border-slate-200">
        <div className="flex justify-between items-start">
          <h2 className="text-3xl font-serif text-slate-600 leading-tight">{candidateName}</h2>
          <div className="text-right text-xs text-slate-500">
            <div>{email}</div>
            <div>{phone}</div>
            <div>{location}</div>
          </div>
        </div>
        <p className="mt-5 text-xs text-slate-400 font-serif tracking-wide">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    );
  }

  if (templateId === 'executive-two-column') {
    return (
      <div className="pb-5 mb-6 border-b border-slate-300">
        <div className="flex justify-between gap-8">
          <div className="w-40 text-xs text-slate-600 border-r border-slate-200 pr-5">
            <div className="font-bold text-slate-800 mb-3">{recruiter || 'Responsable recrutement'}</div>
            <div>{company || 'Entreprise'}</div>
            <div className="mt-4">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-serif text-slate-800 leading-tight">{candidateName}</h2>
            <p className="text-xs text-slate-500 mt-3">{email} · {phone} · {location}</p>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === 'aqua-header') {
    return (
      <div className="-mx-8 sm:-mx-10 -mt-8 sm:-mt-10 mb-6 bg-cyan-100 border-b-4 border-cyan-500 px-8 py-5">
        <h2 className="text-2xl font-black text-cyan-950 tracking-wide">{candidateName}</h2>
        <p className="text-xs font-bold text-cyan-700 mt-1">{candidateTitle}</p>
        <div className="mt-2 text-xs text-cyan-900">{email} · {phone} · {location}</div>
      </div>
    );
  }

  if (templateId === 'salmon-accent') {
    return (
      <div className="pb-5 mb-6 border-b border-rose-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-serif text-rose-900">{candidateName}</h2>
            <p className="text-xs text-rose-500 font-bold mt-1">{candidateTitle}</p>
          </div>
          <div className="w-20 h-20 rounded-full bg-rose-100 border border-rose-200" />
        </div>
        <div className="mt-3 text-xs text-slate-500">{email} · {phone} · {location}</div>
      </div>
    );
  }

  if (templateId === 'minimal-black' || templateId === 'thin-line-formal') {
    return (
      <div className="pb-5 mb-7 border-b border-slate-900">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">{candidateName}</h2>
          <div className="text-right text-xs tracking-wide text-slate-500">
            <div>{email}</div>
            <div>{phone}</div>
            <div>{location}</div>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === 'green-side-panel') {
    return (
      <div className="-mx-8 sm:-mx-10 -mt-8 sm:-mt-10 mb-6 grid grid-cols-[1fr_120px] border-b border-emerald-900/20">
        <div className="px-8 py-7">
          <h2 className="text-2xl font-serif font-bold text-slate-900">{candidateName}</h2>
          <p className="text-xs text-emerald-800 mt-1">{candidateTitle}</p>
        </div>
        <div className="bg-emerald-950 text-white p-4 text-xs leading-relaxed">
          <div>{email}</div>
          <div>{phone}</div>
          <div>{location}</div>
        </div>
      </div>
    );
  }

  if (templateId === 'beige-editorial') {
    return (
      <div className="pb-4 mb-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">{candidateName}</h2>
        <p className="text-xs text-slate-500 mt-1">{candidateTitle}</p>
        <div className="mt-2 text-xs text-slate-400 tracking-wide">{email} · {phone} · {location}</div>
      </div>
    );
  }

  // Default Fallback (Épurée / Créative / Formelle)
  return (
    <div className="border-b-2 border-blue-600 pb-4 mb-5 flex justify-between items-start">
      <div>
        <h2 className="text-2xl font-extrabold text-blue-900 tracking-tight">{candidateName}</h2>
        <p className="text-xs font-bold text-blue-600 mt-0.5">{candidateTitle}</p>
      </div>
      <div className="text-right text-xs text-slate-500 space-y-0.5 font-medium">
        <div>{email}</div>
        <div>{phone}</div>
        <div>{location}</div>
      </div>
    </div>
  );
}

export default ApplicationKit;
