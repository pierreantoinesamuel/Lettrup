import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Menu, Lock, ArrowRight, Home, FileText, ClipboardList, User, Bell } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { canAccessTab } from './domain/billing/PlanAccess';
import Sidebar, { DashboardTab } from './components/dashboard/Sidebar';
import PageContainer, { PageContainerVariant } from './components/dashboard/PageContainer';
import ResumeList from './components/dashboard/ResumeList';
import CoverLetterList from './components/dashboard/CoverLetterList';
import JobTracker from './components/dashboard/JobTracker';
import FindJobs from './components/dashboard/FindJobs';
import InterviewSimulator from './components/dashboard/InterviewSimulator';
import LinkedInOptimizer from './components/dashboard/LinkedInOptimizer';
import PortfolioBuilder from './components/dashboard/PortfolioBuilder';
import AtsMatchScanner from './components/dashboard/AtsMatchScanner';
import UserProfileView from './components/dashboard/UserProfileView';
import ProfileAnalysisView from './components/dashboard/ProfileAnalysisView';
import ApplicationPackView from './components/dashboard/ApplicationPackView';
import { hasPendingPack } from './lib/applicationPackApi';
import TemplatesGallery from './TemplatesGallery';
import { LearningHubView } from './features/learning-hub/presentation/LearningHubView';

