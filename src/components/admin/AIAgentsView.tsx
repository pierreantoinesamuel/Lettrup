import React, { useState } from 'react';
import {
  Bot,
  Zap,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  Search,
  Filter,
  Check,
  X
} from 'lucide-react';
import { AdminAIAgent, AdminAILog } from './adminData';
import { AdminStore } from './adminStore';

interface AIAgentsViewProps {
  agents: AdminAIAgent[];
  logs: AdminAILog[];
  onRefresh: () => void;
}

export default function AIAgentsView({ agents, logs, onRefresh }: AIAgentsViewProps) {
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [selectedLog, setSelectedLog] = useState<AdminAILog | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredLogs = logs.filter((l) => {
    const matchesAgent = selectedAgentFilter === 'all' || l.agentName === selectedAgentFilter;
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesAgent && matchesStatus;
  });

  const handleToggleAgent = (agent: AdminAIAgent) => {
    const newStatus = agent.status === 'enabled' ? 'disabled' : 'enabled';
    const updated = agents.map((a) => (a.id === agent.id ? { ...a, status: newStatus as any } : a));
    AdminStore.saveAIAgents(updated);
    AdminStore.logAction(
      'TOGGLE_AI_AGENT',
      'AI Agent',
      agent.id,
      `Agent ${agent.name} passé en ${newStatus}`
    );
    showToast(`Agent "${agent.name}" ${newStatus === 'enabled' ? 'activé' : 'désactivé'}.`);
    onRefresh();
  };

  const totalCostUSD = agents.reduce((sum, a) => sum + a.costEstimateUSD, 0).toFixed(2);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Supervision des Agents IA <Bot className="text-indigo-600" size={24} />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring en temps réel des performances, taux d'erreurs API Gemini et coût estimé.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Coût Estime Global</div>
            <div className="text-lg font-black text-slate-900">${totalCostUSD} USD</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Agents Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((agent) => {
          const successRate = ((agent.successCount / agent.totalCalls) * 100).toFixed(1);
          const isEnabled = agent.status === 'enabled';

          return (
            <div
              key={agent.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                isEnabled ? 'border-slate-200' : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isEnabled ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Bot size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{agent.name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">{agent.slug}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAgent(agent)}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    title={isEnabled ? 'Désactiver l\'agent' : 'Activer l\'agent'}
                  >
                    {isEnabled ? <ToggleRight size={28} className="text-indigo-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-snug my-3">{agent.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">Appels Totaux:</span>
                  <span className="font-bold text-slate-900">{agent.totalCalls.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">Taux de Succès:</span>
                  <span className="font-bold text-emerald-600">{successRate}%</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px]">Temps Réponse Moyen:</span>
                  <span className="font-semibold text-slate-800">{agent.avgResponseMs} ms</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Logs Table Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Logs des Appels API IA</h3>
            <p className="text-xs text-slate-500">Historique détaillé des requêtes Gemini et erreurs d'exécution</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">Tous les agents IA</option>
              {agents.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">Tous les résultats</option>
              <option value="success">Succès</option>
              <option value="error">Erreurs API</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Agent IA</th>
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Extrait Input</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Durée</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">{log.timestamp}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{log.agentName}</td>
                  <td className="py-3 px-4 text-slate-600">{log.userEmail}</td>
                  <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{log.inputSnippet}</td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-max ${
                        log.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.status === 'success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {log.status === 'success' ? 'Succès' : 'Erreur API'}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{log.durationMs} ms</td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition-colors"
                      title="Inspecter le log JSON"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Inspection Log API Gemini</h3>
                <p className="text-xs text-indigo-300">{selectedLog.agentName} • {selectedLog.timestamp}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-900 block mb-1">Entrée (Input) :</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.inputSnippet}
                </pre>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Sortie (Output / Trace) :</span>
                <pre className="p-3 bg-slate-900 text-indigo-300 rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.errorMessage ? `ERROR: ${selectedLog.errorMessage}` : selectedLog.outputSnippet}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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
