import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Trash2, Download, ZoomIn, ZoomOut, Send, Bot, GripVertical, Mail, Phone, MapPin, Link as LinkIcon, User, Upload, Loader2, Linkedin, Github, Car, Camera, X, FileText, File as FileIcon, FileType, Eye, CheckCircle2, Sparkles, LayoutTemplate, Layers, ArrowLeft, Home, ClipboardList } from 'lucide-react';
import { TEMPLATES_DATA, TemplateItem, MiniCvDocument, sortFeaturedTemplatesFirst } from './TemplatesGallery';
import { buildSampleResumeDataForTemplate } from './components/dashboard/CompactCvSample';
import { recommendTemplatesForRole } from './domain/resume-builder/templateRecommendation';
import { AtsCompatibilityWidget } from './components/AtsCompatibilityWidget';
import { optimizeText, generateSummary, generateBullets, generateResumeSection, parseResumeWithAI, auditResume } from './services/geminiService';
import { useAuth } from './contexts/AuthContext';
import { createUserResume, updateUserResume, getUserResumeById, FREE_TIER_CV_LIMIT_ERROR } from './lib/resumeStore';
import { logUserActivity } from './services/analytics';
import { checkExportEntitlement, consumeExportEntitlement } from './lib/exportApi';
import ExportPaywallModal from './components/ExportPaywallModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { TemplateType, TEMPLATES, TEMPLATE_NAMES } from './templates';
import {
  ResumePreview,
  ResumeData,
  Experience,
  Education,
  Project,
  CustomResumeSection,
  SectionId,
  ResumeSectionId,
  SECTION_LABELS,
} from './components/resume-preview/ResumePreview';
import { exportResumeToPdf } from './lib/cvPdfExport';

const initialData: ResumeData = {
  coordonnees: {
    name: 'Dwight K. Schrute III',
    jobTitle: 'Assistant au Directeur Régional',
    photoUrl: '',
    email: 'dschrute@schrutefarms.com',
    phone: '(570) 555-1212',
    website: 'linkedin.com/in/dwight-schrute',
    location: 'Scranton, PA',
    linkedin: '',
    github: '',
    drivingLicense: 'Permis B',
  },
  profil: 'Assistant au Directeur Régional avec une solide expérience dans la vente, la culture de la betterave et la distribution de papier. Reconnu pour son dévouement, sa loyauté et son approche unique de la résolution de problèmes.',
  experience: [
    {
      id: '1',
      company: 'Dunder Mifflin',
      jobTitle: 'Assistant au Directeur Régional',
      startDate: 'Mai 2013',
      endDate: '',
      current: true,
      location: 'Scranton, PA',
      description: '<ul><li>Assistant au Directeur Régional chez Dunder Mifflin</li><li>Maintien de la moyenne de ventes la plus élevée</li><li>Gestion et protection de la succursale de Scranton</li><li>A mené le bureau au succès</li></ul>',
    },
    {
      id: '2',
      company: 'Staples',
      jobTitle: 'Associé aux ventes',
      startDate: 'Mar 2008',
      endDate: 'Mar 2008',
      current: false,
      location: 'Scranton, PA',
      description: '<ul><li>Devenu le meilleur vendeur du magasin en un mois</li><li>A réalisé un chiffre d\'affaires record malgré un patron pas drôle</li><li>A fourni un service client extraordinaire et exceptionnel aux masses</li></ul>',
    }
  ],
  education: [
    {
      id: '1',
      institution: 'Scranton University',
      degree: 'BA Business Administration',
      date: '1994 - 1998',
    }
  ],
  competences: 'Travailleur, Mâle Alpha, Marteau-piqueur, Impitoyable, Insatiable\nKaraté (Ceinture Violette), Jujitsu, Chasse au loup-garou, Fabrication de tables',
  langues: 'Anglais (Courant)\nAllemand (Notions)',
  interets: 'Agriculture (Betteraves)\nArts martiaux\nSurvie',
  projets: [
    {
      id: '1',
      name: 'Schrute Farms (Bed and Breakfast)',
      description: 'Un magnifique complexe qui propose des activités amusantes comme la fabrication de tables et de matelas.',
    }
  ],
};

function SortableItem({ id, label }: { id: string; label: string; key?: React.Key }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md cursor-grab active:cursor-grabbing mb-2 hover:border-gray-400 transition-colors">
      <GripVertical size={16} className="text-gray-400" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

function DroppableColumn({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 rounded-md transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}
    >
      <h4 className="text-xs font-semibold text-gray-600 mb-2">{label}</h4>
      <div className="min-h-12 rounded-md">{children}</div>
    </div>
  );
}

const Input = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-md p-2.5 text-base focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 outline-none transition-all bg-gray-50 focus:bg-white"
    />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows = 4 }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, rows?: number }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-gray-300 rounded-md p-2.5 text-base resize-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 outline-none transition-all bg-gray-50 focus:bg-white"
    />
  </div>
);

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-5">
    <div className="flex items-center gap-2 mb-5 text-gray-800 font-bold text-sm">
      <GripVertical size={16} className="text-gray-400" />
      {title}
    </div>
    {children}
  </div>
);

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ]
};

