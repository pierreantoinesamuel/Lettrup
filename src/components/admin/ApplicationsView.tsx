import React, { useState } from 'react';
import {
  Search,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  Eye,
  Check,
  X
} from 'lucide-react';
import { AdminApplication, overrideApplicationDecision, logAdminAction } from '../../lib/adminApi';
import { useAuth } from '../../contexts/AuthContext';

interface ApplicationsViewProps {
  applications: AdminApplication[];
  onRefresh: () => void;
}

export default function ApplicationsView({ applications, onRefresh }: ApplicationsViewProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'auto_rejected' | 'shortlisted'>('all');
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOverrideScore = async (app: AdminApplication, newStatus: AdminApplication['status']) => {
    await overrideApplicationDecision(app.id, newStatus);
    if (user) {
      logAdminAction(
        { id: user.id, name: user.name || user.email, role: user.role },
        'OVERRIDE_MATCH_DECISION',
        'Application',
        app.id,
        `Décision modifiée manuellement par l'admin : statut changé en ${newStatus}`
      );
    }
    showToast(`Candidature de ${app.candidateName} mise à jour en statut : ${newStatus}`);
    if (selectedApp?.id === app.id) {
      setSelectedApp({ ...selectedApp, status: newStatus, reviewStatus: 'overridden', autoRejected: false });
    }
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supervision des Candidatures & Match Score</h1>
          <p className="text-xs text-slate-500 mt-1">
            Contrôle des auto-rejets (&lt;70%), vérification des réponses filtrage et surpassement des décisions IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">Tous les statuts de candidature</option>
            <option value="auto_rejected">Auto-rejetées (&lt;70% Match)</option>
            <option value="shortlisted">Sélectionnées (Shortlist)</option>
            <option value="under_review">En cours d'évaluation</option>
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="text-slate-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par candidat, poste ou entreprise..."
          className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Candidat & Email</th>
                <th className="py-3.5 px-4">Poste & Entreprise</th>
                <th className="py-3.5 px-4">Match Score IA</th>
                <th className="py-3.5 px-4">Statut Décision</th>
                <th className="py-3.5 px-4">Revue Admin</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Candidate */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-xs">{app.candidateName}</div>
                    <div className="text-[11px] text-slate-500">{app.candidateEmail}</div>
                  </td>

                  {/* Job */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{app.jobTitle}</div>
                    <div className="text-[11px] text-slate-400">{app.companyName}</div>
                  </td>

                  {/* Match Score Progress Bar */}
                  <td className="py-3.5 px-4 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-black text-xs ${
                          app.matchScore >= 80
                            ? 'text-emerald-600'
                            : app.matchScore >= 70
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {app.matchScore}%
                      </span>
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            app.matchScore >= 80
                              ? 'bg-emerald-500'
                              : app.matchScore >= 70
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${app.matchScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Decision Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        app.status === 'shortlisted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'auto_rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {app.status === 'shortlisted' && 'Shortlisté'}
                      {app.status === 'auto_rejected' && 'Auto-rejeté (<70%)'}
                      {app.status === 'under_review' && 'En évaluation'}
                      {app.status === 'pending' && 'En attente'}
                    </span>
                  </td>

                  {/* Review status */}
                  <td className="py-3.5 px-4 text-[11px]">
                    {app.reviewStatus === 'overridden' ? (
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        Décision modifiée par Admin
                      </span>
                    ) : (
                      <span className="text-slate-500">Automatique IA</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md transition-all flex items-center gap-1"
                      >
                        <Eye size={12} /> Détails & Réponses
                      </button>

                      {app.status === 'auto_rejected' && (
                        <button
                          onClick={() => handleOverrideScore(app, 'shortlisted')}
                          title="Forcer la sélection de la candidature"
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-md transition-all flex items-center gap-1"
                        >
                          <Sparkles size={12} /> Forcer Shortlist
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Aucune candidature trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{selectedApp.candidateName}</h3>
                <p className="text-xs text-indigo-300">Candidature pour {selectedApp.jobTitle} chez {selectedApp.companyName}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Match Score Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Score de Match IA Calculé</span>
                  <span className="text-lg font-black text-indigo-600">{selectedApp.matchScore}%</span>
                </div>

                {selectedApp.autoRejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px] leading-relaxed mt-2">
                    <div className="font-bold flex items-center gap-1.5 mb-0.5">
                      <AlertTriangle size={14} className="text-red-600" /> Motif de l'Auto-rejet (&lt;70%)
                    </div>
                    {selectedApp.autoRejectionReason}
                  </div>
                )}
              </div>

              {/* Candidate Screening Answers */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Réponses du candidat aux questions filtrage</h4>
                {selectedApp.screeningAnswers.length > 0 ? (
                  <div className="space-y-2">
                    {selectedApp.screeningAnswers.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                        <div className="font-semibold text-slate-800">Q: {item.question}</div>
                        <div className="text-indigo-700 font-bold mt-1">R: {item.answer}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Aucune question de filtrage requise pour ce poste.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Action Manuelle Administrateur</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOverrideScore(selectedApp, 'shortlisted')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Rétablir en Shortlist
                </button>
                <button
                  onClick={() => handleOverrideScore(selectedApp, 'rejected')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Confirmer le Rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
