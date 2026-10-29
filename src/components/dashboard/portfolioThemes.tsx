import React from 'react';
import { ArrowUpRight, Download, Mail, MapPin } from 'lucide-react';
import type { ResumeProfile } from '../../types';
import type { PortfolioThemeId } from './portfolioTemplatesCatalog';

/**
 * Nine portfolio themes with genuinely different layouts. They only receive the
 * resume and the editing helpers of PortfolioBuilder: nothing here reads or
 * writes data on its own, and nothing is invented (key figures are derived from
 * the resume itself).
 */

/** Only http(s) links are rendered; blocks javascript:/data: URIs stored in a project link. */
const safeUrl = (u?: string): string | null => {
  if (!u) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(u.trim()) ? u.trim() : `https://${u.trim()}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
};

export type PortfolioSection = 'about' | 'skills' | 'projects' | 'experience';

export interface EditableProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  tag?: any;
  placeholder?: string;
  readOnly?: boolean;
}

export interface PortfolioThemeProps {
  resume: ResumeProfile;
  sections: PortfolioSection[];
  labels: Record<string, any>;
  Editable: React.ComponentType<EditableProps>;
  updateField: (field: keyof ResumeProfile, value: any) => void;
  updateNested: (parent: 'experience' | 'projects' | 'education', id: string, field: string, value: string) => void;
  updateSkill: (index: number, value: string) => void;
  /** Wraps a section in the builder's drag-and-drop / reorder controls. */
  wrapSection: (section: PortfolioSection, index: number, node: React.ReactNode) => React.ReactNode;
  onContact: () => void;
  onDownloadCV?: () => void;
}

const SERIF = "'Fraunces', 'Times New Roman', serif";
const GROTESK = "'Space Grotesk', 'DM Sans', system-ui, sans-serif";
const SANS = "'DM Sans', system-ui, sans-serif";
const HELV = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ── helpers ────────────────────────────────────────────────────────────────

const firstName = (r: ResumeProfile) => (r.fullName || '').trim().split(/\s+/)[0] || '';
const headline = (r: ResumeProfile) => r.experience?.[0]?.role || '';
const initials = (r: ResumeProfile) =>
  (r.fullName || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('') || 'P';

const startYear = (value?: string) => {
  const m = value?.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
};

/** Years since the earliest start date in the resume, or null when unknown. */
const yearsOfExperience = (r: ResumeProfile): number | null => {
  const years = (r.experience || []).map((e) => startYear(e.startDate)).filter((y): y is number => y !== null);
  if (!years.length) return null;
  return Math.max(0, new Date().getFullYear() - Math.min(...years));
};

const period = (e: ResumeProfile['experience'][number], labels: Record<string, any>) =>
  [e.startDate, e.current ? labels.present || 'Présent' : e.endDate].filter(Boolean).join(' – ');

const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

const NAV_ITEMS: PortfolioSection[] = ['about', 'experience', 'projects', 'skills'];

/** Key figures taken from the resume only. */
const keyFigures = (r: ResumeProfile) => {
  const figures: Array<{ value: string; label: string }> = [];
  const years = yearsOfExperience(r);
  if (years !== null && years > 0) figures.push({ value: String(years), label: years > 1 ? "ans d'expérience" : "an d'expérience" });
  if ((r.experience || []).length) figures.push({ value: String(r.experience.length), label: r.experience.length > 1 ? 'postes' : 'poste' });
  if ((r.projects || []).length) figures.push({ value: String(r.projects!.length), label: (r.projects || []).length > 1 ? 'projets' : 'projet' });
  if ((r.skills || []).length) figures.push({ value: String(r.skills.length), label: (r.skills || []).length > 1 ? 'compétences' : 'compétence' });
  return figures.slice(0, 4);
};

const renderOrdered = (
  p: PortfolioThemeProps,
  render: (sec: PortfolioSection, index: number) => React.ReactNode
) =>
  p.sections.map((sec, index) => {
    const node = render(sec, index);
    if (!node) return null;
    return <React.Fragment key={sec}>{p.wrapSection(sec, index, node)}</React.Fragment>;
  });

const SiteNav: React.FC<{
  p: PortfolioThemeProps;
  className: string;
  linkClass: string;
  ctaClass: string;
  brand: React.ReactNode;
}> = ({ p, className, linkClass, ctaClass, brand }) => (
  <nav aria-label="Navigation du portfolio" className={`sticky top-0 z-40 ${className}`}>
    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
      {brand}
      <div className="hidden lg:flex items-center gap-7 whitespace-nowrap">
        {NAV_ITEMS.map((item) => (
          <a
            key={item}
            href={`#${item}`}
            onClick={(e) => {
              e.preventDefault();
              goTo(item);
            }}
            className={linkClass}
          >
            {p.labels[item === 'skills' ? 'expertise' : item] || item}
          </a>
        ))}
        <button type="button" onClick={p.onContact} className={`${ctaClass} whitespace-nowrap`}>
          {p.labels.contact}
        </button>
      </div>
    </div>
  </nav>
);

// ═══════════════════════════════════════════════════════════════════════════
// 1. ÉDITORIAL — papier crème, grand serif léger, mise en page aérée
// ═══════════════════════════════════════════════════════════════════════════

