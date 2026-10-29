import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { ResumeProfile } from '../../types';
import {
  Globe, Mail, MapPin, Linkedin, Phone, Car, Download, ExternalLink, Share2, Eye, X, Copy, Check,
  Github, Terminal, Palette, Send, Loader2, Code, Folder, Star, Zap, GripVertical,
  ArrowUp, ArrowDown, Menu, Save, History, Trash2, Clock, CheckCircle, Sparkles, LayoutGrid
} from 'lucide-react';
import { translations, Language } from '../../utils/translations';
import { useAuth } from '../../contexts/AuthContext';
import {
  saveWebsiteConfig,
  getUserWebsiteConfigs,
  updateWebsiteConfig,
  deleteWebsiteConfig,
  type WebsiteConfig
} from '../../services/website';
import { logUserActivity } from '../../services/analytics';
import { listUserResumes } from '../../lib/resumeStore';
import { adaptResumeDataToProfile } from '../../lib/resumeAdapter';
import { resolvePrimaryResume } from '../../domain/user/PrimaryResume';
import {
  PORTFOLIO_TEMPLATES_CATALOG,
  WebsiteTemplate,
  getPortfolioTemplateMeta,
  resolvePortfolioTemplateId,
} from './portfolioTemplatesCatalog';
import { PORTFOLIO_THEME_COMPONENTS } from './portfolioThemes';

interface PortfolioBuilderProps {
  resume?: ResumeProfile;
  setResume?: React.Dispatch<React.SetStateAction<ResumeProfile>>;
  lang?: Language;
  onDownloadCV?: () => void;
  publicMode?: boolean;
  initialConfig?: any;
}

type WebsiteSection = 'about' | 'skills' | 'projects' | 'experience';

const EMPTY_RESUME: ResumeProfile = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  drivingLicense: '',
  linkedin: '',
  github: '',
  website: '',
  summary: '',
  skills: [],
  experience: [],
  projects: [],
};

// --- EDITABLE HELPER COMPONENT ---
interface EditableElementProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  tag?: any;
  placeholder?: string;
  readOnly?: boolean;
}

const EditableElement: React.FC<EditableElementProps> = ({
  value,
  onChange,
  className = "",
  tag: Tag = "div",
  placeholder = "Edit...",
  readOnly = false,
}) => {
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const newText = e.currentTarget.innerText;
    if (newText !== value) {
      onChange(newText);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <Tag
      className={readOnly ? className : `outline-none hover:bg-black/5 hover:rounded px-1 -mx-1 transition-colors cursor-text empty:before:content-[attr(placeholder)] empty:before:text-gray-400 ${className}`}
      contentEditable={!readOnly}
      suppressContentEditableWarning={!readOnly}
      onBlur={readOnly ? undefined : handleBlur}
      onPaste={readOnly ? undefined : handlePaste}
      placeholder={readOnly ? undefined : placeholder}
    >
      {value}
    </Tag>
  );
};

