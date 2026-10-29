import React, { useRef, useEffect, useState } from 'react';
import { MoreHorizontal, Star, Sparkles, Target, Copy } from 'lucide-react';
import { ResumeListItem } from '../../lib/resumeStore';

interface CvActionsMenuProps {
  resume: ResumeListItem;
  onSetPrimary: (id: string) => void;
  onTailor: (resume: ResumeListItem) => void;
  onScan: (resume: ResumeListItem) => void;
  onDuplicate: (resume: ResumeListItem) => void;
}

export default function CvActionsMenu({ resume, onSetPrimary, onTailor, onScan, onDuplicate }: CvActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Actions"
        aria-haspopup="true"
        aria-expanded={open}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl min-w-[170px] py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {!resume.isPrimary && (
            <button
              role="menuitem"
              onClick={() => { onSetPrimary(resume.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Star size={14} className="text-amber-500" />
              Définir comme principal
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => { onTailor(resume); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Sparkles size={14} className="text-[#007568]" />
            Adapter avec l'IA
          </button>
          <button
            role="menuitem"
            onClick={() => { onScan(resume); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Target size={14} className="text-blue-500" />
            Scanner ATS
          </button>
          <button
            role="menuitem"
            onClick={() => { onDuplicate(resume); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy size={14} className="text-gray-500" />
            Dupliquer
          </button>

        </div>
      )}
    </div>
  );
}
