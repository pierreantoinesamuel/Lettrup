import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  FileText,
  Sparkles,
  Search,
  Eye,
  X,
  Briefcase,
  Crown,
  Columns,
  HeartHandshake,
  LayoutTemplate,
  Check,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CoverLetterHistoryItem, mapCoverLetterRow, COVER_LETTER_MAX } from '../../lib/coverLetterStore';
import {
  getAllCoverLetterTemplates,
  canAccessCoverLetterTemplate,
  CoverLetterTemplateInfo,
  CoverLetterCategoryKey,
} from './templates/coverLetterRegistry';
import CoverLetterCard from './CoverLetterCard';
import CompactCoverLetterSample from './CompactCoverLetterSample';
import CoverLetterGenerator from './CoverLetterGenerator';

interface CoverLetterListProps {
  onOpenEditor?: (letter: CoverLetterHistoryItem) => void;
  onOpenGenerator?: () => void;
  onUseTemplate?: (templateId: string) => void;
  refreshKey?: number;
  userPlan?: string;
  onRequireUpgrade?: () => void;
}

const allTemplates = getAllCoverLetterTemplates();

const CATEGORIES: { key: CoverLetterCategoryKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: `Tous (${allTemplates.length})`, icon: <LayoutTemplate size={14} /> },
  { key: 'modern', label: 'Moderne', icon: <Sparkles size={14} /> },
  { key: 'classic', label: 'Classique', icon: <Briefcase size={14} /> },
  { key: 'creative', label: 'Créatif', icon: <Sparkles size={14} /> },
  { key: 'simple', label: 'Minimaliste', icon: <Columns size={14} /> },
  { key: 'executive', label: 'Cadre / Direction', icon: <Crown size={14} /> },
  { key: 'sector', label: 'Santé & Secteurs', icon: <HeartHandshake size={14} /> },
];

