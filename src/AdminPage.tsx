import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import AdminHeader from './components/admin/AdminHeader';
import AdminSidebar, { AdminTab } from './components/admin/AdminSidebar';
import AdminOverview from './components/admin/AdminOverview';
import CandidatesView from './components/admin/CandidatesView';
import EmployersView from './components/admin/EmployersView';
import JobModerationView from './components/admin/JobModerationView';
import ApplicationsView from './components/admin/ApplicationsView';
import ArticlesView from './components/admin/ArticlesView';
import AIAgentsView from './components/admin/AIAgentsView';
import WorkflowsView from './components/admin/WorkflowsView';
import AnalyticsView from './components/admin/AnalyticsView';
import SettingsView from './components/admin/SettingsView';
import AdminAgentModal from './components/admin/AdminAgentModal';
import { AdminStore } from './components/admin/adminStore';
import {
  AdminAIAgent,
  AdminAILog,
  AdminWorkflow,
  AdminAuditLog,
  Article,
} from './components/admin/adminData';
import {
  AdminCandidate,
  AdminEmployer,
  AdminJob,
  AdminApplication,
  listCandidates,
  listEmployers,
  listJobsForAdmin,
  listApplicationsForAdmin,
  listBlogArticlesForAdmin,
} from './lib/adminApi';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isAIAgentOpen, setIsAIAgentOpen] = useState(false);

  // Real Supabase-backed state (candidates/employers/jobs/applications)
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [employers, setEmployers] = useState<AdminEmployer[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);

  // Still mock/localStorage-backed (out of scope for this pass — see plan)
  const [articles, setArticles] = useState<Article[]>([]);
  const [aiAgents, setAIAgents] = useState<AdminAIAgent[]>([]);
  const [aiLogs, setAILogs] = useState<AdminAILog[]>([]);
  const [workflows, setWorkflows] = useState<AdminWorkflow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const refreshAllData = async () => {
    const [candidatesData, employersData, jobsData, applicationsData, articlesData] = await Promise.all([
      listCandidates(),
      listEmployers(),
      listJobsForAdmin(),
      listApplicationsForAdmin(),
      listBlogArticlesForAdmin().catch((error) => {
        console.error('[AdminPage] Blog articles failed to load:', error);
        return AdminStore.getArticles();
      }),
    ]);
    setCandidates(candidatesData);
    setEmployers(employersData);
    setJobs(jobsData);
    setApplications(applicationsData);
    setArticles(articlesData);

    setAIAgents(AdminStore.getAIAgents());
    setAILogs(AdminStore.getAILogs());
    setWorkflows(AdminStore.getWorkflows());
    setAuditLogs(AdminStore.getAuditLogs());
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <AdminOverview
            candidates={candidates}
            employers={employers}
            jobs={jobs}
            applications={applications}
            onNavigateTab={setActiveTab}
            onOpenAIAgent={() => setIsAIAgentOpen(true)}
          />
        );
      case 'candidates':
        return <CandidatesView candidates={candidates} onRefresh={refreshAllData} />;
      case 'employers':
        return <EmployersView employers={employers} onRefresh={refreshAllData} />;
      case 'jobs':
        return <JobModerationView jobs={jobs} onRefresh={refreshAllData} />;
      case 'applications':
        return <ApplicationsView applications={applications} onRefresh={refreshAllData} />;
      case 'articles':
        return <ArticlesView articles={articles} onRefresh={refreshAllData} />;
      case 'ai-agents':
        return <AIAgentsView agents={aiAgents} logs={aiLogs} onRefresh={refreshAllData} />;
      case 'workflows':
        return <WorkflowsView workflows={workflows} onRefresh={refreshAllData} />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView auditLogs={auditLogs} onRefresh={refreshAllData} />;
      default:
        return (
          <AdminOverview
            candidates={candidates}
            employers={employers}
            jobs={jobs}
            applications={applications}
            onNavigateTab={setActiveTab}
            onOpenAIAgent={() => setIsAIAgentOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-900 antialiased">
      {/* Fixed Left Sidebar (280px) */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAIAgent={() => setIsAIAgentOpen(true)}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Top Header (64px) */}
        <AdminHeader
          onOpenAIAgent={() => setIsAIAgentOpen(true)}
          adminName={user?.name || user?.email || 'Admin'}
          adminRole={user?.isSuperAdmin ? 'Super Admin' : 'Administrateur'}
        />

        {/* Scrollable Main Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Admin Oversight Agent Modal */}
      <AdminAgentModal
        isOpen={isAIAgentOpen}
        onClose={() => setIsAIAgentOpen(false)}
        candidates={candidates}
        employers={employers}
        jobs={jobs}
        applications={applications}
        aiAgents={aiAgents}
        workflows={workflows}
        onRefreshData={refreshAllData}
      />
    </div>
  );
}