export const EditorialTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];

  const Row: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 py-14 border-t border-[#1b1a17]/15">
      <h2 className="md:col-span-3 text-lg italic text-[#b4452a]" style={{ fontFamily: SERIF }}>
        {title}
      </h2>
      <div className="md:col-span-9">{children}</div>
    </section>
  );

  const body = (sec: PortfolioSection) => {
    if (sec === 'about') {
      return (
        <Row title={labels.about}>
          <div style={{ fontFamily: SERIF }}>
            <E
              tag="p"
              className="text-xl sm:text-2xl leading-[1.55] font-light text-[#1b1a17]"
              value={resume.summary}
              onChange={(v) => updateField('summary', v)}
            />
          </div>
        </Row>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <Row title={labels.experience}>
          <ol className="divide-y divide-[#1b1a17]/10">
            {resume.experience.map((exp) => (
              <li key={exp.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6 py-7 first:pt-0">
                <p className="sm:col-span-3 text-sm text-[#6b665c] pt-1">{period(exp, labels)}</p>
                <div className="sm:col-span-9">
                  <h3 className="text-2xl text-[#1b1a17]" style={{ fontFamily: SERIF }}>
                    <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                  </h3>
                  <p className="mt-1 text-[#b4452a] font-medium">
                    <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                  </p>
                  <div className="mt-3 text-[#3d3a33] leading-relaxed">
                    <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Row>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <Row title={labels.projects}>
          <ol className="space-y-10">
            {projects.map((proj, i) => (
              <li key={proj.id || i} className="grid grid-cols-12 gap-4">
                <span className="col-span-2 sm:col-span-1 text-4xl font-light text-[#1b1a17]/25" style={{ fontFamily: SERIF }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="col-span-10 sm:col-span-11">
                  <h3 className="text-2xl text-[#1b1a17]" style={{ fontFamily: SERIF }}>
                    <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                  </h3>
                  <div className="mt-2 text-[#3d3a33] leading-relaxed max-w-2xl">
                    <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                  </div>
                  {safeUrl(proj.link) && (
                    <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4 decoration-[#b4452a] hover:text-[#b4452a]">
                      Voir le projet <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Row>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <Row title={labels.expertise}>
          <ul className="flex flex-wrap gap-x-3 gap-y-2 text-2xl text-[#1b1a17]" style={{ fontFamily: SERIF }}>
            {resume.skills.map((skill, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
                {i < resume.skills.length - 1 && <span className="text-[#b4452a]">/</span>}
              </li>
            ))}
          </ul>
        </Row>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[800px] bg-[#f6f1e7] text-[#1b1a17]" style={{ fontFamily: SANS }}>
      <SiteNav
        p={p}
        className="bg-[#f6f1e7]/90 backdrop-blur border-b border-[#1b1a17]/10"
        linkClass="text-sm text-[#6b665c] hover:text-[#1b1a17] transition-colors"
        ctaClass="text-sm font-semibold underline underline-offset-[6px] decoration-[#b4452a] decoration-2 hover:text-[#b4452a]"
        brand={<span className="text-lg" style={{ fontFamily: SERIF }}>{resume.fullName || 'Portfolio'}</span>}
      />

      <div className="max-w-5xl mx-auto px-6">
        <header className="pt-16 pb-14 md:pt-28 md:pb-20">
          <p className="text-sm text-[#6b665c] mb-8">
            {[headline(resume), resume.location].filter(Boolean).join(' · ')}
          </p>
          <h1 className="text-[clamp(3rem,9.5vw,8rem)] leading-[1.02] tracking-[-0.03em] font-light" style={{ fontFamily: SERIF }}>
            <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
          </h1>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <button type="button" onClick={p.onContact} className="font-semibold underline underline-offset-[6px] decoration-[#b4452a] decoration-2 hover:text-[#b4452a] cursor-pointer">
              {labels.heroBtn}
            </button>
            {p.onDownloadCV && (
              <button type="button" onClick={p.onDownloadCV} className="inline-flex items-center gap-1.5 text-[#6b665c] hover:text-[#1b1a17] cursor-pointer">
                <Download size={14} /> {labels.download}
              </button>
            )}
          </div>
        </header>

        {renderOrdered(p, (sec) => body(sec))}

        <footer className="border-t border-[#1b1a17]/15 py-20">
          <button type="button" onClick={p.onContact} className="text-[clamp(2.25rem,6vw,4.5rem)] leading-tight font-light underline underline-offset-[10px] decoration-[#b4452a] decoration-2 hover:text-[#b4452a] cursor-pointer text-left" style={{ fontFamily: SERIF }}>
            {labels.contact} →
          </button>
          <p className="mt-8 text-sm text-[#6b665c]">
            {resume.email && <a href={`mailto:${resume.email}`} className="hover:text-[#1b1a17]">{resume.email}</a>}
            {resume.email && ' · '}© {new Date().getFullYear()} {resume.fullName}
          </p>
        </footer>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. BENTO CLAIR — tuiles de tailles différentes, très lisible
// ═══════════════════════════════════════════════════════════════════════════

export const BentoTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];
  const years = keyFigures(resume).find((f) => f.label.includes('expérience'));
  const current = (resume.experience || []).find((e) => e.current) || (resume.experience || [])[0];

  const Tile: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`rounded-[1.75rem] bg-white border border-[#e4e6eb] p-6 sm:p-8 ${className}`}>{children}</div>
  );
  const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-sm font-semibold text-[#5b6472] mb-4">{children}</h2>
  );

  const body = (sec: PortfolioSection) => {
    if (sec === 'about') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Tile className="lg:col-span-2">
            <Title>{labels.about}</Title>
            <E tag="p" className="text-xl sm:text-2xl leading-snug text-[#0f172a]" value={resume.summary} onChange={(v) => updateField('summary', v)} />
          </Tile>
          {(years || current) && (
            <Tile className="bg-[#0f172a] text-white border-[#0f172a] flex flex-col justify-between gap-6">
              {years && (
                <div>
                  <p className="text-6xl font-bold tabular-nums text-[#c8f169] leading-none">{years.value}</p>
                  <p className="mt-2 text-sm text-white/70">{years.label}</p>
                </div>
              )}
              {current && (
                <div className={years ? 'pt-5 border-t border-white/15' : ''}>
                  <p className="text-xs text-white/50">{current.current ? 'Poste actuel' : 'Dernier poste'}</p>
                  <p className="mt-1 font-semibold">{current.role}</p>
                  {current.company && <p className="text-sm text-white/70">{current.company}</p>}
                </div>
              )}
            </Tile>
          )}
        </div>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <div className="mb-4">
          <h2 className="sr-only">{labels.experience}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resume.experience.map((exp, i) => (
              <Tile key={exp.id} className={i === 0 && resume.experience.length % 2 === 1 ? 'md:col-span-2' : ''}>
                <p className="text-xs font-semibold text-[#2f5bff]">{period(exp, labels)}</p>
                <h3 className="mt-2 text-xl font-bold text-[#0f172a]">
                  <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                </h3>
                <p className="text-[#5b6472] font-medium">
                  <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                </p>
                <div className="mt-3 text-sm text-[#334155] leading-relaxed">
                  <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                </div>
              </Tile>
            ))}
          </div>
        </div>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <div className="mb-4">
          <h2 className="sr-only">{labels.projects}</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {projects.map((proj, i) => (
              <Tile key={proj.id || i} className={i === 0 ? 'md:col-span-6 bg-[#2f5bff] text-white border-[#2f5bff]' : 'md:col-span-3'}>
                <p className={`text-xs font-semibold ${i === 0 ? 'text-white/70' : 'text-[#2f5bff]'}`}>{labels.projects} · {String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 text-xl sm:text-2xl font-bold">
                  <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                </h3>
                <div className={`mt-3 text-sm leading-relaxed ${i === 0 ? 'text-white/85' : 'text-[#334155]'}`}>
                  <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                </div>
                {safeUrl(proj.link) && (
                  <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4">
                    Voir le projet <ArrowUpRight size={14} />
                  </a>
                )}
              </Tile>
            ))}
          </div>
        </div>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <div className="mb-4">
          <Tile>
            <Title>{labels.expertise}</Title>
            <ul className="flex flex-wrap gap-2">
              {resume.skills.map((skill, i) => (
                <li key={i} className="px-4 py-2 rounded-full bg-[#eef1f7] text-[#0f172a] text-sm font-medium">
                  <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
                </li>
              ))}
            </ul>
          </Tile>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[800px] bg-[#f3f4f7] text-[#0f172a]" style={{ fontFamily: SANS }}>
      <SiteNav
        p={p}
        className="bg-[#f3f4f7]/85 backdrop-blur border-b border-[#e4e6eb]"
        linkClass="text-sm font-medium text-[#5b6472] hover:text-[#0f172a] transition-colors"
        ctaClass="px-5 py-2 rounded-full bg-[#0f172a] text-white text-sm font-semibold hover:bg-[#2f5bff] transition-colors cursor-pointer"
        brand={<span className="font-bold tracking-tight">{firstName(resume) || 'Portfolio'}</span>}
      />

      <div className="max-w-6xl mx-auto px-6 py-10 sm:py-14">
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <Tile className="lg:col-span-8 flex flex-col justify-between min-h-[22rem]">
            <p className="text-sm text-[#5b6472]">{[headline(resume), resume.location].filter(Boolean).join(' · ')}</p>
            <div>
              <h1 className="text-[clamp(2.5rem,6.5vw,5rem)] leading-[1.05] font-bold tracking-tight">
                <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={p.onContact} className="px-6 py-3 rounded-full bg-[#2f5bff] text-white text-sm font-semibold hover:bg-[#0f172a] transition-colors cursor-pointer">
                  {labels.heroBtn}
                </button>
                {p.onDownloadCV && (
                  <button type="button" onClick={p.onDownloadCV} className="px-6 py-3 rounded-full border border-[#cfd4de] text-sm font-semibold inline-flex items-center gap-2 hover:border-[#0f172a] transition-colors cursor-pointer">
                    <Download size={15} /> {labels.download}
                  </button>
                )}
              </div>
            </div>
          </Tile>

          <div className="lg:col-span-4 grid grid-rows-2 gap-4">
            <Tile className="bg-[#c8f169] border-[#c8f169] flex items-center justify-center">
              {resume.photoUrl ? (
                <img src={resume.photoUrl} alt={resume.fullName} className="w-28 h-28 rounded-full object-cover" />
              ) : (
                <span className="text-6xl font-bold tracking-tight text-[#0f172a]">{initials(resume)}</span>
              )}
            </Tile>
            <Tile className="flex flex-col justify-center gap-2 text-sm">
              {resume.location && <p className="inline-flex items-center gap-2"><MapPin size={15} /> {resume.location}</p>}
              {resume.email && <a href={`mailto:${resume.email}`} className="inline-flex items-center gap-2 hover:text-[#2f5bff] break-all"><Mail size={15} /> {resume.email}</a>}
            </Tile>
          </div>
        </header>

        {renderOrdered(p, (sec) => body(sec))}

        <footer className="mt-10 text-sm text-[#5b6472] flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} {resume.fullName}</span>
          <button type="button" onClick={p.onContact} className="font-semibold text-[#0f172a] underline underline-offset-4 cursor-pointer">{labels.contact}</button>
        </footer>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. CABINET — bleu nuit et ivoire, chiffres clés, résultats en avant
// ═══════════════════════════════════════════════════════════════════════════

export const CabinetTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];
  const figures = keyFigures(resume);

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mb-8">
      <h2 className="text-3xl text-[#0e2a47]" style={{ fontFamily: SERIF }}>{children}</h2>
      <div className="mt-3 h-px w-16 bg-[#9a7b3f]" />
    </div>
  );

  const body = (sec: PortfolioSection) => {
    if (sec === 'about') {
      return (
        <section className="py-14">
          <Heading>{labels.about}</Heading>
          <E tag="p" className="text-lg leading-[1.75] text-[#26354a] max-w-3xl" value={resume.summary} onChange={(v) => updateField('summary', v)} />
        </section>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <section className="py-14 border-t border-[#0e2a47]/15">
          <Heading>{labels.experience}</Heading>
          <ol className="space-y-10">
            {resume.experience.map((exp) => (
              <li key={exp.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8">
                <p className="md:col-span-3 text-sm font-semibold text-[#9a7b3f] pt-1">{period(exp, labels)}</p>
                <div className="md:col-span-9">
                  <h3 className="text-xl font-semibold text-[#0e2a47]">
                    <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                  </h3>
                  <p className="text-[#5a6b82] font-medium">
                    <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                  </p>
                  <div className="mt-3 text-[#26354a] leading-relaxed">
                    <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <section className="py-14 border-t border-[#0e2a47]/15">
          <Heading>{labels.projects}</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((proj, i) => (
              <article key={proj.id || i} className="bg-white border border-[#0e2a47]/15 p-7">
                <h3 className="text-xl font-semibold text-[#0e2a47]">
                  <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                </h3>
                <div className="mt-3 text-[#26354a] leading-relaxed text-sm">
                  <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                </div>
                {safeUrl(proj.link) && (
                  <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#9a7b3f] hover:text-[#0e2a47]">
                    Voir le projet <ArrowUpRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <section className="py-14 border-t border-[#0e2a47]/15">
          <Heading>{labels.expertise}</Heading>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
            {resume.skills.map((skill, i) => (
              <li key={i} className="flex items-baseline gap-3 text-[#26354a]">
                <span className="inline-block w-1.5 h-1.5 bg-[#9a7b3f] shrink-0 translate-y-[-2px]" />
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
              </li>
            ))}
          </ul>
        </section>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[800px] bg-[#faf7f0] text-[#0e2a47]" style={{ fontFamily: SANS }}>
      <header className="bg-[#0e2a47] text-white">
        <SiteNav
          p={p}
          className="border-b border-white/10 bg-[#0e2a47]"
          linkClass="text-sm text-white/70 hover:text-white transition-colors"
          ctaClass="px-5 py-2 border border-[#c9a96b] text-[#c9a96b] text-sm font-semibold hover:bg-[#c9a96b] hover:text-[#0e2a47] transition-colors cursor-pointer"
          brand={<span className="text-lg" style={{ fontFamily: SERIF }}>{resume.fullName || 'Portfolio'}</span>}
        />
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24">
          <p className="text-sm text-[#c9a96b] mb-5">{[headline(resume), resume.location].filter(Boolean).join(' · ')}</p>
          <h1 className="text-[clamp(2.5rem,6vw,4.75rem)] leading-[1.08]" style={{ fontFamily: SERIF }}>
            <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
          </h1>
          <div className="mt-9 flex flex-wrap gap-4">
            <button type="button" onClick={p.onContact} className="px-7 py-3 bg-[#c9a96b] text-[#0e2a47] text-sm font-semibold hover:bg-white transition-colors cursor-pointer">
              {labels.heroBtn}
            </button>
            {p.onDownloadCV && (
              <button type="button" onClick={p.onDownloadCV} className="px-7 py-3 border border-white/30 text-sm font-semibold inline-flex items-center gap-2 hover:border-white transition-colors cursor-pointer">
                <Download size={15} /> {labels.download}
              </button>
            )}
          </div>
        </div>
      </header>

      {figures.length > 0 && (
        <div className="border-b border-[#0e2a47]/15 bg-white">
          <dl className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#0e2a47]/10">
            {figures.map((f) => (
              <div key={f.label} className="py-7 px-4 first:pl-0">
                <dt className="text-4xl text-[#0e2a47] tabular-nums" style={{ fontFamily: SERIF }}>{f.value}</dt>
                <dd className="mt-1 text-sm text-[#5a6b82]">{f.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6">{renderOrdered(p, (sec) => body(sec))}</div>

      <footer className="bg-[#0e2a47] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-wrap items-center justify-between gap-6">
          <p className="text-sm text-white/70">
            {resume.email && <a href={`mailto:${resume.email}`} className="hover:text-white">{resume.email}</a>}
            {resume.email && ' · '}© {new Date().getFullYear()} {resume.fullName}
          </p>
          <button type="button" onClick={p.onContact} className="text-sm font-semibold text-[#c9a96b] underline underline-offset-4 cursor-pointer">
            {labels.contact}
          </button>
        </div>
      </footer>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. STUDIO — fond charbon, très grand texte, un seul accent
// ═══════════════════════════════════════════════════════════════════════════

export const StudioTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];

  const Block: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 py-16 sm:py-24 border-t border-white/10">
      <div className="lg:col-span-3">
        <div className="lg:sticky lg:top-28 flex lg:flex-col items-baseline lg:items-start gap-3">
          <span className="text-xs font-medium text-[#0c0c0d] bg-[#d7ff3f] rounded-full px-2.5 py-1 tabular-nums">{n}</span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="lg:col-span-9">{children}</div>
    </section>
  );

  const body = (sec: PortfolioSection, index: number) => {
    const n = String(index + 1).padStart(2, '0');
    if (sec === 'about') {
      return (
        <Block n={n} title={labels.about}>
          <E tag="p" className="text-[clamp(1.125rem,2vw,1.5rem)] leading-[1.6] text-[#f2f0eb]/90 max-w-3xl" value={resume.summary} onChange={(v) => updateField('summary', v)} />
        </Block>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <Block n={n} title={labels.projects}>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj, i) => (
              <li
                key={proj.id || i}
                className={`group relative rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-8 hover:border-[#d7ff3f]/60 hover:bg-white/[0.06] transition-colors ${i === 0 && projects.length % 2 === 1 ? 'md:col-span-2' : ''}`}
              >
                <span className="absolute top-6 right-7 text-5xl font-semibold tabular-nums text-white/[0.07] group-hover:text-[#d7ff3f]/30 transition-colors">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight pr-14">
                  <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                </h3>
                <div className="mt-4 text-white/60 leading-relaxed">
                  <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                </div>
                {safeUrl(proj.link) && (
                  <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#d7ff3f]">
                    Voir le projet <ArrowUpRight size={15} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Block>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <Block n={n} title={labels.experience}>
          <ol className="relative border-l border-white/15 ml-1.5 space-y-10">
            {resume.experience.map((exp) => (
              <li key={exp.id} className="relative pl-8">
                <span className="absolute -left-[7px] top-2 h-3.5 w-3.5 rounded-full bg-[#d7ff3f] ring-4 ring-[#0c0c0d]" />
                <p className="text-sm text-white/50">{period(exp, labels)}</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight">
                  <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                </h3>
                <p className="text-[#d7ff3f] mt-0.5">
                  <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                </p>
                <div className="mt-3 text-white/60 leading-relaxed max-w-2xl">
                  <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                </div>
              </li>
            ))}
          </ol>
        </Block>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <Block n={n} title={labels.expertise}>
          <ul className="flex flex-wrap gap-2.5">
            {resume.skills.map((skill, i) => (
              <li key={i} className="px-5 py-2.5 rounded-full border border-white/20 text-base hover:bg-[#d7ff3f] hover:text-[#0c0c0d] hover:border-[#d7ff3f] transition-colors">
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
              </li>
            ))}
          </ul>
        </Block>
      );
    }
    return null;
  };

  const meta = [
    { k: 'Poste', v: headline(resume), href: undefined as string | undefined },
    { k: 'Lieu', v: resume.location, href: undefined as string | undefined },
    { k: 'Contact', v: resume.email, href: resume.email ? `mailto:${resume.email}` : undefined },
  ].filter((m) => m.v);

  return (
    <div className="relative min-h-[800px] bg-[#0c0c0d] text-[#f2f0eb] overflow-hidden" style={{ fontFamily: GROTESK }}>
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 h-[38rem] w-[38rem] rounded-full bg-[#d7ff3f]/[0.09] blur-3xl" />
      <SiteNav
        p={p}
        className="bg-[#0c0c0d]/85 backdrop-blur border-b border-white/10"
        linkClass="text-sm text-white/60 hover:text-white transition-colors"
        ctaClass="px-5 py-2 rounded-full bg-[#d7ff3f] text-[#0c0c0d] text-sm font-semibold hover:bg-white transition-colors cursor-pointer"
        brand={<span className="font-semibold tracking-tight">{firstName(resume) || 'Portfolio'}<span className="text-[#d7ff3f]">.</span></span>}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <header className="pt-14 pb-16 sm:pt-24 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-end">
          <div className="lg:col-span-8">
            <h1 className="text-[clamp(2.75rem,8vw,6.5rem)] leading-[1.02] font-semibold tracking-[-0.04em]">
              <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
              <span className="text-[#d7ff3f]">.</span>
            </h1>
            <div className="mt-10 flex flex-wrap gap-3">
              <button type="button" onClick={p.onContact} className="px-7 py-3.5 rounded-full bg-[#d7ff3f] text-[#0c0c0d] text-sm font-semibold hover:bg-white transition-colors cursor-pointer">
                {labels.heroBtn}
              </button>
              {p.onDownloadCV && (
                <button type="button" onClick={p.onDownloadCV} className="px-7 py-3.5 rounded-full border border-white/25 text-sm font-semibold inline-flex items-center gap-2 hover:border-white transition-colors cursor-pointer">
                  <Download size={15} /> {labels.download}
                </button>
              )}
            </div>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <div className="relative h-52 w-52 sm:h-64 sm:w-64 rounded-[2.5rem] overflow-hidden border border-white/15 bg-white/[0.04] flex items-center justify-center">
              {resume.photoUrl ? (
                <img src={resume.photoUrl} alt={resume.fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-7xl font-semibold text-[#d7ff3f]">{initials(resume)}</span>
              )}
            </div>
          </div>
          {meta.length > 0 && (
            <dl className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 border border-white/10 rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-white/10 bg-white/[0.02]">
              {meta.map((m) => (
                <div key={m.k} className="px-6 py-5 min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-white/40">{m.k}</dt>
                  <dd className="mt-1 font-medium break-words">
                    {m.href ? <a href={m.href} className="hover:text-[#d7ff3f]">{m.v}</a> : m.v}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </header>

        {renderOrdered(p, body)}

        <footer className="border-t border-white/10 py-20">
          <button type="button" onClick={p.onContact} className="text-[clamp(2.25rem,7vw,5.5rem)] font-semibold tracking-[-0.04em] leading-[1.05] hover:text-[#d7ff3f] transition-colors text-left cursor-pointer">
            {labels.contact} ↗
          </button>
          <p className="mt-8 text-sm text-white/50">© {new Date().getFullYear()} {resume.fullName}</p>
        </footer>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. SUISSE — grille visible, noir et blanc, un accent rouge
// ═══════════════════════════════════════════════════════════════════════════

export const SwissTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];

  const Block: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
    <section className="grid grid-cols-1 md:grid-cols-12 border-t-2 border-[#0a0a0a]">
      <div className="md:col-span-3 py-6 md:py-10 md:border-r border-[#0a0a0a]/20 md:pr-6">
        <p className="text-sm font-medium text-[#e10600] tabular-nums">({n})</p>
        <h2 className="mt-1 text-lg font-bold">{title}</h2>
      </div>
      <div className="md:col-span-9 py-6 md:py-10 md:pl-8">{children}</div>
    </section>
  );

  const body = (sec: PortfolioSection, index: number) => {
    const n = String(index + 1).padStart(2, '0');
    if (sec === 'about') {
      return (
        <Block n={n} title={labels.about}>
          <E tag="p" className="text-xl sm:text-2xl leading-[1.45] font-medium tracking-tight max-w-3xl" value={resume.summary} onChange={(v) => updateField('summary', v)} />
        </Block>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <Block n={n} title={labels.experience}>
          <ol className="divide-y divide-[#0a0a0a]/15">
            {resume.experience.map((exp) => (
              <li key={exp.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6 py-5 first:pt-0">
                <p className="sm:col-span-3 text-sm tabular-nums">{period(exp, labels)}</p>
                <div className="sm:col-span-9">
                  <h3 className="text-xl font-bold leading-tight">
                    <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                  </h3>
                  <p className="font-medium text-[#e10600]">
                    <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                  </p>
                  <div className="mt-2 text-[#262626] leading-relaxed max-w-2xl">
                    <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Block>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <Block n={n} title={labels.projects}>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            {projects.map((proj, i) => (
              <li key={proj.id || i} className="border-t border-[#0a0a0a]/30 pt-4">
                <p className="text-sm tabular-nums text-[#e10600]">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 text-xl font-bold leading-tight">
                  <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                </h3>
                <div className="mt-2 text-sm text-[#262626] leading-relaxed">
                  <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                </div>
                {safeUrl(proj.link) && (
                  <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 decoration-[#e10600]">
                    Voir le projet <ArrowUpRight size={14} />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </Block>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <Block n={n} title={labels.expertise}>
          <ul className="columns-2 sm:columns-3 gap-8 text-lg font-medium [&>li]:break-inside-avoid [&>li]:py-1">
            {resume.skills.map((skill, i) => (
              <li key={i}>
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
              </li>
            ))}
          </ul>
        </Block>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[800px] bg-[#f2f2f0] text-[#0a0a0a]" style={{ fontFamily: HELV }}>
      <SiteNav
        p={p}
        className="bg-[#f2f2f0] border-b-2 border-[#0a0a0a]"
        linkClass="text-sm font-medium hover:text-[#e10600] transition-colors"
        ctaClass="px-4 py-2 bg-[#0a0a0a] text-white text-sm font-medium hover:bg-[#e10600] transition-colors cursor-pointer"
        brand={<span className="font-bold tracking-tight">{resume.fullName || 'Portfolio'}</span>}
      />

      <div className="max-w-6xl mx-auto px-6">
        <header className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-16 pb-14 md:pt-24 md:pb-20">
          <h1 className="md:col-span-9 text-[clamp(3.25rem,10vw,8.5rem)] leading-[1.02] font-bold tracking-[-0.05em]">
            <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
          </h1>
          <dl className="md:col-span-3 self-end text-sm space-y-3">
            {headline(resume) && (
              <div><dt className="text-[#e10600] font-medium">Poste</dt><dd className="font-medium">{headline(resume)}</dd></div>
            )}
            {resume.location && (
              <div><dt className="text-[#e10600] font-medium">Lieu</dt><dd className="font-medium">{resume.location}</dd></div>
            )}
            {resume.email && (
              <div><dt className="text-[#e10600] font-medium">Contact</dt><dd className="font-medium break-all"><a href={`mailto:${resume.email}`} className="underline underline-offset-4">{resume.email}</a></dd></div>
            )}
          </dl>
        </header>

        {renderOrdered(p, body)}

        <footer className="border-t-2 border-[#0a0a0a] py-10 flex flex-wrap items-center justify-between gap-4 text-sm">
          <span>© {new Date().getFullYear()} {resume.fullName}</span>
          <div className="flex items-center gap-6">
            {p.onDownloadCV && (
              <button type="button" onClick={p.onDownloadCV} className="inline-flex items-center gap-1.5 font-medium hover:text-[#e10600] cursor-pointer">
                <Download size={14} /> {labels.download}
              </button>
            )}
            <button type="button" onClick={p.onContact} className="font-bold underline underline-offset-4 decoration-[#e10600] decoration-2 cursor-pointer">
              {labels.contact} →
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. ATELIER — tons terre et sauge, formes arrondies, photo en avant
// ═══════════════════════════════════════════════════════════════════════════

export const AtelierTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];

  const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-3xl sm:text-4xl text-[#2b2a26] mb-8" style={{ fontFamily: SERIF }}>{children}</h2>
  );

  const body = (sec: PortfolioSection) => {
    if (sec === 'about') {
      return (
        <section className="py-12">
          <div className="rounded-[2.5rem] bg-[#fbf7f1] p-8 sm:p-12">
            <Heading>{labels.about}</Heading>
            <E tag="p" className="text-lg sm:text-xl leading-[1.7] text-[#46433b] max-w-3xl" value={resume.summary} onChange={(v) => updateField('summary', v)} />
          </div>
        </section>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <section className="py-12">
          <Heading>{labels.experience}</Heading>
          <div className="space-y-5">
            {resume.experience.map((exp) => (
              <article key={exp.id} className="rounded-[2rem] bg-[#fbf7f1] p-7 sm:p-9 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                  <span className="inline-block rounded-full bg-[#dfe6d4] text-[#4d6040] text-sm font-medium px-4 py-1.5">{period(exp, labels)}</span>
                </div>
                <div className="md:col-span-9">
                  <h3 className="text-2xl text-[#2b2a26]" style={{ fontFamily: SERIF }}>
                    <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                  </h3>
                  <p className="text-[#c8693a] font-medium">
                    <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                  </p>
                  <div className="mt-3 text-[#46433b] leading-relaxed">
                    <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <section className="py-12">
          <Heading>{labels.projects}</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((proj, i) => (
              <article key={proj.id || i} className="rounded-[2rem] bg-[#fbf7f1] p-8">
                <span className="inline-flex w-10 h-10 rounded-full bg-[#c8693a] text-white items-center justify-center text-sm font-bold">{i + 1}</span>
                <h3 className="mt-5 text-2xl text-[#2b2a26]" style={{ fontFamily: SERIF }}>
                  <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                </h3>
                <div className="mt-3 text-[#46433b] leading-relaxed">
                  <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                </div>
                {safeUrl(proj.link) && (
                  <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#c8693a] hover:text-[#2b2a26]">
                    Voir le projet <ArrowUpRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <section className="py-12">
          <Heading>{labels.expertise}</Heading>
          <ul className="flex flex-wrap gap-3">
            {resume.skills.map((skill, i) => (
              <li key={i} className="rounded-full bg-[#dfe6d4] text-[#34452b] px-5 py-2.5 font-medium">
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
              </li>
            ))}
          </ul>
        </section>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[800px] bg-[#f1e9dc] text-[#2b2a26]" style={{ fontFamily: SANS }}>
      <SiteNav
        p={p}
        className="bg-[#f1e9dc]/90 backdrop-blur border-b border-[#2b2a26]/10"
        linkClass="text-sm font-medium text-[#5d5a50] hover:text-[#c8693a] transition-colors"
        ctaClass="px-5 py-2.5 rounded-full bg-[#c8693a] text-white text-sm font-semibold hover:bg-[#2b2a26] transition-colors cursor-pointer"
        brand={<span className="text-lg" style={{ fontFamily: SERIF }}>{firstName(resume) || 'Portfolio'}</span>}
      />

      <div className="max-w-5xl mx-auto px-6">
        <header className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center pt-14 pb-10 md:pt-20 md:pb-14">
          <div className="md:col-span-7 order-2 md:order-1">
            <p className="text-[#c8693a] font-medium mb-5">{[headline(resume), resume.location].filter(Boolean).join(' · ')}</p>
            <h1 className="text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: SERIF }}>
              <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
            </h1>
            <div className="mt-9 flex flex-wrap gap-3">
              <button type="button" onClick={p.onContact} className="px-7 py-3.5 rounded-full bg-[#2b2a26] text-white text-sm font-semibold hover:bg-[#c8693a] transition-colors cursor-pointer">
                {labels.heroBtn}
              </button>
              {p.onDownloadCV && (
                <button type="button" onClick={p.onDownloadCV} className="px-7 py-3.5 rounded-full border border-[#2b2a26]/30 text-sm font-semibold inline-flex items-center gap-2 hover:border-[#2b2a26] transition-colors cursor-pointer">
                  <Download size={15} /> {labels.download}
                </button>
              )}
            </div>
          </div>
          <div className="md:col-span-5 order-1 md:order-2 flex justify-center">
            <div className="w-64 h-80 sm:w-72 sm:h-96 rounded-t-full rounded-b-[2rem] bg-[#dfe6d4] overflow-hidden flex items-center justify-center">
              {resume.photoUrl ? (
                <img src={resume.photoUrl} alt={resume.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl text-[#4d6040]" style={{ fontFamily: SERIF }}>{initials(resume)}</span>
              )}
            </div>
          </div>
        </header>

        {renderOrdered(p, (sec) => body(sec))}

        <footer className="my-12 rounded-[2.5rem] bg-[#c8693a] text-white p-10 sm:p-14 text-center">
          <button type="button" onClick={p.onContact} className="text-[clamp(2rem,5vw,3.5rem)] leading-tight underline underline-offset-8 decoration-white/50 hover:decoration-white cursor-pointer" style={{ fontFamily: SERIF }}>
            {labels.contact}
          </button>
          <p className="mt-6 text-sm text-white/85">
            {resume.email && <a href={`mailto:${resume.email}`} className="hover:text-white">{resume.email}</a>}
            {resume.email && ' · '}© {new Date().getFullYear()} {resume.fullName}
          </p>
        </footer>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. AURORE — dégradé pastel lumineux, verre dépoli, typographie mixte
// ═══════════════════════════════════════════════════════════════════════════

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export const AuroreTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];

  const Glass: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`relative rounded-[2rem] bg-white/60 backdrop-blur-2xl ring-1 ring-white/80 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_30px_60px_-30px_rgba(76,60,140,0.35)] p-7 sm:p-10 ${className}`}>{children}</div>
  );
  const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-4 mb-8">
      <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#8f78f0] to-[#ff9f7a]" />
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5b4fb0]">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-[#cfc4f3] to-transparent" />
    </div>
  );

  const body = (sec: PortfolioSection) => {
    if (sec === 'about') {
      return (
        <Glass className="mb-6">
          <Title>{labels.about}</Title>
          <div className="text-xl sm:text-[1.6rem] leading-[1.55] text-[#241f3d]" style={{ fontFamily: SERIF }}><E value={resume.summary} onChange={(v) => updateField('summary', v)} /></div>
        </Glass>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <Glass className="mb-6">
          <Title>{labels.experience}</Title>
          <ol className="relative ml-2 space-y-10 border-l border-transparent" style={{ borderImage: 'linear-gradient(#b9a4f5, #ffc9b0, #a6e8d2) 1' }}>
            {resume.experience.map((exp) => (
              <li key={exp.id} className="relative pl-8">
                <span className="absolute -left-[6px] top-2 h-3 w-3 rounded-full bg-white ring-[3px] ring-[#8f78f0]" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8a82ad]">{period(exp, labels)}</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-[#241f3d]">
                  <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                </h3>
                <p className="font-medium text-[#6d5bd0]">
                  <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                </p>
                <div className="mt-3 text-[#4a4566] leading-relaxed max-w-2xl">
                  <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                </div>
              </li>
            ))}
          </ol>
        </Glass>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <div className="mb-6">
          <h2 className="sr-only">{labels.projects}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((proj, i) => (
              <Glass key={proj.id || i} className={`group hover:-translate-y-1 transition-transform duration-300 ${i === 0 && projects.length % 2 === 1 ? 'md:col-span-2' : ''}`}>
                <span className="text-6xl font-semibold tabular-nums bg-gradient-to-br from-[#b9a4f5] to-[#ffc9b0] bg-clip-text text-transparent" style={{ fontFamily: SERIF }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[#241f3d]">
                  <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                </h3>
                <div className="mt-3 text-[#4a4566] leading-relaxed">
                  <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                </div>
                {safeUrl(proj.link) && (
                  <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#241f3d]">
                    Voir le projet
                    <span className="h-8 w-8 rounded-full bg-[#241f3d] text-white flex items-center justify-center group-hover:bg-[#6d5bd0] transition-colors"><ArrowUpRight size={15} /></span>
                  </a>
                )}
              </Glass>
            ))}
          </div>
        </div>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <Glass className="mb-6">
          <Title>{labels.expertise}</Title>
          <ul className="flex flex-wrap gap-2.5">
            {resume.skills.map((skill, i) => (
              <li key={i} className="px-4 py-2 rounded-full bg-white/80 ring-1 ring-[#e4def8] text-sm font-medium text-[#241f3d] hover:bg-gradient-to-r hover:from-[#ece5ff] hover:to-[#ffe9df] transition-colors">
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
              </li>
            ))}
          </ul>
        </Glass>
      );
    }
    return null;
  };

  return (
    <div
      className="relative min-h-[800px] text-[#241f3d] overflow-hidden"
      style={{
        fontFamily: SANS,
        background:
          'radial-gradient(55rem 38rem at 8% -8%, #e4d8fc 0%, transparent 62%), radial-gradient(48rem 34rem at 96% 4%, #ffdccb 0%, transparent 62%), radial-gradient(52rem 40rem at 50% 108%, #cdf2e4 0%, transparent 62%), #f7f5fc',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />

      <SiteNav
        p={p}
        className="bg-white/45 backdrop-blur-2xl border-b border-white/70"
        linkClass="text-sm font-medium text-[#5b5578] hover:text-[#241f3d] transition-colors"
        ctaClass="px-5 py-2 rounded-full bg-[#241f3d] text-white text-sm font-semibold hover:bg-[#6d5bd0] transition-colors cursor-pointer"
        brand={<span className="font-semibold tracking-tight">{firstName(resume) || 'Portfolio'}<span className="text-[#8f78f0]">.</span></span>}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <header className="text-center mb-20">
          <div className="relative mx-auto h-36 w-36">
            <div aria-hidden className="absolute -inset-5 rounded-full bg-gradient-to-br from-[#b9a4f5] via-[#ffc9b0] to-[#a6e8d2] blur-2xl opacity-70" />
            <div className="relative h-full w-full rounded-full p-[3px] bg-[conic-gradient(from_200deg,#8f78f0,#ff9f7a,#7fe0c2,#8f78f0)]">
              {resume.photoUrl ? (
                <img src={resume.photoUrl} alt={resume.fullName} className="h-full w-full rounded-full object-cover border-4 border-white" />
              ) : (
                <span className="h-full w-full rounded-full bg-white flex items-center justify-center text-4xl font-semibold text-[#6d5bd0]">{initials(resume)}</span>
              )}
            </div>
          </div>
          <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/70 ring-1 ring-white px-4 py-1.5 text-sm text-[#5b5578] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8f78f0]" />
            {[headline(resume), resume.location].filter(Boolean).join(' · ') || 'Portfolio'}
          </p>
          <h1 className="mt-6 text-[clamp(2.75rem,8vw,5.75rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
            <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
          </h1>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={p.onContact} className="px-8 py-4 rounded-full bg-[#241f3d] text-white text-sm font-semibold shadow-[0_18px_40px_-14px_rgba(36,31,61,0.7)] hover:bg-[#6d5bd0] transition-colors cursor-pointer">
              {labels.heroBtn}
            </button>
            {p.onDownloadCV && (
              <button type="button" onClick={p.onDownloadCV} className="px-8 py-4 rounded-full bg-white/70 backdrop-blur ring-1 ring-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-white transition-colors cursor-pointer">
                <Download size={15} /> {labels.download}
              </button>
            )}
          </div>
        </header>

        {renderOrdered(p, (sec) => body(sec))}

        <footer className="mt-16 rounded-[2rem] bg-[#241f3d] text-white px-8 py-12 sm:px-14 sm:py-16 text-center">
          <button type="button" onClick={p.onContact} className="text-[clamp(1.75rem,5vw,3.25rem)] font-semibold tracking-[-0.03em] leading-tight hover:text-[#ffc9b0] transition-colors cursor-pointer" style={{ fontFamily: SERIF }}>
            {labels.contact} →
          </button>
          <p className="mt-6 text-sm text-white/60">
            {resume.email && <a href={`mailto:${resume.email}`} className="hover:text-white">{resume.email}</a>}
            {resume.email && ' · '}© {new Date().getFullYear()} {resume.fullName}
          </p>
        </footer>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 8. BRUTAL — contours noirs, ombres franches, palette resserrée
// ═══════════════════════════════════════════════════════════════════════════

const BR_INK = '#0d0d0d';
const BR_PAPER = '#f4efe4';
const BR_YELLOW = '#ffe14d';
const BR_BLUE = '#3355ff';

export const BrutalTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];
  const ticker = [headline(resume), resume.location, ...(resume.skills || []).slice(0, 5)].filter(Boolean) as string[];

  const Title: React.FC<{ n: string; children: React.ReactNode }> = ({ n, children }) => (
    <div className="flex items-end justify-between gap-6 border-b-2 border-[#0d0d0d] pb-4 mb-10">
      <h2 className="text-[clamp(2rem,6vw,4rem)] font-bold uppercase leading-none tracking-[-0.03em]">{children}</h2>
      <span className="text-sm font-bold tabular-nums">({n})</span>
    </div>
  );

  const body = (sec: PortfolioSection, index: number) => {
    const n = String(index + 1).padStart(2, '0');
    if (sec === 'about') {
      return (
        <section className="py-14">
          <Title n={n}>{labels.about}</Title>
          <div className="border-2 border-[#0d0d0d] rounded-3xl p-7 sm:p-12 shadow-[8px_8px_0_#0d0d0d]" style={{ backgroundColor: BR_YELLOW }}>
            <E tag="p" className="text-[clamp(1.25rem,2.6vw,2rem)] font-medium leading-[1.35] tracking-tight" value={resume.summary} onChange={(v) => updateField('summary', v)} />
          </div>
        </section>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <section className="py-14">
          <Title n={n}>{labels.experience}</Title>
          <ol className="border-2 border-[#0d0d0d] rounded-3xl bg-white shadow-[8px_8px_0_#0d0d0d] divide-y-2 divide-[#0d0d0d] overflow-hidden">
            {resume.experience.map((exp) => (
              <li key={exp.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 p-7 sm:p-9">
                <p className="md:col-span-3 text-sm font-bold uppercase tracking-wide pt-1">{period(exp, labels)}</p>
                <div className="md:col-span-9">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    <E value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                  </h3>
                  <p className="mt-1 inline-block px-2 py-0.5 text-sm font-bold text-white" style={{ backgroundColor: BR_BLUE }}>
                    <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                  </p>
                  <div className="mt-4 leading-relaxed max-w-2xl">
                    <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      const tones = [
        { bg: '#ffffff', fg: BR_INK },
        { bg: BR_BLUE, fg: '#ffffff' },
        { bg: BR_YELLOW, fg: BR_INK },
      ];
      return (
        <section className="py-14">
          <Title n={n}>{labels.projects}</Title>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {projects.map((proj, i) => {
              const tone = tones[i % tones.length];
              return (
                <article
                  key={proj.id || i}
                  className={`border-2 border-[#0d0d0d] rounded-3xl p-7 sm:p-9 shadow-[8px_8px_0_#0d0d0d] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[5px_5px_0_#0d0d0d] transition-all ${i === 0 && projects.length % 2 === 1 ? 'md:col-span-2' : ''}`}
                  style={{ backgroundColor: tone.bg, color: tone.fg }}
                >
                  <p className="text-sm font-bold tabular-nums">№ {String(i + 1).padStart(2, '0')}</p>
                  <h3 className="mt-2 text-3xl sm:text-4xl font-bold uppercase leading-[1.02] tracking-[-0.02em]">
                    <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                  </h3>
                  <div className="mt-4 leading-relaxed opacity-90">
                    <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                  </div>
                  {safeUrl(proj.link) && (
                    <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 border-2 border-[#0d0d0d] rounded-full bg-white text-[#0d0d0d] px-5 py-2 text-sm font-bold hover:bg-[#0d0d0d] hover:text-white transition-colors">
                      Voir le projet <ArrowUpRight size={15} />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <section className="py-14">
          <Title n={n}>{labels.expertise}</Title>
          <ul className="flex flex-wrap gap-3">
            {resume.skills.map((skill, i) => (
              <li key={i} className="border-2 border-[#0d0d0d] rounded-full bg-white px-5 py-2.5 text-sm font-bold shadow-[4px_4px_0_#0d0d0d] hover:bg-[#ffe14d] transition-colors">
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
              </li>
            ))}
          </ul>
        </section>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[800px] text-[#0d0d0d]" style={{ fontFamily: GROTESK, backgroundColor: BR_PAPER }}>
      <style>{'@keyframes cvp-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.cvp-marquee{animation:none!important}}'}</style>
      <SiteNav
        p={p}
        className="border-b-2 border-[#0d0d0d]"
        linkClass="text-sm font-bold uppercase tracking-wide hover:underline underline-offset-4 decoration-2"
        ctaClass="px-5 py-2 border-2 border-[#0d0d0d] rounded-full bg-[#ffe14d] text-sm font-bold shadow-[3px_3px_0_#0d0d0d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0d0d0d] transition-all cursor-pointer"
        brand={<span className="font-bold text-lg tracking-tight uppercase">{firstName(resume) || 'Portfolio'}<span style={{ color: BR_BLUE }}>*</span></span>}
      />

      <div className="max-w-6xl mx-auto px-6">
        <header className="pt-14 pb-16 sm:pt-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em]">{[headline(resume), resume.location].filter(Boolean).join(' — ') || 'Portfolio'}</p>
            <h1 className="mt-5 text-[clamp(3rem,10vw,8rem)] leading-[0.92] font-bold uppercase tracking-[-0.045em]">
              <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
            </h1>
            <div className="mt-10 flex flex-wrap gap-4">
              <button type="button" onClick={p.onContact} className="px-8 py-3.5 border-2 border-[#0d0d0d] rounded-full text-white text-sm font-bold shadow-[5px_5px_0_#0d0d0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#0d0d0d] transition-all cursor-pointer" style={{ backgroundColor: BR_BLUE }}>
                {labels.heroBtn}
              </button>
              {p.onDownloadCV && (
                <button type="button" onClick={p.onDownloadCV} className="px-8 py-3.5 border-2 border-[#0d0d0d] rounded-full bg-white text-sm font-bold inline-flex items-center gap-2 shadow-[5px_5px_0_#0d0d0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#0d0d0d] transition-all cursor-pointer">
                  <Download size={15} /> {labels.download}
                </button>
              )}
            </div>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <div className="relative">
              <div className="h-60 w-60 sm:h-72 sm:w-72 border-2 border-[#0d0d0d] rounded-[2rem] shadow-[10px_10px_0_#0d0d0d] overflow-hidden flex items-center justify-center" style={{ backgroundColor: BR_YELLOW }}>
                {resume.photoUrl ? (
                  <img src={resume.photoUrl} alt={resume.fullName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-7xl font-bold">{initials(resume)}</span>
                )}
              </div>
              <span className="absolute -bottom-5 -left-6 -rotate-6 border-2 border-[#0d0d0d] rounded-full bg-white px-4 py-1.5 text-sm font-bold shadow-[4px_4px_0_#0d0d0d]">
                Portfolio {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </header>
      </div>

      {ticker.length > 0 && (
        <div className="border-y-2 border-[#0d0d0d] bg-[#0d0d0d] text-[#f4efe4] overflow-hidden" aria-hidden>
          <div className="cvp-marquee flex w-max whitespace-nowrap py-3 text-lg font-bold uppercase tracking-wide" style={{ animation: 'cvp-marquee 28s linear infinite' }}>
            {[0, 1].map((k) => (
              <div key={k} className="flex items-center">
                {[...ticker, ...ticker].map((t, i) => (
                  <span key={`${k}-${i}`} className="flex items-center">
                    <span className="px-6">{t}</span>
                    <span style={{ color: BR_YELLOW }}>✺</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6">
        {renderOrdered(p, body)}

        <footer className="py-16 border-t-2 border-[#0d0d0d] mt-6 flex flex-wrap items-end justify-between gap-6">
          <button type="button" onClick={p.onContact} className="text-[clamp(2.5rem,8vw,6rem)] font-bold uppercase leading-none tracking-[-0.04em] hover:underline underline-offset-[10px] decoration-[6px] cursor-pointer text-left" style={{ textDecorationColor: BR_BLUE }}>
            {labels.contact} ↗
          </button>
          <p className="text-sm font-bold">
            {resume.email && <a href={`mailto:${resume.email}`} className="underline underline-offset-4">{resume.email}</a>}
            {resume.email && ' · '}© {new Date().getFullYear()} {resume.fullName}
          </p>
        </footer>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 9. CARNET — page de notes éditoriale : serif, papier chaud, filets fins
// ═══════════════════════════════════════════════════════════════════════════

const CA_INK = '#16161a';
const CA_MUTED = '#77736b';
const CA_RULE = '#e6e1d6';
const CA_ACCENT = '#1f4d3f';

export const CarnetTheme: React.FC<PortfolioThemeProps> = (p) => {
  const { resume, labels, Editable: E, updateField, updateNested, updateSkill } = p;
  const projects = resume.projects || [];

  const Section: React.FC<{ n: string; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
    <section className="grid grid-cols-1 md:grid-cols-[9rem_1fr] gap-x-10 gap-y-4 py-12" style={{ borderTop: `1px solid ${CA_RULE}` }}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] pt-1.5" style={{ color: CA_MUTED }}>
        <span className="tabular-nums" style={{ color: CA_ACCENT }}>{n}</span> &nbsp;{title}
      </h2>
      <div>{children}</div>
    </section>
  );

  const body = (sec: PortfolioSection, index: number) => {
    const n = String(index + 1).padStart(2, '0');
    if (sec === 'about') {
      return (
        <Section n={n} title={labels.about}>
          <div
            className="text-xl sm:text-[1.4rem] leading-[1.7] first-letter:float-left first-letter:mr-3 first-letter:text-6xl first-letter:leading-[0.85] first-letter:font-light"
            style={{ fontFamily: SERIF, color: CA_INK }}
          >
            <E value={resume.summary} onChange={(v) => updateField('summary', v)} />
          </div>
        </Section>
      );
    }
    if (sec === 'experience') {
      if (!resume.experience?.length) return null;
      return (
        <Section n={n} title={labels.experience}>
          <ol className="space-y-9">
            {resume.experience.map((exp) => (
              <li key={exp.id}>
                <p className="text-xs uppercase tracking-[0.14em] tabular-nums" style={{ color: CA_MUTED }}>{period(exp, labels)}</p>
                <h3 className="mt-1.5 text-xl sm:text-2xl font-medium tracking-tight" style={{ fontFamily: SERIF, color: CA_INK }}>
                  <E tag="span" value={exp.role} onChange={(v) => updateNested('experience', exp.id, 'role', v)} />
                </h3>
                <p className="text-sm font-medium" style={{ color: CA_ACCENT }}>
                  <E tag="span" value={exp.company} onChange={(v) => updateNested('experience', exp.id, 'company', v)} />
                </p>
                <div className="mt-3 leading-[1.75] text-[#45423c] max-w-xl">
                  <E value={exp.description} onChange={(v) => updateNested('experience', exp.id, 'description', v)} />
                </div>
              </li>
            ))}
          </ol>
        </Section>
      );
    }
    if (sec === 'projects') {
      if (!projects.length) return null;
      return (
        <Section n={n} title={labels.projects}>
          <ul className="space-y-9">
            {projects.map((proj, i) => (
              <li key={proj.id || i}>
                <h3 className="text-xl sm:text-2xl font-medium tracking-tight" style={{ fontFamily: SERIF, color: CA_INK }}>
                  <E value={proj.name} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'name', v)} />
                </h3>
                <div className="mt-2 leading-[1.75] text-[#45423c] max-w-xl">
                  <E value={proj.description} onChange={(v) => updateNested('projects', proj.id || 'proj' + i, 'description', v)} />
                </div>
                {safeUrl(proj.link) && (
                  <a href={safeUrl(proj.link) ?? undefined} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4" style={{ color: CA_ACCENT, textDecorationColor: CA_RULE }}>
                    Voir le projet <ArrowUpRight size={13} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>
      );
    }
    if (sec === 'skills') {
      if (!resume.skills?.length) return null;
      return (
        <Section n={n} title={labels.expertise}>
          <ul className="flex flex-wrap gap-y-2 text-[1.0625rem]" style={{ fontFamily: SERIF, color: CA_INK }}>
            {resume.skills.map((skill, i) => (
              <li key={i} className="flex items-center">
                <E tag="span" value={skill} onChange={(v) => updateSkill(i, v)} />
                {i < resume.skills.length - 1 && <span className="mx-3" style={{ color: CA_RULE }}>/</span>}
              </li>
            ))}
          </ul>
        </Section>
      );
    }
    return null;
  };

  return (
    <div className="min-h-[800px]" style={{ fontFamily: SANS, backgroundColor: '#fbfaf6', color: CA_INK }}>
      <div className="max-w-3xl mx-auto px-6 pt-14 sm:pt-20 pb-16">
        <div className="flex items-center justify-between pb-6 text-xs uppercase tracking-[0.2em]" style={{ color: CA_MUTED, borderBottom: `2px solid ${CA_INK}` }}>
          <span>{[headline(resume), resume.location].filter(Boolean).join(' — ') || 'Portfolio'}</span>
          <span className="tabular-nums">{new Date().getFullYear()}</span>
        </div>

        <header className="pt-14 pb-14 flex flex-col-reverse sm:flex-row sm:items-end sm:justify-between gap-8">
          <div>
            <h1 className="text-[clamp(2.75rem,8vw,5rem)] leading-[1.02] font-light tracking-[-0.025em]" style={{ fontFamily: SERIF }}>
              <E tag="span" value={resume.fullName} onChange={(v) => updateField('fullName', v)} />
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <button type="button" onClick={p.onContact} className="px-6 py-3 text-white font-medium tracking-wide hover:opacity-90 transition-opacity cursor-pointer" style={{ backgroundColor: CA_ACCENT }}>
                {labels.heroBtn}
              </button>
              {p.onDownloadCV && (
                <button type="button" onClick={p.onDownloadCV} className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4 cursor-pointer" style={{ textDecorationColor: CA_RULE }}>
                  <Download size={14} /> {labels.download}
                </button>
              )}
            </div>
          </div>
          {resume.photoUrl ? (
            <img src={resume.photoUrl} alt={resume.fullName} className="h-40 w-32 sm:h-52 sm:w-40 object-cover shrink-0 grayscale-[35%]" />
          ) : (
            <span className="h-40 w-32 sm:h-52 sm:w-40 shrink-0 flex items-center justify-center text-5xl font-light" style={{ fontFamily: SERIF, backgroundColor: '#f0ece1', color: CA_MUTED }}>{initials(resume)}</span>
          )}
        </header>

        {renderOrdered(p, body)}

        <footer className="pt-10 flex flex-wrap items-center justify-between gap-4 text-sm" style={{ borderTop: `2px solid ${CA_INK}`, color: CA_MUTED }}>
          <span>
            {resume.email && <a href={`mailto:${resume.email}`} className="hover:underline underline-offset-4" style={{ color: CA_INK }}>{resume.email}</a>}
            {resume.email && ' · '}© {new Date().getFullYear()} {resume.fullName}
          </span>
          <button type="button" onClick={p.onContact} className="font-medium underline underline-offset-4 cursor-pointer" style={{ color: CA_ACCENT }}>{labels.contact}</button>
        </footer>
      </div>
    </div>
  );
};

export const PORTFOLIO_THEME_COMPONENTS: Record<PortfolioThemeId, React.FC<PortfolioThemeProps>> = {
  editorial: EditorialTheme,
  bento: BentoTheme,
  cabinet: CabinetTheme,
  studio: StudioTheme,
  swiss: SwissTheme,
  atelier: AtelierTheme,
  aurore: AuroreTheme,
  brutal: BrutalTheme,
  carnet: CarnetTheme,
};
