import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Eye, FileText, Loader2, RefreshCw, Star, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listUserResumes, resumeDataToPlainText } from '../../lib/resumeStore';
import { deleteCvHistoryEntry, readCvHistory } from '../../lib/cvScoreHistory';
import type { CvHistoryEntry, CvSnapshot } from '../../lib/cvScoreHistory';

interface HistoryRow {
  entry: CvHistoryEntry;
  resumeId: string;
  resumeName: string;
  isPrimary: boolean;
  /** When the CV itself was created (dd/mm/yyyy). */
  createdDate: string;
}

type LineStatus = 'same' | 'removed' | 'added';
interface DiffLine {
  text: string;
  status: LineStatus;
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function scoreTone(score: number): string {
  if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 70) return 'bg-blue-50 text-blue-800 border-blue-200';
  if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

// Experience descriptions are HTML lists: turn the list items into lines so
// the comparison works bullet by bullet instead of on one huge paragraph.
function snapshotToLines(snapshot: CvSnapshot): string[] {
  const experience = Array.isArray(snapshot.experience)
    ? (snapshot.experience as Record<string, unknown>[]).map((exp) => ({
        ...exp,
        description: String(exp.description ?? '')
          .replace(/<\/(li|p|div)>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<li[^>]*>/gi, '- '),
      }))
    : snapshot.experience;
  return resumeDataToPlainText({ ...snapshot, experience })
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean);
}

// Line-level diff (longest common subsequence). CVs are a few hundred lines at most.
function diffLines(before: string[], after: string[]): { left: DiffLine[]; right: DiffLine[] } {
  const n = before.length;
  const m = after.length;
  if (n * m > 400_000) {
    return {
      left: before.map((text) => ({ text, status: 'removed' as const })),
      right: after.map((text) => ({ text, status: 'added' as const })),
    };
  }
  const table = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      left.push({ text: before[i], status: 'same' });
      right.push({ text: after[j], status: 'same' });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      left.push({ text: before[i++], status: 'removed' });
    } else {
      right.push({ text: after[j++], status: 'added' });
    }
  }
  while (i < n) left.push({ text: before[i++], status: 'removed' });
  while (j < m) right.push({ text: after[j++], status: 'added' });
  return { left, right };
}

function ScoreChange({ entry }: { entry: CvHistoryEntry }) {
  if (entry.scoreBefore === null) {
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-black ${scoreTone(entry.scoreAfter)}`}>
        {entry.scoreAfter}%
      </span>
    );
  }
  const delta = entry.scoreAfter - entry.scoreBefore;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`rounded-full border px-2.5 py-1 text-sm font-black ${scoreTone(entry.scoreBefore)}`}>{entry.scoreBefore}%</span>
      <ArrowRight size={14} className="text-slate-400" aria-hidden="true" />
      <span className={`rounded-full border px-2.5 py-1 text-sm font-black ${scoreTone(entry.scoreAfter)}`}>{entry.scoreAfter}%</span>
      <span
        className={`text-xs font-extrabold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-400'}`}
      >
        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '='} pt{Math.abs(delta) > 1 ? 's' : ''}
      </span>
    </span>
  );
}

