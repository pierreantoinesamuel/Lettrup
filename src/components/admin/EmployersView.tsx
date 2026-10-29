import React, { useState } from 'react';
import {
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  FileCheck,
  AlertTriangle,
  ExternalLink,
  Ban,
  RotateCcw,
  Eye,
  Check,
  X
} from 'lucide-react';
import { AdminEmployer, setEmployerVerification, setAccountStatus, logAdminAction } from '../../lib/adminApi';
import { useAuth } from '../../contexts/AuthContext';

interface EmployersViewProps {
  employers: AdminEmployer[];
  onRefresh: () => void;
}

export default function EmployersView({ employers, onRefresh }: EmployersViewProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedEmployer, setSelectedEmployer] = useState<AdminEmployer | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const logAction = (actionType: string, targetId: string, notes: string) => {
    if (!user) return;
    logAdminAction({ id: user.id, name: user.name || user.email, role: user.role }, actionType, 'Employer', targetId, notes);
  };

  const filtered = employers.filter((emp) => {
    const matchesSearch =
      emp.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.verificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleVerify = async (emp: AdminEmployer, status: 'approved' | 'rejected') => {
    await setEmployerVerification(emp.id, status);
    logAction(status === 'approved' ? 'APPROVE_EMPLOYER' : 'REJECT_EMPLOYER', emp.id, `Vérification entreprise : ${status}`);
    showToast(`Entreprise ${emp.companyName} ${status === 'approved' ? 'approuvée' : 'refusée'}.`);
    onRefresh();
  };

  const handleToggleSuspend = async (emp: AdminEmployer) => {
    const newStatus = emp.status === 'suspended' ? 'active' : 'suspended';
    await setAccountStatus(emp.id, newStatus);
    logAction(newStatus === 'suspended' ? 'SUSPEND_EMPLOYER' : 'REACTIVATE_EMPLOYER', emp.id, `Compte entreprise ${newStatus}`);
    showToast(`Compte ${emp.companyName} ${newStatus === 'suspended' ? 'suspendu' : 'réactivé'}.`);
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

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestion des Recruteurs & Entreprises</h1>
          <p className="text-xs text-slate-500 mt-1">
            Vérification Kbis, approbation des comptes recruteurs et prévention des fraudes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les statuts de vérification</option>
            <option value="pending">En attente de vérification</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Refusés / Suspendus</option>
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
          placeholder="Rechercher une entreprise par nom, email ou secteur..."
          className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Entreprise</th>
                <th className="py-3.5 px-4">Secteur / Taille</th>
                <th className="py-3.5 px-4">Vérification</th>
                <th className="py-3.5 px-4">Offres / Candidatures</th>
                <th className="py-3.5 px-4">Statut Compte</th>
                <th className="py-3.5 px-4 text-right">Actions Moderation</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Company Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {emp.companyName}
                          <a href={emp.website} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        <div className="text-[11px] text-slate-500">{emp.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Industry */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{emp.industry}</div>
                    <div className="text-[11px] text-slate-400">{emp.companySize}</div>
                  </td>

                  {/* Verification Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        emp.verificationStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : emp.verificationStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {emp.verificationStatus === 'approved' && 'Vérifié'}
                      {emp.verificationStatus === 'pending' && 'En attente Kbis'}
                      {emp.verificationStatus === 'rejected' && 'Refusé'}
                    </span>
                  </td>

                  {/* Job & Apps count */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900">{emp.jobCount}</span> offres /{' '}
                    <span className="font-bold text-slate-900">{emp.applicationsReceived}</span> candidatures
                  </td>

                  {/* Account Status */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {emp.status === 'active' ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>

                  {/* Moderation Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedEmployer(emp)}
                        title="Voir la fiche entreprise"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      >
                        <Eye size={15} />
                      </button>

                      {emp.verificationStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerify(emp, 'approved')}
                            title="Approuver le compte"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} /> Approuver
                          </button>

                          <button
                            onClick={() => handleVerify(emp, 'rejected')}
                            title="Refuser le compte"
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-md transition-all flex items-center gap-1"
                          >
                            <XCircle size={12} /> Refuser
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleToggleSuspend(emp)}
                        title={emp.status === 'suspended' ? 'Réactiver le compte' : 'Suspendre le compte'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          emp.status === 'suspended' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-red-50 text-red-600'
                        }`}
                      >
                        <Ban size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Aucune entreprise trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Details */}
      {selectedEmployer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold">{selectedEmployer.companyName}</h3>
                  <p className="text-xs text-indigo-300">{selectedEmployer.industry}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmployer(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 font-semibold block">Email Contact</span>
                  <span className="font-bold text-slate-800">{selectedEmployer.email}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block">Taille Entreprise</span>
                  <span className="font-bold text-slate-800">{selectedEmployer.companySize}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block">Site Web</span>
                  <a href={selectedEmployer.website} target="_blank" rel="noreferrer" className="font-bold text-indigo-600 underline">
                    {selectedEmployer.website}
                  </a>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block">Date d'inscription</span>
                  <span className="font-bold text-slate-800">{selectedEmployer.createdAt}</span>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Activité Recrutement</div>
                  <div className="text-slate-500">{selectedEmployer.jobCount} offres publiées au total</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-indigo-600">{selectedEmployer.applicationsReceived}</div>
                  <div className="text-[11px] text-slate-500">Candidatures reçues</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEmployer(null)}
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