// --- DRAGGABLE WRAPPER ---
interface DraggableWrapperProps {
  section: WebsiteSection;
  children: React.ReactNode;
  showPreview: boolean;
  draggedSection: WebsiteSection | null;
  onDragStart: (e: React.DragEvent, section: WebsiteSection) => void;
  onDragOver: (e: React.DragEvent, section: WebsiteSection) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const DraggableWrapper: React.FC<DraggableWrapperProps> = ({
  section,
  children,
  showPreview,
  draggedSection,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}) => (
  <div
    draggable={!showPreview}
    onDragStart={(e) => onDragStart(e, section)}
    onDragOver={(e) => onDragOver(e, section)}
    onDragEnd={onDragEnd}
    className={`relative group transition-all duration-200 ${draggedSection === section ? 'opacity-40 scale-[0.99] border-2 border-dashed border-slate-300 rounded-lg' : ''}`}
  >
    <div id={section} className="scroll-mt-24"></div>
    {!showPreview && (
      <>
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-200/50 pointer-events-none rounded-lg transition-colors z-0"></div>
        <div className="absolute left-1/2 -top-4 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all z-20 hover:opacity-100">
          <div className="flex items-center bg-white shadow-md border border-slate-200 rounded-full px-1.5 py-1 gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              disabled={isFirst}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Move Up"
            >
              <ArrowUp size={14} />
            </button>
            <div
              className="p-1.5 text-slate-400 cursor-move hover:text-indigo-600 border-l border-r border-slate-100 mx-0.5"
              title="Drag to reorder"
            >
              <GripVertical size={14} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              disabled={isLast}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Move Down"
            >
              <ArrowDown size={14} />
            </button>
          </div>
        </div>
      </>
    )}
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

export default function PortfolioBuilder({
  resume: propResume,
  setResume: propSetResume,
  lang = 'fr',
  onDownloadCV,
  publicMode = false,
  initialConfig
}: PortfolioBuilderProps) {
  const { user } = useAuth();
  const [internalResume, setInternalResume] = useState<ResumeProfile>(propResume || EMPTY_RESUME);

  const resume = propResume || internalResume;
  const setResume = propSetResume || setInternalResume;

  const [showPreview, setShowPreview] = useState(publicMode);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState<'all' | 'clair' | 'marque'>('all');
  const [copied, setCopied] = useState(false);

  const [template, setTemplate] = useState<WebsiteTemplate>(resolvePortfolioTemplateId(initialConfig?.template));
  const [sections, setSections] = useState<WebsiteSection[]>(initialConfig?.sections || ['about', 'experience', 'skills', 'projects']);
  const [draggedSection, setDraggedSection] = useState<WebsiteSection | null>(null);

  // Contact Form State
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Database persistence state
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<WebsiteConfig[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const t = translations[lang]?.website || translations.fr.website;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publicMode || !rootRef.current) return;
    const disableEditing = () => {
      rootRef.current?.querySelectorAll('[contenteditable="true"]')
        .forEach(el => el.setAttribute('contenteditable', 'false'));
    };
    disableEditing();
    const observer = new MutationObserver(disableEditing);
    observer.observe(rootRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [publicMode]);

  useEffect(() => {
    loadSavedConfigs();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && currentConfigId) {
      const debounceTimer = setTimeout(() => {
        saveCurrentConfig();
      }, 2000);
      return () => clearTimeout(debounceTimer);
    }
  }, [template, sections]);

  const loadSavedConfigs = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const configs = await getUserWebsiteConfigs(user.id);
      setSavedConfigs(configs);
      if (configs.length > 0) {
        const latestConfig = configs[0];
        setCurrentConfigId(latestConfig.id);
        if (latestConfig.template) {
          setTemplate(resolvePortfolioTemplateId(latestConfig.template));
        }
        if (latestConfig.sections && Array.isArray(latestConfig.sections)) {
          setSections(latestConfig.sections as WebsiteSection[]);
        }
      }
      if (!propResume) {
        const resumes = await listUserResumes(user.id);
        const primary = resolvePrimaryResume(resumes);
        const profile = primary ? adaptResumeDataToProfile(primary.resumeData) : null;
        if (profile) {
          setInternalResume(profile);
        } else if (configs[0]?.resume_data) {
          setInternalResume(prev => ({ ...prev, ...configs[0].resume_data }));
        }
      }
    } catch (error) {
      console.error('Error loading website configs:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveCurrentConfig = async () => {
    if (!user?.id) return;
    setIsSavingConfig(true);
    try {
      const configData = {
        config_name: `${resume.fullName || 'Mon'} Portfolio`,
        template: template,
        sections: sections,
        resume_data: resume,
        theme_config: { template, sections }
      };

      if (currentConfigId) {
        await updateWebsiteConfig(currentConfigId, user.id, configData);
      } else {
        const newConfig = await saveWebsiteConfig(user.id, configData);
        if (newConfig) {
          setCurrentConfigId(newConfig.id);
        }
      }
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2000);
    } catch (error) {
      console.error('Error saving website config:', error);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    await saveCurrentConfig();
    await loadSavedConfigs();
    if (user?.id) {
      await logUserActivity(user.id, 'website_saved', { template });
    }
  };

  const handleLoadConfig = (config: WebsiteConfig) => {
    setCurrentConfigId(config.id);
    if (config.template) {
      setTemplate(resolvePortfolioTemplateId(config.template));
    }
    if (config.sections && Array.isArray(config.sections)) {
      setSections(config.sections as WebsiteSection[]);
    }
    if (config.resume_data) {
      setResume(prev => ({ ...prev, ...config.resume_data }));
    }
    setShowHistory(false);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette configuration ?')) return;
    if (!user?.id) return;
    try {
      const success = await deleteWebsiteConfig(configId, user.id);
      if (success) {
        setSavedConfigs(prev => prev.filter(c => c.id !== configId));
        if (currentConfigId === configId) {
          setCurrentConfigId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting config:', error);
    }
  };

  const slugify = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'portfolio';

  // Capped at 40 chars so the result stays a valid DNS label (max 63) once
  // used as a subdomain, e.g. jean-dupont-a1b2c3.cvpilot.fr.
  const buildSlug = (configId: string) =>
    `${slugify(resume.fullName || 'portfolio').slice(0, 40)}-${configId.replace(/-/g, '').slice(0, 6)}`;

  const currentConfig = savedConfigs.find(c => c.id === currentConfigId);
  const publicSlug = currentConfig?.published_url || currentConfigId || buildSlug('demo123');
  // Portfolio subdomains ride on whatever apex domain the dashboard itself is
  // served from (cvpilot.fr in prod, localhost in dev — browsers resolve
  // *.localhost to loopback automatically), so no extra config is needed here.
  const publicApexHost = window.location.host.replace(/^www\./, '');
  const publicSubdomainUrl = `${window.location.protocol}//${publicSlug}.${publicApexHost}`;
  const publicPathUrl = `${window.location.origin}/p/${publicSlug}`;

  const handlePublish = async () => {
    if (!user?.id) return;
    setIsSavingConfig(true);
    try {
      const configData = {
        config_name: `${resume.fullName || 'Mon'} Portfolio`,
        template: template,
        sections: sections,
        resume_data: resume,
        is_published: true,
        theme_config: { template, sections }
      };

      let configId = currentConfigId;
      if (configId) {
        await updateWebsiteConfig(configId, user.id, configData);
      } else {
        const newConfig = await saveWebsiteConfig(user.id, configData);
        if (newConfig) {
          setCurrentConfigId(newConfig.id);
          configId = newConfig.id;
        }
      }

      if (configId) {
        const existing = savedConfigs.find(c => c.id === configId);
        if (!existing?.published_url) {
          await updateWebsiteConfig(configId, user.id, { published_url: buildSlug(configId) });
        }
      }

      await loadSavedConfigs();
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2000);
    } catch (error) {
      console.error('Error publishing:', error);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const updateField = (field: keyof ResumeProfile, value: any) => {
    setResume(prev => ({ ...prev, [field]: value }));
  };

  const updateNested = (parent: 'experience' | 'projects' | 'education', id: string, field: string, value: string) => {
    setResume(prev => ({
      ...prev,
      [parent]: prev[parent]?.map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const updateSkill = (index: number, val: string) => {
    const newSkills = [...resume.skills];
    newSkills[index] = val;
    updateField('skills', newSkills);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConfigId || !currentConfig?.is_published) {
      toast.error('Ce portfolio doit être publié pour recevoir des messages.');
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/portfolio/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: currentConfigId,
          fromName: contactForm.name,
          fromEmail: contactForm.email,
          message: contactForm.message,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Échec de l'envoi du message.");
        return;
      }
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setShowContactModal(false);
        setContactForm({ name: '', email: '', message: '' });
      }, 2000);
    } catch (err) {
      console.error('Error sending portfolio contact message:', err);
      toast.error("Échec de l'envoi du message.");
    } finally {
      setIsSending(false);
    }
  };

  // --- DRAG AND DROP HELPERS ---
  const handleDragStart = (e: React.DragEvent, section: WebsiteSection) => {
    setDraggedSection(section);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', section);
  };

  const handleDragOver = (e: React.DragEvent, targetSection: WebsiteSection) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === targetSection) return;

    const newOrder = [...sections];
    const dragIndex = newOrder.indexOf(draggedSection);
    const targetIndex = newOrder.indexOf(targetSection);

    newOrder.splice(dragIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSection);

    setSections(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[newIndex];
    newSections[newIndex] = temp;

    setSections(newSections);
  };

  // --- THEMES ---
  // Each of the themes is a full layout (see portfolioThemes.tsx). They share
  // the editing helpers below, so in-place editing and reordering behave the same.
  const DynamicTemplateWrapper = ({ tpl }: { tpl: string }) => {
    const Theme = PORTFOLIO_THEME_COMPONENTS[resolvePortfolioTemplateId(tpl)];
    return (
      <Theme
        resume={resume}
        sections={sections}
        labels={t}
        Editable={EditableElement}
        updateField={updateField}
        updateNested={updateNested}
        updateSkill={updateSkill}
        wrapSection={(section, index, node) => (
          <DraggableWrapper
            key={section}
            section={section}
            showPreview={showPreview}
            draggedSection={draggedSection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onMoveUp={() => moveSection(index, -1)}
            onMoveDown={() => moveSection(index, 1)}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
          >
            {node}
          </DraggableWrapper>
        )}
        onContact={() => setShowContactModal(true)}
        onDownloadCV={onDownloadCV}
      />
    );
  };

  return (
    <div ref={rootRef} className={`flex flex-col h-full bg-slate-50 w-full font-sans`}>
      {/* TOOLBAR */}
      {!publicMode && (
        <header className="px-4 lg:px-8 py-3 bg-white border-b border-slate-200 z-10 relative space-y-2.5">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Globe className="text-indigo-600" size={18} /> {t.title}
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  {t.subtitle} • <span className="font-bold text-indigo-600">{PORTFOLIO_TEMPLATES_CATALOG.length} Modèles disponibles</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGalleryModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <LayoutGrid size={15} />
                <span>Galerie ({PORTFOLIO_TEMPLATES_CATALOG.length} Portfolios)</span>
              </button>
            </div>

            <div className="flex gap-2 lg:gap-3 items-center">
              {hasSaved && (
                <span className="text-xs text-[var(--status-green)] flex items-center gap-1 bg-[var(--status-green)]/10 px-2 py-1 rounded">
                  <CheckCircle size={12} /> Enregistré
                </span>
              )}
              {isSavingConfig && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Enregistrement...
                </span>
              )}

              {/* History Button */}
              {savedConfigs.length > 0 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors cursor-pointer"
                  title="Voir les configurations sauvegardées"
                >
                  <History size={16} />
                  <span className="text-xs">{savedConfigs.length}</span>
                </button>
              )}

              {/* Save Button */}
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save size={16} /> <span className="hidden sm:inline">Enregistrer</span>
              </button>

              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors cursor-pointer"
              >
                <Eye size={16} /> <span className="hidden sm:inline">{t.preview}</span>
              </button>

              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold shadow-sm transition-all cursor-pointer shadow-indigo-600/30"
              >
                <Share2 size={16} /> <span className="hidden sm:inline">{t.publish}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Portfolio Strip */}
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl w-max min-w-full">
              {PORTFOLIO_TEMPLATES_CATALOG.map((item) => {
                const isSelected = template === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-white shadow-sm text-slate-900 font-black ring-1 ring-indigo-500/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                      style={{ backgroundColor: item.previewAccent }}
                    />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      )}

      {/* PORTFOLIO TEMPLATES GALLERY MODAL */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Choisissez votre style
                </h2>
                <p className="text-xs text-slate-500">
                  {PORTFOLIO_TEMPLATES_CATALOG.length} mises en page vraiment différentes, pour tous les métiers. Votre contenu est repris automatiquement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200 shadow-2xs cursor-pointer self-end sm:self-center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category Filter Bar */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto bg-white">
              {[
                { id: 'all', label: `Tous (${PORTFOLIO_TEMPLATES_CATALOG.length})` },
                { id: 'clair', label: 'Clairs et sobres' },
                { id: 'marque', label: 'Plus marqués' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGalleryCategory(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    galleryCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Cards Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-min content-start gap-4 bg-slate-50/50">
              {PORTFOLIO_TEMPLATES_CATALOG.filter(
                (item) => galleryCategory === 'all' || item.category === galleryCategory
              ).map((item) => {
                const isSelected = template === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setTemplate(item.id);
                      setShowGalleryModal(false);
                    }}
                    className={`rounded-2xl border-2 overflow-hidden cursor-pointer transition-all flex flex-col justify-between bg-white hover:-translate-y-0.5 hover:shadow-lg ${
                      isSelected ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Visual Mini-Mockup Swatch */}
                    <div
                      className="h-28 p-4 flex flex-col justify-between relative overflow-hidden"
                      style={{ backgroundColor: item.previewBg, color: item.previewText }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: item.previewAccent, color: item.previewBg }}
                        >
                          {item.badge}
                        </span>
                        {isSelected && (
                          <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={11} /> Actif
                          </span>
                        )}
                      </div>

                      <div
                        className="rounded-lg p-2.5 border border-white/15 flex items-center justify-between"
                        style={{ backgroundColor: item.previewSurface }}
                      >
                        <div className="space-y-1">
                          <div
                            className="h-2 w-24 rounded"
                            style={{ backgroundColor: item.previewAccent }}
                          />
                          <div className="h-1.5 w-36 rounded opacity-40 bg-current" />
                        </div>
                        <div
                          className="w-5 h-5 rounded-full shrink-0"
                          style={{ backgroundColor: item.previewAccent }}
                        />
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          <h4 className="font-black text-sm text-slate-900">{item.name}</h4>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {item.audience}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600">
                        <span>Appliquer ce portfolio</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Builder Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto shadow-2xl rounded-xl overflow-hidden min-h-[800px] transition-all duration-300 border border-slate-200">
          <DynamicTemplateWrapper tpl={template} />
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {showPreview && !publicMode && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={() => setShowPreview(false)}
              className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-all font-medium border border-slate-700 cursor-pointer"
            >
              <X size={18} /> {lang === 'fr' ? 'Fermer l\'aperçu' : 'Close Preview'}
            </button>
          </div>
          <DynamicTemplateWrapper tpl={template} />
        </div>
      )}

      {/* PUBLISH MODAL */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Globe className="text-indigo-600" size={24} /> Publier le Portfolio
                </h2>
                <p className="text-sm text-slate-500 mt-1">Rendez votre site web accessible en ligne.</p>
              </div>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200 shadow-sm cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-indigo-50/60 border border-indigo-100 p-6 rounded-2xl flex flex-col items-center text-center">
                <Globe size={48} className="text-indigo-600 mb-4" />
                <h3 className="font-bold text-lg text-slate-800 mb-2">Publication Instantanée</h3>
                <p className="text-slate-600 text-sm mb-6 max-w-md leading-relaxed">
                  Hébergez votre portfolio avec un lien personnalisé. Tout visiteur pourra consulter votre parcours et télécharger votre CV.
                </p>

                <button
                  onClick={handlePublish}
                  disabled={isSavingConfig}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                  {isSavingConfig ? 'Publication...' : 'Publier Maintenant'}
                </button>

                {currentConfig?.is_published && publicSlug && (
                  <div className="mt-6 w-full p-4 bg-white rounded-xl border border-slate-200 text-left">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Votre URL Publique (sous-domaine)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={publicSubdomainUrl}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-700 font-mono"
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(publicSubdomainUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-200 transition-colors text-xs font-semibold cursor-pointer"
                      >
                        {copied ? <Check size={14} className="text-[var(--status-green)]" /> : <Copy size={14} />}
                      </button>
                      <a
                        href={publicSubdomainUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-900 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-800 transition-colors text-xs font-semibold"
                      >
                        <ExternalLink size={14} /> Voir
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Lien alternatif : <a href={publicPathUrl} target="_blank" rel="noreferrer" className="underline hover:text-slate-600">{publicPathUrl}</a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-start p-6 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{t.heroBtn}</h2>
                <p className="text-sm text-slate-500">Envoyez un message direct à {resume.fullName}.</p>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors ml-4 shrink-0 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {sendSuccess ? (
                <div className="bg-[var(--status-green)]/10 border border-[var(--status-green)]/30 rounded-xl p-8 text-center animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-[var(--status-green)]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--status-green)]">
                    <Check size={32} strokeWidth={3} />
                  </div>
                  <h3 className="font-bold text-[var(--status-green)] text-lg mb-2">Message Envoyé !</h3>
                  <p className="text-[var(--status-green)] text-sm">Merci pour votre message. Vous recevrez une réponse très rapidement.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 uppercase mb-1">Votre Nom</label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-base"
                      placeholder="Jean Dupont"
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 uppercase mb-1">Votre Email</label>
                    <input
                      type="email"
                      required
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-base"
                      placeholder="jean.dupont@exemple.fr"
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 uppercase mb-1">Message</label>
                    <textarea
                      required
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none text-base"
                      placeholder="Bonjour, j'aimerais échanger au sujet d'un projet..."
                      value={contactForm.message}
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    />
                  </div>
                </form>
              )}
            </div>

            {!sendSuccess && (
              <div className="shrink-0 p-6 pt-0 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={handleContactSubmit as any}
                  disabled={isSending}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg cursor-pointer text-xs"
                >
                  {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {isSending ? 'Envoi en cours...' : 'Envoyer le Message'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History size={20} className="text-indigo-600" />
                Configurations de Portfolio Sauvegardées
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
              ) : savedConfigs.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs">Aucune configuration sauvegardée.</p>
              ) : (
                <div className="space-y-3">
                  {savedConfigs.map(config => (
                    <div key={config.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800 text-sm">
                              {config.config_name || 'Mon Portfolio'}
                            </h4>
                            {config.is_published && (
                              <span className="text-[10px] bg-[var(--status-green)]/10 text-[var(--status-green)] px-2 py-0.5 rounded font-bold">
                                Publié
                              </span>
                            )}
                            {currentConfigId === config.id && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">
                                Actuel
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Thème: <span className="font-semibold text-slate-700">{getPortfolioTemplateMeta(config.template || 'modern').name}</span></p>
                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(config.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLoadConfig(config)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors cursor-pointer"
                          >
                            Charger
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(config.id)}
                            className="p-1.5 text-slate-400 hover:text-[var(--status-red)] hover:bg-[var(--status-red)]/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
