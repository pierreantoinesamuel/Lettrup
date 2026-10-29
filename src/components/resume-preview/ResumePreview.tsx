import React from 'react';
import { Mail, Phone, MapPin, Link as LinkIcon, Linkedin, Github, Car } from 'lucide-react';
import { TemplateType, TEMPLATES } from '../../templates';
import { sanitizeDescriptionHtml } from '../../lib/cvContentSafety';

/**
 * Shared CV data shapes + the single renderer both the live editor
 * (ResumeBuilder.tsx) and the paginated PDF exporter (cvPdfExport.tsx) use.
 * Living in its own file (rather than inline in ResumeBuilder.tsx) avoids a
 * circular import: cvPdfExport.tsx needs this component, and ResumeBuilder.tsx
 * needs cvPdfExport.tsx.
 */

export type Experience = { id: string; company: string; jobTitle: string; startDate: string; endDate: string; current: boolean; location: string; description: string };
export type Education = { id: string; institution: string; degree: string; date: string };
export type Project = { id: string; name: string; description: string };
export type CustomResumeSection = { id: `custom-${string}`; title: string; content: string[] };

export type ResumeData = {
  coordonnees: {
    name: string;
    jobTitle: string;
    photoUrl: string;
    email: string;
    phone: string;
    website: string;
    location: string;
    linkedin: string;
    github: string;
    drivingLicense: string;
  };
  profil: string;
  experience: Experience[];
  education: Education[];
  competences: string;
  langues: string;
  interets: string;
  projets: Project[];
  customSections?: CustomResumeSection[];
};

export type SectionId = 'experience' | 'education' | 'projets' | 'competences' | 'langues' | 'interets';
export type ResumeSectionId = SectionId | `custom-${string}`;

export const SECTION_LABELS: Record<SectionId, string> = {
  experience: 'Expérience',
  education: 'Éducation',
  projets: 'Projets',
  competences: 'Compétences',
  langues: 'Langues',
  interets: 'Intérêts'
};

