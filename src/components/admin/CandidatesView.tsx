import React, { useState } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  UserX,
  KeyRound,
  FileText,
  Trash2,
  Eye,
  Edit,
  Mail,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import { AdminCandidate, setAccountStatus, updateCandidateProfile, logAdminAction } from '../../lib/adminApi';
import { useAuth } from '../../contexts/AuthContext';

interface CandidatesViewProps {
  candidates: AdminCandidate[];
  onRefresh: () => void;
}

export default function CandidatesView({ candidates, onRefresh }: CandidatesViewProps) {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<AdminCandidate | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<AdminCandidate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const logAction = (actionType: string, targetId: string, notes: string) => {
    if (!user) return;
    logAdminAction({ id: user.id, name: user.name || user.email, role: user.role }, actionType, 'Candidate', targetId, notes);
  };

  const filtered = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || c.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleToggleBan = async (cand: AdminCandidate) => {
    const newStatus = cand.status === 'banned' ? 'active' : 'banned';
    await setAccountStatus(cand.id, newStatus);
    logAction(newStatus === 'banned' ? 'BAN_CANDIDATE' : 'UNBAN_CANDIDATE', cand.id, `Statut changé en ${newStatus}`);
    showToast(`Compte de ${cand.name} ${newStatus === 'banned' ? 'banni' : 'débloqué'}.`);
    onRefresh();
  };

  const handleResetPassword = (cand: AdminCandidate) => {
    logAction('RESET_PASSWORD_REQUEST', cand.id, `Réinitialisation demandée pour ${cand.email} (envoi d'email non encore implémenté)`);
    showToast(`Demande de réinitialisation enregistrée pour ${cand.email}.`);
  };

  const handleDeleteCandidate = async (cand: AdminCandidate) => {
    // Hard-deleting the auth.users row requires the service-role key (never
    // exposed client-side), so "delete" here permanently deactivates the
    // account instead of erasing it.
    if (confirm(`Voulez-vous désactiver définitivement le compte de ${cand.name} ?`)) {
      await setAccountStatus(cand.id, 'banned');
      logAction('DELETE_CANDIDATE', cand.id, `Compte candidat ${cand.name} désactivé définitivement`);
      showToast(`Candidat ${cand.name} désactivé.`);
      setSelectedCandidate(null);
      onRefresh();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;
    await updateCandidateProfile(editingCandidate.id, {
      name: editingCandidate.name,
      role: editingCandidate.role,
      plan: editingCandidate.plan,
    });
    logAction('EDIT_CANDIDATE', editingCandidate.id, 'Informations modifiées');
    showToast(`Profil de ${editingCandidate.name} mis à jour.`);
    setEditingCandidate(null);
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

      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestion des Candidats</h1>
          <p className="text-xs text-slate-500 mt-1">
            Superviser les comptes candidats, gérer les accès, réinitialiser les mots de passe et modérer les profils.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les Formules</option>
            <option value="free_trial">Essai Gratuit</option>
            <option value="premium">Premium</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les Statuts</option>
            <option value="active">Actifs</option>
            <option value="banned">Bannis</option>
          </select>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="text-slate-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, email ou poste recherché..."
          className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-xs text-slate-400 hover:text-slate-700">
            Effacer
          </button>
        )}
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Candidat</th>
                <th className="py-3.5 px-4">Poste Cible</th>
                <th className="py-3.5 px-4">Formule</th>
                <th className="py-3.5 px-4">CVs / Apps</th>
                <th className="py-3.5 px-4">Dernière Connexion</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((cand) => (
                <tr key={cand.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Candidate Name & Contact */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {cand.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{cand.name}</div>
                        <div className="text-[11px] text-slate-500">{cand.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{cand.role}</td>

                  {/* Plan Badge */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        cand.plan === 'premium'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cand.plan.toUpperCase()}
                    </span>
                  </td>

                  {/* CV & Application Count */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{cand.cvCount}</span> CVs /{' '}
                      <span className="font-bold text-slate-900">{cand.applicationCount}</span> candidatures
                    </div>
                  </td>

                  {/* Last Login */}
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">{cand.lastLogin}</td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        cand.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {cand.status === 'active' ? 'Actif' : 'Banni'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedCandidate(cand)}
                        title="Voir le profil complet"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => setEditingCandidate({ ...cand })}
                        title="Éditer les informations"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        onClick={() => handleResetPassword(cand)}
                        title="Envoyer email réinitialisation mot de passe"
                        className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition-colors"
                      >
                        <KeyRound size={15} />
                      </button>

                      <button
                        onClick={() => handleToggleBan(cand)}
                        title={cand.status === 'banned' ? 'Débloquer le compte' : 'Bannir le candidat'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          cand.status === 'banned'
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'hover:bg-red-50 text-red-600'
                        }`}
                      >
                        {cand.status === 'banned' ? <UserCheck size={15} /> : <UserX size={15} />}
                      </button>

                      <button
                        onClick={() => handleDeleteCandidate(cand)}
                        title="Supprimer le compte"
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Aucun candidat ne correspond aux filtres de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Details Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-base flex items-center justify-center">
                  {selectedCandidate.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-base font-bold">{selectedCandidate.name}</h3>
                  <p className="text-xs text-indigo-300">{selectedCandidate.role}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Email</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail size={13} className="text-slate-400" />
                    {selectedCandidate.email}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Dernière connexion</span>
                  <span className="font-bold text-slate-800">{selectedCandidate.lastLogin}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Formule</span>
                  <span className="font-black text-indigo-600">{selectedCandidate.plan.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                <div>
                  <div className="font-bold text-slate-900">Activité Candidatures & CVs</div>
                  <div className="text-slate-500">Inscrit le {selectedCandidate.createdAt}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-slate-900">
                    {selectedCandidate.cvCount} CVs | {selectedCandidate.applicationCount} Candidatures
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetPassword(selectedCandidate)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-100"
                >
                  Réinitialiser MDP
                </button>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveEdit} className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Modifier le candidat</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nom complet</label>
                <input
                  type="text"
                  value={editingCandidate.name}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={editingCandidate.email}
                  disabled
                  title="L'email est géré par l'authentification et ne peut pas être modifié ici."
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Poste recherché</label>
                <input
                  type="text"
                  value={editingCandidate.role}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, role: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Formule Plan</label>
                <select
                  value={editingCandidate.plan}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, plan: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="free_trial">Essai Gratuit</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCandidate(null)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
