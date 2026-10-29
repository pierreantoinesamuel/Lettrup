import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoIcon from '../../assets/logo-icon-light.png';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileCheck,
  Bot,
  Workflow,
  BarChart3,
  Settings,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  LogOut,
  BookOpen
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'candidates'
  | 'employers'
  | 'jobs'
  | 'applications'
  | 'articles'
  | 'ai-agents'
  | 'workflows'
  | 'analytics'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onOpenAIAgent: () => void;
  pendingAlertsCount?: number;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  onOpenAIAgent,
  pendingAlertsCount = 3,
}: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems: { id: AdminTab; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }[] = [
    { id: 'overview', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'candidates', label: 'Candidats', icon: Users, badge: '5' },
    { id: 'employers', label: 'Entreprises', icon: Building2, badge: '1 en attente', badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'jobs', label: 'Modération Offres', icon: Briefcase, badge: '1 suspecte', badgeColor: 'bg-red-100 text-red-700' },
    { id: 'applications', label: 'Suivi Candidatures', icon: FileCheck, badge: '1 rejet <70%' },
    { id: 'articles', label: 'Gestion Articles (Blog)', icon: BookOpen, badge: 'Blog IA', badgeColor: 'bg-rose-100 text-rose-800' },
    { id: 'ai-agents', label: 'Agents IA & Logs', icon: Bot, badge: '5 actifs', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'workflows', label: 'Workflows (n8n)', icon: Workflow },
    { id: 'analytics', label: 'Analytique Plateforme', icon: BarChart3 },
    { id: 'settings', label: 'Paramètres & Rôles', icon: Settings },
  ];

  return (
    <aside className="w-[280px] bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-3 group">
          <img src={logoIcon} alt="Lettrup" className="w-11 h-11 object-contain group-hover:scale-105 transition-transform" />
          <div>
            <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Lettrup <span className="text-indigo-400">PRO</span>
            </div>
            <div className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase">
              Panneau Administrateur
            </div>
          </div>
        </Link>
      </div>

      {/* Main Admin Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Gestion & Supervision
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin AI Oversight Card */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-800/50 p-3.5 rounded-xl text-left relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-1 text-indigo-300 font-bold text-xs">
            <Sparkles size={14} className="text-indigo-400 animate-pulse" />
            <span>Agent IA de Supervision</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-snug">
            Détection automatique d'anomalies, offres frauduleuses et échecs de workflows.
          </p>
          <button
            onClick={onOpenAIAgent}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Lancer l'Analyse IA</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* User Info / Exit */}
        <div className="pt-2 space-y-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between px-1 pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-medium text-slate-300">
                {user?.isSuperAdmin ? 'Super Admin' : 'Administrateur'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={14} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
