import React from 'react';
import { Trash2, ExternalLink } from 'lucide-react';
import { CoverLetterHistoryItem } from '../../lib/coverLetterStore';
import { getAllCoverLetterTemplates } from './templates/coverLetterRegistry';
import CompactCoverLetterSample from './CompactCoverLetterSample';

const allTemplates = getAllCoverLetterTemplates();

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function CoverLetterMiniPage({ letter }: { letter: CoverLetterHistoryItem }) {
  const tplInfo = allTemplates.find((t) => t.id === letter.template) || allTemplates[0];
  const paragraphs = letter.content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="mx-auto aspect-[210/297] w-full max-w-[190px] overflow-hidden rounded-xs bg-white text-slate-900 ring-1 ring-gray-200 transition-transform duration-300 group-hover:scale-[1.015]">
      <CompactCoverLetterSample
        template={tplInfo}
        accentColor={tplInfo.previewColor}
        size="sm"
        customData={{
          candidateName: tplInfo.candidateName,
          candidateRole: letter.posteVise || tplInfo.candidateRole,
          company: letter.company || tplInfo.company,
          recruiter: letter.recruiter || 'Service Recrutement',
          dateLabel: formatDate(letter.createdAt) || '14 oct. 2026',
          paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
        }}
      />
    </div>
  );
}

interface CoverLetterCardProps {
  letter: CoverLetterHistoryItem;
  onOpen: (letter: CoverLetterHistoryItem) => void;
  onDelete: (id: string) => void;
}

const CoverLetterCard = React.memo(function CoverLetterCard({ letter, onOpen, onDelete }: CoverLetterCardProps) {
  const tplInfo = allTemplates.find((t) => t.id === letter.template);
  const templateName = tplInfo?.nameFr || letter.template;

  return (
    <div className="bg-white border border-tertiary/10 hover:border-tertiary/30 rounded-lg overflow-hidden flex flex-col hover:shadow-[0_14px_30px_-18px_rgba(11,64,86,0.35)] transition-all group">
      {/* Full-page realistic miniature preview */}
      <div className="flex justify-center bg-[#e9f0f4] p-3">
        <CoverLetterMiniPage letter={letter} />
      </div>

      {/* Card body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {/* Company */}
        <p className="text-base font-black text-tertiary leading-tight line-clamp-1">
          {letter.company || 'Candidature'}
        </p>
        {/* Position */}
        <p className="text-xs text-[#007568] font-semibold leading-tight line-clamp-1">
          {letter.posteVise || 'Poste non précisé'}
        </p>

        {/* Template + date */}
        <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
          <span className="truncate max-w-[60%]">{templateName}</span>
          <span className="shrink-0">{formatDate(letter.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-1 flex gap-2">
          <button
            onClick={() => onOpen(letter)}
            className="flex-1 text-center text-sm font-bold py-2 rounded-lg bg-tertiary text-white hover:bg-[#093b50] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <ExternalLink size={12} />
            Ouvrir
          </button>
          <button
            onClick={() => onDelete(letter.id)}
            className="p-2 rounded-lg border border-tertiary/15 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default CoverLetterCard;