export const ResumePreview = ({
  data,
  template,
  layout,
  singleColumnOrder,
  mainColumnOrder,
  sideColumnOrder,
  id = 'resume-preview',
  showHeader = true,
}: {
  data: ResumeData,
  template: TemplateType,
  layout: 'single' | 'double',
  singleColumnOrder: ResumeSectionId[],
  mainColumnOrder: ResumeSectionId[],
  sideColumnOrder: ResumeSectionId[],
  /** Distinct DOM id per mounted instance — the live editor, the export-modal
   * thumbnail, and the offscreen pagination renderer can all be mounted at
   * once, and duplicate ids make `getElementById` ambiguous. */
  id?: string,
  /** Continuation pages (page 2+) render only the overflowing main-column
   * content at full width, with no repeated header/photo — see cvPdfExport.tsx. */
  showHeader?: boolean,
}) => {
  const t = TEMPLATES[template];

  // data-cv-section-header + data-cv-item/-id let the export-time pagination
  // engine (cvPdfExport.tsx) measure real rendered geometry off this exact
  // component — the same markup used for both the live preview and every
  // exported page, so there is no drift between what the editor shows and
  // what gets paginated/captured.
  // Templates with a colored sidebar need a header style per column: a light
  // title meant for a dark sidebar is invisible on the white main column (and
  // the other way round), so each column can override the shared style.
  const SectionHeader = ({ title, sectionId, isSidebar = false }: { title: string; sectionId: ResumeSectionId; isSidebar?: boolean }) => (
    <div
      className={(isSidebar ? t.sidebarSectionHeaderContainer : t.mainSectionHeaderContainer) || t.sectionHeaderContainer}
      data-cv-section-header={sectionId}
    >
      <div className={t.sectionHeaderLine}></div>
      <h2 className={(isSidebar ? t.sidebarSectionHeaderTitle : t.mainSectionHeaderTitle) || t.sectionHeaderTitle}>{title}</h2>
      <div className={t.sectionHeaderLineEnd}></div>
    </div>
  );

  // Body text colors are shared by whichever column a section lands in (the
  // side/main assignment is user-configurable drag-and-drop, not fixed per
  // section type), so each block resolves its own colors from `isSidebar`
  // rather than the caller passing down a pre-picked class string.
  const renderExpSection = (isSidebar: boolean, colorsSidebar: boolean = isSidebar) => {
    const titleCls = (colorsSidebar ? t.sidebarBodyTitle : undefined) || t.bodyTitle || 'text-gray-800';
    const subtitleCls = (colorsSidebar ? t.sidebarBodySubtitle : undefined) || t.bodySubtitle || 'text-gray-700';
    const mutedCls = (colorsSidebar ? t.sidebarBodyMuted : undefined) || t.bodyMuted || 'text-gray-600';
    const metaCls = (colorsSidebar ? t.sidebarBodyMeta : undefined) || t.bodyMeta || 'text-gray-500';

    const expLayout = t.experienceLayout || 'row';
    const descCls = `text-xs ${mutedCls} space-y-1 min-w-0 max-w-full [overflow-wrap:anywhere] [&_*]:[overflow-wrap:anywhere] [&>ul]:list-disc [&>ul]:list-outside [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:list-outside [&>ol]:ml-4 [&_p]:mb-1 [&_a]:break-all`;

    const renderExpItem = (exp: typeof data.experience[0]) => {
      const dateStr = `${exp.startDate} – ${exp.current ? 'Présent' : exp.endDate}`;

      if (expLayout === 'date-left') {
        return (
          <div key={exp.id} data-cv-item="experience" data-cv-item-id={exp.id} className="flex gap-3 min-w-0">
            <div className="shrink-0 text-right" style={{ width: '68px' }}>
              <span className="text-xs font-semibold leading-tight" style={{ color: t.accent || '#6b7280' }}>
                {exp.startDate}<br />{exp.current ? 'Présent' : exp.endDate}
              </span>
            </div>
            <div className="flex-1 min-w-0 border-l-2 pl-3" style={{ borderColor: t.accent ? `${t.accent}55` : '#e5e7eb' }}>
              <h3 className={`font-bold ${titleCls} text-sm break-words`}>{exp.company}{exp.location ? ` — ${exp.location}` : ''}</h3>
              <div className={`text-sm font-medium ${subtitleCls} mb-1.5 break-words`}>{exp.jobTitle}</div>
              <div className={descCls} dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(exp.description) }} />
            </div>
          </div>
        );
      }

        const inner = (
        <>
          <div className="flex justify-between items-baseline gap-3 mb-0.5">
            <h3 className={`font-bold ${titleCls} text-sm break-words min-w-0`}>
              {exp.company}{exp.location ? ` - ${exp.location}` : ''}
            </h3>
            <span className={`text-xs ${metaCls} shrink-0 whitespace-nowrap`}>{dateStr}</span>
          </div>
          <div className={`text-sm font-medium ${subtitleCls} mb-2 break-words`}>{exp.jobTitle}</div>
          <div className={descCls} dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(exp.description) }} />
        </>
      );

      if (expLayout === 'card') {
        return (
          <div
            key={exp.id}
            data-cv-item="experience"
            data-cv-item-id={exp.id}
            className="rounded-lg border border-gray-200 p-3 min-w-0"
            style={t.accent ? { borderLeftColor: t.accent, borderLeftWidth: '3px' } : undefined}
          >
            {inner}
          </div>
        );
      }
      if (expLayout === 'timeline') {
        return (
          <div key={exp.id} data-cv-item="experience" data-cv-item-id={exp.id} className="relative pl-5 min-w-0">
            <div
              className="absolute top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{ left: '-5px', backgroundColor: t.accent || '#6b7280' }}
            />
            {inner}
          </div>
        );
      }
      return (
        <div key={exp.id} data-cv-item="experience" data-cv-item-id={exp.id} className="min-w-0">
          {inner}
        </div>
      );
    };

    if (!data.experience.length) return false;
    return (
      <div key="experience">
        <SectionHeader title="Expérience" sectionId="experience" isSidebar={colorsSidebar} />
        {expLayout === 'timeline' ? (
          <div className="space-y-5 relative" style={{ borderLeft: `2px solid ${t.accent || '#e5e7eb'}` }}>
            {data.experience.map(renderExpItem)}
          </div>
        ) : (
          <div className="space-y-5">{data.experience.map(renderExpItem)}</div>
        )}
      </div>
    );
  };

  const renderProjSection = (isSidebar: boolean, colorsSidebar: boolean = isSidebar) => {
    const titleCls = (colorsSidebar ? t.sidebarBodyTitle : undefined) || t.bodyTitle || 'text-gray-800';
    const mutedCls = (colorsSidebar ? t.sidebarBodyMuted : undefined) || t.bodyMuted || 'text-gray-600';

    return data.projets.length > 0 && (
      <div key="projets">
        <SectionHeader title="Projets" sectionId="projets" isSidebar={colorsSidebar} />
        <div className="space-y-3">
          {data.projets.map(proj => (
            <div key={proj.id} data-cv-item="projets" data-cv-item-id={proj.id} className="text-xs min-w-0">
              <span className={`font-bold ${titleCls} text-sm mr-2 break-words`}>{proj.name}</span>
              <span className={`${mutedCls} break-words`}>{proj.description}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEduSection = (isSidebar: boolean, colorsSidebar: boolean = isSidebar) => {
    const titleCls = (colorsSidebar ? t.sidebarBodyTitle : undefined) || t.bodyTitle || 'text-gray-800';
    const subtitleCls = (colorsSidebar ? t.sidebarBodySubtitle : undefined) || t.bodySubtitle || 'text-gray-700';
    const metaCls = (colorsSidebar ? t.sidebarBodyMeta : undefined) || t.bodyMeta || 'text-gray-500';

    return data.education.length > 0 && (
      <div key="education">
        <SectionHeader title="Éducation" sectionId="education" isSidebar={colorsSidebar} />
        <div className="space-y-4">
          {data.education.map(edu => (
            <div key={edu.id} data-cv-item="education" data-cv-item-id={edu.id} className="flex justify-between items-baseline gap-3 min-w-0">
              <div className="min-w-0">
                <div className={`font-bold ${titleCls} text-sm break-words`}>{edu.institution}</div>
                <div className={`text-xs ${subtitleCls} mt-0.5 break-words`}>{edu.degree}</div>
              </div>
              <span className={`text-xs ${metaCls} shrink-0 whitespace-nowrap`}>{edu.date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCompSection = (isSidebar: boolean, colorsSidebar: boolean = isSidebar) => {
    const mutedCls = (colorsSidebar ? t.sidebarBodyMuted : undefined) || t.bodyMuted || 'text-gray-600';
    if (!data.competences) return false;
    const lines = data.competences.split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
    const sidebarSkillItems = lines
      .flatMap((line) => line.split(','))
      .map((line) => line.trim())
      .filter(Boolean);
    const skillsLayout = t.skillsLayout || 'list';

    let content: React.ReactNode;
    if (skillsLayout === 'tags') {
      content = isSidebar ? (
        <div data-cv-item="competences" data-cv-item-id="__whole__" className="space-y-1.5 min-w-0 max-w-full">
          {sidebarSkillItems.map((line, i) => (
            <div
              key={`${line}-${i}`}
              className={`border-l-2 pl-2 text-xs leading-snug ${mutedCls} min-w-0 max-w-full [overflow-wrap:anywhere]`}
              style={{ borderColor: t.accent || 'currentColor' }}
            >
              {line}
            </div>
          ))}
        </div>
      ) : (
        <div data-cv-item="competences" data-cv-item-id="__whole__" className="flex flex-wrap gap-1.5">
          {lines.map((line, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded-full border"
              style={t.accent ? { borderColor: t.accent, color: t.accent, backgroundColor: `${t.accent}18` } : { borderColor: '#d1d5db', color: '#374151', backgroundColor: '#f3f4f6' }}
            >
              {line}
            </span>
          ))}
        </div>
      );
    } else if (skillsLayout === 'bars') {
      content = (
        <div data-cv-item="competences" data-cv-item-id="__whole__" className="space-y-2">
          {lines.map((line, i) => {
            const match = line.match(/^(.+?)(?::\s*(\d+)%)?$/);
            const name = match?.[1]?.trim() || line;
            const pct = match?.[2] ? parseInt(match[2]) : 75;
            return (
              <div key={i}>
                <div className={`flex justify-between text-xs mb-0.5 ${mutedCls}`}>
                  <span>{name}</span>
                  {match?.[2] && <span>{pct}%</span>}
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: t.accent || '#6b7280' }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    } else if (skillsLayout === 'inline') {
      content = (
        <p data-cv-item="competences" data-cv-item-id="__whole__" className={`text-xs ${mutedCls} leading-relaxed`}>
          {lines.join(' · ')}
        </p>
      );
    } else {
      content = (
        <ul data-cv-item="competences" data-cv-item-id="__whole__" className={`list-disc list-outside ml-4 text-xs ${mutedCls} space-y-1 min-w-0 max-w-full [overflow-wrap:anywhere]`}>
          {lines.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      );
    }

    return (
      <div key="competences">
        <SectionHeader title="Compétences" sectionId="competences" isSidebar={colorsSidebar} />
        {content}
      </div>
    );
  };

  const renderLangSection = (isSidebar: boolean, colorsSidebar: boolean = isSidebar) => {
    const mutedCls = (colorsSidebar ? t.sidebarBodyMuted : undefined) || t.bodyMuted || 'text-gray-600';
    return data.langues && (
      <div key="langues">
        <SectionHeader title="Langues" sectionId="langues" isSidebar={colorsSidebar} />
        <ul
          data-cv-item="langues"
          data-cv-item-id="__whole__"
          className={`list-disc list-outside ml-4 text-xs ${mutedCls} space-y-1 min-w-0 max-w-full [overflow-wrap:anywhere]`}
        >
          {data.langues.split('\n').map((line, i) => {
            const cleanLine = line.replace(/^[-*]\s*/, '').trim();
            return cleanLine ? <li key={i}>{cleanLine}</li> : null;
          })}
        </ul>
      </div>
    );
  };

  const renderIntSection = (isSidebar: boolean, colorsSidebar: boolean = isSidebar) => {
    const mutedCls = (colorsSidebar ? t.sidebarBodyMuted : undefined) || t.bodyMuted || 'text-gray-600';
    return data.interets && (
      <div key="interets">
        <SectionHeader title="Intérêts" sectionId="interets" isSidebar={colorsSidebar} />
        <ul
          data-cv-item="interets"
          data-cv-item-id="__whole__"
          className={`list-disc list-outside ml-4 text-xs ${mutedCls} space-y-1 min-w-0 max-w-full [overflow-wrap:anywhere]`}
        >
          {data.interets.split('\n').map((line, i) => {
            const cleanLine = line.replace(/^[-*]\s*/, '').trim();
            return cleanLine ? <li key={i}>{cleanLine}</li> : null;
          })}
        </ul>
      </div>
    );
  };

  // Layout always follows the sidebar variant (existing look); only the colors
  // switch with the real column, so light-on-dark text never lands on white.
  const getSectionsMap = (colorsSidebar: boolean): Record<SectionId, React.ReactNode> => ({
    experience: renderExpSection(true, colorsSidebar),
    projets: renderProjSection(true, colorsSidebar),
    education: renderEduSection(true, colorsSidebar),
    competences: renderCompSection(true, colorsSidebar),
    langues: renderLangSection(true, colorsSidebar),
    interets: renderIntSection(true, colorsSidebar)
  });

  const sideMap = getSectionsMap(true);
  const mainMap = getSectionsMap(false);
  const renderCustomSection = (sectionId: ResumeSectionId, isSidebar: boolean) => {
    const section = (data.customSections || []).find((item) => item.id === sectionId);
    if (!section || !section.title.trim() || !section.content.some((item) => item.trim())) return null;
    const mutedCls = (isSidebar ? t.sidebarBodyMuted : undefined) || t.bodyMuted || 'text-gray-700';
    return (
      <div key={section.id}>
        <SectionHeader title={section.title} sectionId={section.id} isSidebar={isSidebar} />
        <ul className={`list-disc list-outside ml-4 text-xs ${mutedCls} space-y-1 min-w-0 max-w-full [overflow-wrap:anywhere]`}>
          {section.content.map((item, index) => (
            <li
              key={`${section.id}-${index}`}
              data-cv-item={section.id}
              data-cv-item-id={`${section.id}-${index}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  };
  const isCustomSection = (sectionId: ResumeSectionId) => (data.customSections || []).some((item) => item.id === sectionId);
  const renderSection = (isSidebar: boolean) => (sectionId: ResumeSectionId) =>
    isCustomSection(sectionId)
      ? renderCustomSection(sectionId, isSidebar)
      : (isSidebar ? sideMap : mainMap)[sectionId as SectionId];

  const renderClassicCompact = () => {
    const splitLines = (value: string, splitCommas = false) =>
      value
        .split(splitCommas ? /[\n,]/ : '\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);

    const parseLevel = (line: string) => {
      const match = line.match(/^(.+?)(?:\s*[:\-–—]\s*(\d{1,3})\s*%)$/);
      if (!match) return { name: line, pct: null as number | null };
      return { name: match[1].trim(), pct: Math.max(0, Math.min(100, Number(match[2]))) };
    };

    const splitLabelDetail = (line: string) => {
      const match = line.match(/^(.+?)\s*[:\-–—]\s*(.+)$/);
      return match ? { label: match[1].trim(), detail: match[2].trim() } : { label: line, detail: '' };
    };

    const sectionRows: React.ReactNode[] = [];

    const SectionRow = ({
      id: sectionId,
      label,
      children,
    }: {
      id: ResumeSectionId;
      label: string;
      children: React.ReactNode;
      key?: React.Key;
    }) => (
      <section key={sectionId} className="grid grid-cols-[22%_78%] gap-[5mm] pt-[4mm] first:pt-0 min-w-0">
        <div className="pt-[1mm]" data-cv-section-header={sectionId}>
          <h2 className={t.sectionHeaderTitle}>{label}</h2>
        </div>
        <div className="min-w-0 border-b border-zinc-200 pb-[4mm]">
          {children}
        </div>
      </section>
    );

    if (data.experience.length > 0) {
      sectionRows.push(
        <SectionRow id="experience" label="EXPÉRIENCES">
          <div className="space-y-[3.5mm]">
            {data.experience.map((exp) => {
              const dateStr = `${exp.startDate} – ${exp.current ? 'Présent' : exp.endDate}`;
              return (
                <article key={exp.id} data-cv-item="experience" data-cv-item-id={exp.id} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-[4mm] min-w-0">
                    <h3 className="text-[9px] leading-tight font-black uppercase text-zinc-950 min-w-0 break-words">
                      {[exp.jobTitle, exp.company].filter(Boolean).join(' – ')}
                    </h3>
                    {(exp.startDate || exp.endDate || exp.current) && (
                      <span className="text-[8px] leading-tight font-bold text-zinc-800 shrink-0 whitespace-nowrap">
                        {dateStr}
                      </span>
                    )}
                  </div>
                  {exp.location && (
                    <div className="text-[8px] leading-snug text-zinc-600 mt-[1mm] break-words">{exp.location}</div>
                  )}
                  {exp.description && (
                    <div
                      className="text-[8.5px] leading-snug text-zinc-700 mt-[1.5mm] min-w-0 max-w-full [overflow-wrap:anywhere] [&_*]:[overflow-wrap:anywhere] [&>ul]:list-disc [&>ul]:list-outside [&>ul]:ml-[3.5mm] [&>ul]:space-y-[0.5mm] [&>ol]:list-decimal [&>ol]:list-outside [&>ol]:ml-[3.5mm] [&_p]:mb-[1mm] [&_a]:break-all"
                      dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(exp.description) }}
                    />
                  )}
                </article>
              );
            })}
          </div>
        </SectionRow>
      );
    }

    if (data.education.length > 0) {
      sectionRows.push(
        <SectionRow id="education" label="ÉTUDES">
          <div className="space-y-[3mm]">
            {data.education.map((edu) => (
              <article key={edu.id} data-cv-item="education" data-cv-item-id={edu.id} className="flex items-baseline justify-between gap-[4mm] min-w-0">
                <div className="min-w-0">
                  <h3 className="text-[9px] leading-tight font-black uppercase text-zinc-950 break-words">{edu.degree}</h3>
                  <div className="text-[8.5px] leading-snug text-zinc-700 mt-[1mm] break-words">{edu.institution}</div>
                </div>
                {edu.date && (
                  <span className="text-[8px] leading-tight font-bold text-zinc-800 shrink-0 whitespace-nowrap">{edu.date}</span>
                )}
              </article>
            ))}
          </div>
        </SectionRow>
      );
    }

    if (data.projets.length > 0) {
      sectionRows.push(
        <SectionRow id="projets" label="PROJETS">
          <div className="space-y-[2.5mm]">
            {data.projets.map((proj) => (
              <article key={proj.id} data-cv-item="projets" data-cv-item-id={proj.id} className="text-[8.5px] leading-snug text-zinc-700 min-w-0">
                <span className="font-black uppercase text-zinc-950 break-words">{proj.name}</span>
                {proj.description && <span className="break-words"> — {proj.description}</span>}
              </article>
            ))}
          </div>
        </SectionRow>
      );
    }

    if (data.competences) {
      const skills = splitLines(data.competences, true).map(parseLevel);
      sectionRows.push(
        <SectionRow id="competences" label="COMPÉTENCES">
          <div data-cv-item="competences" data-cv-item-id="__whole__" className="grid grid-cols-3 gap-x-[5mm] gap-y-[2.5mm]">
            {skills.map((skill, i) => (
              <div key={`${skill.name}-${i}`} className="min-w-0">
                <div className="text-[8px] leading-tight font-black uppercase text-zinc-950 break-words">{skill.name}</div>
                {skill.pct !== null && (
                  <div className="h-[2px] bg-zinc-200 mt-[1mm] overflow-hidden">
                    <div className="h-full bg-zinc-900" style={{ width: `${skill.pct}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionRow>
      );
    }

    if (data.langues) {
      const languages = splitLines(data.langues).map(parseLevel);
      sectionRows.push(
        <SectionRow id="langues" label="LANGUES">
          <div data-cv-item="langues" data-cv-item-id="__whole__" className="grid grid-cols-2 gap-x-[7mm] gap-y-[2mm]">
            {languages.map((language, i) => (
              <div key={`${language.name}-${i}`} className="min-w-0">
                <div className="text-[8.5px] leading-tight text-zinc-700 break-words">
                  {(() => {
                    const display = splitLabelDetail(language.name);
                    return (
                      <>
                        <span className="font-black uppercase text-zinc-950">{display.label}</span>
                        {display.detail && <span> — {display.detail}</span>}
                      </>
                    );
                  })()}
                </div>
                {language.pct !== null && (
                  <div className="h-[2px] bg-zinc-200 mt-[1mm] overflow-hidden">
                    <div className="h-full bg-zinc-900" style={{ width: `${language.pct}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionRow>
      );
    }

    if (data.interets) {
      const interests = splitLines(data.interets, true);
      sectionRows.push(
        <SectionRow id="interets" label="CENTRES D'INTÉRÊT">
          <div data-cv-item="interets" data-cv-item-id="__whole__" className="grid grid-cols-3 gap-x-[5mm] gap-y-[1.5mm]">
            {interests.map((interest, i) => (
              <div key={`${interest}-${i}`} className="flex items-start gap-[1.5mm] text-[8.5px] leading-snug text-zinc-700 min-w-0">
                <span className="text-zinc-950 font-bold leading-none mt-[0.5mm]">✓</span>
                <span className="break-words">{interest}</span>
              </div>
            ))}
          </div>
        </SectionRow>
      );
    }

    (data.customSections || []).forEach((section) => {
      if (!section.title.trim() || !section.content.some((item) => item.trim())) return;
      sectionRows.push(
        <SectionRow key={section.id} id={section.id} label={section.title.toLocaleUpperCase()}>
          <div className="space-y-[2mm]">
            {section.content.map((item, index) => (
              <div
                key={`${section.id}-${index}`}
                data-cv-item={section.id}
                data-cv-item-id={`${section.id}-${index}`}
                className="text-[8.5px] leading-snug text-zinc-700 min-w-0 break-words"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionRow>
      );
    });

    return (
      <div id={id} className={`${t.container} leading-normal bg-white w-[210mm] min-h-[297mm] max-w-[210mm] shrink-0 transition-transform origin-top box-border flex flex-col`}>
        {showHeader && (
          <header className={t.header} data-cv-region="header">
            <div className="flex items-start gap-[7mm] min-w-0">
              {data.coordonnees.photoUrl && (
                <img
                  src={data.coordonnees.photoUrl}
                  alt={data.coordonnees.name || 'Photo de profil'}
                  className="w-[28mm] h-[28mm] rounded-full object-cover shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className={`${t.contact} flex flex-col gap-[1.2mm] mb-[3mm]`}>
                  <div className="flex flex-wrap items-center gap-x-[5mm] gap-y-[1mm] min-w-0">
                    {data.coordonnees.email && <div className="flex items-center gap-[1.5mm] break-all min-w-0"><Mail size={10} className="shrink-0" /> {data.coordonnees.email}</div>}
                    {data.coordonnees.phone && <div className="flex items-center gap-[1.5mm] break-all min-w-0"><Phone size={10} className="shrink-0" /> {data.coordonnees.phone}</div>}
                  </div>
                  {data.coordonnees.location && <div className="flex items-center gap-[1.5mm] break-words min-w-0"><MapPin size={10} className="shrink-0" /> {data.coordonnees.location}</div>}
                  <div className="flex flex-wrap items-center gap-x-[5mm] gap-y-[1mm] min-w-0">
                    {data.coordonnees.linkedin && <div className="flex items-center gap-[1.5mm] break-all min-w-0"><Linkedin size={10} className="shrink-0" /> {data.coordonnees.linkedin}</div>}
                    {data.coordonnees.github && <div className="flex items-center gap-[1.5mm] break-all min-w-0"><Github size={10} className="shrink-0" /> {data.coordonnees.github}</div>}
                    {data.coordonnees.website && <div className="flex items-center gap-[1.5mm] break-all min-w-0"><LinkIcon size={10} className="shrink-0" /> {data.coordonnees.website}</div>}
                    {data.coordonnees.drivingLicense && <div className="flex items-center gap-[1.5mm] break-words min-w-0"><Car size={10} className="shrink-0" /> {data.coordonnees.drivingLicense}</div>}
                  </div>
                </div>
                {data.coordonnees.name && <h1 className={`${t.name} break-words`}>{data.coordonnees.name}</h1>}
                {data.coordonnees.jobTitle && <div className="text-[10.5px] leading-tight font-semibold text-zinc-700 mt-[1mm] break-words">{data.coordonnees.jobTitle}</div>}
                {data.profil && <p className={`${t.profil} mt-[3mm] break-words`}>{data.profil}</p>}
              </div>
            </div>
          </header>
        )}
        <main data-cv-region="main" className="px-[12mm] pb-[11mm] flex-1 min-w-0">
          {sectionRows}
        </main>
      </div>
    );
  };

  if (template === 'classic-compact') {
    return renderClassicCompact();
  }

  return (
    <div id={id} className={`${t.container} leading-normal bg-white shadow-2xl w-[210mm] min-h-[297mm] max-w-[210mm] ${(t.layoutVariant === 'left-sidebar' || t.layoutVariant === 'two-column') ? 'p-0' : 'p-12'} shrink-0 transition-transform origin-top box-border flex flex-col`}>
      {/* Header — Top mode (classic, two-column, and centered variants) */}
      {showHeader && t.layoutVariant !== 'left-sidebar' && (() => {
        const isCentered = template === 'minimalist' || t.headerCentered;
        const isNameContactRow = t.headerLayout === 'name-contact-row';

        const nameNode = t.nameSplit && data.coordonnees.name.trim().includes(' ') ? (() => {
          const words = data.coordonnees.name.trim().split(/\s+/);
          const last = words.pop()!;
          const rest = words.join(' ');
          return <><span>{rest} </span><span style={{ color: t.accent || 'inherit' }}>{last}</span></>;
        })() : data.coordonnees.name;

        const contactItems = (
          <>
            {data.coordonnees.email && <div className="flex items-center gap-1.5 break-all min-w-0"><Mail size={14} className="shrink-0" /> {data.coordonnees.email}</div>}
            {data.coordonnees.phone && <div className="flex items-center gap-1.5 break-all min-w-0"><Phone size={14} className="shrink-0" /> {data.coordonnees.phone}</div>}
            {data.coordonnees.location && <div className="flex items-center gap-1.5 break-words min-w-0"><MapPin size={14} className="shrink-0" /> {data.coordonnees.location}</div>}
            {data.coordonnees.drivingLicense && <div className="flex items-center gap-1.5 break-words min-w-0"><Car size={14} className="shrink-0" /> {data.coordonnees.drivingLicense}</div>}
            {data.coordonnees.linkedin && <div className="flex items-center gap-1.5 break-all min-w-0"><Linkedin size={14} className="shrink-0" /> {data.coordonnees.linkedin}</div>}
            {data.coordonnees.github && <div className="flex items-center gap-1.5 break-all min-w-0"><Github size={14} className="shrink-0" /> {data.coordonnees.github}</div>}
            {data.coordonnees.website && <div className="flex items-center gap-1.5 break-all min-w-0"><LinkIcon size={14} className="shrink-0" /> {data.coordonnees.website}</div>}
          </>
        );

        if (isNameContactRow) {
          return (
            <div className={t.header} data-cv-region="header">
              <div className="flex justify-between items-start gap-6 min-w-0">
                <div className="min-w-0 flex-1">
                  {data.coordonnees.photoUrl && (
                    <img src={data.coordonnees.photoUrl} alt={data.coordonnees.name || 'Photo de profil'} className={`w-20 h-20 object-cover border-2 border-gray-200 mb-3 ${t.photoShape === 'square' ? '' : t.photoShape === 'rounded' ? 'rounded-lg' : 'rounded-full'}`} />
                  )}
                  <h1 className={`${t.name} break-words`}>{nameNode}</h1>
                  {data.coordonnees.jobTitle && <div className="text-base font-medium text-gray-500 break-words mt-1">{data.coordonnees.jobTitle}</div>}
                </div>
                <div className={t.contact}>{contactItems}</div>
              </div>
              <p className={`${t.profil} break-words`}>{data.profil}</p>
            </div>
          );
        }

        return (
          <div className={t.header} data-cv-region="header">
            <div className={`flex ${isCentered ? 'flex-col items-center text-center' : 'items-center'} gap-6 mb-4 min-w-0`}>
              {data.coordonnees.photoUrl && (
                <img src={data.coordonnees.photoUrl} alt={data.coordonnees.name || 'Photo de profil'} className={`w-24 h-24 object-cover border-2 border-gray-200 shrink-0 ${t.photoShape === 'square' ? '' : t.photoShape === 'rounded' ? 'rounded-lg' : 'rounded-full'}`} />
              )}
              <div className={`min-w-0 ${isCentered ? 'flex flex-col items-center' : ''}`}>
                <h1 className={`${t.name} break-words`}>{nameNode}</h1>
                {data.coordonnees.jobTitle && <div className={`text-xl font-medium text-gray-500 break-words ${isCentered ? 'tracking-widest uppercase text-sm' : ''}`}>{data.coordonnees.jobTitle}</div>}
              </div>
            </div>
            <div className={t.contact}>{contactItems}</div>
            <p className={`${t.profil} break-words`}>{data.profil}</p>
          </div>
        );
      })()}

      {(layout === 'double' || t.layoutVariant === 'left-sidebar' || t.layoutVariant === 'two-column') ? (
        <div className={`flex min-w-0 flex-1 ${t.layoutVariant === 'left-sidebar' ? 'h-full' : 'gap-8'}`}>
          <div className={`w-1/3 min-w-0 flex flex-col gap-6 ${t.sidebarContainer || ''}`} data-cv-region="sidebar">
            {/* Header — Left sidebar mode only (two-column renders header above) */}
            {showHeader && t.layoutVariant === 'left-sidebar' && (
              <div data-cv-region="header" className="mb-6">
                <div className="flex flex-col gap-4 mb-4 min-w-0">
                  {data.coordonnees.photoUrl && (
                    <img src={data.coordonnees.photoUrl} alt={data.coordonnees.name || 'Photo de profil'} className={`w-24 h-24 object-cover border-2 border-white/20 shrink-0 mx-auto ${t.photoShape === 'square' ? '' : t.photoShape === 'rounded' ? 'rounded-lg' : 'rounded-full'}`} />
                  )}
                  <div className="min-w-0 text-center">
                    <h1 className={`${t.name} break-words leading-tight`}>{data.coordonnees.name}</h1>
                    {data.coordonnees.jobTitle && <div className={`text-sm font-medium opacity-80 break-words mt-1 ${t.sidebarJobTitle || ''}`}>{data.coordonnees.jobTitle}</div>}
                  </div>
                </div>
                
                <p className={`${t.profil} break-words text-center italic opacity-90`}>{data.profil}</p>
                
                <div className={t.contact}>
                  {data.coordonnees.email && <div className="flex items-center gap-1.5 break-all min-w-0"><Mail size={14} className="shrink-0" /> {data.coordonnees.email}</div>}
                  {data.coordonnees.phone && <div className="flex items-center gap-1.5 break-all min-w-0"><Phone size={14} className="shrink-0" /> {data.coordonnees.phone}</div>}
                  {data.coordonnees.location && <div className="flex items-center gap-1.5 break-words min-w-0"><MapPin size={14} className="shrink-0" /> {data.coordonnees.location}</div>}
                  {data.coordonnees.drivingLicense && <div className="flex items-center gap-1.5 break-words min-w-0"><Car size={14} className="shrink-0" /> {data.coordonnees.drivingLicense}</div>}
                  {data.coordonnees.linkedin && <div className="flex items-center gap-1.5 break-all min-w-0"><Linkedin size={14} className="shrink-0" /> {data.coordonnees.linkedin}</div>}
                  {data.coordonnees.github && <div className="flex items-center gap-1.5 break-all min-w-0"><Github size={14} className="shrink-0" /> {data.coordonnees.github}</div>}
                  {data.coordonnees.website && <div className="flex items-center gap-1.5 break-all min-w-0"><LinkIcon size={14} className="shrink-0" /> {data.coordonnees.website}</div>}
                </div>
              </div>
            )}
            
            {sideColumnOrder.map(renderSection(true))}
          </div>
          <div className={`w-2/3 min-w-0 flex flex-col gap-6 ${t.layoutVariant === 'left-sidebar' ? 'py-12 pl-12 pr-12' : t.layoutVariant === 'two-column' ? 'py-6 pl-6 pr-8' : ''}`} data-cv-region="main">
            {mainColumnOrder.map(renderSection(false))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 min-w-0 flex-1" data-cv-region="main">
          {singleColumnOrder.map(renderSection(false))}
        </div>
      )}
    </div>
  );
};
