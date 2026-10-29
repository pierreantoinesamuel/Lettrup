import React from 'react';
import {
  Users,
  Building2,
  Briefcase,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { AdminCandidate, AdminEmployer, AdminJob, AdminApplication } from '../../lib/adminApi';

interface AdminOverviewProps {
  candidates: AdminCandidate[];
  employers: AdminEmployer[];
  jobs: AdminJob[];
  applications: AdminApplication[];
  onNavigateTab: (tab: any) => void;
  onOpenAIAgent: () => void;
}

export default function AdminOverview({
  candidates,
  employers,
  jobs,
  applications,
  onNavigateTab,
  onOpenAIAgent,
}: AdminOverviewProps) {
  // Stats Calculations
  const totalCandidates = candidates.length;
  const totalEmployers = employers.length;
  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const pendingJobs = jobs.filter((j) => j.status === 'pending_review').length;
  const flaggedJobs = jobs.filter((j) => j.flagStatus === 'spam' || j.flagStatus === 'suspicious').length;
  const pendingEmployers = employers.filter((e) => e.verificationStatus === 'pending').length;
  const totalApps = applications.length;
  const pendingApps = applications.filter((a) => a.status === 'pending' || a.status === 'under_review').length;

  // Chart Data: Match Score Distribution
  const matchScoreData = [
    { range: '0 - 49% (Rejet)', count: applications.filter((a) => a.matchScore < 50).length },
    { range: '50 - 69% (Faible)', count: applications.filter((a) => a.matchScore >= 50 && a.matchScore < 70).length },
    { range: '70 - 84% (Bon)', count: applications.filter((a) => a.matchScore >= 70 && a.matchScore < 85).length },
    { range: '85 - 100% (Excellent)', count: applications.filter((a) => a.matchScore >= 85).length },
  ];

  // Still hardcoded mock data — no real analytics pipeline yet (out of scope
  // for this pass, see the core-recruiting-loop migration plan's Analytics note).
  const dailyTrendData = [
    { day: 'Lun', dau: 320, apps: 45 },
    { day: 'Mar', dau: 410, apps: 62 },
    { day: 'Mer', dau: 550, apps: 88 },
    { day: 'Jeu', dau: 620, apps: 95 },
    { day: 'Ven', dau: 580, apps: 72 },
    { day: 'Sam', dau: 290, apps: 30 },
    { day: 'Dim', dau: 340, apps: 40 },
  ];

  // Still hardcoded mock data (same scope note as dailyTrendData above).
  const recentActivities = [
    { id: '1', title: 'Nouvelle candidature déposée', detail: 'Sophie Martin pour Senior PM AI', time: 'Il y a 5 min', type: 'app' },
    { id: '2', title: 'Agent IA de filtrage exécuté', detail: 'Match score 92% calculé pour app-901', time: 'Il y a 10 min', type: 'ai' },
    { id: '3', title: 'Offre suspecte modérée', detail: 'Crypto Wealth Scam Ltd passée en suspendue', time: 'Il y a 25 min', type: 'alert' },
    { id: '4', title: 'Nouvelle entreprise inscrite', detail: 'GreenMobility SAS en attente de vérification', time: 'Il y a 1h', type: 'emp' },
    { id: '5', title: 'Workflow n8n relancé', detail: 'ai_health_cron exécuté avec succès', time: 'Il y a 2h', type: 'system' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Tableau de Bord Administrateur <Sparkles className="text-indigo-600" size={24} />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervision globale de la plateforme Lettrup : candidats, recuteurs, offres et agents IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('employers')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-all"
          >
            <Building2 size={14} />
            Vérifications ({pendingEmployers})
          </button>

          <button
            onClick={() => onNavigateTab('jobs')}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-all"
          >
            <ShieldAlert size={14} className="text-amber-600" />
            Modération Offres ({flaggedJobs + pendingJobs})
          </button>

          <button
            onClick={onOpenAIAgent}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Bot size={15} />
            IA Oversight Check
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Candidates Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidats</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalCandidates}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp size={12} />
              <span>+12.4% cette semaine</span>
            </div>
          </div>
        </div>

        {/* Employers Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entreprises</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalEmployers}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-600">
              <span>{pendingEmployers} vérification(s) en attente</span>
            </div>
          </div>
        </div>

        {/* Active Jobs Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Offres Actives</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{activeJobs}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-red-600">
              <AlertTriangle size={12} />
              <span>{flaggedJobs} offre(s) suspecte(s)</span>
            </div>
          </div>
        </div>

        {/* Total Applications Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidatures</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck size={20} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalApps}</div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-500">
              <span>{pendingApps} en cours d'évaluation IA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Score Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribution des Scores de Match IA</h3>
              <p className="text-xs text-slate-500">Résultats du scanner ATS sur l'ensemble des candidatures</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              Seuil auto-rejet : 70%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchScoreData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Active Users & Applications LineChart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Utilisateurs Actifs & Candidatures</h3>
              <p className="text-xs text-slate-500">Activité quotidienne sur les 7 derniers jours</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-indigo-600"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-full" /> DAU</span>
              <span className="flex items-center gap-1 text-emerald-600"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Apps</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="dau" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="apps" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alerts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Panneau d'Alertes <AlertTriangle size={16} className="text-amber-500" />
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              Action Recommandée
            </span>
          </div>

          <div className="space-y-3">
            {pendingEmployers > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-start gap-3">
                <Building2 size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-amber-900">Entreprise(s) en attente de validation</div>
                  <p className="text-amber-700 text-[11px] mt-0.5">{pendingEmployers} entreprise(s) en attente de vérification.</p>
                  <button
                    onClick={() => onNavigateTab('employers')}
                    className="mt-2 text-[11px] font-bold text-amber-900 hover:underline flex items-center gap-1"
                  >
                    Examiner l'entreprise <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {flaggedJobs > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs flex items-start gap-3">
                <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-red-900">Offre(s) d'emploi suspecte(s) / Spam</div>
                  <p className="text-red-700 text-[11px] mt-0.5">{flaggedJobs} offre(s) signalée(s) nécessitent une revue.</p>
                  <button
                    onClick={() => onNavigateTab('jobs')}
                    className="mt-2 text-[11px] font-bold text-red-900 hover:underline flex items-center gap-1"
                  >
                    Gérer la modération <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs flex items-start gap-3">
              <Bot size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-indigo-900">Monitoring Agents IA</div>
                <p className="text-indigo-700 text-[11px] mt-0.5">5 agents opérationnels. Taux de succès global : 99.4%.</p>
                <button
                  onClick={() => onNavigateTab('ai-agents')}
                  className="mt-2 text-[11px] font-bold text-indigo-900 hover:underline flex items-center gap-1"
                >
                  Inspecter les logs IA <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Activité Récente de la Plateforme <Clock size={16} className="text-slate-400" />
            </h3>
            <span className="text-xs font-semibold text-slate-500">Temps Réel</span>
          </div>

          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {act.type === 'app' && <FileCheck size={16} className="text-indigo-600" />}
                  {act.type === 'ai' && <Bot size={16} className="text-emerald-600" />}
                  {act.type === 'alert' && <ShieldAlert size={16} className="text-red-500" />}
                  {act.type === 'emp' && <Building2 size={16} className="text-amber-500" />}
                  {act.type === 'system' && <CheckCircle2 size={16} className="text-blue-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{act.title}</h4>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap ml-2">{act.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
