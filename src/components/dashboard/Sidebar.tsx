import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ClipboardList, FileText, Edit3, Globe, Compass, ScanSearch,
  MessageSquare, Clock, Target, GraduationCap, LayoutTemplate,
  Settings, LogOut, Menu, Lock, User, CreditCard, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserSettingsModal from './UserSettingsModal';
import { canAccessTab } from '../../domain/billing/PlanAccess';
import logoIcon from '../../assets/logo-icon-light.png';

export type DashboardTab = 
  | 'resumes' 
  | 'cover-letters' 
  | 'tracker' 
  | 'jobs'
  | 'interview' 
  | 'linkedin' 
  | 'portfolio' 
  | 'strategy' 
  | 'learning-hub'
  | 'ats-scanner'
  | 'scan-history'
  | 'templates'
  | 'profile-analysis'
  | 'application-pack'
  | 'profile';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  key: string;
  tabId: DashboardTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar({ activeTab, setActiveTab, isOpenOnMobile, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = () => {
      try {
        const stored = localStorage.getItem(`cvpilot_user_avatar_${user?.id || 'default'}`);
        setAvatarUrl(stored);
      } catch {
        setAvatarUrl(null);
      }
    };
    loadAvatar();
    window.addEventListener('cvpilot-profile-updated', loadAvatar);
    return () => window.removeEventListener('cvpilot-profile-updated', loadAvatar);
  }, [user?.id]);

  const navSections: NavSection[] = [
    {
      title: 'Emploi',
      items: [
        { key: 'trouver-emploi', tabId: 'jobs', label: 'Trouver un Emploi', icon: Search },
        { key: 'objectifs-cv-ia', tabId: 'application-pack', label: 'Objectifs & CV IA', icon: Sparkles },
      ]
    },
    {
      title: 'Mon espace',
      items: [
        { key: 'createur-cv', tabId: 'resumes', label: 'Mes CV', icon: FileText },
        { key: 'galerie-modeles', tabId: 'templates', label: 'Modèles de CV', icon: LayoutTemplate, badge: '40+' },
        { key: 'suivi-candidatures', tabId: 'tracker', label: 'Candidatures', icon: ClipboardList },
        { key: 'lettre-motivation', tabId: 'cover-letters', label: 'Lettres de motivation', icon: Edit3 },
        { key: 'job-match', tabId: 'ats-scanner', label: 'Analyses IA', icon: Target },
        { key: 'analyse-cv', tabId: 'profile-analysis', label: 'Analyse de CV', icon: ScanSearch },
      ]
    },
    {
      title: 'Outils avancés',
      items: [
        { key: 'simulateur-entretien', tabId: 'interview', label: 'Simulateur Entretien', icon: MessageSquare },
        { key: 'historique-scans', tabId: 'scan-history', label: 'Historique Scans', icon: Clock },
        { key: 'learning-hub', tabId: 'learning-hub', label: 'Centre de connaissances', icon: GraduationCap },
        { key: 'site-personnel', tabId: 'portfolio', label: 'Site Personnel', icon: Globe },
      ]
    }
  ];

  const userName = user?.name || 'Thomas Martin';
  const initialLetter = userName.charAt(0).toUpperCase() || 'T';

  const handleItemClick = (item: NavItem) => {
    if (!canAccessTab(user?.plan, item.tabId)) {
      navigate('/pricing');
      onCloseMobile?.();
      return;
    }
    setActiveTab(item.tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <aside className="w-64 bg-[#062b3b] text-white/80 border-r border-white/[0.07] flex flex-col h-full select-none shrink-0 font-sans">
      {/* Top App Branding */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logoIcon} alt="Lettrup" className="w-11 h-11 object-contain" />
          <span className="text-lg font-extrabold tracking-tight text-white">Lettrup</span>
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Fermer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Nav Items Categorized */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <div className="text-[11px] font-semibold text-white/35 px-3 mb-1.5">
              {section.title}
            </div>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tabId;
                const isLocked = !canAccessTab(user?.plan, item.tabId);

                return (
                  <button
                    key={item.key}
                    onClick={() => handleItemClick(item)}
                    title={isLocked ? 'Fonctionnalité réservée aux formules payantes' : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#007568] text-white ring-1 ring-inset ring-[#00a88f]/60 shadow-sm shadow-black/10'
                        : isLocked
                        ? 'text-white/35 hover:text-white/60 hover:bg-white/5'
                        : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={17} className={isActive ? 'text-white shrink-0' : isLocked ? 'text-white/30 shrink-0' : 'text-white/45 shrink-0'} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {isLocked ? (
                      <Lock size={12} className="text-white/30 shrink-0" />
                    ) : item.badge && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom User Area */}
      <div className="bg-black/15 border-t border-white/10 p-3 space-y-2">
        {/* Profile Card — Clicking opens Mon profil */}
        <div
          onClick={() => {
            setActiveTab('profile');
            onCloseMobile?.();
          }}
          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
            activeTab === 'profile'
              ? 'bg-[#007568]/30 border-[#00a88f]/50'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                initialLetter
              )}
            </div>
            <div className="flex-1 truncate">
              <h4 className="text-xs font-bold text-white truncate">{userName}</h4>
              <p className="text-[10px] font-semibold text-white/50">
                Mon profil
              </p>
            </div>
          </div>

          {/* Gear Icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSettingsOpen(true);
            }}
            title="Paramètres"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Bottom Menu / Logout Row */}
        <div className="flex items-center justify-between px-2 pt-1 text-white/40">
          <Link
            to="/pricing"
            onClick={onCloseMobile}
            className="p-1.5 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium"
            title="Abonnement et tarifs"
          >
            <CreditCard size={14} />
            <span>Tarifs</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:text-white transition-colors"
            title="Paramètres avancés"
          >
            <Menu size={16} />
          </button>

          <Link
            to="/"
            onClick={() => {
              onCloseMobile?.();
              logout();
            }}
            className="p-1.5 hover:text-red-400 transition-colors flex items-center gap-1 text-xs font-medium"
            title="Déconnexion"
          >
            <LogOut size={14} />
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-30 w-64">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpenOnMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Sidebar */}
          <div className="relative z-10 w-72 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