function DiffColumn({ title, score, lines }: { title: string; score: number | null; lines: DiffLine[] }) {
  return (
    <section className="min-w-0 rounded-xl border border-[#dce7ed] bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-[#edf3f6] px-4 py-3">
        <h3 className="text-sm font-black text-tertiary">{title}</h3>
        {score !== null && (
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-black ${scoreTone(score)}`}>{score}%</span>
        )}
      </header>
      <ul className="max-h-[55vh] space-y-1 overflow-y-auto p-3 text-[13px] leading-5 text-[#244354]">
        {lines.map((line, index) => (
          <li
            key={index}
            className={`break-words rounded-md px-2 py-1 ${
              line.status === 'removed'
                ? 'bg-rose-50 text-rose-900 line-through decoration-rose-300'
                : line.status === 'added'
                ? 'bg-emerald-50 text-emerald-900'
                : ''
            }`}
          >
            {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CompareModal({ row, onClose }: { row: HistoryRow; onClose: () => void }) {
  const { entry } = row;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const diff = useMemo(
    () => (entry.before ? diffLines(snapshotToLines(entry.before), snapshotToLines(entry.after)) : null),
    [entry]
  );
  const importedLines = useMemo(
    () => snapshotToLines(entry.after).map((text) => ({ text, status: 'same' as const })),
    [entry]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Comparaison du CV ${row.resumeName}`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#dce7ed] bg-[#f3f7fa] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#dce7ed] bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-tertiary">{row.resumeName}</h2>
            <p className="mt-0.5 text-xs text-[#607786]">
              {entry.label} · {longDate(entry.at)} à {shortTime(entry.at)}
            </p>
            <div className="mt-2">
              <ScoreChange entry={entry} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {diff && !diff.left.some((l) => l.status !== 'same') && !diff.right.some((l) => l.status !== 'same') ? (
            <>
              <p className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-[#607786]">
                Le contenu du CV n’a pas changé lors de cette action.
              </p>
              <DiffColumn title="CV à ce moment-là" score={entry.scoreAfter} lines={diff.right} />
            </>
          ) : diff ? (
            <>
              <p className="mb-3 text-xs text-[#607786]">
                <span className="rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-800 line-through">Retiré</span>{' '}
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">Ajouté ou réécrit</span>
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <DiffColumn title="Avant" score={entry.scoreBefore} lines={diff.left} />
                <DiffColumn title="Après" score={entry.scoreAfter} lines={diff.right} />
              </div>
            </>
          ) : (
            <DiffColumn
              title={entry.kind === 'import' ? 'CV importé' : 'CV à ce moment-là'}
              score={entry.scoreAfter}
              lines={importedLines}
            />
          )}
        </div>

        <div className="flex justify-end border-t border-[#dce7ed] bg-white px-5 py-3">
          <Link
            to={`/builder?id=${row.resumeId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#007568] px-4 py-2 text-xs font-bold text-white hover:bg-[#006257]"
          >
            Ouvrir ce CV dans l’éditeur <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

// Same column layout for the header and every row (md and up); below md each row stacks.
const ROW_GRID = 'md:grid md:grid-cols-[48px_minmax(0,2.4fr)_minmax(0,1.7fr)_minmax(0,1.5fr)_96px_96px_80px] md:items-center md:gap-4';

export default function CvScanHistoryView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<HistoryRow | null>(null);

  const load = React.useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resumes = await listUserResumes(user.id);
      const flat = resumes.flatMap((resume) =>
        readCvHistory(resume.resumeData).map((entry) => ({
          entry,
          resumeId: resume.id,
          resumeName: resume.name,
          isPrimary: resume.isPrimary,
          createdDate: resume.createdDate,
        }))
      );
      flat.sort((a, b) => b.entry.at.localeCompare(a.entry.at));
      setRows(flat);
    } catch {
      setError('Impossible de charger votre historique. Réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (row: HistoryRow) => {
    if (!user?.id) return;
    if (!window.confirm('Supprimer cette ligne de l’historique ? Votre CV n’est pas modifié.')) return;
    const previous = rows;
    setRows((current) => current.filter((item) => item.entry.id !== row.entry.id));
    try {
      await deleteCvHistoryEntry(row.resumeId, user.id, row.entry.id);
    } catch {
      setRows(previous);
      setError('La suppression a échoué. Réessayez.');
    }
  };

  return (
    <div className="space-y-6 pb-16 md:pb-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827] sm:text-3xl">Historique des scans</h1>
          <p className="mt-1 text-sm text-[#4b5563]">
            Suivez chaque CV importé ou réécrit par l’IA, avec son score avant et après.
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            {rows.length} événement{rows.length > 1 ? 's' : ''} enregistré{rows.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#374151] shadow-xs transition hover:bg-[#f9fafb] disabled:opacity-60"
            aria-label="Actualiser l’historique"
            title="Actualiser"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/builder"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-tertiary px-4 text-sm font-bold text-white shadow-xs transition hover:bg-[#093b50]"
          >
            <FileText size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Importer un CV</span>
            <span className="sm:hidden">Importer</span>
          </Link>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-xs">
        <div className={`hidden border-b border-[#e5e7eb] px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-[#4b5563] ${ROW_GRID}`}>
          <span>Base</span>
          <span>CV</span>
          <span>Opportunité</span>
          <span>Score</span>
          <span>Créé le</span>
          <span>Modifié le</span>
          <span className="text-right">Actions</span>
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <p className="text-xs text-slate-500">Chargement de l’historique…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Clock size={32} className="mx-auto text-[#007568]" />
            <h2 className="mt-3 font-bold text-[#102d3e]">Aucun scan pour l’instant</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Importez un CV : il apparaît ici avec sa date et son score. Chaque réécriture par l’assistant IA ajoute une ligne avec l’ancien et le nouveau score.
            </p>
            <Link
              to="/builder"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#007568] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#006257]"
            >
              <Upload size={15} /> Importer un CV
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#f1f2f4]">
            {rows.map((row) => (
              <li
                key={row.entry.id}
                className={`flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-[#f9fafb] ${ROW_GRID}`}
              >
                <div className="flex items-center gap-3 md:contents">
                  <span className="flex w-7 shrink-0 justify-center md:w-auto" title={row.isPrimary ? 'CV principal' : undefined}>
                    <Star
                      size={17}
                      className={row.isPrimary ? 'fill-amber-400 text-amber-400' : 'text-[#d1d5db]'}
                      aria-label={row.isPrimary ? 'CV principal' : 'Autre CV'}
                    />
                  </span>

                  <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eff4ff] text-[#3b6fe0]">
                      <FileText size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#111827]">{row.resumeName}</p>
                      <p className="truncate text-[11px] italic text-[#6b7280]">{row.entry.label}</p>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 text-sm">
                  {row.entry.opportunity ? (
                    <>
                      <p className="truncate font-bold text-[#111827]">{row.entry.opportunity.company}</p>
                      <p className="truncate text-[11px] text-[#6b7280]">{row.entry.opportunity.role}</p>
                    </>
                  ) : (
                    <span className="hidden text-[#9ca3af] md:inline">—</span>
                  )}
                </div>

                <div>
                  <ScoreChange entry={row.entry} />
                </div>

                <p className="text-sm text-[#374151]">
                  <span className="mr-1 text-[11px] text-[#9ca3af] md:hidden">Créé le</span>
                  {row.createdDate}
                </p>

                <p className="text-sm text-[#374151]" title={`${dateFr(row.entry.at)} à ${shortTime(row.entry.at)}`}>
                  <span className="mr-1 text-[11px] text-[#9ca3af] md:hidden">Modifié le</span>
                  {dateFr(row.entry.at)}
                </p>

                <div className="flex items-center gap-1 md:justify-end">
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6b7280] transition hover:bg-[#eef2f6] hover:text-[#007568]"
                    aria-label={row.entry.before ? 'Voir les différences entre l’ancien et le nouveau CV' : 'Voir le CV'}
                    title={row.entry.before ? 'Voir les différences' : 'Voir le CV'}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(row)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9ca3af] transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Supprimer cette ligne de l’historique"
                    title="Supprimer de l’historique"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && <CompareModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
