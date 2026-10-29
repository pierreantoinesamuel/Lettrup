import React, { useState, useEffect } from 'react';
import { JobApplication, JobStatus } from '../../types';
import { toast } from 'react-toastify';
import { translations, Language } from '../../utils/translations';
import {
  Plus,
  X,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  ArrowRight,
  Trash2,
  Loader2,
  RefreshCw,
  Briefcase,
  AlertCircle,
  FileText,
  Search,
  Send,
} from 'lucide-react';
import { OutreachModal } from './OutreachModal';
import { Input, Textarea, Button } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeJobStatus } from '../../utils/jobStatus';
import {
  getUserJobApplications,
  saveJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getUserApplicationStats,
} from '../../services/jobTracker';
import { logUserActivity } from '../../services/analytics';

interface ManualJobFormData {
  title: string;
  company: string;
  url: string;
  location: string;
  salary: string;
  notes: string;
  column: JobStatus;
}

const MANUAL_COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: 'Saved', label: 'Sauvegardé', color: '#6B7280' },
  { id: 'Applied', label: 'Postulé', color: '#5ca88e' },
  { id: 'Interview', label: 'Entretien', color: '#a98fc9' },
  { id: 'Offer', label: 'Offre', color: '#3B82F6' },
  { id: 'Rejected', label: 'Refusé', color: '#c97575' },
];

const emptyManualForm: ManualJobFormData = {
  title: '',
  company: '',
  url: '',
  location: '',
  salary: '',
  notes: '',
  column: 'Saved',
};

function AddJobModal({
  onClose,
  onSave,
  defaultColumn = 'Saved',
}: {
  onClose: () => void;
  onSave: (data: ManualJobFormData) => void;
  defaultColumn?: JobStatus;
}) {
  const [form, setForm] = useState<ManualJobFormData>({ ...emptyManualForm, column: defaultColumn });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Requis';
    if (!form.company.trim()) e.company = 'Requis';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        }}
      >
        <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <div className="text-lg font-bold text-slate-900">Ajouter un poste</div>
            <div className="text-sm text-slate-400 mt-0.5">Renseignez les informations de l'offre</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <Input
            label="Intitulé du poste"
            placeholder="ex: Développeur React Senior"
            required
            value={form.title}
            error={errors.title}
            onChange={(e) => {
              setForm((f) => ({ ...f, title: e.target.value }));
              setErrors((er) => ({ ...er, title: '' }));
            }}
          />
          <div style={{ marginBottom: 12 }} />
          <Input
            label="Entreprise"
            placeholder="ex: Google, Airbnb..."
            required
            value={form.company}
            error={errors.company}
            onChange={(e) => {
              setForm((f) => ({ ...f, company: e.target.value }));
              setErrors((er) => ({ ...er, company: '' }));
            }}
          />
          <div style={{ marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Input
                label="Localisation"
                placeholder="ex: Paris, Remote"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <Input
                label="Salaire proposé"
                placeholder="ex: 55K€ - 65K€"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }} />
          <Input
            label="Lien vers l'offre"
            type="url"
            placeholder="https://..."
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Statut initial
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MANUAL_COLUMNS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setForm((f) => ({ ...f, column: c.id }))}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `2px solid ${form.column === c.id ? c.color : '#E5E7EB'}`,
                    background: form.column === c.id ? c.color + '15' : '#fff',
                    color: form.column === c.id ? c.color : '#6B7280',
                    fontSize: 13,
                    fontWeight: form.column === c.id ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Notes"
            placeholder="Ajoutez des notes sur ce poste, le contact, etc."
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div style={{ padding: '16px 28px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f3f4f6' }}>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Sauvegarder le poste ✓
          </Button>
        </div>
      </div>
    </div>
  );
}

interface JobTrackerProps {
  applications?: JobApplication[];
  setApplications?: React.Dispatch<React.SetStateAction<JobApplication[]>>;
  lang?: Language;
}