// Per-tab PageContainer variant. `fluid` (no cap) is the default for
// dashboards/lists/grids — they should use almost all of MainArea's width.
// `wide` (1600px, centered) is reserved for multi-panel workspaces where
// unlimited width would make the UI awkward to scan, not for a blanket cap.
const TAB_VARIANT: Record<DashboardTab, PageContainerVariant> = {
  resumes: 'fluid',
  'cover-letters': 'wide',
  tracker: 'fluid',
  jobs: 'fluid',
  interview: 'wide',
  linkedin: 'fluid',
  portfolio: 'fluid',
  strategy: 'fluid',
  'learning-hub': 'fluid',
  'ats-scanner': 'fluid',
  'scan-history': 'fluid',
  templates: 'fluid',
  profile: 'fluid',
  'profile-analysis': 'fluid',
  'application-pack': 'wide',
};

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const activeTab = (searchParams.get('tab') as DashboardTab) || 'resumes';
  const checkoutStatus = searchParams.get('checkout');
  const exportCheckoutStatus = searchParams.get('export_checkout');

  useEffect(() => {
    const loadAvatar = () => {
      try {
        setAvatarUrl(localStorage.getItem(`cvpilot_user_avatar_${user?.id || 'default'}`));
      } catch {
        setAvatarUrl(null);
      }
    };
    loadAvatar();
    window.addEventListener('cvpilot-profile-updated', loadAvatar);
    return () => window.removeEventListener('cvpilot-profile-updated', loadAvatar);
  }, [user?.id]);

  // Back from the 1.99€ checkout started in "Objectifs & CV IA": the Stripe
  // success URL has no ?tab, so send the buyer back to the pack they paid for.
  useEffect(() => {
    if (exportCheckoutStatus && !searchParams.get('tab') && hasPendingPack()) {
      setSearchParams({ tab: 'application-pack' }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (tab: DashboardTab) => {
    setSearchParams({ tab }, { replace: true });
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleNavToTab = (e: CustomEvent<{ tab: DashboardTab }>) => {
      if (e.detail?.tab) {
        handleTabChange(e.detail.tab);
      }
    };
    const handleNavCoverLetter = () => {
      handleTabChange('cover-letters');
    };
    const handleNavTracker = () => {
      handleTabChange('tracker');
    };

    window.addEventListener('nav-to-tab' as any, handleNavToTab);
    window.addEventListener('nav-to-cover-letter' as any, handleNavCoverLetter);
    window.addEventListener('nav-to-tracker' as any, handleNavTracker);

    return () => {
      window.removeEventListener('nav-to-tab' as any, handleNavToTab);
      window.removeEventListener('nav-to-cover-letter' as any, handleNavCoverLetter);
      window.removeEventListener('nav-to-tracker' as any, handleNavTracker);
    };
  }, []);

  useEffect(() => {
    if (!checkoutStatus && !exportCheckoutStatus) return;
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      next.delete('export_checkout');
      setSearchParams(next, { replace: true });
    }, 6000);
    return () => clearTimeout(timeout);
  }, [checkoutStatus, exportCheckoutStatus]);

  useEffect(() => {
    if (checkoutStatus !== 'success') return;
    refreshUser();
    const retry = setTimeout(() => refreshUser(), 3000);
    return () => clearTimeout(retry);
  }, [checkoutStatus]);

  const TAB_LABELS: Record<DashboardTab, string> = {
    'resumes': 'Mes CV',
    'cover-letters': 'Lettre de Motivation',
    'tracker': 'Candidatures',
    'jobs': 'Trouver un Emploi',
    'interview': 'Simulateur Entretien',
    'linkedin': 'Scan LinkedIn',
    'portfolio': 'Site Personnel',
    'strategy': 'Stratégie Carrière',
    'learning-hub': 'Centre de connaissances',
    'ats-scanner': 'Analyse IA',
    'scan-history': 'Historique des Scans',
    'templates': 'Modèles de CV',
    'profile': 'Mon profil',
    'profile-analysis': 'Analyse de CV',
    'application-pack': 'Objectifs & CV IA',
  };

  const renderActiveView = () => {
    if (!canAccessTab(user?.plan, activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-24 px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#bcefe4]/50 border border-[#9bdccc] flex items-center justify-center mb-5">
            <Lock size={24} className="text-[#007568]" />
          </div>
          <h2 className="text-xl font-bold text-[#102d3e] mb-2">
            {TAB_LABELS[activeTab] || 'Cette fonctionnalité'} nécessite une formule payante
          </h2>
          <p className="text-sm text-[#456071] max-w-md mb-6">
            Passez à une formule supérieure pour débloquer cet outil et le reste de la suite Lettrup.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/pricing?feature=${encodeURIComponent(activeTab)}`)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white bg-[#007568] hover:bg-[#006257] shadow-lg shadow-[#007568]/20 transition-all active:scale-95"
          >
            <span>Voir les formules</span>
            <ArrowRight size={16} />
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'resumes':
        return <ResumeList />;
      case 'cover-letters':
        return <CoverLetterList />;
      case 'tracker':
        return <JobTracker />;
      case 'jobs':
        return <FindJobs onNavigateToTab={handleTabChange} />;
      case 'interview':
        return <InterviewSimulator />;
      case 'linkedin':
        return <LinkedInOptimizer />;
      case 'portfolio':
        return <PortfolioBuilder />;
      case 'strategy':
      case 'learning-hub':
        return <LearningHubView />;
      case 'ats-scanner':
        return <AtsMatchScanner initialSubTab="scan" />;
      case 'scan-history':
        return <AtsMatchScanner initialSubTab="history" />;
      case 'templates':
        return <TemplatesGallery inDashboard />;
      case 'profile':
        return <UserProfileView />;
      case 'profile-analysis':
        return <ProfileAnalysisView />;
      case 'application-pack':
        return <ApplicationPackView />;
      default:
        return <ResumeList />;
    }
  };

  const userName = user?.name || 'Thomas Martin';
  const userInitial = userName.charAt(0).toUpperCase() || 'T';

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f3f7fa] font-sans text-[#102d3e]">
      {/* Mobile Top Header Bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-16 bg-white text-[#102d3e] border-b border-[#dce7ed] px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-[#edf3f6] text-[#007568] hover:bg-[#dce8ee] transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#007568] text-white font-black text-sm flex items-center justify-center">
              C
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">Lettrup</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#d2f3eb] text-[#063e3a] border border-[#a5e0d2]">
            {TAB_LABELS[activeTab] || 'Dashboard'}
          </span>
          <button
            type="button"
            onClick={() => handleTabChange('ats-scanner')}
            className="p-1.5 rounded-full text-[#456071] hover:text-[#102d3e] hover:bg-[#edf3f6] transition-colors"
            title="Analyses IA"
          >
            <Bell size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('profile')}
            className="w-8 h-8 rounded-full bg-[#062b3b] text-white font-bold text-xs flex items-center justify-center overflow-hidden border border-[#dce7ed] shrink-0"
            title="Mon profil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              userInitial
            )}
          </button>
        </div>
      </header>

      {/* Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpenOnMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className={`h-screen overflow-y-auto overflow-x-hidden pt-16 pb-20 md:pb-0 md:pt-0 md:ml-64 min-w-0 ${activeTab === 'tracker' ? 'py-2 sm:py-3 lg:py-4 flex flex-col' : 'py-4 sm:py-6 lg:py-8'}`}>
        {checkoutStatus === 'success' && (
          <PageContainer variant="fluid">
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Abonnement activé avec succès ! Votre nouvelle formule est déjà disponible.
            </div>
          </PageContainer>
        )}
        {exportCheckoutStatus === 'success' && (
          <PageContainer variant="fluid">
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Paiement confirmé 🎉 Votre téléchargement est prêt — retournez sur votre document et cliquez à nouveau sur télécharger.
            </div>
          </PageContainer>
        )}
        {exportCheckoutStatus === 'cancelled' && (
          <PageContainer variant="fluid">
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              Paiement annulé. Votre document est toujours sauvegardé.
            </div>
          </PageContainer>
        )}
        <PageContainer
          variant={TAB_VARIANT[activeTab] || 'fluid'}
          className={activeTab === 'tracker' ? 'flex-1 min-h-0 flex flex-col' : ''}
        >
          {renderActiveView()}
        </PageContainer>
      </main>

      {/* Mobile Bottom Navigation Bar (11. Vue mobile) */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white border-t border-[#dce7ed] px-2 flex items-center justify-around shadow-[0_-2px_10px_rgba(16,45,62,0.06)]"
      >
        <button
          type="button"
          onClick={() => handleTabChange('resumes')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
            activeTab === 'resumes' ? 'text-[#007568]' : 'text-[#456071] hover:text-[#102d3e]'
          }`}
        >
          <Home size={19} strokeWidth={activeTab === 'resumes' ? 2.4 : 2} />
          <span>Accueil</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/builder')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
            activeTab === 'templates' ? 'text-[#007568]' : 'text-[#456071] hover:text-[#102d3e]'
          }`}
        >
          <FileText size={19} strokeWidth={activeTab === 'templates' ? 2.4 : 2} />
          <span>CV</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('tracker')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
            activeTab === 'tracker' ? 'text-[#007568]' : 'text-[#456071] hover:text-[#102d3e]'
          }`}
        >
          <ClipboardList size={19} strokeWidth={activeTab === 'tracker' ? 2.4 : 2} />
          <span>Candidatures</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('profile')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
            activeTab === 'profile' ? 'text-[#007568]' : 'text-[#456071] hover:text-[#102d3e]'
          }`}
        >
          <User size={19} strokeWidth={activeTab === 'profile' ? 2.4 : 2} />
          <span>Profil</span>
        </button>
      </nav>
    </div>
  );
}
