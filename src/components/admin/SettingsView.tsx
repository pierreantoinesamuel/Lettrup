import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Sliders,
  History,
  CheckCircle2,
  Save,
  Check
} from 'lucide-react';
import { AdminAuditLog } from './adminData';
import { AdminStore } from './adminStore';
import { useAuth } from '../../contexts/AuthContext';
import { promoteToAdmin } from '../../lib/adminApi';

interface SettingsViewProps {
  auditLogs: AdminAuditLog[];
  onRefresh: () => void;
}

export default function SettingsView({ auditLogs, onRefresh }: SettingsViewProps) {
  const { user } = useAuth();
  const [minMatchThreshold, setMinMatchThreshold] = useState(70);
  const [autoFlagSensitivity, setAutoFlagSensitivity] = useState<'Standard' | 'Haute' | 'Strict'>('Haute');
  const [aiTimeoutMs, setAiTimeoutMs] = useState(5000);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteError(null);
    setPromoteLoading(true);
    try {
      await promoteToAdmin(promoteEmail.trim());
      showToast(`${promoteEmail.trim()} est maintenant administrateur.`);
      setPromoteEmail('');
    } catch (err: any) {
      setPromoteError(err.message || 'La promotion a échoué.');
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    AdminStore.logAction(
      'UPDATE_SYSTEM_SETTINGS',
      'AI Agent',
      'system',
      `Seuil auto-rejet : ${minMatchThreshold}%, Sensibilité : ${autoFlagSensitivity}`
    );
    showToast('Paramètres système enregistrés avec succès.');
    onRefresh();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Paramètres Système & Journaux d'Audit <Settings className="text-indigo-600" size={24} />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configuration des seuils IA, gestion des rôles d'accès et historique complet des actions administratives.
          </p>
        </div>
      </div>

      {user?.isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserPlus size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Ajouter un Administrateur</h3>
          </div>
          <p className="text-xs text-slate-500">
            Réservé au super-administrateur. La personne doit déjà avoir un compte Lettrup ; il sera promu administrateur.
          </p>

          <form onSubmit={handlePromoteAdmin} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="flex-1 px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-hidden"
            />
            <button
              type="submit"
              disabled={promoteLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-60 disabled:cursor-wait shrink-0"
            >
              {promoteLoading ? 'Promotion...' : 'Promouvoir Admin'}
            </button>
          </form>

          {promoteError && <p className="text-[11px] text-[var(--status-red)]">{promoteError}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Settings Form */}
        <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Seuils & Algorithmes IA</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Seuil minimal Auto-Rejet (&lt; {minMatchThreshold}%)</label>
              <input
                type="range"
                min="50"
                max="85"
                value={minMatchThreshold}
                onChange={(e) => setMinMatchThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>50% (Permissif)</span>
                <span className="font-bold text-indigo-600">{minMatchThreshold}% Actuel</span>
                <span>85% (Strict)</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Sensibilité de Modération Anti-Spam</label>
              <select
                value={autoFlagSensitivity}
                onChange={(e) => setAutoFlagSensitivity(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
              >
                <option value="Standard">Standard (Signalement préventif)</option>
                <option value="Haute">Haute (Détection avancée des liens)</option>
                <option value="Strict">Strict (Blocage immédiat des comptes suspects)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Timeout API Gemini (ms)</label>
              <input
                type="number"
                value={aiTimeoutMs}
                onChange={(e) => setAiTimeoutMs(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Save size={15} />
            <span>Enregistrer la Configuration</span>
          </button>
        </form>

        {/* Audit Logs Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History size={18} className="text-indigo-600" />
              Journal des Actions d'Audit Admin
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {auditLogs.length} Entrées
            </span>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                <tr>
                  <th className="py-3 px-3">Horodatage</th>
                  <th className="py-3 px-3">Admin</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Cible</th>
                  <th className="py-3 px-3">Détails / Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-[10px] font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{log.adminName}</td>
                    <td className="py-3 px-3">
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{log.targetType} ({log.targetId})</td>
                    <td className="py-3 px-3 text-slate-500">{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