export default function CoverLetterList({
  onOpenEditor,
  onOpenGenerator,
  onUseTemplate,
  refreshKey = 0,
  userPlan,
  onRequireUpgrade,
}: CoverLetterListProps) {
  const { user } = useAuth();
  const effectivePlan = userPlan || user?.plan || 'free';
  const [letters, setLetters] = useState<CoverLetterHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CoverLetterCategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [previewTemplate, setPreviewTemplate] = useState<CoverLetterTemplateInfo | null>(null);
  const [editorState, setEditorState] = useState<{
    open: boolean;
    initialData?: CoverLetterHistoryItem;
    initialTemplateId?: string;
  }>({ open: false });

  const fetchLetters = useCallback(async () => {
    if (!user?.id || !supabase) {
      setLetters([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_cover_letters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(COVER_LETTER_MAX);

    if (!error && data) {
      setLetters(data.map(mapCoverLetterRow));
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters, refreshKey]);

  const handleOpenGenerator = useCallback(() => {
    if (onOpenGenerator) {
      onOpenGenerator();
      return;
    }
    setEditorState({ open: true });
  }, [onOpenGenerator]);

  const handleOpenEditor = useCallback(
    (letter: CoverLetterHistoryItem) => {
      if (onOpenEditor) {
        onOpenEditor(letter);
        return;
      }
      setEditorState({ open: true, initialData: letter, initialTemplateId: letter.template });
    },
    [onOpenEditor]
  );

  const handleUseTemplate = useCallback(
    (templateId: string) => {
      if (onUseTemplate) {
        onUseTemplate(templateId);
        return;
      }
      setEditorState({ open: true, initialTemplateId: templateId });
    },
    [onUseTemplate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Supprimer cette lettre de motivation ?')) return;
      setLetters((prev) => prev.filter((item) => item.id !== id));
      if (user?.id && supabase) {
        await supabase.from('user_cover_letters').delete().eq('id', id).eq('user_id', user.id);
      }
    },
    [user?.id]
  );

  const handleColorChange = (templateId: string, color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedColors((prev) => ({ ...prev, [templateId]: color }));
  };

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allTemplates.filter((tpl) => {
      const matchesCat = activeCategory === 'all' || tpl.categories.includes(activeCategory);
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        tpl.nameFr.toLowerCase().includes(q) ||
        tpl.descriptionFr.toLowerCase().includes(q) ||
        tpl.candidateRole.toLowerCase().includes(q) ||
        tpl.candidateName.toLowerCase().includes(q) ||
        tpl.company.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  if (editorState.open) {
    return (
      <CoverLetterGenerator
        initialData={editorState.initialData}
        initialTemplateId={editorState.initialTemplateId}
        userPlan={effectivePlan}
        onRequireUpgrade={onRequireUpgrade}
        onBack={() => {
          setEditorState({ open: false });
          fetchLetters();
        }}
        onLetterSaved={(savedItem) => {
          setLetters((prev) => [savedItem, ...prev.filter((item) => item.id !== savedItem.id)]);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-44 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 h-[360px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 md:pb-12">
      {/* Saved Cover Letters Section */}
      {letters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-tertiary">
              Mes lettres enregistrées ({letters.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {letters.map((letter) => (
              <CoverLetterCard
                key={letter.id}
                letter={letter}
                onOpen={handleOpenEditor}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Cover Letter Templates Gallery — matching Modèles de CV (TemplatesGallery.tsx) */}
      <div className="pt-8 border-t border-tertiary/15 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-tertiary tracking-tight">
                Galerie de modèles de lettre
              </h2>
              <span className="text-sm font-bold text-[#007568] tabular-nums">
                {filteredTemplates.length} modèles
              </span>
            </div>
            <p className="text-sm text-[#456071] mt-1.5">
              Aperçus A4 réalistes avec exemples de rédaction par métier. Cliquez sur un modèle pour le personnaliser.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 xl:ml-auto shrink-0">
            <button
              onClick={handleOpenGenerator}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold px-5 py-3 rounded-lg bg-[#007568] text-white hover:bg-[#006257] transition-colors cursor-pointer"
            >
              {letters.length === 0 ? 'Générer ma première lettre avec l’IA' : 'Générer une lettre avec l’IA'}
            </button>
            <button
              onClick={handleOpenGenerator}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold px-5 py-3 rounded-lg bg-tertiary text-white hover:bg-[#093b50] transition-colors cursor-pointer"
            >
              <Plus size={18} />
              Créer une lettre
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-full xl:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un métier, style..."
              className="w-full pl-9 pr-8 py-2.5 rounded-full bg-white border border-tertiary/20 text-sm font-medium text-tertiary placeholder:text-slate-400 focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills — identical visual style to Modèles de CV */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold whitespace-nowrap rounded-full transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-tertiary text-white'
                    : 'bg-transparent border border-tertiary/20 text-tertiary hover:border-tertiary'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grid of Realistic Mini A4 Cover Letter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTemplates.map((tpl) => {
            const accessible = canAccessCoverLetterTemplate(tpl.id, effectivePlan);
            const currentColor = selectedColors[tpl.id] || tpl.previewColor;

            return (
              <div
                key={tpl.id}
                onClick={() => (accessible ? handleUseTemplate(tpl.id) : onRequireUpgrade?.())}
                className="bg-white rounded-lg border border-tertiary/10 hover:border-tertiary/30 hover:shadow-[0_18px_40px_-20px_rgba(11,64,86,0.35)] transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden"
              >
                {/* Mini Preview Container — same dimensions & styling as Modèles de CV */}
                <div className="bg-[#e9f0f4] p-3 relative min-h-[295px] flex items-center justify-center overflow-hidden">
                  <div className="w-[190px] h-[269px] bg-white rounded-xs transition-transform duration-300 group-hover:scale-[1.015] relative flex flex-col overflow-hidden">
                    <CompactCoverLetterSample
                      template={tpl}
                      accentColor={currentColor}
                      size="sm"
                    />
                  </div>

                  {/* Quick Eye Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(tpl);
                    }}
                    title="Aperçu grand format"
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-[#007568] border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Eye size={14} />
                  </button>

                  {/* Hover Action Overlay */}
                  <div className="absolute inset-0 bg-tertiary/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                    <span className="bg-accent text-tertiary font-bold text-sm px-5 py-2.5 rounded-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      Utiliser ce modèle
                    </span>
                  </div>

                  {/* Color Palette Swatches & Format Badges */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-1.5 bg-white/85 backdrop-blur-xs px-2 py-1 rounded-full border border-gray-200/80">
                      {tpl.colors.map((color) => {
                        const isSelected = currentColor === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={(event) => handleColorChange(tpl.id, color, event)}
                            style={{ backgroundColor: color }}
                            aria-label={`Couleur ${color}`}
                            className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 ${
                              isSelected ? 'border-gray-900 scale-110' : 'border-transparent opacity-80'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-white/90 text-tertiary text-xs font-bold px-1.5 py-0.5 rounded border border-tertiary/10">
                        PDF
                      </span>
                      <span className="bg-white/90 text-tertiary text-xs font-bold px-1.5 py-0.5 rounded border border-tertiary/10">
                        DOCX
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Title, Role Example & CTA */}
                <div className="p-4 bg-white flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-serif font-black text-lg text-tertiary group-hover:text-[#007568] transition-colors leading-snug">
                        {tpl.nameFr}
                      </h3>
                    </div>
                    <p className="text-xs font-semibold text-[#007568] mb-1.5 truncate">
                      Ex. : {tpl.candidateRole}
                    </p>
                    <p className="text-sm text-[#456071] leading-relaxed line-clamp-2">
                      {tpl.descriptionFr}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-tertiary/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplate(tpl);
                      }}
                      className="text-sm font-semibold text-[#456071] hover:text-tertiary inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={14} />
                      Aperçu
                    </button>
                    <span className="text-sm font-bold text-[#007568] group-hover:underline underline-offset-4">
                      Choisir ce modèle →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Size A4 Cover Letter Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">{previewTemplate.nameFr}</h3>
                  <span className="text-xs font-semibold text-[#456071]">Format A4</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exemple : {previewTemplate.candidateName} — {previewTemplate.candidateRole} ({previewTemplate.company})
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Color picker inside modal */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-full border border-slate-200">
                  {previewTemplate.colors.map((color) => {
                    const activeColor = (selectedColors[previewTemplate.id] || previewTemplate.previewColor) === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={(e) => handleColorChange(previewTemplate.id, color, e)}
                        style={{ backgroundColor: color }}
                        className={`w-4 h-4 rounded-full border transition-transform ${
                          activeColor ? 'border-slate-900 scale-110' : 'border-transparent opacity-80'
                        }`}
                      />
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const id = previewTemplate.id;
                    setPreviewTemplate(null);
                    handleUseTemplate(id);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007568] hover:bg-[#006257] text-white text-xs font-bold cursor-pointer"
                >
                  <Check size={14} />
                  Choisir ce modèle
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Full A4 Sheet */}
            <div className="p-6 bg-[#f2f4f8] overflow-y-auto flex justify-center">
              <div className="w-full max-w-[560px] aspect-[210/297] bg-white rounded-md shadow-xl ring-1 ring-slate-200 overflow-hidden">
                <CompactCoverLetterSample
                  template={previewTemplate}
                  accentColor={selectedColors[previewTemplate.id] || previewTemplate.previewColor}
                  size="lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
