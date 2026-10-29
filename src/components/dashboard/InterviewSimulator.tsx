import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  History,
  Trash2,
  Clock,
  X,
  RefreshCw,
  Briefcase,
  Plus,
  PlusCircle,
  Keyboard,
  BarChart3,
  Users,
  Play,
  FileQuestion,
  Lightbulb,
  Check,
  Zap,
} from 'lucide-react';
import { generateInterviewQuestions, analyzeInterviewSession } from '../../services/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { listUserResumes } from '../../lib/resumeStore';
import { Language } from '../../utils/translations';

interface InterviewSimulatorProps {
  lang?: Language;
}

interface IQuestion {
  q: string;
  category: string;
  time: number;
}

interface IReview {
  scores: Array<{ label: string; value: number; color: string }>;
  globalScore: number;
  globalComment: string;
  perQuestion: Array<{ question: string; feedback: string; score: number }>;
}

interface StoredSession {
  id: string;
  date: string;
  jobRole: string;
  company: string;
  completedQuestions: number;
  overallScore: number;
  answers: { question: string; answer: string; time: number }[];
}

function fmtSessionDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSessionRow(row: any, locale: string): StoredSession {
  return {
    id: row.id,
    date: fmtSessionDate(row.session_date || row.created_at, locale),
    jobRole: row.job_role || '',
    company: row.company || '',
    completedQuestions: row.completed_questions || 0,
    overallScore: (row.overall_rating || 0) * 20,
    answers: row.conversation || [],
  };
}

// interview_sessions.difficulty_level only accepts 'Easy' | 'Medium' | 'Hard'
function mapDifficultyToDb(level: string): 'Easy' | 'Medium' | 'Hard' {
  const l = level.toLowerCase();
  if (l.includes('déb') || l.includes('junior')) return 'Easy';
  if (l.includes('senior')) return 'Hard';
  return 'Medium';
}

// interview_sessions.mode only accepts 'STAR' | 'Technical' | 'Behavioral' | 'Mixed'
function mapInterviewTypeToDb(type: string): 'STAR' | 'Technical' | 'Behavioral' | 'Mixed' {
  const t = type.toLowerCase();
  if (t.includes('tech')) return 'Technical';
  if (t.includes('comport') || t.includes('behav') || t.includes('rh') || t.includes('hr')) return 'Behavioral';
  if (t.includes('étude') || t.includes('case') || t.includes('cas')) return 'Mixed';
  return 'STAR';
}

const getCategoryColor = (cat: string): string => {
  const c = cat.toLowerCase();
  if (c.includes('prés') || c.includes('pres') || c.includes('intro')) return '#3B82F6';
  if (c.includes('comport') || c.includes('behav') || c.includes('soft')) return '#a98fc9';
  if (c.includes('tech') || c.includes('code') || c.includes('system')) return '#c97575';
  if (c.includes('méth') || c.includes('meth') || c.includes('process')) return '#5ca88e';
  if (c.includes('négoc') || c.includes('negoc') || c.includes('salar')) return '#c88a4f';
  return '#6366F1';
};

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Syne:wght@700;800&display=swap');

  @keyframes ip-fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ip-fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes ip-spin { to { transform:rotate(360deg); } }
  @keyframes ip-ripple { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(2.2); opacity:0; } }
  @keyframes ip-pulse-ring { 0%,100% { transform:scale(1); opacity:0.4; } 50% { transform:scale(1.15); opacity:0.8; } }
  @keyframes ip-bar { 0%,100% { transform:scaleY(0.25); } 50% { transform:scaleY(1); } }
  @keyframes ip-blink { 0%,100%{opacity:1} 50%{opacity:0} }

  .ip-q-card:hover { background:rgba(0,0,0,0.04) !important; }
  .ip-action-btn:hover { transform:scale(1.02); }

  @media (max-width: 1023px) {
    .ip-setup-grid { grid-template-columns: minmax(0,1fr) !important; }
  }
  @media (max-width: 639px) {
    .ip-header-illustration { display: none !important; }
    .ip-config-grid { grid-template-columns: 1fr !important; }
    .ip-active-sidebar { display: none !important; }
    .ip-review-scores-grid { grid-template-columns: repeat(2,1fr) !important; }
    .ip-review-global-panel { flex-direction: column !important; align-items: stretch !important; }
    .ip-review-global-actions { width: 100% !important; }
    .ip-review-global-actions button { flex: 1 !important; }
    .ip-setup-grid, .ip-active-main, .ip-review-wrap { padding: 20px 16px !important; }
  }