export const JobTracker: React.FC<JobTrackerProps> = ({
  applications: initialApplications,
  setApplications: setInitialApplications,
  lang = 'fr',
}) => {
  const { user } = useAuth();
  const t = translations[lang].tracker;

  const [applications, setApplications] = useState<JobApplication[]>(initialApplications || []);
  const [isLoading, setIsLoading] = useState(!initialApplications?.length);
  const [error, setError] = useState<string | null>(null);
  const [, setStats] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [confirmApplyId, setConfirmApplyId] = useState<string | null>(null);
  const [outreachModalData, setOutreachModalData] = useState<{
    isOpen: boolean;
    company: string;
    role: string;
  }>({ isOpen: false, company: '', role: '' });

  useEffect(() => {
    if (initialApplications) {
      setApplications(initialApplications);
      if (user?.id) {
        getUserApplicationStats(user.id).then(setStats).catch(console.error);
      }
    }
  }, [initialApplications, user?.id]);

  useEffect(() => {
    loadApplications();
  }, [user?.id]);

  const loadApplications = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [dbApplications, appStats] = await Promise.all([
        getUserJobApplications(user.id),
        getUserApplicationStats(user.id),
      ]);

      const convertedApps: JobApplication[] = dbApplications.map((app) => ({
        id: app.id,
        company: app.company,
        role: app.role,
        location: app.location,
        salary: app.salary,
        status: normalizeJobStatus(app.status, 'Saved'),
        dateAdded: app.date_added,
        url: app.url,
        logo: app.logo,
        notes: app.notes,
        is_internal: app.is_internal,
        job_id: app.job_id,
      }));

      setApplications(convertedApps);
      if (setInitialApplications) setInitialApplications(convertedApps);
      setStats(appStats);
    } catch (e) {
      console.error('Error loading applications:', e);
      setError('Failed to load job applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const COLUMNS: { id: JobStatus; title: string; color: string; sub: string; statBg: string; statText: string }[] = [
    {
      id: 'Saved',
      title: t.columns.saved,
      color: '',
      sub: t.subSaved,
      statBg: 'bg-tertiary/5',
      statText: 'text-tertiary',
    },
    {
      id: 'Applied',
      title: t.columns.applied,
      color: '',
      sub: t.subApplied,
      statBg: 'bg-tertiary/5',
      statText: 'text-tertiary',
    },
    {
      id: 'Interview',
      title: t.columns.interview,
      color: '',
      sub: t.subInterview,
      statBg: 'bg-tertiary/5',
      statText: 'text-tertiary',
    },
    {
      id: 'Offer',
      title: t.columns.offer,
      color: '',
      sub: t.subOffer,
      statBg: 'bg-primary-container/60',
      statText: 'text-[#007568]',
    },
    {
      id: 'Rejected',
      title: t.columns.rejected,
      color: '',
      sub: t.subRejected || (lang === 'fr' ? 'Candidatures non retenues' : 'Applications declined'),
      statBg: 'bg-[var(--status-red)]/10',
      statText: 'text-[var(--status-red)]',
    },
  ];

  const handleAddJob = async (formData: ManualJobFormData) => {
    if (!formData.company.trim() || !user?.id) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticJob: JobApplication = {
      id: tempId,
      company: formData.company,
      role: formData.title || 'Role TBD',
      status: formData.column,
      location: formData.location || undefined,
      salary: formData.salary || undefined,
      url: formData.url || undefined,
      notes: formData.notes || undefined,
      dateAdded: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    setApplications((prev) => [optimisticJob, ...prev]);
    if (setInitialApplications) setInitialApplications((prev) => [optimisticJob, ...prev]);
    const previousApplications = [...applications];

    try {
      const savedJob = await saveJobApplication(user.id, {
        company: formData.company,
        role: formData.title || 'Role TBD',
        status: formData.column,
        location: formData.location || undefined,
        salary: formData.salary || undefined,
        url: formData.url || undefined,
        notes: formData.notes || undefined,
        source: 'Manual',
      });

      const jobApp: JobApplication = {
        id: savedJob.id,
        company: savedJob.company,
        role: savedJob.role,
        location: savedJob.location,
        salary: savedJob.salary,
        status: normalizeJobStatus(savedJob.status, formData.column),
        dateAdded: savedJob.date_added,
        url: savedJob.url,
        logo: savedJob.logo,
        notes: savedJob.notes,
        is_internal: savedJob.is_internal,
        job_id: savedJob.job_id,
      };

      const replaceAndDedupe = (list: JobApplication[]) => {
        const replaced = list.map((app) => (app.id === tempId ? jobApp : app));
        const seen = new Set<string>();
        return replaced.filter((app) => {
          if (seen.has(app.id)) return false;
          seen.add(app.id);
          return true;
        });
      };
      setApplications((prev) => replaceAndDedupe(prev));
      if (setInitialApplications) setInitialApplications((prev) => replaceAndDedupe(prev));
      setShowAddForm(false);
      setError(null);

      await logUserActivity(user.id, 'job_added', { company: formData.company });

      const appStats = await getUserApplicationStats(user.id);
      setStats(appStats);
    } catch (e: any) {
      setApplications(previousApplications);
      if (setInitialApplications) setInitialApplications(previousApplications);
      console.error('Error adding job:', e);
      if (e.message === 'This job is already in your tracker.') {
        toast.info(lang === 'fr' ? 'Ce poste est déjà dans votre suivi.' : e.message);
      } else {
        toast.error(lang === 'fr' ? "Échec de l'ajout du poste." : 'Failed to add job. Please try again.');
      }
    }
  };

  const moveJob = async (id: string, currentStatus: JobStatus, targetStatus?: JobStatus) => {
    if (!user?.id) return;

    if (pendingUpdates.has(id)) {
      console.warn('[JobTracker] Update already in progress for job', id);
      return;
    }

    const statusOrder: JobStatus[] = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
    const currentIndex = statusOrder.indexOf(currentStatus);

    let nextStatus: JobStatus;
    if (targetStatus) {
      nextStatus = targetStatus;
    } else if (currentIndex < statusOrder.length - 2) {
      nextStatus = statusOrder[currentIndex + 1];
    } else {
      return;
    }

    const updatePayload: any = { status: nextStatus };
    if (nextStatus === 'Applied') {
      updatePayload.applied_date = new Date().toISOString().split('T')[0];
    }

    setPendingUpdates((prev) => new Set([...prev, id]));
    const previousApplications = [...applications];

    setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status: nextStatus } : app)));
    if (setInitialApplications) setInitialApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status: nextStatus } : app)));

    try {
      await updateJobApplication(id, user.id, updatePayload);

      await logUserActivity(user.id, 'job_status_updated', {
        jobId: id,
        fromStatus: currentStatus,
        toStatus: nextStatus,
      });

      const appStats = await getUserApplicationStats(user.id);
      setStats(appStats);
    } catch (e) {
      setApplications(previousApplications);
      if (setInitialApplications) setInitialApplications(previousApplications);
      console.error('Error updating job status:', e);
      toast.error(lang === 'fr' ? 'Échec de la mise à jour du statut.' : 'Failed to update job status. Please try again.');
    } finally {
      setPendingUpdates((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce poste ?')) return;
    if (!user?.id) return;

    const previousApplications = [...applications];

    setApplications((prev) => prev.filter((app) => app.id !== id));
    if (setInitialApplications) setInitialApplications((prev) => prev.filter((app) => app.id !== id));

    try {
      const success = await deleteJobApplication(id, user.id);

      if (success) {
        await logUserActivity(user.id, 'job_deleted', { jobId: id });
        const appStats = await getUserApplicationStats(user.id);
        setStats(appStats);
      } else {
        setApplications(previousApplications);
        if (setInitialApplications) setInitialApplications(previousApplications);
      }
    } catch (e) {
      setApplications(previousApplications);
      if (setInitialApplications) setInitialApplications(previousApplications);
      console.error('Error deleting job:', e);
      toast.error(lang === 'fr' ? 'Échec de la suppression.' : 'Failed to delete job. Please try again.');
    }
  };

  const handleApplyClick = (id: string) => {
    setConfirmApplyId(id);
  };

  const confirmApplication = async (didApply: boolean) => {
    if (confirmApplyId && didApply && user?.id) {
      const previousApplications = [...applications];

      setApplications((prev) =>
        prev.map((app) => (app.id === confirmApplyId ? { ...app, status: 'Applied', url: undefined } : app))
      );
      if (setInitialApplications) {
        setInitialApplications((prev) =>
          prev.map((app) => (app.id === confirmApplyId ? { ...app, status: 'Applied', url: undefined } : app))
        );
      }

      try {
        await updateJobApplication(confirmApplyId, user.id, {
          status: 'Applied',
          url: undefined,
        });

        await logUserActivity(user.id, 'job_applied', { jobId: confirmApplyId });
        const appStats = await getUserApplicationStats(user.id);
        setStats(appStats);
      } catch (e) {
        setApplications(previousApplications);
        if (setInitialApplications) setInitialApplications(previousApplications);
        console.error('Error updating job:', e);
        toast.error(lang === 'fr' ? 'Échec de la mise à jour.' : 'Failed to update job status. Please try again.');
      }
    }
    setConfirmApplyId(null);
  };

  const getConfirmingJobName = () => {
    return applications.find((a) => a.id === confirmApplyId)?.company || 'ce poste';
  };

  const filteredApplications = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.company.toLowerCase().includes(q) ||
      app.role.toLowerCase().includes(q) ||
      (app.location && app.location.toLowerCase().includes(q))
    );
  });

  const derivedStats = {
    total_count: applications.length,
    saved_count: applications.filter((a) => a.status === 'Saved').length,
    applied_count: applications.filter((a) => a.status === 'Applied').length,
    interview_count: applications.filter((a) => a.status === 'Interview').length,
    offer_count: applications.filter((a) => a.status === 'Offer').length,
    rejected_count: applications.filter((a) => a.status === 'Rejected').length,
  };

  if (isLoading) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center p-12">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
          <span>Chargement du suivi des candidatures...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 overflow-hidden relative rounded-lg w-full max-w-full">
      {/* Sleek, compact Header banner */}
      <div className="bg-tertiary text-white px-6 py-4 rounded-lg mb-4 shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-accent text-tertiary flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Suivi des candidatures
              </h1>
              <span className="px-2.5 py-0.5 bg-white/10 text-accent text-xs font-black rounded-md">
                {derivedStats.total_count} {t.stats.total}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/70 hidden sm:block">
              Gérez l'ensemble de votre processus de recrutement et l'état de vos opportunités en un coup d'œil.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto relative z-10">
          <div className="relative flex-1 sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher entreprise..."
              className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/15 rounded-lg text-sm font-medium text-white placeholder-white/55 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors"
            />
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-accent hover:bg-white text-tertiary px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>Ajouter Candidature</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-[var(--status-red)]/10 border border-[var(--status-red)]/30 rounded-xl flex items-center gap-3 text-[var(--status-red)] text-xs shrink-0">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={loadApplications} className="ml-auto text-xs font-bold underline hover:no-underline">
            Réessayer
          </button>
        </div>
      )}

      {/* Main Board View: Kanban Columns aligned cleanly */}
      <div className="flex-1 min-h-0 w-full overflow-x-auto flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 auto-rows-fr gap-3 flex-1 min-h-0 w-full min-w-[1000px]">
          {COLUMNS.map((col) => {
            const count = filteredApplications.filter((a) => a.status === col.id).length;
            return (
              <div
                key={col.id}
                className="flex flex-col bg-tertiary/[0.04] rounded-lg border border-tertiary/10 overflow-hidden min-h-0"
              >
                {/* Column Header */}
                <div className="p-3.5 bg-white border-b border-tertiary/10 flex items-center justify-between shrink-0">
                  <div className="min-w-0 pr-2">
                    <h3 className="font-black text-base text-tertiary truncate">{col.title}</h3>
                    <p className="text-xs text-[#456071] truncate">{col.sub}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-md text-sm font-black shrink-0 tabular-nums ${col.statBg} ${col.statText}`}>
                    {count}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div
                  className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-0"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-[var(--status-green)]/10', 'ring-2', 'ring-[var(--status-green)]/30', 'ring-inset');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-[var(--status-green)]/10', 'ring-2', 'ring-[var(--status-green)]/30', 'ring-inset');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-[var(--status-green)]/10', 'ring-2', 'ring-[var(--status-green)]/30', 'ring-inset');
                    const id = e.dataTransfer.getData('applicationId');
                    const sourceStatus = e.dataTransfer.getData('sourceStatus') as JobStatus;
                    const targetStatus = col.id;

                    if (id && sourceStatus !== targetStatus) {
                      moveJob(id, sourceStatus, targetStatus);
                    }
                  }}
                >
                  {count === 0 ? (
                    <div className="text-center py-8 text-[#456071] text-sm border border-dashed border-tertiary/20 rounded-lg">
                      {t.empty}
                    </div>
                  ) : (
                    filteredApplications
                      .filter((a) => a.status === col.id)
                      .map((app) => (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('applicationId', app.id);
                            e.dataTransfer.setData('sourceStatus', app.status);
                            e.currentTarget.classList.add('opacity-50');
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.classList.remove('opacity-50');
                          }}
                          className="bg-white p-3.5 rounded-lg border border-tertiary/10 hover:border-tertiary/30 hover:shadow-[0_10px_24px_-14px_rgba(11,64,86,0.4)] transition-all group relative overflow-hidden cursor-grab active:cursor-grabbing space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {app.is_internal && (
                                  <span className="bg-primary-container/60 text-tertiary text-xs font-bold px-1.5 py-0.5 rounded">
                                    Direct
                                  </span>
                                )}
                              </div>
                              <h4 className="font-black text-sm text-tertiary truncate" title={app.company}>
                                {app.company}
                              </h4>
                            </div>
                            <button
                              onClick={() => deleteJob(app.id)}
                              className="text-slate-300 hover:text-[var(--status-red)] opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <p className="text-sm text-[#244354] font-medium truncate">{app.role}</p>

                          {(app.location || app.salary) && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                              {app.location && (
                                <span className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  <MapPin size={9} /> {app.location}
                                </span>
                              )}
                              {app.salary && (
                                <span className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  <DollarSign size={9} /> {app.salary}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 text-slate-400 font-medium text-xs">
                              <Calendar size={10} /> {app.dateAdded}
                            </span>
                            {app.status === 'Saved' &&
                              (app.is_internal ? (
                                <button
                                  className="flex items-center gap-1 text-[var(--status-green)] hover:opacity-80 font-bold text-xs transition-colors cursor-pointer"
                                  onClick={() => {
                                    window.dispatchEvent(
                                      new CustomEvent('nav-to-job', {
                                        detail: { jobId: app.job_id, company: app.company, role: app.role },
                                      })
                                    );
                                  }}
                                >
                                  <Briefcase size={10} /> {lang === 'fr' ? 'Postuler' : 'Apply'}
                                </button>
                              ) : (
                                app.url && (
                                  <a
                                    href={app.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-tertiary hover:text-tertiary font-bold text-xs"
                                    title="Apply"
                                    onClick={() => handleApplyClick(app.id)}
                                  >
                                    <ExternalLink size={10} /> {lang === 'fr' ? 'Postuler' : 'Apply'}
                                  </a>
                                )
                              ))}
                          </div>

                          {col.id !== 'Offer' && col.id !== 'Rejected' && (
                            <div className="flex flex-col gap-1 pt-1">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => moveJob(app.id, col.id)}
                                  className="flex-1 py-1.5 bg-white hover:bg-tertiary hover:text-white text-tertiary text-xs font-bold rounded-md border border-tertiary/25 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  {lang === 'fr' ? 'Suivant' : 'Next'} <ArrowRight size={11} />
                                </button>
                                <button
                                  onClick={() => moveJob(app.id, col.id, 'Rejected')}
                                  className="px-2 py-1 bg-[var(--status-red)]/10 hover:bg-[var(--status-red)]/20 text-[var(--status-red)] text-xs font-bold rounded-lg border border-[var(--status-red)]/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                                  title={lang === 'fr' ? 'Refusé' : 'Reject'}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    window.dispatchEvent(
                                      new CustomEvent('nav-to-cover-letter', {
                                        detail: { jobDescription: `${app.role} chez ${app.company}` },
                                      })
                                    );
                                  }}
                                  className="flex-1 py-1 bg-primary-container/40 hover:bg-primary-container text-tertiary text-xs font-bold rounded-lg border border-tertiary/20 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                                >
                                  <FileText size={11} /> {lang === 'fr' ? 'Lettre' : 'Cover Letter'}
                                </button>

                                <button
                                  onClick={() => {
                                    setOutreachModalData({
                                      isOpen: true,
                                      company: app.company,
                                      role: app.role,
                                    });
                                  }}
                                  className="flex-1 py-1 bg-[#007568] hover:opacity-90 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                                  title="Générer une accroche recruteur"
                                >
                                  <Send size={11} /> {lang === 'fr' ? 'Accroche' : 'Outreach'}
                                </button>
                              </div>
                            </div>
                          )}
                          {col.id === 'Rejected' && (
                            <button
                              onClick={() => moveJob(app.id, col.id, 'Applied')}
                              className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                            >
                              <RefreshCw size={11} /> {lang === 'fr' ? 'Réessayer' : 'Retry'}
                            </button>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Job Modal */}
      {showAddForm && <AddJobModal onClose={() => setShowAddForm(false)} onSave={handleAddJob} />}

      {/* Confirmation Modal */}
      {confirmApplyId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">{t.modalTitle}</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                {t.modalQuestion} <br />
                <span className="font-semibold text-tertiary">{getConfirmingJobName()}</span>
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => confirmApplication(true)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {t.btnYes}
                </button>
                <button
                  onClick={() => confirmApplication(false)}
                  className="w-full py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {t.btnNo}
                </button>
              </div>
            </div>
            <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
              <button
                onClick={() => setConfirmApplyId(null)}
                className="text-sm text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Outreach Modal */}
      <OutreachModal
        isOpen={outreachModalData.isOpen}
        onClose={() => setOutreachModalData((prev) => ({ ...prev, isOpen: false }))}
        companyName={outreachModalData.company}
        jobTitle={outreachModalData.role}
      />
    </div>
  );
};

export default JobTracker;
