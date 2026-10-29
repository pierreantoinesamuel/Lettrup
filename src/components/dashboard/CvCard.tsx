import React from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle2, Trash2 } from 'lucide-react';
import { ResumeListItem } from '../../lib/resumeStore';
import CvThumbnail from './CvThumbnail';
import CvActionsMenu from './CvActionsMenu';

interface CvCardProps {
  resume: ResumeListItem;
  onSetPrimary: (id: string) => void;
  onTailor: (resume: ResumeListItem) => void;
  onScan: (resume: ResumeListItem) => void;
  onDuplicate: (resume: ResumeListItem) => void;
  onDelete: (id: string) => void;
}

function AtsBadge({ analyzed, score }: { analyzed: boolean; score: number }) {
  if (!analyzed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-tertiary/5 text-[#456071]">
        Non analysé
      </span>
    );
  }

  let colorClass: string;
  if (score >= 75) colorClass = 'bg-[var(--status-green)]/10 text-[var(--status-green)] border-[var(--status-green)]/30';
  else if (score >= 50) colorClass = 'bg-[var(--status-orange)]/10 text-[var(--status-orange)] border-[var(--status-orange)]/30';
  else colorClass = 'bg-[var(--status-red)]/10 text-[var(--status-red)] border-[var(--status-red)]/30';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${colorClass}`}>
      <CheckCircle2 size={10} />
      ATS {score}
    </span>
  );
}

const CvCard = React.memo(function CvCard({ resume, onSetPrimary, onTailor, onScan, onDuplicate, onDelete }: CvCardProps) {
  return (
    <div className="bg-white border border-tertiary/10 hover:border-tertiary/30 rounded-lg overflow-hidden flex flex-col hover:shadow-[0_14px_30px_-18px_rgba(11,64,86,0.35)] transition-all group">
      {/* Thumbnail */}
      <div className="relative">
        <CvThumbnail
          resumeData={resume.resumeData}
          cvName={resume.name}
        />
        {/* Primary badge overlay */}
        {resume.isPrimary && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-accent text-tertiary text-xs font-black px-2 py-0.5 rounded-md">
            <Star size={10} fill="currentColor" />
            Principal
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* ATS badge + actions row */}
        <div className="flex items-center justify-between">
          <AtsBadge analyzed={resume.atsAnalyzed} score={resume.atsScore} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Supprimer ce CV"
              aria-label={`Supprimer ${resume.name}`}
              onClick={() => onDelete(resume.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
            <CvActionsMenu
              resume={resume}
              onSetPrimary={onSetPrimary}
              onTailor={onTailor}
              onScan={onScan}
              onDuplicate={onDuplicate}
            />
          </div>
        </div>

        {/* Name */}
        <p className="text-base font-black text-tertiary leading-tight line-clamp-2">{resume.name}</p>

        {/* Template + date */}
        <div className="flex items-center justify-between text-xs text-[#456071]/70 font-medium">
          <span className="truncate max-w-[60%]">{resume.template}</span>
          <span className="shrink-0">{resume.updatedDate}</span>
        </div>

        {/* Open button */}
        <Link
          to={`/builder?id=${resume.id}`}
          className="mt-auto w-full text-center text-sm font-bold py-2.5 rounded-lg bg-tertiary hover:bg-[#093b50] text-white transition-colors"
        >
          Ouvrir
        </Link>
      </div>
    </div>
  );
});

export default CvCard;
