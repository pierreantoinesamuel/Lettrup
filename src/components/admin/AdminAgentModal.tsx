import React, { useRef, useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import {
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  X,
  Check,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminAIAgent, AdminWorkflow } from './adminData';
import {
  AdminCandidate,
  AdminEmployer,
  AdminJob,
  AdminApplication,
  setAccountStatus,
  setEmployerVerification,
  updateJobStatus,
  logAdminAction,
} from '../../lib/adminApi';
import { useAuth } from '../../contexts/AuthContext';

interface AdminAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: AdminCandidate[];
  employers: AdminEmployer[];
  jobs: AdminJob[];
  applications: AdminApplication[];
  aiAgents: AdminAIAgent[];
  workflows: AdminWorkflow[];
  onRefreshData: () => void;
}

interface RecommendedAction {
  label: string;
  type: 'suspend_employer' | 'approve_employer' | 'ban_candidate' | 'approve_job' | 'reject_job';
  targetId: string;
}

interface AgentOversightAnalysis {
  alerts: string[];
  suspicious_accounts: string[];
  job_posts_to_review: string[];
  workflow_issues: string[];
  ai_agent_issues: string[];
  recommended_actions: RecommendedAction[];
}

export default function AdminAgentModal({
  isOpen,
  onClose,
  candidates,
  employers,
  jobs,
  applications,
  aiAgents,
  workflows,
  onRefreshData,
}: AdminAgentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AgentOversightAnalysis | null>(null);
  const [executedActions, setExecutedActions] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogA11y(isOpen, onClose, dialogRef);

  if (!isOpen) return null;

  const runAnalysis = async () => {
    setLoading(true);
    setExecutedActions([]);

    try {
      const payload = {
        candidates: candidates.map((c) => ({ id: c.id, name: c.name, email: c.email, status: c.status, plan: c.plan })),
        employers: employers.map((e) => ({ id: e.id, name: e.companyName, email: e.email, status: e.verificationStatus })),
        jobs: jobs.map((j) => ({ id: j.id, title: j.title, company: j.companyName, flag: j.flagStatus, status: j.status })),
        applications: applications.map((a) => ({ id: a.id, score: a.matchScore, status: a.status })),
        ai_agents: aiAgents.map((a) => ({ name: a.name, status: a.status, errors: a.errorCount })),
        workflows: workflows.map((w) => ({ name: w.name, status: w.status, failures: w.failureCount })),
      };

      // Server-side route builds the prompt and calls the AI provider — the
      // admin-role check and provider keys must never live in the browser.
      // See aiEngineApi.ts handleAdminAiOversightRoute.
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const res = await fetch('/api/admin/ai-oversight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.result) {
        setAnalysis(data.result);
      } else {
        throw new Error(data.error || "L'analyse IA a échoué.");
      }
    } catch (err) {
      console.error('AI Oversight error:', err);
      // Honest failure state — no fabricated findings or fake IDs, since
      // executing an action against a made-up ID would silently fail or
      // error against real data.
      setAnalysis({
        alerts: ["L'analyse IA a échoué. Réessayez ou consultez les logs."],
        suspicious_accounts: [],
        job_posts_to_review: [],
        workflow_issues: [],
        ai_agent_issues: [],
        recommended_actions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action: RecommendedAction) => {
    const key = `${action.type}:${action.targetId}`;
    if (executedActions.includes(key)) return;
    if (!user) return;

    const actor = { id: user.id, name: user.name || user.email, role: user.role };

    try {
      switch (action.type) {
        case 'suspend_employer':
          await setAccountStatus(action.targetId, 'suspended');
          await logAdminAction(actor, 'SUSPEND_EMPLOYER', 'Employer', action.targetId, "Action suggérée par l'Agent Oversight");
          break;
        case 'approve_employer':
          await setEmployerVerification(action.targetId, 'approved');
          await logAdminAction(actor, 'APPROVE_EMPLOYER', 'Employer', action.targetId, "Action suggérée par l'Agent Oversight");
          break;
        case 'ban_candidate':
          await setAccountStatus(action.targetId, 'banned');
          await logAdminAction(actor, 'BAN_CANDIDATE', 'Candidate', action.targetId, "Action suggérée par l'Agent Oversight");
          break;
        case 'approve_job':
          await updateJobStatus(action.targetId, 'active', 'normal');
          await logAdminAction(actor, 'APPROVE_JOB', 'Job', action.targetId, "Action suggérée par l'Agent Oversight");
          break;
        case 'reject_job':
          await updateJobStatus(action.targetId, 'rejected', 'spam');
          await logAdminAction(actor, 'REJECT_JOB', 'Job', action.targetId, "Action suggérée par l'Agent Oversight");
          break;
      }

      setExecutedActions((prev) => [...prev, key]);
      setToastMsg(`Action exécutée : ${action.label}`);
      setTimeout(() => setToastMsg(null), 3000);
      onRefreshData();
    } catch (err: any) {
      setToastMsg(`Échec de l'action : ${err.message || 'erreur inconnue'}`);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-agent-modal-title"
        tabIndex={-1}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
              <Bot size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h3 id="admin-agent-modal-title" className="text-base font-bold flex items-center gap-2">
                Agent IA de Supervision Platform (Oversight)
                <span className="text-[10px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                  Gemini Powered
                </span>
              </h3>
              <p className="text-xs text-indigo-300">Analyse automatisée de l'écosystème Lettrup</p>
            </div>
          </div>

          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Toast */}
          {toastMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{toastMsg}</span>
            </div>
          )}

          {!analysis && !loading && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center mx-auto">
                <Sparkles size={32} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Lancer l'Analyse IA de Supervision</h4>
                <p className="text-slate-500 max-w-md mx-auto mt-1">
                  L'agent va examiner les requêtes candidates, la légitimité des employeurs, les offres publiées et la santé des workflows n8n.
                </p>
              </div>

              <button
                onClick={runAnalysis}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <Zap size={16} />
                <span>Analyser la Plateforme</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 space-y-3">
              <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
              <div className="font-bold text-slate-800">Analyse IA en cours par Gemini...</div>
              <p className="text-slate-400 text-[11px]">Détection des anomalies, spam et comportements suspects...</p>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-5">
              {/* Alerts */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                  <AlertTriangle size={15} className="text-amber-600" /> Alertes Principales ({analysis.alerts.length})
                </h4>
                <ul className="space-y-1 text-amber-800 pl-4 list-disc text-[11px]">
                  {analysis.alerts.map((alt, idx) => (
                    <li key={idx}>{alt}</li>
                  ))}
                </ul>
              </div>

              {/* Suspicious Accounts & Jobs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                  <h5 className="font-bold text-red-900 flex items-center gap-1.5 text-xs">
                    <ShieldAlert size={14} className="text-red-600" /> Comptes Suspects
                  </h5>
                  <ul className="text-red-800 space-y-1 text-[11px] font-semibold">
                    {analysis.suspicious_accounts.map((acc, idx) => (
                      <li key={idx}>• {acc}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <AlertTriangle size={14} className="text-amber-500" /> Offres à Réviser
                  </h5>
                  <ul className="text-slate-700 space-y-1 text-[11px]">
                    {analysis.job_posts_to_review.map((jp, idx) => (
                      <li key={idx}>• {jp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Actions with 1-click execution */}
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
                <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                  <Zap size={15} className="text-indigo-600" /> Actions Administratives Recommandées (1-Clic)
                </h4>

                <div className="space-y-2">
                  {analysis.recommended_actions.length === 0 && (
                    <p className="text-slate-500 text-[11px] italic">Aucune action recommandée pour le moment.</p>
                  )}
                  {analysis.recommended_actions.map((act, idx) => {
                    const key = `${act.type}:${act.targetId}`;
                    const isDone = executedActions.includes(key);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-white border border-indigo-100 rounded-lg shadow-2xs"
                      >
                        <span className="text-slate-800 font-semibold pr-2">{act.label}</span>
                        <button
                          onClick={() => handleExecuteAction(act)}
                          disabled={isDone}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                          }`}
                        >
                          {isDone ? 'Exécuté ✓' : 'Appliquer'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Re-analyser la plateforme
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
