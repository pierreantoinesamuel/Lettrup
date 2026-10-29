import React, { useState } from 'react';
import {
  Workflow,
  RotateCcw,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Code,
  Check,
  X
} from 'lucide-react';
import { AdminWorkflow } from './adminData';
import { AdminStore } from './adminStore';

interface WorkflowsViewProps {
  workflows: AdminWorkflow[];
  onRefresh: () => void;
}

export default function WorkflowsView({ workflows, onRefresh }: WorkflowsViewProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState<AdminWorkflow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRestart = (wf: AdminWorkflow) => {
    const updated = workflows.map((w) =>
      w.id === wf.id
        ? {
            ...w,
            status: 'active' as const,
            lastRunTime: 'A l\'instant',
            successCount: w.successCount + 1,
            lastErrorMessage: undefined,
          }
        : w
    );
    AdminStore.saveWorkflows(updated);
    AdminStore.logAction('RESTART_WORKFLOW', 'Workflow', wf.id, `Workflow n8n "${wf.name}" relancé manuellement`);
    showToast(`Workflow "${wf.name}" relancé avec succès.`);
    onRefresh();
  };

  const handleToggleStatus = (wf: AdminWorkflow) => {
    const newStatus = wf.status === 'active' ? 'paused' : 'active';
    const updated = workflows.map((w) => (w.id === wf.id ? { ...w, status: newStatus as any } : w));
    AdminStore.saveWorkflows(updated);
    AdminStore.logAction('TOGGLE_WORKFLOW', 'Workflow', wf.id, `Statut workflow changé en ${newStatus}`);
    showToast(`Workflow "${wf.name}" ${newStatus === 'active' ? 'activé' : 'mis en pause'}.`);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Workflows d'Automatisations (n8n) <Workflow className="text-indigo-600" size={24} />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervision des workflows événementiels : modération automatique, vérification entreprise et cron santé.
          </p>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workflows.map((wf) => (
          <div key={wf.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center">
                  <Workflow size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{wf.name}</h3>
                  <span className="text-[10px] font-mono text-slate-400">Trigger: {wf.triggerType}</span>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                  wf.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : wf.status === 'paused'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {wf.status === 'active' && 'Actif'}
                {wf.status === 'paused' && 'En Pause'}
                {wf.status === 'error' && 'Erreur'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Succès</span>
                <span className="font-black text-emerald-600">{wf.successCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Échecs</span>
                <span className="font-black text-red-600">{wf.failureCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Durée Moy.</span>
                <span className="font-bold text-slate-800">{wf.durationMs} ms</span>
              </div>
            </div>

            {wf.lastErrorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                <span className="font-bold block mb-0.5">Dernière Erreur :</span>
                {wf.lastErrorMessage}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock size={12} /> {wf.lastRunTime}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedWorkflow(wf)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <Code size={13} /> JSON
                </button>

                <button
                  onClick={() => handleRestart(wf)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <RotateCcw size={13} /> Relancer
                </button>

                <button
                  onClick={() => handleToggleStatus(wf)}
                  className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
                  title={wf.status === 'active' ? 'Mettre en pause' : 'Activer'}
                >
                  {wf.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* JSON Execution Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Configuration n8n</h3>
                <p className="text-xs text-indigo-300">{selectedWorkflow.name} ({selectedWorkflow.code})</p>
              </div>
              <button onClick={() => setSelectedWorkflow(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto">
{JSON.stringify(
  {
    workflow_id: selectedWorkflow.id,
    name: selectedWorkflow.name,
    trigger: selectedWorkflow.triggerType,
    status: selectedWorkflow.status,
    nodes: [
      { type: 'n8n-nodes-base.webhook', name: 'Trigger' },
      { type: 'n8n-nodes-base.geminiAI', name: 'Gemini Analysis' },
      { type: 'n8n-nodes-base.postgres', name: 'Audit Log DB' }
    ]
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