`;

const COMMON_ROLE_SUGGESTIONS = [
  'Développeur Full Stack',
  'Développeur Frontend',
  'Développeur Backend',
  'Chef de projet',
  'Product Manager',
  'Data Analyst',
  'Data Scientist',
  'UX/UI Designer',
  'Commercial',
  'Responsable marketing',
];

export default function InterviewSimulator({ lang = 'fr' }: InterviewSimulatorProps) {
  const { user } = useAuth();
  const isFr = lang === 'fr';

  // State phases
  const [phase, setPhase] = useState<'setup' | 'active' | 'review'>('setup');
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string; time: number }[]>([]);
  const [answer, setAnswer] = useState('');
  const [timer, setTimer] = useState(0);
  const [review, setReview] = useState<IReview | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  // Configuration
  const [answerMode, setAnswerMode] = useState<'voice' | 'text'>('voice');
  const [expLevel, setExpLevel] = useState(isFr ? 'Intermédiaire' : 'Intermediate');
  const [interviewType, setInterviewType] = useState(isFr ? 'Entretien comportemental' : 'Behavioral interview');
  const [duration, setDuration] = useState(isFr ? '30 minutes' : '30 minutes');

  // Job Target
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [jobDescriptionInput, setJobDescriptionInput] = useState('');
  const [jobValidationError, setJobValidationError] = useState('');
  const [resumeRoles, setResumeRoles] = useState<string[]>([]);
  const jobText = company ? `${jobTitle} @ ${company}` : jobTitle;
  const roleSuggestions = Array.from(new Set([...resumeRoles, ...COMMON_ROLE_SUGGESTIONS]));

  // Speech Recognition & Synthesis
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // History state
  const [pastSessions, setPastSessions] = useState<StoredSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setResumeRoles([]);
      return;
    }
    listUserResumes(user.id)
      .then((resumes) => {
        const roles = resumes.flatMap((resume) => {
          const resumeData = resume.resumeData || {};
          return [
            resume.jobTitle,
            resumeData.coordonnees?.jobTitle,
            ...(Array.isArray(resumeData.experience)
              ? resumeData.experience.map((experience: { jobTitle?: string }) => experience.jobTitle)
              : []),
          ];
        });
        setResumeRoles(Array.from(new Set(roles.filter(
          (role): role is string => typeof role === 'string' && role.trim().length > 0
        ).map((role) => role.trim()))));
      })
      .catch((error) => {
        console.error('Unable to load saved CV roles for interview suggestions:', error);
      });
  }, [user?.id]);

  // Load past sessions from Supabase, scoped to the logged-in user.
  useEffect(() => {
    if (!user?.id || !supabase) {
      setPastSessions([]);
      return;
    }
    const locale = isFr ? 'fr-FR' : 'en-US';
    supabase
      .from('interview_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPastSessions(data.map((row) => mapSessionRow(row, locale)));
      });
  }, [user?.id, isFr]);

  // Web Speech setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = isFr ? 'fr-FR' : 'en-US';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          setAnswer((prev) => (prev ? prev + ' ' : '') + finalTranscript.trim());
        }
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, [isFr]);

  // Timer
  useEffect(() => {
    if (phase !== 'active') return;
    setTimer(0);
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [phase, currentQ]);

  // Speak Text helper
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isFr ? 'fr-FR' : 'en-US';
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleToggleMic = () => {
    if (!recognitionRef.current) {
      alert(isFr ? "La reconnaissance vocale n'est pas disponible sur ce navigateur. Vous pouvez répondre par écrit." : "Speech recognition is not supported on this browser. You can type your answer.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Generate Questions
  const loadQuestions = async (overrides?: {
    jobTitle?: string;
    company?: string;
    jobDescription?: string;
    seniority?: string;
    interviewType?: string;
  }) => {
    const targetRole = (overrides?.jobTitle ?? jobTitle).trim();
    if (!targetRole) {
      setQuestionError(isFr ? 'Choisissez ou saisissez un poste cible pour préparer vos questions.' : 'Choose or enter a target role to prepare your questions.');
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    setQuestionError('');
    try {
      const generated = await generateInterviewQuestions(
        targetRole,
        overrides?.seniority ?? expLevel,
        5,
        overrides?.jobDescription ?? jobDescription,
        overrides?.company ?? company,
        overrides?.interviewType ?? interviewType,
        lang
      );
      if (generated && generated.length > 0) {
        const formatted: IQuestion[] = generated.map((g: any, i: number) => ({
          q: g.question || g.q || `Question ${i + 1}`,
          category: g.category || (isFr ? 'Entretien' : 'Interview'),
          time: 120,
        }));
        setQuestions(formatted);
      } else {
        setQuestions([]);
        setQuestionError(isFr
          ? 'Aucune question n’a pu être générée. Vérifiez le poste et réessayez.'
          : 'No questions could be generated. Check the role and try again.');
      }
    } catch (err) {
      console.error(err);
      setQuestions([]);
      setQuestionError(isFr
        ? 'La génération des questions a échoué. Vérifiez votre connexion puis réessayez.'
        : 'Question generation failed. Check your connection and try again.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSaveJob = () => {
    const trimmedRole = jobTitleInput.trim();
    if (!trimmedRole) {
      setJobValidationError(isFr ? 'Saisissez ou sélectionnez un poste cible.' : 'Enter or select a target role.');
      return;
    }
    const trimmedCompany = companyInput.trim();
    const trimmedDescription = jobDescriptionInput.trim();
    setJobTitle(trimmedRole);
    setCompany(trimmedCompany);
    setJobDescription(trimmedDescription);
    setShowJobModal(false);
    loadQuestions({
      jobTitle: trimmedRole,
      company: trimmedCompany,
      jobDescription: trimmedDescription,
    });
  };

  const handleStart = () => {
    if (!jobTitle.trim() || !questions.length || loadingQuestions) return;
    setPhase('active');
    setCurrentQ(0);
    setAnswers([]);
    setAnswer('');
    // Speak first question
    if (questions[0]?.q) {
      speakText(questions[0].q);
    }
  };

  const handleNext = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    stopSpeech();

    const savedAnswer = {
      question: questions[currentQ]?.q || '',
      answer: answer || (isFr ? 'Réponse enregistrée à l\'oral.' : 'Oral response recorded.'),
      time: timer,
    };

    const newAnswers = [...answers, savedAnswer];
    setAnswers(newAnswers);
    setAnswer('');

    if (currentQ < questions.length - 1) {
      const nextIdx = currentQ + 1;
      setCurrentQ(nextIdx);
      if (questions[nextIdx]?.q) {
        speakText(questions[nextIdx].q);
      }
    } else {
      // Complete session -> Review
      setPhase('review');
      setLoadingReview(true);
      try {
        const analysis = await analyzeInterviewSession(
          newAnswers.map((a) => ({ question: a.question, answer: a.answer }))
        );

        const qResults = analysis.questionResults ?? [];
        const avg = (key: keyof typeof qResults[0]['scores']) =>
          qResults.length
            ? Math.round(qResults.reduce((s, q) => s + (q.scores[key] ?? 0), 0) / qResults.length)
            : analysis.overallScore;

        const revData: IReview = {
          scores: [
            { label: isFr ? 'Structure STAR' : 'STAR Structure', value: avg('star_structure'), color: '#3B82F6' },
            { label: isFr ? 'Clarté & Élocution' : 'Clarity & Tone', value: avg('clarity'), color: '#8B5CF6' },
            { label: isFr ? 'Savoir-Faire Technique' : 'Technical Skill', value: avg('technical_expertise'), color: 'var(--status-red)' },
            { label: isFr ? 'Posture & Confiance' : 'Confidence', value: avg('posture_confidence'), color: '#10B981' },
          ],
          globalScore: analysis.overallScore,
          globalComment: analysis.detailedFeedback?.[0] ?? '',
          perQuestion: newAnswers.map((item, idx) => {
            const qr = qResults[idx];
            const strengths = qr?.feedback_strengths ?? [];
            const improvements = qr?.feedback_improvements ?? [];
            const feedbackFallback = isFr ? 'Aucun retour spécifique disponible.' : 'No specific feedback available.';
            const feedback = strengths.length ? strengths[0] : (improvements[0] ?? feedbackFallback);
            return {
              question: item.question,
              feedback,
              score: qr?.overall_question_score ?? analysis.overallScore,
            };
          }),
        };

        setReview(revData);

        // Save session to Supabase, scoped to the logged-in user.
        if (user?.id && supabase) {
          const { data, error } = await supabase
            .from('interview_sessions')
            .insert({
              user_id: user.id,
              session_date: new Date().toISOString(),
              job_role: jobTitle,
              company,
              difficulty_level: mapDifficultyToDb(expLevel),
              mode: mapInterviewTypeToDb(interviewType),
              total_questions: questions.length,
              completed_questions: newAnswers.length,
              conversation: newAnswers,
              overall_feedback: revData.globalComment,
              overall_rating: Math.min(5, Math.max(1, Math.round(revData.globalScore / 20))),
              strengths: analysis.strengths || [],
              improvements: analysis.areasForImprovement || [],
            })
            .select()
            .single();

          if (!error && data) {
            setPastSessions((prev) => [mapSessionRow(data, isFr ? 'fr-FR' : 'en-US'), ...prev]);
          }
        }
      } catch (err) {
        console.error(err);
        setReview({
          scores: [],
          globalScore: 0,
          globalComment: isFr
            ? "Une erreur est survenue lors de l'analyse IA. Veuillez relancer un entretien."
            : 'An error occurred during AI analysis. Please start a new session.',
          perQuestion: newAnswers.map(item => ({ question: item.question, feedback: '', score: 0 })),
        });
      } finally {
        setLoadingReview(false);
      }
    }
  };

  const handleRestart = () => {
    setPhase('setup');
    setCurrentQ(0);
    setAnswers([]);
    setAnswer('');
    setTimer(0);
    setReview(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    stopSpeech();
  };

  const handleDeleteSession = async (sessionId: string) => {
    setPastSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (user?.id && supabase) {
      await supabase.from('interview_sessions').delete().eq('id', sessionId).eq('user_id', user.id);
    }
  };

  const question = questions[currentQ];
  const progress = questions.length > 0 ? (answers.length / questions.length) * 100 : 0;

  return (
    <div className="rounded-lg bg-[#e9f0f4] text-gray-900 flex flex-col min-h-[820px] font-sans overflow-hidden relative">
      <style>{CSS}</style>

      {/* ── SETUP PHASE ── */}
      {phase === 'setup' && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="ip-setup-grid flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-7 p-6 md:p-8">
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-6">
              {/* Header with mic illustration */}
              <div className="flex items-start justify-between gap-5">
                <div className="flex-1 min-w-0">
                  <h1 className="text-4xl md:text-6xl font-black text-tertiary tracking-tight leading-[1.1]">
                    {isFr ? "Simulateur d'Entretien" : 'Interview Simulator'}{' '}
                    <span className="text-[#007568]">IA</span>
                  </h1>
                  <p className="text-[#456071] text-base mt-3 max-w-xl leading-relaxed">
                    {isFr
                      ? "Entraînez-vous aux questions réelles de vos entretiens — avec analyse vocale et feedback IA instantané."
                      : "Practice real interview questions with instant AI speech analysis and scoring."}
                  </p>
                </div>

                {/* Static mic mark: the animated waveform and glow were decoration, nothing is recording on this screen */}
                <div className="ip-header-illustration w-20 h-20 shrink-0 rounded-lg bg-tertiary flex items-center justify-center">
                  <Mic size={32} className="text-accent" />
                </div>
              </div>

              {/* POSTE CIBLE CARD */}
              <div className="bg-[#f2f2f2] border border-gray-300 rounded-2xl p-4 md:p-5 flex items-center gap-4 animate-[ip-fadeUp_0.4s_ease]">
                <div className="w-11 h-11 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                  <Briefcase size={20} className="text-[#007568]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
                    {isFr ? 'Poste cible' : 'Target position'}
                  </div>
                  <div className="text-sm font-bold text-gray-900 truncate mt-0.5">
                    {jobText || (isFr ? 'Aucun poste sélectionné' : 'No target role selected')}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {isFr ? 'Questions générées spécifiquement pour ce rôle.' : 'Questions tailored to this role.'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setJobTitleInput(jobTitle);
                    setCompanyInput(company);
                    setJobDescriptionInput(jobDescription);
                    setJobValidationError('');
                    setShowJobModal(true);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-300 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                >
                  <Plus size={14} /> {isFr ? 'Modifier' : 'Edit'}
                </button>
              </div>

              {/* PREPARED QUESTIONS */}
              <div>
                <div className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-2.5 mb-3">
                  <span>{isFr ? 'Questions préparées' : 'Prepared questions'}</span>
                  <button
                    onClick={loadQuestions}
                    disabled={loadingQuestions}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    title="Régénérer"
                  >
                    <RefreshCw size={13} className={loadingQuestions ? 'animate-spin' : ''} />
                  </button>
                </div>

                {loadingQuestions ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-[#f2f2f2] border border-gray-300 rounded-xl p-4 flex gap-3 animate-pulse">
                        <div className="w-7 h-7 rounded-lg bg-gray-300 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-300 rounded w-1/4" />
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : questionError ? (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {questionError}
                  </div>
                ) : questions.length === 0 ? (
                  <div className="rounded-xl border border-gray-300 bg-[#f2f2f2] p-4 text-sm text-gray-600">
                    {isFr
                      ? 'Choisissez un poste cible pour générer des questions adaptées à votre entretien.'
                      : 'Choose a target role to generate questions tailored to your interview.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {questions.map((q, i) => {
                      const cc = getCategoryColor(q.category);
                      return (
                        <div
                          key={i}
                          className="ip-q-card bg-[#f2f2f2] border border-gray-300 rounded-xl p-4 flex items-start gap-3.5 transition-all cursor-pointer"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                            style={{ background: `${cc}22`, color: cc, border: `1px solid ${cc}44` }}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${cc}20`, color: cc }}
                              >
                                {q.category}
                              </span>
                              <span className="text-[10px] text-gray-500">⏱ {q.time}s</span>
                            </div>
                            <div className="text-xs text-gray-800 leading-relaxed font-medium">
                              {q.q}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CONFIGURATION GRID */}
              <div className="bg-[#f2f2f2] border border-gray-300 rounded-2xl p-5">
                <div className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-3.5">
                  {isFr ? 'Configuration de la session' : 'Session configuration'}
                </div>
                <div className="ip-config-grid grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <BarChart3 size={14} className="text-blue-400" />
                      {isFr ? "Niveau d'expérience" : 'Experience level'}
                    </label>
                    <select
                      value={expLevel}
                      onChange={(e) => {
                        const value = e.target.value;
                        setExpLevel(value);
                        if (jobTitle) loadQuestions({ seniority: value });
                      }}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-base font-semibold text-gray-800 focus:outline-none focus:border-[#007568] cursor-pointer"
                    >
                      {(isFr ? ['Débutant', 'Intermédiaire', 'Confirmé', 'Senior'] : ['Junior', 'Intermediate', 'Confirmed', 'Senior']).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <Users size={14} className="text-[var(--status-purple)]" />
                      {isFr ? "Type d'entretien" : 'Interview type'}
                    </label>
                    <select
                      value={interviewType}
                      onChange={(e) => {
                        const value = e.target.value;
                        setInterviewType(value);
                        if (jobTitle) loadQuestions({ interviewType: value });
                      }}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-base font-semibold text-gray-800 focus:outline-none focus:border-[#007568] cursor-pointer"
                    >
                      {(isFr ? ['Entretien comportemental', 'Entretien technique', 'Entretien RH', 'Étude de cas'] : ['Behavioral interview', 'Technical interview', 'HR interview', 'Case study']).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <Clock size={14} className="text-[var(--status-green)]" />
                      {isFr ? 'Durée estimée' : 'Estimated duration'}
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-base font-semibold text-gray-800 focus:outline-none focus:border-[#007568] cursor-pointer"
                    >
                      {['15 minutes', '30 minutes', '45 minutes'].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex flex-col gap-4">
              {/* Start Card */}
              <div className="bg-gradient-to-b from-white to-[#f2f2f2] border border-[#007568]/30 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute -inset-2 rounded-full border border-[#007568]/30 animate-[ip-pulse-ring_3s_ease_infinite]" />
                  <div className="w-20 h-20 rounded-full bg-[#007568] border border-[#007568]/50 flex items-center justify-center shadow-[0_0_35px_rgba(31,63,139,0.4)]">
                    <Mic size={32} className="text-[#f2f2f2]" />
                  </div>
                </div>

                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">
                  {isFr ? 'Prêt à commencer ?' : 'Ready to start?'}
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  {isFr
                    ? 'Répondez de vive voix avec votre micro ou saisissez vos réponses. L\'IA analysera la qualité de votre argumentation.'
                    : 'Speak into your mic or type your answers. AI will evaluate your responses.'}
                </p>

                <button
                  onClick={handleStart}
                  disabled={loadingQuestions || !jobTitle.trim() || questions.length === 0}
                  className="ip-action-btn w-full bg-[#007568] hover:bg-[#007568]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-[#007568]/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                >
                  <Play size={16} fill="currentColor" />
                  <span>{isFr ? 'Démarrer la session' : 'Start session'}</span>
                </button>

                {pastSessions.length > 0 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="w-full mt-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <History size={14} />
                    <span>{isFr ? `${pastSessions.length} session(s) précédente(s)` : `${pastSessions.length} previous session(s)`}</span>
                  </button>
                )}
              </div>

              {/* Mode Selection */}
              <div className="bg-[#f2f2f2] border border-gray-300 rounded-2xl p-4">
                <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mb-3">
                  {isFr ? 'Mode de réponse' : 'Answer mode'}
                </div>
                {[
                  { mode: 'voice' as const, icon: <Mic size={16} />, label: isFr ? 'Mode Voix' : 'Voice Mode', desc: isFr ? 'Parlez directement au micro' : 'Speak into microphone' },
                  { mode: 'text' as const, icon: <Keyboard size={16} />, label: isFr ? 'Mode Texte' : 'Text Mode', desc: isFr ? 'Rédigez vos réponses' : 'Type your responses' },
                ].map(({ mode, icon, label, desc }) => {
                  const active = answerMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setAnswerMode(mode)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 mb-2 transition-all cursor-pointer ${
                        active
                          ? 'border-[#007568]/60 bg-[#007568]/15 text-[#007568]'
                          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <div className={active ? 'text-[#007568]' : 'text-gray-400'}>{icon}</div>
                      <div className="flex-1">
                        <div className="text-xs font-bold">{label}</div>
                        <div className="text-[11px] opacity-70">{desc}</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'border-[#007568] bg-[#007568]' : 'border-gray-300'}`}>
                        {active && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tips Box */}
              <div className="bg-[var(--status-orange)]/10 border border-[var(--status-orange)]/20 rounded-2xl p-4">
                <div className="text-xs font-bold text-[var(--status-orange)] flex items-center gap-1.5 mb-2">
                  <Lightbulb size={15} /> {isFr ? 'Conseils clés' : 'Pro tips'}
                </div>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                  <li>{isFr ? 'Utilisez la méthode STAR (Situation, Tâche, Action, Résultat).' : 'Use the STAR method.'}</li>
                  <li>{isFr ? 'Illustrez vos réponses avec des chiffres ou métriques.' : 'Use specific metrics and details.'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── JOB EDIT MODAL ── */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Briefcase size={18} className="text-[#007568]" />
                {isFr ? 'Définir le poste cible' : 'Set target position'}
              </h3>
              <button
                type="button"
                aria-label={isFr ? 'Fermer' : 'Close'}
                onClick={() => setShowJobModal(false)}
                className="min-w-11 min-h-11 flex items-center justify-center text-gray-500 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007568]"
              >
                <X size={18} />
              </button>
            </div>
            <div>
              <label htmlFor="interview-target-role" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {isFr ? 'Poste cible' : 'Target role'}
              </label>
              <input
                id="interview-target-role"
                type="text"
                list="interview-role-suggestions"
                value={jobTitleInput}
                onChange={(e) => {
                  setJobTitleInput(e.target.value);
                  setJobValidationError('');
                }}
                autoComplete="off"
                placeholder={isFr ? 'Choisissez un poste ou saisissez votre poste cible' : 'Choose a role or type your target position'}
                aria-invalid={Boolean(jobValidationError)}
                aria-describedby={jobValidationError ? 'interview-role-error' : 'interview-role-help'}
                className="w-full min-h-11 bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-base text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007568]"
              />
              <datalist id="interview-role-suggestions">
                {roleSuggestions.map((role) => <option key={role} value={role} />)}
              </datalist>
              <p id="interview-role-help" className="text-xs text-gray-500 mt-1.5">
                {isFr
                  ? 'Les postes de vos CV enregistrés sont proposés. Vous pouvez aussi saisir librement un autre poste.'
                  : 'Roles from your saved CVs are suggested. You can also type any other role.'}
              </p>
              {jobValidationError && (
                <p id="interview-role-error" role="alert" className="text-sm text-red-700 mt-1.5">
                  {jobValidationError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="interview-target-company" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {isFr ? 'Entreprise (facultatif)' : 'Company (optional)'}
              </label>
              <input
                id="interview-target-company"
                type="text"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder={isFr ? 'Nom de l’entreprise' : 'Company name'}
                className="w-full min-h-11 bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-base text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007568]"
              />
            </div>
            <div>
              <label htmlFor="interview-job-description" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {isFr ? "Offre d’emploi ou missions (facultatif)" : 'Job description or responsibilities (optional)'}
              </label>
              <textarea
                id="interview-job-description"
                rows={4}
                value={jobDescriptionInput}
                onChange={(e) => setJobDescriptionInput(e.target.value)}
                placeholder={isFr
                  ? 'Collez les missions et compétences recherchées pour obtenir des questions encore plus ciblées.'
                  : 'Paste the role responsibilities and skills to get even more targeted questions.'}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-base text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007568]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJobModal(false)}
                className="min-h-11 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007568]"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveJob}
                className="min-h-11 px-5 py-2 rounded-xl bg-[#007568] hover:bg-[#007568]/90 text-white text-sm font-bold cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007568]"
              >
                {isFr ? 'Générer la préparation' : 'Save & Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVE INTERVIEW ARENA ── */}
      {phase === 'active' && question && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200 w-full">
            <div
              className="h-full bg-[#007568] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Question Nav Sidebar */}
            <div className="ip-active-sidebar w-56 bg-[#f2f2f2] border-r border-gray-200 p-4 overflow-y-auto shrink-0 hidden md:block">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                {isFr ? 'Progression' : 'Questions'}
              </div>
              <div className="space-y-2">
                {questions.map((q, i) => {
                  const done = i < answers.length;
                  const current = i === currentQ;
                  return (
                    <div
                      key={i}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                        current
                          ? 'border-[#007568]/60 bg-[#007568]/15 text-[#007568]'
                          : done
                          ? 'border-gray-200 bg-white text-gray-400'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          done ? 'bg-[var(--status-green)]/20 text-[var(--status-green)]' : current ? 'bg-[#007568] text-white' : 'bg-gray-300 text-gray-500'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate">{q.category}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Question Panel */}
            <div className="ip-active-main flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#007568]/20 text-[#007568]">
                    {question.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    Question {currentQ + 1} / {questions.length}
                  </span>
                </div>
                <div className="bg-gray-200 px-3 py-1 rounded-full text-xs font-mono font-bold text-gray-600 border border-gray-300">
                  ⏱ {fmt(timer)}
                </div>
              </div>

              {/* Question Banner */}
              <div className="bg-[#f2f2f2] border border-gray-300 rounded-2xl p-6 space-y-3 shadow-lg">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
                  "{question.q}"
                </h2>
                <div className="flex items-center gap-2 pt-1">
                  {isSpeaking ? (
                    <button
                      onClick={stopSpeech}
                      className="text-xs bg-[#007568]/20 text-[#007568] px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 border border-[#007568]/30"
                    >
                      <VolumeX size={14} /> {isFr ? 'Arrêter la lecture' : 'Stop voice'}
                    </button>
                  ) : (
                    <button
                      onClick={() => speakText(question.q)}
                      className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Volume2 size={14} /> {isFr ? 'Écouter la question' : 'Listen'}
                    </button>
                  )}
                </div>
              </div>

              {/* Mic & Waveform Visualizer */}
              <div className="bg-[#f2f2f2] border border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
                {/* Waveform visualizer */}
                <div className="flex items-center justify-center gap-1 h-12">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isListening ? 'bg-[#007568] animate-[ip-bar_0.5s_ease_infinite]' : 'bg-gray-300 h-2'
                      }`}
                      style={
                        isListening
                          ? { height: `${20 + Math.sin(i + timer) * 40 + 40}%`, animationDelay: `${(i % 5) * 0.1}s` }
                          : undefined
                      }
                    />
                  ))}
                </div>

                {/* Mic Button */}
                <button
                  onClick={handleToggleMic}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl relative ${
                    isListening
                      ? 'bg-[var(--status-red)] text-white shadow-[var(--status-red)]/40 animate-pulse'
                      : 'bg-[#007568] hover:bg-[#007568]/90 text-white shadow-[#007568]/40'
                  }`}
                >
                  {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                </button>

                <div className="text-xs text-gray-500 font-medium">
                  {isListening
                    ? isFr
                      ? 'Enregistrement en cours... Parlez clairement.'
                      : 'Listening... Speak clearly into your mic.'
                    : isFr
                    ? 'Cliquez pour enregistrer votre réponse vocale'
                    : 'Click mic to record oral answer'}
                </div>
              </div>

              {/* Text Input Option */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {isFr ? 'Ou saisissez votre réponse par écrit' : 'Or type your answer'}
                </label>
                <textarea
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    isFr
                      ? 'Votre réponse apparaîtra ici au fur et à mesure de votre prise de parole, ou vous pouvez la saisir manuellement...'
                      : 'Your voice transcript will appear here, or you can type directly...'
                  }
                  className="w-full bg-white border border-gray-300 rounded-xl p-4 text-base text-gray-800 focus:outline-none focus:border-[#007568] leading-relaxed resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-300"
                >
                  {isFr ? 'Quitter' : 'Quit'}
                </button>

                <button
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-[#007568] hover:bg-[#007568]/90 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#007568]/30 cursor-pointer"
                >
                  <span>
                    {currentQ < questions.length - 1
                      ? isFr
                        ? 'Question suivante →'
                        : 'Next question →'
                      : isFr
                      ? 'Terminer & Analyser ✦'
                      : 'Finish & Evaluate ✦'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW PHASE ── */}
      {phase === 'review' && (
        <div className="ip-review-wrap flex-1 p-6 md:p-8 overflow-y-auto animate-[ip-fadeUp_0.4s_ease]">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="text-4xl">🎯</div>
              <h2 className="text-2xl font-extrabold text-gray-900">
                {isFr ? 'Bilan de votre Entretien' : 'Interview Evaluation Report'}
              </h2>
              <p className="text-xs text-gray-500">
                {loadingReview
                  ? isFr
                    ? "L'IA analyse vos performances vocales et le fond de vos réponses..."
                    : 'AI is evaluating your responses...'
                  : isFr
                  ? 'Analyse détaillée basée sur vos réponses'
                  : 'Detailed performance breakdown'}
              </p>
            </div>

            {loadingReview ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-2 border-[#007568] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-semibold text-gray-500">
                  {isFr ? 'Génération de l\'évaluation globale...' : 'Generating AI feedback report...'}
                </div>
              </div>
            ) : review ? (
              <>
                {/* Score Grid */}
                <div className="ip-review-scores-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                  {review.scores.map((s) => (
                    <div key={s.label} className="bg-[#f2f2f2] border border-gray-300 rounded-2xl p-4 text-center">
                      <div className="text-3xl font-extrabold" style={{ color: s.color }}>
                        {s.value}
                      </div>
                      <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mt-1 mb-2">
                        {s.label}
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall Score Banner */}
                <div className="ip-review-global-panel bg-gradient-to-r from-[#007568]/10 to-[#f2f2f2] border border-[#007568]/30 rounded-2xl p-6 flex items-center justify-between gap-6">
                  <div>
                    <div className="text-[10px] font-bold text-[#007568] uppercase tracking-wider mb-1">
                      {isFr ? 'Score Global' : 'Overall Score'}
                    </div>
                    <div className="text-4xl font-extrabold text-[#007568]">
                      {review.globalScore} <span className="text-lg text-gray-400">/ 100</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-2 leading-relaxed">
                      {review.globalComment}
                    </div>
                  </div>

                  <div className="ip-review-global-actions flex gap-3 shrink-0">
                    <button
                      onClick={handleRestart}
                      className="px-5 py-2.5 rounded-xl bg-[#007568] hover:bg-[#007568]/90 text-white text-xs font-bold cursor-pointer"
                    >
                      {isFr ? 'Nouvel Entretien' : 'New Session'}
                    </button>
                  </div>
                </div>

                {/* Question Details */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {isFr ? 'Détail par question' : 'Question-by-Question Feedback'}
                  </div>

                  {review.perQuestion.map((pq, idx) => (
                    <div key={idx} className="bg-[#f2f2f2] border border-gray-300 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Question {idx + 1}</span>
                        <span className="text-xs font-extrabold text-[#007568] bg-[#007568]/10 px-2 py-0.5 rounded-full border border-[#007568]/20">
                          {pq.score} / 100
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 italic">"{pq.question}"</p>
                      <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200 leading-relaxed">
                        ✦ {pq.feedback}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── PAST SESSIONS HISTORY MODAL ── */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <History size={18} className="text-[#007568]" />
                {isFr ? 'Historique des Entretiens' : 'Interview History'}
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {pastSessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  {isFr ? 'Aucune session archivée.' : 'No saved sessions found.'}
                </div>
              ) : (
                pastSessions.map((s) => (
                  <div key={s.id} className="bg-[#f2f2f2] border border-gray-300 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-gray-800">
                        {s.jobRole} @ {s.company}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                        <span>{s.date}</span>
                        <span>•</span>
                        <span>{s.completedQuestions} questions</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-[#007568]">{s.overallScore}/100</div>
                      </div>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="text-gray-400 hover:text-[var(--status-red)] p-1 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
