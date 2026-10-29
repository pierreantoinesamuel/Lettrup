import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Target,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { FullPipelineOutput, GapSeverity } from '../../application/cv-tailoring/types';

interface TailorResultPanelProps {
  pipelineResult: FullPipelineOutput;
  matchScore?: number;
  changeSummary: string[];
  diffPreview: { originalSummary: string; tailoredSummary: string };
}

const severityColor: Record<GapSeverity, string> = {
  low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  medium: 'text-orange-600 bg-orange-50 border-orange-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

const severityLabel: Record<GapSeverity, string> = {
  low: 'Faible',
  medium: 'Modéré',
  high: 'Élevé',
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-green-700 bg-green-50 border-green-200' :
    score >= 50 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
    'text-red-700 bg-red-50 border-red-200';

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-sm ${color}`}>
      <Target size={14} />
      {score}% de compatibilité
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      aria-label="Copier"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function TailorResultPanel({
  pipelineResult,
  matchScore,
  changeSummary,
  diffPreview,
}: TailorResultPanelProps) {
  const analysis = pipelineResult.task_2_analysis;
  const generation = pipelineResult.task_3_generation;
  const extraction = pipelineResult.task_1_extraction;

  const score = matchScore ?? analysis?.match_score;

  return (
    <div className="space-y-4">
      {/* Match Score + Job Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {extraction?.job_title && (
                <span>{extraction.job_title}{extraction.company_name ? ` · ${extraction.company_name}` : ''}</span>
              )}
            </p>
          </div>
          {score !== undefined && <ScoreBadge score={score} />}
        </div>

        {extraction?.red_flags && extraction.red_flags.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-700 mb-1">Points de vigilance</p>
              <ul className="space-y-0.5">
                {extraction.red_flags.map((flag, i) => (
                  <li key={i} className="text-xs text-red-600">• {flag}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Keywords */}
      {analysis && (
        <Section title="Mots-clés" icon={<TrendingUp size={13} />}>
          <div className="space-y-3">
            {analysis.matched_keywords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-green-700 mb-1.5">Présents dans votre CV</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matched_keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium border border-green-200">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis.missing_keywords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-orange-700 mb-1.5">Manquants</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missing_keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full font-medium border border-orange-200">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Gaps */}
      {analysis?.gaps && analysis.gaps.length > 0 && (
        <Section title="Écarts à combler" icon={<AlertTriangle size={13} />} defaultOpen={false}>
          <div className="space-y-2">
            {analysis.gaps.map((gap, i) => (
              <div key={i} className={`border rounded-lg p-3 space-y-1 ${severityColor[gap.severity]}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">{gap.requirement}</p>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border opacity-70">
                    {severityLabel[gap.severity]}
                  </span>
                </div>
                {gap.suggestion && (
                  <p className="text-xs opacity-80">{gap.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Before / After */}
      <Section title="Aperçu Avant / Après" icon={<FileText size={13} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-gray-400">Version Initiale</span>
            <p className="text-xs text-gray-700 leading-relaxed">{diffPreview.originalSummary}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-purple-600">Version Adaptée</span>
            <p className="text-xs text-purple-800 leading-relaxed font-medium">{diffPreview.tailoredSummary}</p>
          </div>
        </div>
      </Section>

      {/* Change Log */}
      {changeSummary.length > 0 && (
        <Section title={`Modifications (${changeSummary.length})`} icon={<CheckCircle2 size={13} />} defaultOpen={false}>
          <ul className="space-y-1.5">
            {changeSummary.map((change, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5 font-medium">
                <span className="text-green-600 shrink-0">•</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Cover Letter */}
      {generation?.cover_letter?.body && (
        <Section title="Lettre de motivation générée" icon={<FileText size={13} />} defaultOpen={false}>
          <div className="space-y-2">
            {generation.cover_letter.subject_line && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-800">
                  Objet : {generation.cover_letter.subject_line}
                </p>
                <CopyButton text={generation.cover_letter.subject_line} />
              </div>
            )}
            <div className="relative bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="absolute top-2 right-2">
                <CopyButton text={generation.cover_letter.body} />
              </div>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap pr-8">
                {generation.cover_letter.body}
              </p>
            </div>
            {generation.cover_letter.word_count > 0 && (
              <p className="text-[10px] text-gray-400 text-right">{generation.cover_letter.word_count} mots</p>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
