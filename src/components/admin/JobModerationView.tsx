import React, { useState } from 'react';
import {
  Search,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Edit3,
  Trash2,
  Check,
  X,
  Sparkles,
  MapPin,
  Euro
} from 'lucide-react';
import { AdminJob, updateJobStatus, bulkApproveJobs, logAdminAction } from '../../lib/adminApi';
import { useAuth } from '../../contexts/AuthContext';

interface JobModerationViewProps {
  jobs: AdminJob[];
  onRefresh: () => void;
}

export default function JobModerationView({ jobs, onRefresh }: JobModerationViewProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'active' | 'suspended'>('all');
  const [flagFilter, setFlagFilter] = useState<'all' | 'normal' | 'suspicious' | 'spam'>('all');
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
  const [rejectingJob, setRejectingJob] = useState<AdminJob | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const logAction = (actionType: string, targetId: string, notes: string) => {
    if (!user) return;
    logAdminAction({ id: user.id, name: user.name || user.email, role: user.role }, actionType, 'Job', targetId, notes);
  };

  const filtered = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesFlag = flagFilter === 'all' || job.flagStatus === flagFilter;
    return matchesSearch && matchesStatus && matchesFlag;
  });

  const handleApprove = async (job: AdminJob) => {
    await updateJobStatus(job.id, 'active', 'normal');
    logAction('APPROVE_JOB', job.id, `Offre "${job.title}" approuvée`);
    showToast(`Offre "${job.title}" approuvée.`);
    onRefresh();
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingJob) return;
    await updateJobStatus(rejectingJob.id, 'rejected', 'spam', rejectReason);
    logAction('REJECT_JOB', rejectingJob.id, `Motif : ${rejectReason}`);
    showToast(`Offre "${rejectingJob.title}" refusée pour motif : ${rejectReason}`);
    setRejectingJob(null);
    setRejectReason('');
    onRefresh();
  };

  const handleToggleFlagSpam = async (job: AdminJob) => {
    const newFlag = job.flagStatus === 'spam' ? 'normal' : 'spam';
    const newStatus = newFlag === 'spam' ? 'suspended' : 'active';
    await updateJobStatus(job.id, newStatus, newFlag, newFlag === 'spam' ? "Marqué comme spam par l'admin" : null);
    logAction('FLAG_SPAM_JOB', job.id, `Nouveau statut flag : ${newFlag}`);
    showToast(`Offre marqée comme ${newFlag === 'spam' ? 'SPAM / Frauduleuse' : 'Normale'}.`);
    onRefresh();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedJobIds(filtered.map((j) => j.id));
    } else {
      setSelectedJobIds([]);
    }
  };

  const handleSelectJob = (id: string) => {
    setSelectedJobIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkApprove = async () => {
    await bulkApproveJobs(selectedJobIds);
    logAction('BULK_APPROVE_JOBS', 'multiple', `${selectedJobIds.length} offres approuvées en masse`);
    showToast(`${selectedJobIds.length} offres approuvées.`);
    setSelectedJobIds([]);
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Modération des Offres d'Emploi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Système automatique de filtrage anti-spam et validation manuelle des offres publiées.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedJobIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              Approuver la sélection ({selectedJobIds.length})
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending_review">En attente de modération</option>
            <option value="active">Approuvées</option>
            <option value="suspended">Suspendues / Refusées</option>
          </select>

          <select
            value={flagFilter}
            onChange={(e) => setFlagFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">Tous les niveaux de risque</option>
            <option value="normal">Normale (0 risque)</option>
            <option value="suspicious">Suspecte (IA Alert)</option>
            <option value="spam">Spam / Arnaque confirmée</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="text-slate-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par titre de poste, entreprise ou ville..."
          className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedJobIds.length === filtered.length && filtered.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-3.5 px-4">Titre de l'Offre & Entreprise</th>
                <th className="py-3.5 px-4">Type / Salaire</th>
                <th className="py-3.5 px-4">Niveau de Risque IA</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Candidats</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((job) => (
                <tr
                  key={job.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    job.flagStatus === 'spam' ? 'bg-red-50/30' : job.flagStatus === 'suspicious' ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={selectedJobIds.includes(job.id)}
                      onChange={() => handleSelectJob(job.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Title & Company */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-xs">{job.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-slate-700">{job.companyName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {job.location}
                      </span>
                    </div>
                  </td>

                  {/* Contract & Salary */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{job.jobType}</div>
                    <div className="text-[11px] text-slate-500">{job.salaryRange}</div>
                  </td>

                  {/* Flag Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-max ${
                        job.flagStatus === 'spam'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : job.flagStatus === 'suspicious'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {job.flagStatus === 'spam' && <ShieldAlert size={12} />}
                      {job.flagStatus === 'suspicious' && <AlertTriangle size={12} />}
                      {job.flagStatus === 'normal' && <CheckCircle2 size={12} />}
                      <span>
                        {job.flagStatus === 'spam' && 'SPAM / Frauduleuse'}
                        {job.flagStatus === 'suspicious' && 'IA Flag: Suspecte'}
                        {job.flagStatus === 'normal' && 'Normale (0 risque)'}
                      </span>
                    </span>
                    {job.flagReason && (
                      <p className="text-[10px] text-red-600 mt-1 max-w-xs italic line-clamp-1">{job.flagReason}</p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : job.status === 'pending_review'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {job.status === 'active' && 'Approuvée'}
                      {job.status === 'pending_review' && 'En attente'}
                      {job.status === 'suspended' && 'Suspendue'}
                      {job.status === 'rejected' && 'Refusée'}
                      {job.status === 'filled' && 'Pourvue'}
                    </span>
                  </td>

                  {/* Applicants count */}
                  <td className="py-3.5 px-4 font-bold text-slate-900">{job.applicantCount} candidatures</td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md transition-all"
                      >
                        Aperçu
                      </button>

                      {job.status !== 'active' && (
                        <button
                          onClick={() => handleApprove(job)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Approuver
                        </button>
                      )}

                      <button
                        onClick={() => setRejectingJob(job)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-md transition-all flex items-center gap-1"
                      >
                        <XCircle size={12} /> Refuser
                      </button>

                      <button
                        onClick={() => handleToggleFlagSpam(job)}
                        title={job.flagStatus === 'spam' ? 'Déclasser le flag' : 'Signaler comme Spam'}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      >
                        <ShieldAlert size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Aucune offre d'emploi trouvée avec ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleRejectConfirm} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Refuser l'offre d'emploi</h3>
            <p className="text-xs text-slate-500">
              Indiquez le motif du refus pour l'entreprise <span className="font-bold text-slate-900">{rejectingJob.companyName}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Motif de modération</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Offre non conforme, rémunération irréaliste, suspicion de phishing..."
                className="w-full p-3 border border-slate-200 rounded-lg text-xs h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingJob(null)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg"
              >
                Confirmer le refus
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Job Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">{selectedJob.title}</h3>
                <p className="text-xs text-indigo-300">{selectedJob.companyName} • {selectedJob.location}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="font-bold text-slate-900 text-sm mb-1">Description de l'offre</div>
                <p className="text-slate-700 leading-relaxed">{selectedJob.description}</p>
              </div>

              {selectedJob.screeningQuestions?.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Questions de filtrage candidat ({selectedJob.screeningQuestions.length})</h4>
                  <ul className="space-y-1 pl-4 list-disc text-slate-600">
                    {selectedJob.screeningQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800"
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
