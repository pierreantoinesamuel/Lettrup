import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Building2,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function AnalyticsView() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'ytd'>('30d');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const userGrowthData = [
    { month: 'Jan', candidates: 120, employers: 15 },
    { month: 'Fév', candidates: 240, employers: 28 },
    { month: 'Mar', candidates: 450, employers: 42 },
    { month: 'Avr', candidates: 680, employers: 65 },
    { month: 'Mai', candidates: 920, employers: 88 },
    { month: 'Juin', candidates: 1250, employers: 110 },
    { month: 'Juil', candidates: 1580, employers: 142 },
  ];

  const industryData = [
    { industry: 'IA & Tech Cloud', count: 480 },
    { industry: 'Finance & Banking', count: 320 },
    { industry: 'CleanTech & Mobilité', count: 190 },
    { industry: 'Santé & Biotech', count: 140 },
    { industry: 'E-commerce & SaaS', count: 260 },
  ];

  const funnelData = [
    { step: '1. Vues Offres', count: 12400 },
    { step: '2. Candidatures', count: 2850 },
    { step: '3. Match Score >= 70%', count: 1980 },
    { step: '4. Shortlist Recruteur', count: 850 },
    { step: '5. Entretiens Vocal IA', count: 420 },
    { step: '6. Embauches', count: 185 },
  ];

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Mois,Candidats,Recruteurs\n' +
      userGrowthData.map((e) => `${e.month},${e.candidates},${e.employers}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cvpilot_analytics_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Rapport d\'analyse exporté au format CSV.');
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
            Analytique & Performances Plateforme <BarChart3 className="text-indigo-600" size={24} />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Métriques d'acquisition, taux de conversion du funnel et répartition par secteur d'activité.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { key: '7d', label: '7 jours' },
                { key: '30d', label: '30 jours' },
                { key: 'ytd', label: 'Année 2026' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => setDateRange(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  dateRange === item.key ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all"
          >
            <Download size={14} /> Exporter Rapport
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Taux de Croissance Utilisateurs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">+28.5%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> vs mois précédent
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Score de Match Moyen IA</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">78.4%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Écart-type: ±8.2%</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Conversion Funnel Embauches</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">6.5%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">185 embauches confirmées</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Temps Moyen de Recrutement</div>
          <div className="text-2xl font-black text-slate-900 mt-1">14 jours</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">-4 jours grâce aux agents IA</div>
        </div>
      </div>

      {/* User Growth AreaChart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Croissance Cumulée des Utilisateurs</h3>
            <p className="text-xs text-slate-500">Acquisition candidats vs entreprises inscrites</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="candidates" stroke="#6366F1" fill="#EEF2FF" strokeWidth={3} />
              <Area type="monotone" dataKey="employers" stroke="#10B981" fill="#D1FAE5" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel & Industry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Entonnoir de Conversion (Funnel)</h3>
          <p className="text-xs text-slate-500 mb-4">Du premier affichage jusqu'à l'embauche</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="step" type="category" width={140} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Industry Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Candidatures par Secteur d'Activité</h3>
          <p className="text-xs text-slate-500 mb-4">Volume total d'offres et d'interactions</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={industryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="industry" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