export default function ResumeBuilder() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTemplate = (searchParams.get('template') as TemplateType) || 'minimalist';
  const activeId = searchParams.get('id');

  const getDefaultDataForTemplate = (tplId: TemplateType): ResumeData => {
    const found = TEMPLATES_DATA.find((t) => t.id === tplId);
    return found ? buildSampleResumeDataForTemplate(found) : initialData;
  };

  const [data, setData] = useState<ResumeData>(() => getDefaultDataForTemplate(initialTemplate));
  const baselineDataRef = useRef<string>(JSON.stringify(getDefaultDataForTemplate(initialTemplate)));
  const [isLoadingResume, setIsLoadingResume] = useState<boolean>(!!activeId);
  const loadedIdRef = useRef<string | null>(null);
  const currentIdRef = useRef<string | null>(activeId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set once a free-tier account (already at its 1-CV limit) tries to create
  // a second one. Blocks further autosave-create attempts (which would just
  // fail again every 900ms) until they either navigate to an existing resume
  // or upgrade.
  const [creationLimitReached, setCreationLimitReached] = useState(false);

  // Load resume data for the active id (or reset to a fresh, unsaved resume).
  useEffect(() => {
    let cancelled = false;
    setCreationLimitReached(false);

    if (!activeId) {
      currentIdRef.current = null;
      loadedIdRef.current = null;
      const fresh = getDefaultDataForTemplate(initialTemplate);
      baselineDataRef.current = JSON.stringify(fresh);
      setData(fresh);
      setIsLoadingResume(false);
      return;
    }

    currentIdRef.current = activeId;

    if (activeId === loadedIdRef.current) {
      setIsLoadingResume(false);
      return;
    }

    if (authLoading) {
      // Auth not resolved yet; this effect re-runs once it is.
      return;
    }

    if (!user?.id) {
      // /builder is reachable while logged out; there's no per-user resume to
      // fetch (and RLS would block it anyway), so fall back to a fresh editor.
      loadedIdRef.current = null;
      currentIdRef.current = null;
      const fresh = getDefaultDataForTemplate(initialTemplate);
      baselineDataRef.current = JSON.stringify(fresh);
      setData(fresh);
      setIsLoadingResume(false);
      return;
    }

    setIsLoadingResume(true);
    getUserResumeById(activeId, user.id).then((resume) => {
      if (cancelled) return;
      if (resume && resume.resumeData) {
        const { _meta, ...cleanResumeData } = resume.resumeData;
        setData({ ...initialData, ...cleanResumeData });
        loadedIdRef.current = activeId;
      } else {
        loadedIdRef.current = null;
        currentIdRef.current = null;
        const fresh = getDefaultDataForTemplate(initialTemplate);
        baselineDataRef.current = JSON.stringify(fresh);
        setData(fresh);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('id');
          return next;
        }, { replace: true });
      }
      setIsLoadingResume(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeId, user?.id, authLoading]);

  // Debounced autosave to Supabase, scoped to the logged-in user.
  useEffect(() => {
    if (isLoadingResume || !user?.id) return;
    // Don't silently create a DB row for a brand-new /builder visit until the
    // user actually edits something — otherwise every click into the editor
    // (even just to look) persists a junk placeholder resume.
    if (!currentIdRef.current && JSON.stringify(data) === baselineDataRef.current) return;
    // A free-tier account already blocked once this session — retrying the
    // same failing create every 900ms would just spam the same error.
    if (!currentIdRef.current && creationLimitReached) return;
    const userId = user.id;
    const plan = user.plan;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const idAtSaveTime = currentIdRef.current;
      const candidateName = data.coordonnees?.name;
      const jobTitle = data.coordonnees?.jobTitle;
      const resumeName = candidateName && candidateName !== initialData.coordonnees.name
        ? `CV ${candidateName}${jobTitle ? ' - ' + jobTitle : ''}`
        : 'Nouveau CV';

      (async () => {
        try {
          if (idAtSaveTime) {
            await updateUserResume(idAtSaveTime, userId, {
              name: resumeName,
              jobTitle,
              resumeData: data,
            });
          } else {
            const created = await createUserResume(
              userId,
              {
                name: resumeName,
                type: 'created',
                jobTitle,
                resumeData: data,
              },
              plan
            );
            currentIdRef.current = created.id;
            loadedIdRef.current = created.id;
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('id', created.id);
              return next;
            }, { replace: true });
          }
        } catch (e: any) {
          if (e?.message === FREE_TIER_CV_LIMIT_ERROR) {
            setCreationLimitReached(true);
          } else {
            console.error('Error autosaving resume:', e);
          }
        }
      })();
    }, 900);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, isLoadingResume, user?.id, creationLimitReached]);

  const [zoom, setZoom] = useState(0.65);
  const [template, setTemplate] = useState<TemplateType>(initialTemplate);
  const [layout, setLayout] = useState<'single' | 'double'>('single');
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [isImporting, setIsImporting] = useState(false);

  const handleColorChange = (templateId: string, color: string) => {
    setSelectedColors((prev) => ({ ...prev, [templateId]: color }));
  };
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const recommendedTemplates = recommendTemplatesForRole(data.coordonnees.jobTitle || '', TEMPLATES_DATA);
  const recommendedTemplateIds = new Set(recommendedTemplates.map(({ template: item }) => item.id));
  const [isExporting, setIsExporting] = useState(false);
  const [isExportPaywallOpen, setIsExportPaywallOpen] = useState(false);
  const [exportPaywallReason, setExportPaywallReason] = useState<'quota_exceeded' | 'no_subscription' | undefined>(undefined);
  const [mobileTab, setMobileTab] = useState<'all' | 'form' | 'preview' | 'ai'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setZoom(0.42);
      } else if (window.innerWidth < 1024) {
        setZoom(0.62);
      } else {
        setZoom(0.75);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Section Ordering State
  const [singleColumnOrder, setSingleColumnOrder] = useState<ResumeSectionId[]>([
    'experience', 'projets', 'education', 'competences', 'langues', 'interets'
  ]);
  const [mainColumnOrder, setMainColumnOrder] = useState<ResumeSectionId[]>([
    'experience', 'projets', 'education'
  ]);
  const [sideColumnOrder, setSideColumnOrder] = useState<ResumeSectionId[]>([
    'competences', 'langues', 'interets'
  ]);

  useEffect(() => {
    const customIds = (data.customSections || []).map((section) => section.id);
    if (!customIds.length) return;
    setSingleColumnOrder((items) => [...items, ...customIds.filter((id) => !items.includes(id))]);
    setMainColumnOrder((items) => [...items, ...customIds.filter((id) => !items.includes(id))]);
  }, [data.customSections]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndSingle = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSingleColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as ResumeSectionId);
        const newIndex = items.indexOf(over.id as ResumeSectionId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndDouble = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as ResumeSectionId;
    const overId = String(over.id);
    const source = mainColumnOrder.includes(activeId) ? 'main' : 'side';
    const target = overId === 'main-column' || mainColumnOrder.includes(overId as ResumeSectionId)
      ? 'main'
      : overId === 'side-column' || sideColumnOrder.includes(overId as ResumeSectionId)
        ? 'side'
        : null;

    if (!target) return;

    const sourceItems = source === 'main' ? mainColumnOrder : sideColumnOrder;
    const targetItems = target === 'main' ? mainColumnOrder : sideColumnOrder;
    const sourceIndex = sourceItems.indexOf(activeId);
    const targetIndex = overId === `${target}-column`
      ? targetItems.length
      : targetItems.indexOf(overId as ResumeSectionId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    if (source === target) {
      const reordered = arrayMove(sourceItems, sourceIndex, targetIndex);
      if (source === 'main') setMainColumnOrder(reordered);
      else setSideColumnOrder(reordered);
      return;
    }

    const nextSource = sourceItems.filter((id) => id !== activeId);
    const nextTarget = [...targetItems];
    nextTarget.splice(targetIndex, 0, activeId);
    if (source === 'main') setMainColumnOrder(nextSource);
    else setSideColumnOrder(nextSource);
    if (target === 'main') setMainColumnOrder(nextTarget);
    else setSideColumnOrder(nextTarget);
  };

  // AI State
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider à améliorer votre CV aujourd\'hui ?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [improvingProfile, setImprovingProfile] = useState(false);
  const [improvingExpId, setImprovingExpId] = useState<string | null>(null);
  const [improvingSkills, setImprovingSkills] = useState(false);
  const [improvingSectionId, setImprovingSectionId] = useState<string | null>(null);
  const [improvingAll, setImprovingAll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handlers
  const updateCoordonnees = (field: keyof ResumeData['coordonnees'], value: string) => {
    setData({ ...data, coordonnees: { ...data.coordonnees, [field]: value } });
  };

  const addExperience = () => {
    setData({ ...data, experience: [...data.experience, { id: Date.now().toString(), company: '', jobTitle: '', startDate: '', endDate: '', current: false, location: '', description: '' }] });
  };
  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    setData({ ...data, experience: data.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp) });
  };
  const removeExperience = (id: string) => {
    setData({ ...data, experience: data.experience.filter(exp => exp.id !== id) });
  };

  const addEducation = () => {
    setData({ ...data, education: [...data.education, { id: Date.now().toString(), institution: '', degree: '', date: '' }] });
  };
  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setData({ ...data, education: data.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu) });
  };
  const removeEducation = (id: string) => {
    setData({ ...data, education: data.education.filter(edu => edu.id !== id) });
  };

  const addProject = () => {
    setData({ ...data, projets: [...data.projets, { id: Date.now().toString(), name: '', description: '' }] });
  };
  const updateProject = (id: string, field: keyof Project, value: string) => {
    setData({ ...data, projets: data.projets.map(proj => proj.id === id ? { ...proj, [field]: value } : proj) });
  };
  const removeProject = (id: string) => {
    setData({ ...data, projets: data.projets.filter(proj => proj.id !== id) });
  };

  const PROFILE_UPDATE_KEYWORDS = ['résumé', 'resume', 'profil', 'accroche', 'summary', 'à propos', 'a propos'];
  const EXPERIENCE_UPDATE_KEYWORDS = ['expérience', 'experience', 'poste', 'missions', 'bullet', 'puce'];
  const SKILLS_UPDATE_KEYWORDS = ['compétences', 'competences', 'hard skills'];
  const FULL_RESUME_UPDATE_KEYWORDS = [
    'tout le cv', 'cv entier', 'tout mon cv', 'réécris tout', 'reecris tout',
    'améliore tout', 'ameliore tout', 'optimise tout', 'optimise mon cv',
    'améliore mon cv', 'ameliore mon cv', 'génère mon cv', 'genere mon cv', 'filtres ats'
  ];
  const CREATE_SECTION_REQUEST = /(?:cr[eé][eé]r?|ajout(?:e|er)|g[eéè]n[eéè]r(?:e|er)|construi(?:s|re)|fai(?:s|re)|r[eé]dig(?:e|er)|propos(?:e|er)|extrai(?:s|re)|create|add|generate|make|build|nouvelle).{0,60}(?:section|rubrique|cat[eé]gorie|bloc|partie)|(?:section|rubrique|cat[eé]gorie|bloc|partie).{0,60}(?:cr[eé][eé]r?|ajout(?:e|er)|g[eéè]n[eéè]r(?:e|er)|construi(?:s|re)|fai(?:s|re)|r[eé]dig(?:e|er)|propos(?:e|er)|extrai(?:s|re)|create|add|generate|make|build)|\b(?:certifications?|b[eé]n[eé]volat|publications?|distinctions?|r[eé]compenses?|atouts?|points?\s+forts?|outils?|logiciels?|soft\s+skills?|formations?\s+compl[eé]mentaires?|habilitations?|qualifications?|r[eé]f[eé]rences?|contributions?|conf[eé]rences?|associatif|r[eé]alisations?\s+cl[eé]s?)\b/i;

  const getExperienceSummaryText = () =>
    data.experience
      .map(exp => `${exp.jobTitle} chez ${exp.company} (${exp.startDate}${exp.current ? ' - présent' : exp.endDate ? ` - ${exp.endDate}` : ''})`)
      .join('; ') || 'Aucune expérience renseignée';

  const getSkillsList = () => data.competences.split('\n').map(s => s.trim()).filter(Boolean);

  const buildResumeContext = () => {
    const lines: string[] = [];
    if (data.coordonnees.name) lines.push(`Candidat : ${data.coordonnees.name}`);
    if (data.coordonnees.jobTitle) lines.push(`Poste : ${data.coordonnees.jobTitle}`);
    if (data.coordonnees.location) lines.push(`Localisation : ${data.coordonnees.location}`);
    if (data.coordonnees.drivingLicense) lines.push(`Permis : ${data.coordonnees.drivingLicense}`);
    if (data.profil) lines.push(`Profil : ${data.profil}`);
    if (data.experience.length > 0) {
      lines.push('Expériences :');
      data.experience.forEach((exp) => {
        const header = `${exp.jobTitle} chez ${exp.company} (${exp.startDate}${exp.current ? ' - présent' : exp.endDate ? ` - ${exp.endDate}` : ''})`.trim();
        const desc = exp.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        lines.push(desc ? `${header}\n${desc}` : header);
      });
    }
    if (data.education.length > 0) {
      lines.push('Formations :');
      data.education.forEach((edu) => {
        lines.push(`${edu.degree} - ${edu.institution} (${edu.date})`.trim());
      });
    }
    if (data.competences.trim()) lines.push(`Compétences : ${data.competences.trim()}`);
    if (data.langues.trim()) lines.push(`Langues : ${data.langues.trim()}`);
    if (data.interets.trim()) lines.push(`Intérêts : ${data.interets.trim()}`);
    if (data.projets.length > 0) {
      lines.push('Projets :');
      data.projets.forEach((project) => {
        lines.push(`${project.name} : ${project.description}`.trim());
      });
    }
    (data.customSections || []).forEach((section) => {
      if (section.title || section.content.length > 0) {
        lines.push(`${section.title} :`);
        lines.push(...section.content);
      }
    });
    return lines.filter((line) => line.trim()).join('\n');
  };

  const updateCustomSection = (sectionId: string, update: Partial<CustomResumeSection>) => {
    setData((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).map((section) =>
        section.id === sectionId ? { ...section, ...update } : section
      ),
    }));
  };

  const removeCustomSection = (sectionId: string) => {
    setData((prev) => ({
      ...prev,
      customSections: (prev.customSections || []).filter((section) => section.id !== sectionId),
    }));
    setSingleColumnOrder((items) => items.filter((id) => id !== sectionId));
    setMainColumnOrder((items) => items.filter((id) => id !== sectionId));
    setSideColumnOrder((items) => items.filter((id) => id !== sectionId));
  };

  const getSectionLabel = (id: ResumeSectionId) =>
    SECTION_LABELS[id as SectionId] || data.customSections?.find((section) => section.id === id)?.title || id;

  // Regenerates data.profil from the job title + experience + skills already on the canvas.
  const improveProfileWithAI = async () => {
    setImprovingProfile(true);
    try {
      const jobTitle = data.coordonnees.jobTitle || 'Candidat';
      const newProfil = await generateSummary(jobTitle, getExperienceSummaryText(), getSkillsList());
      setData(prev => ({ ...prev, profil: newProfil }));
      return newProfil;
    } finally {
      setImprovingProfile(false);
    }
  };

  // Rewrites one experience's description into STAR-method bullets, based on its own current text.
  const improveExperienceWithAI = async (expId: string) => {
    const exp = data.experience.find(e => e.id === expId);
    if (!exp) return null;
    setImprovingExpId(expId);
    try {
      const plainDescription = exp.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const bullets = await generateBullets(
        exp.jobTitle || 'Poste',
        exp.company || 'Entreprise',
        plainDescription || `${exp.jobTitle} chez ${exp.company}`
      );
      const safeBullets = Array.isArray(bullets) ? bullets : [];
      const html = `<ul>${safeBullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
      setData(prev => ({ ...prev, experience: prev.experience.map(e => e.id === expId ? { ...e, description: html } : e) }));
      return safeBullets;
    } finally {
      setImprovingExpId(null);
    }
  };

  const improveSkillsWithAI = async () => {
    setImprovingSkills(true);
    try {
      const generated = await generateResumeSection('Crée une rubrique Compétences clés et techniques à partir de mon CV', buildResumeContext());
      const existingSkills = getSkillsList();
      const merged = [...new Set([...existingSkills, ...generated.items])];
      const nextSkills = merged.join('\n');
      setData(prev => ({ ...prev, competences: nextSkills }));
      return generated.items;
    } finally {
      setImprovingSkills(false);
    }
  };

  const createOrUpdateCustomSectionWithAI = async (sectionRequest: string, targetSectionId?: string) => {
    if (targetSectionId) setImprovingSectionId(targetSectionId);
    try {
      const generated = await generateResumeSection(sectionRequest, buildResumeContext());
      const existing = targetSectionId
        ? (data.customSections || []).find((s) => s.id === targetSectionId)
        : (data.customSections || []).find((s) => s.title.trim().toLowerCase() === generated.title.trim().toLowerCase());

      if (existing) {
        const updatedSection: CustomResumeSection = {
          ...existing,
          title: targetSectionId ? existing.title || generated.title : generated.title,
          content: generated.items,
        };
        setData((prev) => ({
          ...prev,
          customSections: (prev.customSections || []).map((s) => (s.id === existing.id ? updatedSection : s)),
        }));
        return { section: updatedSection, isNew: false };
      }

      const section: CustomResumeSection = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: generated.title,
        content: generated.items,
      };
      setData((prev) => ({ ...prev, customSections: [...(prev.customSections || []), section] }));
      setSingleColumnOrder((items) => [...items.filter((id) => id !== section.id), section.id]);
      setMainColumnOrder((items) => [...items.filter((id) => id !== section.id), section.id]);
      return { section, isNew: true };
    } finally {
      if (targetSectionId) setImprovingSectionId(null);
    }
  };

  // Chains the profile + every filled-in experience, using only what's already on the canvas.
  const improveWholeResumeWithAI = async () => {
    setImprovingAll(true);
    try {
      await improveProfileWithAI();
      let improvedCount = 0;
      for (const exp of data.experience) {
        if (!exp.company && !exp.jobTitle && !exp.description) continue;
        try {
          await improveExperienceWithAI(exp.id);
          improvedCount++;
        } catch (err) {
          console.error('Error improving experience', exp.id, err);
        }
      }
      return improvedCount;
    } finally {
      setImprovingAll(false);
    }
  };

  const handleProfileButtonClick = async () => {
    try {
      await improveProfileWithAI();
      setMessages(prev => [...prev, { role: 'model', text: "J'ai régénéré votre résumé de profil à partir de votre poste et de votre expérience." }]);
    } catch (error) {
      console.error('Error improving profile:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Une erreur est survenue lors de la génération du profil.' }]);
    }
  };

  const handleExperienceButtonClick = async (expId: string) => {
    try {
      await improveExperienceWithAI(expId);
      setMessages(prev => [...prev, { role: 'model', text: "J'ai réécrit cette expérience en puces percutantes." }]);
    } catch (error) {
      console.error('Error improving experience:', error);
      setMessages(prev => [...prev, { role: 'model', text: "Une erreur est survenue lors de l'amélioration de cette expérience." }]);
    }
  };

  const handleSkillsButtonClick = async () => {
    try {
      await improveSkillsWithAI();
      setMessages(prev => [...prev, { role: 'model', text: "J'ai enrichi votre rubrique Compétences à partir des informations de votre CV." }]);
    } catch (error) {
      console.error('Error improving skills:', error);
      setMessages(prev => [...prev, { role: 'model', text: "Une erreur est survenue lors de la génération des compétences." }]);
    }
  };

  const handleCustomSectionRegenerate = async (section: CustomResumeSection) => {
    try {
      const { section: updated } = await createOrUpdateCustomSectionWithAI(
        `Crée une rubrique ${section.title} à partir de mon CV`,
        section.id
      );
      setMessages(prev => [...prev, { role: 'model', text: `J'ai régénéré le contenu de la rubrique « ${updated.title} » à partir de votre CV.` }]);
    } catch (error) {
      console.error('Error regenerating custom section:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la régénération de cette rubrique.';
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    }
  };

  const handleWholeResumeButtonClick = async () => {
    setMessages(prev => [...prev, { role: 'model', text: 'Je réécris votre profil et vos expériences à partir du contenu déjà présent dans votre CV...' }]);
    try {
      const count = await improveWholeResumeWithAI();
      setMessages(prev => [...prev, { role: 'model', text: `C'est fait ! J'ai amélioré votre profil${count ? ` et ${count} expérience${count > 1 ? 's' : ''}` : ''}. Jetez un œil à l'aperçu.` }]);
    } catch (error) {
      console.error('Error improving whole resume:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Une erreur est survenue pendant la génération du CV.' }]);
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const textToSend = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!textToSend) return;

    const userText = textToSend;
    const newMessages = [...messages, { role: 'user' as const, text: userText }];
    setMessages(newMessages);
    if (typeof overrideText !== 'string') {
      setInput('');
    }
    setIsTyping(true);

    try {
      const lowerText = userText.toLowerCase();
      const wantsFullResumeUpdate = FULL_RESUME_UPDATE_KEYWORDS.some(k => lowerText.includes(k));
      const wantsProfileUpdate = !wantsFullResumeUpdate && PROFILE_UPDATE_KEYWORDS.some(k => lowerText.includes(k));
      const wantsExperienceUpdate = !wantsFullResumeUpdate && !wantsProfileUpdate && EXPERIENCE_UPDATE_KEYWORDS.some(k => lowerText.includes(k));
      const wantsSkillsUpdate = !wantsFullResumeUpdate && !wantsProfileUpdate && !wantsExperienceUpdate &&
        SKILLS_UPDATE_KEYWORDS.some(k => lowerText.includes(k)) && !/soft\s+skills?/i.test(userText);
      const isQuestionOrGreeting = /^(?:bonjour|salut|hello|coucou|merci|comment|pourquoi|quel(?:le)?s?|est-ce\s+que)\b/i.test(lowerText) || userText.includes('?');
      const wantsSectionCreation = !wantsFullResumeUpdate && !wantsProfileUpdate && !wantsExperienceUpdate && !wantsSkillsUpdate &&
        (CREATE_SECTION_REQUEST.test(userText) || !isQuestionOrGreeting);

      if (wantsFullResumeUpdate) {
        const count = await improveWholeResumeWithAI();
        setMessages([...newMessages, { role: 'model', text: `C'est fait ! J'ai réécrit votre profil${count ? ` et ${count} expérience${count > 1 ? 's' : ''}` : ''} à partir des informations déjà présentes dans votre CV.` }]);
      } else if (wantsProfileUpdate) {
        const jobTitle = data.coordonnees.jobTitle || 'Candidat';
        await improveProfileWithAI();
        setMessages([...newMessages, { role: 'model', text: `J'ai mis à jour le résumé de profil sur votre CV en fonction du poste "${jobTitle}" et de votre expérience.` }]);
      } else if (wantsExperienceUpdate) {
        if (data.experience.length === 0) {
          setMessages([...newMessages, { role: 'model', text: "Ajoutez d'abord une expérience dans le formulaire, puis je pourrai l'améliorer." }]);
        } else {
          const matchingExp = data.experience.find(
            (e) => (e.company && lowerText.includes(e.company.toLowerCase())) || (e.jobTitle && lowerText.includes(e.jobTitle.toLowerCase()))
          );
          if (matchingExp || data.experience.length === 1) {
            const targetExp = matchingExp || data.experience[0];
            await improveExperienceWithAI(targetExp.id);
            setMessages([...newMessages, { role: 'model', text: `J'ai réécrit la description de votre expérience chez ${targetExp.company || 'cette entreprise'} en puces percutantes.` }]);
          } else {
            let improvedCount = 0;
            for (const exp of data.experience) {
              if (!exp.company && !exp.jobTitle && !exp.description) continue;
              await improveExperienceWithAI(exp.id);
              improvedCount++;
            }
            setMessages([...newMessages, { role: 'model', text: `J'ai réécrit vos ${improvedCount} expériences professionnelles en puces percutantes.` }]);
          }
        }
      } else if (wantsSkillsUpdate) {
        await improveSkillsWithAI();
        setMessages([...newMessages, { role: 'model', text: `J'ai généré et mis à jour votre rubrique Compétences à partir de votre CV.` }]);
      } else if (wantsSectionCreation) {
        const { section, isNew } = await createOrUpdateCustomSectionWithAI(userText);
        setMessages([
          ...newMessages,
          {
            role: 'model',
            text: `J’ai ${isNew ? 'créé' : 'mis à jour'} la rubrique « ${section.title} » (${section.content.length} élément${section.content.length > 1 ? 's' : ''}) à partir des informations présentes dans votre CV. Vous pouvez modifier son titre et son contenu dans le formulaire.`,
          },
        ]);
      } else {
        const reply = await optimizeText(`${userText}\n\nContexte CV :\n${buildResumeContext()}`, data.coordonnees.jobTitle || 'Candidat');
        setMessages([...newMessages, { role: 'model', text: reply || 'Conseil enregistré pour votre CV.' }]);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de la communication avec l\'IA.';
      setMessages([...newMessages, { role: 'model', text: errorMessage }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsImporting(true);
    try {
      // pdfjs-dist/mammoth are only needed for this one-off import action —
      // dynamic import keeps them out of the builder's initial route chunk.
      const { extractTextFromFile, parseAndBuildResumeData } = await import('./utils/resumeParser');
      const rawText = await extractTextFromFile(file);
      if (!rawText || rawText.trim().length < 15) {
        alert('Aucun texte lisible n’a été trouvé dans ce fichier. Vérifiez qu’il s’agit d’un PDF contenant du texte, d’un DOCX, d’un DOC ou d’un TXT.');
        setIsImporting(false);
        if (e.target) e.target.value = '';
        return;
      }

      const [parsedData, atsAnalysis] = await Promise.all([
        parseResumeWithAI(rawText),
        auditResume(rawText).catch((error) => {
          console.error('ATS analysis failed for imported CV:', error);
          return null;
        }),
      ]);
      const newResumeData: ResumeData = parseAndBuildResumeData(parsedData);

      // Update current state in builder
      setData(newResumeData);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const candidateName = newResumeData.coordonnees?.name || file.name.replace(/\.[^/.]+$/, "");
      const jobTitle = newResumeData.coordonnees?.jobTitle || 'Importé';
      const resumeName = `CV ${candidateName}${jobTitle ? ' - ' + jobTitle : ''}`;
      const meta = {
        template: 'Fichier Importé',
        fileName: file.name,
        fileSize: `${Math.round(file.size / 1024)} KB`,
        ...(atsAnalysis ? {
          atsScore: atsAnalysis.atsScore,
          keywordsCount: atsAnalysis.missingKeywords.length,
        } : {}),
      };

      if (currentIdRef.current) {
        await updateUserResume(currentIdRef.current, user.id, {
          name: resumeName,
          type: 'uploaded',
          jobTitle,
          resumeData: newResumeData,
          meta,
        });
        loadedIdRef.current = currentIdRef.current;
      } else {
        const created = await createUserResume(
          user.id,
          {
            name: resumeName,
            type: 'uploaded',
            jobTitle,
            resumeData: newResumeData,
            meta,
          },
          user.plan
        );
        currentIdRef.current = created.id;
        loadedIdRef.current = created.id;
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('id', created.id);
          return next;
        }, { replace: true });
      }

      alert(atsAnalysis
        ? `CV importé, chargé et analysé par l’ATS (score : ${atsAnalysis.atsScore}/100).`
        : 'CV importé et enregistré, mais l’analyse ATS est indisponible. Rechargez la page pour réessayer.');
    } catch (error: any) {
      if (error?.message === FREE_TIER_CV_LIMIT_ERROR) {
        alert('Formule Gratuite : 1 CV maximum. Passez à Pro pour importer et enregistrer plusieurs CV.');
      } else {
        console.error('Error parsing resume:', error);
        alert('Une erreur est survenue lors de l\'analyse du CV. Veuillez vérifier le fichier.');
      }
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const performExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportResumeToPdf({
        data,
        template,
        layout,
        singleColumnOrder,
        mainColumnOrder,
        sideColumnOrder,
        fileName: `${data.coordonnees.name.replace(/\s+/g, '_')}_CV`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  const performExportDOCX = () => {
    setIsExporting(true);

    // Create a new Document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: data.coordonnees.name,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: data.coordonnees.jobTitle,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: `${data.coordonnees.email} | ${data.coordonnees.phone} | ${data.coordonnees.location}`,
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Profil",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            text: data.profil,
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Expérience",
            heading: HeadingLevel.HEADING_3,
          }),
          ...data.experience.map(exp => [
            new Paragraph({
              text: `${exp.jobTitle} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Présent' : exp.endDate})`,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
              text: exp.description.replace(/<[^>]*>?/gm, ''), // Strip HTML tags for simple text export
            })
          ]).flat(),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Éducation",
            heading: HeadingLevel.HEADING_3,
          }),
          ...data.education.map(edu => [
            new Paragraph({
              text: `${edu.degree} at ${edu.institution} (${edu.date})`,
              heading: HeadingLevel.HEADING_4,
            })
          ]).flat(),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            text: "Compétences",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            text: data.competences,
          })
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${data.coordonnees.name.replace(/\s+/g, '_')}_CV.docx`);
      setIsExporting(false);
      setIsExportModalOpen(false);
    });
  };

  // Download-time paywall: PDF/DOCX are the monetized formats. Only Max is
  // truly unlimited, checked straight off AuthContext with no server round
  // trip. Every other plan is capped (Pro: 10/month, free: 1 CV/month, no
  // free cover letters) and must go through the server round trip, since
  // the quota counter and one-time export_entitlements credits are only
  // knowable server-side.
  const attemptExport = async (format: 'pdf' | 'docx') => {
    if (!user?.id) return;
    logUserActivity(user.id, 'cv_download_clicked', { format, cvId: currentIdRef.current });

    const isUnlimitedSubscriber = user.plan === 'max';
    let entitled = isUnlimitedSubscriber;
    let usedServerCheck = false;

    if (!entitled) {
      const result = await checkExportEntitlement('cv');
      entitled = result.entitled;
      usedServerCheck = true;
      if (!entitled) {
        setExportPaywallReason(result.reason);
      }
    }

    if (!entitled) {
      setIsExportModalOpen(false);
      logUserActivity(user.id, 'export_paywall_opened', { documentType: 'cv', format });
      setIsExportPaywallOpen(true);
      return;
    }

    if (format === 'pdf') {
      await performExportPDF();
    } else {
      performExportDOCX();
    }

    // Any path that went through the server round trip consumed either a
    // Pro monthly quota slot or a one-time credit — either way, tell the
    // server so it can record the consumption. The unlimited-Max shortcut
    // never touched the server, so there's nothing to consume.
    if (usedServerCheck) {
      await consumeExportEntitlement('cv', format, currentIdRef.current || undefined);
    }
    logUserActivity(user.id, 'export_completed', { documentType: 'cv', format });
  };

  const handleExportPDF = () => attemptExport('pdf');
  const handleExportDOCX = () => attemptExport('docx');

  const handleExportTXT = () => {
    setIsExporting(true);
    let text = `${data.coordonnees.name}\n${data.coordonnees.jobTitle}\n\n`;
    text += `Contact: ${data.coordonnees.email} | ${data.coordonnees.phone} | ${data.coordonnees.location}\n\n`;
    text += `Profil:\n${data.profil}\n\n`;
    
    if (data.experience.length > 0) {
      text += `Expérience:\n`;
      data.experience.forEach(exp => {
        text += `- ${exp.jobTitle} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Présent' : exp.endDate})\n`;
        text += `  ${exp.description.replace(/<[^>]*>?/gm, '')}\n`;
      });
      text += `\n`;
    }

    if (data.education.length > 0) {
      text += `Éducation:\n`;
      data.education.forEach(edu => {
        text += `- ${edu.degree} at ${edu.institution} (${edu.date})\n`;
      });
      text += `\n`;
    }

    if (data.competences) {
      text += `Compétences:\n${data.competences}\n\n`;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${data.coordonnees.name.replace(/\s+/g, '_')}_CV.txt`);
    setIsExporting(false);
    setIsExportModalOpen(false);
  };

  if (isLoadingResume) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f3f4f6]">
        <Loader2 className="w-8 h-8 text-gray-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f3f4f6] font-sans overflow-hidden">
      <ExportPaywallModal
        isOpen={isExportPaywallOpen}
        onClose={() => setIsExportPaywallOpen(false)}
        documentType="cv"
        reason={exportPaywallReason}
        documentId={currentIdRef.current || undefined}
      />

      {creationLimitReached && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-3 text-xs text-amber-800 text-center">
          <span>
            La formule Gratuite est limitée à 1 CV — ce nouveau CV ne sera pas enregistré. Passez à Pro pour en créer plusieurs.
          </span>
          <Link to="/pricing" className="font-bold underline underline-offset-2 shrink-0">
            Voir les formules
          </Link>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col lg:flex-row overflow-hidden max-h-[90vh]">
            {/* Left: Preview */}
            <div className="w-full lg:w-1/2 bg-gray-100 p-4 sm:p-8 overflow-y-auto flex justify-center items-start min-h-[220px] border-b lg:border-b-0 lg:border-r border-gray-200">
              <div className="scale-[0.38] sm:scale-[0.45] origin-top">
                <ResumePreview
                  id="resume-preview-thumb"
                  data={data}
                  template={template}
                  layout={layout}
                  singleColumnOrder={singleColumnOrder}
                  mainColumnOrder={mainColumnOrder}
                  sideColumnOrder={sideColumnOrder}
                />
              </div>
            </div>

            {/* Right: Options */}
            <div className="w-full lg:w-1/2 p-4 sm:p-8 flex flex-col relative overflow-y-auto">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Télécharger votre CV</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-6">Choisissez le format qui correspond le mieux à vos besoins.</p>
              
              <div className="space-y-3 sm:space-y-4 flex-1">
                <button 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-800 group-hover:text-red-700">Format PDF</h3>
                    <p className="text-xs text-gray-500">Recommandé. Préserve la mise en page exacte.</p>
                  </div>
                </button>

                <button 
                  onClick={handleExportDOCX}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileIcon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-800 group-hover:text-blue-700">Format Word (DOCX)</h3>
                    <p className="text-xs text-gray-500">Idéal pour modifier le texte ultérieurement.</p>
                  </div>
                </button>

                <button 
                  onClick={handleExportTXT}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 border-gray-200 hover:border-gray-500 hover:bg-gray-100 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileType size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-800 group-hover:text-gray-900">Format Texte (TXT)</h3>
                    <p className="text-xs text-gray-500">Texte brut, parfait pour les systèmes ATS stricts.</p>
                  </div>
                </button>
              </div>

              {isExporting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-gray-800 font-medium text-xs sm:text-sm">
                  <Loader2 className="animate-spin" size={18} />
                  Préparation de votre fichier...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Choisir un modèle de CV</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Sélectionnez un modèle pour l'appliquer immédiatement à votre CV.</p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-5 sm:px-6 py-3 border-b border-gray-100 shrink-0 custom-scrollbar">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'modern', label: 'Moderne' },
                { key: 'professional', label: 'Professionnel' },
                { key: 'simple', label: 'Épuré' },
                { key: 'with-photo', label: 'Avec Photo' },
                { key: 'ats', label: 'Format ATS' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setTemplateCategory(cat.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    templateCategory === cat.key
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {data.coordonnees.jobTitle?.trim() && (
              <div className="border-b border-gray-100 bg-sky-50/60 px-5 py-3 sm:px-6">
                <p className="mb-2 text-xs font-extrabold text-sky-800">
                  Suggestions pour {data.coordonnees.jobTitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendedTemplates.map(({ template: item, reasons }) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (!currentIdRef.current && JSON.stringify(data) === baselineDataRef.current) {
                          const nextSample = getDefaultDataForTemplate(item.id);
                          baselineDataRef.current = JSON.stringify(nextSample);
                          setData(nextSample);
                        } else if (item.photoUrl && !data.coordonnees.photoUrl) {
                          setData((prev) => ({
                            ...prev,
                            coordonnees: { ...prev.coordonnees, photoUrl: item.photoUrl || '' },
                          }));
                        }
                        setTemplate(item.id);
                        setIsTemplateModalOpen(false);
                      }}
                      className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-left hover:border-sky-500"
                    >
                      <span className="block text-xs font-bold text-slate-900">{item.name}</span>
                      <span className="block text-xs text-slate-500">{reasons.join(' · ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Template Cards Grid */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {sortFeaturedTemplatesFirst(
                  TEMPLATES_DATA.filter(
                    (item) =>
                      templateCategory === 'all' ||
                      item.categories.includes(templateCategory as any)
                  )
                ).map((item) => {
                  const isSelected = template === item.id;
                  const currentColor = selectedColors[item.id] || item.colors[0];

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!currentIdRef.current && JSON.stringify(data) === baselineDataRef.current) {
                          const nextSample = getDefaultDataForTemplate(item.id);
                          baselineDataRef.current = JSON.stringify(nextSample);
                          setData(nextSample);
                        } else if (item.photoUrl && !data.coordonnees.photoUrl) {
                          setData((prev) => ({
                            ...prev,
                            coordonnees: { ...prev.coordonnees, photoUrl: item.photoUrl || '' },
                          }));
                        }
                        setTemplate(item.id);
                        setIsTemplateModalOpen(false);
                      }}
                      className={`bg-[#f2f4f8] rounded-xl border transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden relative hover:shadow-md ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-600/30 bg-blue-50/20'
                          : 'border-gray-200/90 hover:border-blue-400'
                      }`}
                    >
                      {/* Active Indicator Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-20 bg-blue-600 text-white text-xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> Sélectionné
                        </div>
                      )}
                      {recommendedTemplateIds.has(item.id) && !isSelected && (
                        <div className="absolute left-2 top-2 z-20 rounded-full border border-sky-200 bg-white/95 px-2 py-0.5 text-xs font-extrabold text-sky-800">
                          Recommandé
                        </div>
                      )}

                      {/* Photo-like Mini A4 Sheet Preview Container */}
                      <div className="p-3 relative h-[240px] flex items-center justify-center overflow-hidden border-b border-gray-100/80">
                        {/* Realistic Mini A4 Paper Document Sheet */}
                        <div
                          className={`w-[155px] h-[219px] bg-white rounded-xs transition-transform duration-300 group-hover:scale-[1.03] text-[6px] text-gray-700 leading-tight select-none relative flex flex-col justify-between overflow-hidden ${
                            item.hasBorderFrame ? 'border border-gray-800' : ''
                          }`}
                        >
                          <MiniCvDocument
                            template={item}
                            accentColor={currentColor}
                          />
                        </div>

                        {/* Floating Bottom Bar inside Card Preview: Color palette & PDF/DOCX Badges */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-10">
                          {/* Color Selector Dots */}
                          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-gray-200/90">
                            {item.colors.map((c) => {
                              const isColorActive = currentColor === c;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleColorChange(item.id, c);
                                  }}
                                  style={{ backgroundColor: c }}
                                  className={`w-3 h-3 rounded-full border transition-transform hover:scale-125 ${
                                    isColorActive
                                      ? 'border-gray-900 scale-110 ring-1 ring-black'
                                      : 'border-transparent opacity-80'
                                  }`}
                                  title={`Palette: ${c}`}
                                />
                              );
                            })}
                          </div>

                          {/* Format Badges */}
                          <div className="flex items-center gap-0.5">
                            <span className="bg-slate-200/90 text-slate-700 text-[8px] font-bold font-mono px-1 py-0.5 rounded">
                              PDF
                            </span>
                            <span className="bg-slate-200/90 text-slate-700 text-[8px] font-bold font-mono px-1 py-0.5 rounded">
                              DOCX
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Template Title & Description */}
                      <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-xs text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-200 shrink-0 z-20 gap-2">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link
            to="/dashboard"
            className="lg:hidden p-1.5 rounded-xl bg-[#edf3f6] text-[#102d3e] hover:bg-[#dce8ee] transition-colors shrink-0"
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="lg:hidden min-w-0">
            <h1 className="text-sm font-extrabold text-[#102d3e] truncate">
              Mon CV - {data.coordonnees.jobTitle || data.coordonnees.name || 'Data Analyst'}
            </h1>
            <p className="text-xs text-[#456071] truncate">
              Dernière modification : aujourd'hui
            </p>
          </div>
          <Link to="/dashboard" className="hidden lg:inline text-xl sm:text-2xl font-black text-tertiary tracking-tight hover:text-[#007568] transition-colors">Lettrup</Link>
          <div className="hidden lg:block h-5 sm:h-6 w-px bg-tertiary/20"></div>
          <span className="hidden lg:inline text-[#456071] font-medium text-xs sm:text-sm">
            Mon CV - {data.coordonnees.jobTitle || data.coordonnees.name || 'Éditeur de CV'}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 shrink-0">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-tertiary hover:bg-[#093b50] text-white font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Télécharger</span>
          </button>
          <Link to="/dashboard" className="hidden sm:inline text-tertiary hover:text-[#007568] font-semibold">Tableau de bord</Link>
        </div>
      </header>

      {/* Mobile Navigation Tabs */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-2 sm:px-4 py-2 flex items-center justify-around gap-1 text-xs font-bold text-gray-700">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
            mobileTab === 'form' ? 'bg-tertiary text-white' : 'hover:bg-tertiary/5 text-[#456071]'
          }`}
        >
          <FileText size={14} /> Formulaire
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
            mobileTab === 'preview' ? 'bg-tertiary text-white' : 'hover:bg-tertiary/5 text-[#456071]'
          }`}
        >
          <Eye size={14} /> Aperçu CV
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('ai')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
            mobileTab === 'ai' ? 'bg-tertiary text-white' : 'hover:bg-tertiary/5 text-[#456071]'
          }`}
        >
          <Bot size={14} /> Assistant IA
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('all')}
          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
            mobileTab === 'all' ? 'bg-tertiary text-white' : 'hover:bg-tertiary/5 text-[#456071]'
          }`}
        >
          Vue Empilée
        </button>
      </div>

      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden min-h-0 relative pb-28 lg:pb-0">
        {/* Left Column: Form */}
        <div className={`w-full lg:w-[420px] lg:shrink-0 bg-[#f3f7fa] border-b lg:border-b-0 lg:border-r border-tertiary/10 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 z-10 custom-scrollbar ${
          mobileTab === 'preview' || mobileTab === 'ai' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Mobile Candidate Header Card (11. Vue mobile) */}
          <div className="lg:hidden bg-[#062b3b] text-white rounded-lg p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-white/15 border border-white/25 flex items-center justify-center font-extrabold text-sm text-white shrink-0 overflow-hidden">
                {data.coordonnees.photo ? (
                  <img src={data.coordonnees.photo} alt={data.coordonnees.name} className="w-full h-full object-cover" />
                ) : (
                  (data.coordonnees.name || 'TM').slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-white truncate">
                  {data.coordonnees.name || 'Thomas Martin'}
                </h2>
                <p className="text-xs text-white/75 truncate">
                  {data.coordonnees.jobTitle || 'Data Analyst'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold shrink-0 flex items-center gap-1"
            >
              <Eye size={13} /> Aperçu
            </button>
          </div>
          
          <AtsCompatibilityWidget 
            data={data} 
            templateId={template}
            onAddSkill={(skill) => setData(prev => ({
              ...prev,
              competences: prev.competences ? `${prev.competences}\n${skill}` : skill
            }))}
            onApplyAiFix={(promptText) => {
              setMobileTab('ai');
              handleSendMessage(promptText);
            }}
          />

          <Section title="Importer un CV">
            <div 
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${isImporting ? 'border-gray-800 bg-gray-50' : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-800 cursor-pointer'}`} 
              onClick={() => !isImporting && fileInputRef.current?.click()}
            >
              <input type="file" accept=".pdf,.doc,.docx,.txt,.text,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={isImporting} />
              {isImporting ? (
                <>
                  <Loader2 className="w-8 h-8 text-gray-800 animate-spin mb-2" />
                  <p className="text-sm font-medium text-gray-700">Analyse du CV en cours...</p>
                  <p className="text-xs text-gray-500 text-center mt-1">L'IA extrait et remplit vos informations</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">Importer un PDF, DOCX, DOC ou TXT</p>
                  <p className="text-xs text-gray-500 text-center mt-1">Cliquez pour importer votre CV existant</p>
                </>
              )}
            </div>
          </Section>

          <Section title="Modèle de CV">
            {(() => {
              const currentTemplateItem = TEMPLATES_DATA.find((t) => t.id === template) || TEMPLATES_DATA[0];
              const currentColor = selectedColors[currentTemplateItem.id] || currentTemplateItem.colors[0];
              return (
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group"
                >
                  <div className="w-14 h-[76px] bg-[#f2f4f8] rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-gray-100">
                    <div
                      className={`w-11 h-[62px] bg-white rounded-xs p-1 text-[3px] text-gray-700 leading-tight select-none relative flex flex-col justify-between overflow-hidden ${
                        currentTemplateItem.hasBorderFrame ? 'border border-gray-800' : ''
                      }`}
                    >
                      <MiniCvDocument template={currentTemplateItem} accentColor={currentColor} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-400 tracking-wide">Modèle actuel</p>
                    <h4 className="text-sm font-extrabold text-gray-900 truncate">{currentTemplateItem.name}</h4>
                    <p className="text-xs text-blue-600 font-bold mt-1 group-hover:underline">Parcourir tous les modèles →</p>
                  </div>
                  <LayoutTemplate size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </button>
              );
            })()}
          </Section>

          <Section title="Mise en page">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLayout('single')}
                className={`py-2 px-3 rounded-md text-sm font-medium border transition-all ${
                  layout === 'single' 
                    ? 'border-gray-800 bg-gray-800 text-white' 
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Simple Colonne
              </button>
              <button
                onClick={() => setLayout('double')}
                className={`py-2 px-3 rounded-md text-sm font-medium border transition-all ${
                  layout === 'double' 
                    ? 'border-gray-800 bg-gray-800 text-white' 
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Double Colonne
              </button>
            </div>
          </Section>

          <Section title="Réorganiser les sections">
            <p className="text-xs text-gray-500 mb-4">Glissez-déposez une section pour la réordonner ou la déplacer entre les colonnes.</p>
            {layout === 'single' ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSingle}>
                <SortableContext items={singleColumnOrder} strategy={verticalListSortingStrategy}>
                  {singleColumnOrder.map((id) => (
                    <SortableItem key={id} id={id} label={getSectionLabel(id)} />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={(args) => {
                  const pointerCollisions = pointerWithin(args);
                  const collisions = pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
                  const sectionCollisions = collisions.filter(
                    ({ id }) => id !== 'main-column' && id !== 'side-column'
                  );
                  return sectionCollisions.length > 0 ? sectionCollisions : collisions;
                }}
                onDragEnd={handleDragEndDouble}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <DroppableColumn id="main-column" label="Colonne principale">
                    <SortableContext items={mainColumnOrder} strategy={verticalListSortingStrategy}>
                      {mainColumnOrder.map((id) => (
                        <SortableItem key={id} id={id} label={getSectionLabel(id)} />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                  <DroppableColumn id="side-column" label="Colonne latérale">
                    <SortableContext items={sideColumnOrder} strategy={verticalListSortingStrategy}>
                      {sideColumnOrder.map((id) => (
                        <SortableItem key={id} id={id} label={getSectionLabel(id)} />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </div>
              </DndContext>
            )}
          </Section>

          <Section title="Coordonnées & Profil">
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="relative w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group shrink-0">
                  {data.coordonnees.photoUrl ? (
                    <img src={data.coordonnees.photoUrl} alt={data.coordonnees.name ? `Photo de profil de ${data.coordonnees.name}` : 'Photo de profil'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-gray-400" size={24} />
                  )}
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="text-white" size={20} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => updateCoordonnees('photoUrl', e.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
                {data.coordonnees.photoUrl && (
                  <button 
                    onClick={() => updateCoordonnees('photoUrl', '')}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Supprimer la photo
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input label="Nom complet" value={data.coordonnees.name} onChange={v => updateCoordonnees('name', v)} />
                <Input label="Titre du poste" value={data.coordonnees.jobTitle} onChange={v => updateCoordonnees('jobTitle', v)} placeholder="ex: Développeur Full Stack" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-600">Profil</label>
                  <button
                    type="button"
                    onClick={handleProfileButtonClick}
                    disabled={improvingProfile}
                    className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
                  >
                    {improvingProfile ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    Améliorer avec l'IA
                  </button>
                </div>
                <textarea
                  value={data.profil}
                  onChange={e => setData({...data, profil: e.target.value})}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-2.5 text-base resize-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 outline-none transition-all bg-gray-50 focus:bg-white"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input label="Email" value={data.coordonnees.email} onChange={v => updateCoordonnees('email', v)} />
                <Input label="Téléphone" value={data.coordonnees.phone} onChange={v => updateCoordonnees('phone', v)} />
                <Input label="Localisation" value={data.coordonnees.location} onChange={v => updateCoordonnees('location', v)} />
                <Input label="Permis de conduire" value={data.coordonnees.drivingLicense} onChange={v => updateCoordonnees('drivingLicense', v)} placeholder="Optionnel" />
                <Input label="LinkedIn" value={data.coordonnees.linkedin} onChange={v => updateCoordonnees('linkedin', v)} placeholder="Optionnel" />
                <Input label="GitHub" value={data.coordonnees.github} onChange={v => updateCoordonnees('github', v)} placeholder="Optionnel" />
                <Input label="Site Web" value={data.coordonnees.website} onChange={v => updateCoordonnees('website', v)} placeholder="Optionnel" />
              </div>
            </div>
          </Section>

          <Section title="Expérience">
            <div className="space-y-6">
              {data.experience.map((exp) => (
                <div key={exp.id} className="relative border border-gray-200 rounded-md p-4 bg-white group">
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExperienceButtonClick(exp.id)}
                      disabled={improvingExpId === exp.id}
                      className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
                      aria-label="Améliorer avec l'IA"
                    >
                      {improvingExpId === exp.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      IA
                    </button>
                    <button onClick={() => removeExperience(exp.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" aria-label="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <Input label="Entreprise" value={exp.company} onChange={v => updateExperience(exp.id, 'company', v)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <Input label="Titre du poste" value={exp.jobTitle} onChange={v => updateExperience(exp.id, 'jobTitle', v)} />
                      <Input label="Ville" value={exp.location} onChange={v => updateExperience(exp.id, 'location', v)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
                      <Input label="Date de début" value={exp.startDate} onChange={v => updateExperience(exp.id, 'startDate', v)} placeholder="ex: Jan 2020" />
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-600">Date de fin</label>
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={exp.current} onChange={e => updateExperience(exp.id, 'current', e.target.checked)} className="rounded text-gray-800 focus:ring-gray-800" />
                            Présent
                          </label>
                        </div>
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={e => updateExperience(exp.id, 'endDate', e.target.value)}
                          placeholder="ex: Déc 2022"
                          disabled={exp.current}
                          className="w-full border border-gray-300 rounded-md p-2.5 text-base focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 outline-none transition-all bg-gray-50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                      <ReactQuill 
                        theme="snow" 
                        value={exp.description} 
                        onChange={v => updateExperience(exp.id, 'description', v)} 
                        modules={quillModules}
                        className="bg-white rounded-md [&_.ql-editor]:min-h-[100px] [&_.ql-editor]:text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addExperience} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-md text-gray-500 font-medium text-sm hover:border-gray-500 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 bg-white">
                <Plus size={16} /> Ajouter une expérience
              </button>
            </div>
          </Section>

          <Section title="Éducation">
            <div className="space-y-6">
              {data.education.map((edu) => (
                <div key={edu.id} className="relative border border-gray-200 rounded-md p-4 bg-white group">
                  <button onClick={() => removeEducation(edu.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors p-1" aria-label="Supprimer">
                    <Trash2 size={16} />
                  </button>
                  <div className="space-y-4">
                    <Input label="Institution" value={edu.institution} onChange={v => updateEducation(edu.id, 'institution', v)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <Input label="Diplôme" value={edu.degree} onChange={v => updateEducation(edu.id, 'degree', v)} />
                      <Input label="Date" value={edu.date} onChange={v => updateEducation(edu.id, 'date', v)} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addEducation} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-md text-gray-500 font-medium text-sm hover:border-gray-500 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 bg-white">
                <Plus size={16} /> Ajouter une éducation
              </button>
            </div>
          </Section>

          <Section title="Compétences">
            <div className="space-y-2">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSkillsButtonClick}
                  disabled={improvingSkills}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
                >
                  {improvingSkills ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Générer avec l'IA
                </button>
              </div>
              <Textarea label="" value={data.competences} onChange={v => setData({...data, competences: v})} placeholder="Une compétence par ligne" rows={4} />
            </div>
          </Section>

          <Section title="Langues">
            <Textarea label="" value={data.langues} onChange={v => setData({...data, langues: v})} placeholder="Une langue par ligne" rows={3} />
          </Section>

          <Section title="Intérêts">
            <Textarea label="" value={data.interets} onChange={v => setData({...data, interets: v})} placeholder="Un intérêt par ligne" rows={3} />
          </Section>

          <Section title="Projets">
            <div className="space-y-6">
              {data.projets.map((proj) => (
                <div key={proj.id} className="relative border border-gray-200 rounded-md p-4 bg-white group">
                  <button onClick={() => removeProject(proj.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors p-1" aria-label="Supprimer">
                    <Trash2 size={16} />
                  </button>
                  <div className="space-y-4">
                    <Input label="Nom du projet" value={proj.name} onChange={v => updateProject(proj.id, 'name', v)} />
                    <Textarea label="Description" value={proj.description} onChange={v => updateProject(proj.id, 'description', v)} rows={2} />
                  </div>
                </div>
              ))}
              <button onClick={addProject} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-md text-gray-500 font-medium text-sm hover:border-gray-500 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 bg-white">
                <Plus size={16} /> Ajouter un projet
              </button>
            </div>
          </Section>

          {(data.customSections || []).length > 0 && (
            <Section title="Rubriques créées par l’IA">
              <div className="space-y-5">
                {(data.customSections || []).map((section) => (
                  <div key={section.id} className="relative space-y-3 rounded-md border border-gray-200 bg-white p-4">
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCustomSectionRegenerate(section)}
                        disabled={improvingSectionId === section.id}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 transition-colors"
                        aria-label={`Régénérer la rubrique ${section.title} avec l'IA`}
                      >
                        {improvingSectionId === section.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        IA
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomSection(section.id)}
                        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`Supprimer la rubrique ${section.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="pr-20">
                      <Input
                        label="Titre de la rubrique"
                        value={section.title}
                        onChange={(title) => updateCustomSection(section.id, { title })}
                      />
                    </div>
                    <Textarea
                      label="Contenu (un élément par ligne)"
                      value={section.content.join('\n')}
                      onChange={(value) => updateCustomSection(section.id, {
                        content: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
                      })}
                      rows={Math.min(Math.max(section.content.length, 3), 8)}
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

        </div>

        {/* Middle Column: Preview */}
        <div className={`flex-1 bg-gray-200 overflow-y-auto flex flex-col items-center py-6 sm:py-12 relative custom-scrollbar min-h-[500px] lg:min-h-0 ${
          mobileTab === 'form' || mobileTab === 'ai' ? 'hidden lg:flex' : 'flex'
        }`} style={{ perspective: '1000px' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            <ResumePreview 
              data={data} 
              template={template} 
              layout={layout} 
              singleColumnOrder={singleColumnOrder}
              mainColumnOrder={mainColumnOrder}
              sideColumnOrder={sideColumnOrder}
            />
          </div>
          
          {/* Zoom Controls */}
          <div className="fixed lg:absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-full px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-4 border border-gray-200 z-20 max-w-[95vw]">
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="text-gray-500 hover:text-gray-800 p-1" aria-label="Zoom arrière"><ZoomOut size={18} className="sm:w-5 sm:h-5" /></button>
            <input 
              type="range" 
              min="20" 
              max="150" 
              value={zoom * 100} 
              onChange={e => setZoom(Number(e.target.value) / 100)}
              className="w-20 sm:w-32 accent-gray-800"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-600 w-10 sm:w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="text-gray-500 hover:text-gray-800 p-1" aria-label="Zoom avant"><ZoomIn size={18} className="sm:w-5 sm:h-5" /></button>
            <div className="w-px h-5 sm:h-6 bg-gray-300 mx-1 sm:mx-2"></div>
            <button className="text-gray-700 hover:text-gray-900 flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors" onClick={() => setIsExportModalOpen(true)}>
              <Download size={16} /> Exporter
            </button>
          </div>
        </div>

        {/* Right Column: AI Assistant */}
        <div className={`w-full lg:w-[350px] lg:shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-tertiary/10 flex flex-col z-10 h-[450px] lg:h-auto ${
          mobileTab === 'form' || mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-tertiary/10 z-10 space-y-3">
            <h2 className="text-lg font-black text-tertiary flex items-center gap-2">
              Assistant IA
            </h2>
            <p className="text-sm leading-relaxed text-[#456071]">
              Demandez une nouvelle rubrique (ex. certifications) : l’IA utilisera uniquement les informations de votre CV.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '+ Certifications', prompt: 'Crée une rubrique Certifications à partir de mon CV' },
                { label: '+ Réalisations clés', prompt: 'Crée une rubrique Réalisations clés à partir de mon CV' },
                { label: '+ Atouts', prompt: 'Crée une rubrique Atouts à partir de mon CV' },
                { label: '+ Outils', prompt: 'Crée une rubrique Outils & Méthodes à partir de mon CV' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={isTyping || improvingAll}
                  onClick={() => handleSendMessage(chip.prompt)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full border border-tertiary/20 bg-white text-tertiary hover:border-tertiary disabled:opacity-50 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleWholeResumeButtonClick}
              disabled={improvingAll}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-tertiary hover:bg-[#093b50] disabled:opacity-50 rounded-lg py-2.5 transition-colors"
            >
              {improvingAll && <Loader2 size={15} className="animate-spin" />}
              Générer mon CV avec l'IA
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#f3f7fa]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-tertiary text-white rounded-br-sm' : 'bg-white border border-tertiary/10 text-tertiary rounded-bl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {(isTyping || improvingAll) && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-800 rounded-lg rounded-bl-sm p-4 text-sm flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-tertiary/10 bg-white">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ex. Crée une rubrique Certifications à partir de mon CV"
                className="w-full border border-tertiary/20 rounded-full py-2.5 pl-5 pr-12 text-base text-tertiary focus:outline-none focus:border-[#007568] focus:ring-2 focus:ring-[#007568]/20 transition-colors bg-white"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={isTyping || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white bg-tertiary rounded-full hover:bg-[#093b50] disabled:opacity-50 disabled:bg-slate-400 transition-colors"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Download CTA + Navigation Bar (11. Vue mobile) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#dce7ed] px-3 pt-2 pb-1.5 shadow-[0_-4px_12px_rgba(16,45,62,0.08)] space-y-1.5">
        <button
          type="button"
          onClick={() => setIsExportModalOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-[#007568] hover:bg-[#006257] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Download size={15} />
          <span>Télécharger</span>
        </button>

        <nav aria-label="Navigation mobile éditeur" className="flex items-center justify-around pt-0.5">
          <Link
            to="/dashboard?tab=resumes"
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-xs font-bold text-[#456071] hover:text-[#102d3e]"
          >
            <Home size={17} />
            <span>Accueil</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileTab('form')}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-xs font-bold text-[#007568]"
          >
            <FileText size={17} strokeWidth={2.4} />
            <span>CV</span>
          </button>
          <Link
            to="/dashboard?tab=tracker"
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-xs font-bold text-[#456071] hover:text-[#102d3e]"
          >
            <ClipboardList size={17} />
            <span>Candidatures</span>
          </Link>
          <Link
            to="/dashboard?tab=profile"
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-xs font-bold text-[#456071] hover:text-[#102d3e]"
          >
            <User size={17} />
            <span>Profil</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
