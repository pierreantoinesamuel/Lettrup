import React, { useState } from 'react';
import {
  Bell,
  Search,
  ShieldCheck,
  UserCheck,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface AdminHeaderProps {
  onOpenAIAgent: () => void;
  adminName?: string;
  adminRole?: string;
}

export default function AdminHeader({
  onOpenAIAgent,
  adminName = 'Admin',
  adminRole = 'Administrateur',
}: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const initials = adminName.trim().charAt(0).toUpperCase() || 'A';

  const notifications = [
    { id: '1', title: 'Nouvelle entreprise à vérifier', desc: 'GreenMobility SAS a soumis des documents.', time: 'Il y a 10 min', type: 'info' },
    { id: '2', title: 'Alerte Modération IA', desc: 'Offre suspecte détectée: Crypto Wealth Scam Ltd.', time: 'Il y a 30 min', type: 'alert' },
    { id: '3', title: 'Taux d\'erreur Agent IA', desc: 'Interview Simulator a atteint un pic à 1.2% de réessais.', time: 'Il y a 2h', type: 'warning' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left Search / System Status */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Rechercher un candidat, un employeur, une offre (ID, nom, email)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Système Opérationnel
        </div>
      </div>

      {/* Right Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* AI Oversight Agent Quick Trigger */}
        <button
          onClick={onOpenAIAgent}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95"
        >
          <Sparkles size={15} className="animate-spin-slow" />
          <span>Agent IA Supervision</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Notifications Admin"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <h4 className="text-xs font-bold text-slate-900">Alertes Récentes ({notifications.length})</h4>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] text-indigo-600 font-semibold hover:underline"
                >
                  Tout marquer comme lu
                </button>
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs hover:bg-slate-100/80 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        {n.type === 'alert' && <AlertTriangle size={12} className="text-red-500" />}
                        {n.type === 'info' && <CheckCircle2 size={12} className="text-indigo-500" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Avatar */}
        <div className="pl-2 border-l border-slate-200 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {initials}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">{adminName}</div>
            <div className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
              <ShieldCheck size={10} />
              {adminRole}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
