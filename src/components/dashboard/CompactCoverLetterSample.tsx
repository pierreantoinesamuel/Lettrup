import React from 'react';
import { CoverLetterTemplateInfo, getAllCoverLetterTemplates } from './templates/coverLetterRegistry';

interface CompactCoverLetterSampleProps {
  template: CoverLetterTemplateInfo | string;
  accentColor?: string;
  size?: 'xs' | 'sm' | 'lg';
  customData?: {
    candidateName?: string;
    candidateRole?: string;
    email?: string;
    phone?: string;
    location?: string;
    company?: string;
    recruiter?: string;
    dateLabel?: string;
    paragraphs?: string[];
  };
}

export default function CompactCoverLetterSample({
  template,
  accentColor,
  size = 'sm',
  customData,
}: CompactCoverLetterSampleProps) {
  const allTemplates = getAllCoverLetterTemplates();
  const tpl: CoverLetterTemplateInfo =
    typeof template === 'string'
      ? allTemplates.find((item) => item.id === template) || allTemplates[0]
      : template;

  const color = accentColor || tpl.previewColor || '#2563eb';
  const candidateName = customData?.candidateName || tpl.candidateName;
  const candidateRole = customData?.candidateRole || tpl.candidateRole;
  const email = customData?.email || tpl.email;
  const phone = customData?.phone || tpl.phone;
  const location = customData?.location || tpl.location;
  const company = customData?.company || tpl.company;
  const recruiter = customData?.recruiter || tpl.recruiter;
  const city = location.split(',')[0]?.trim() || 'Paris';
  const dateLabel = customData?.dateLabel || '14 octobre 2026';
  const paragraphs =
    customData?.paragraphs && customData.paragraphs.length > 0
      ? customData.paragraphs
      : tpl.paragraphs;

  const isLarge = size === 'lg';
  const isTiny = size === 'xs';

  const darkBanner = ['assistant-dentaire', 'cadre-dirigeant', 'corporate-slate'].includes(tpl.id);
  const centeredHeader = ['artistique', 'infirmiere', 'secretaire', 'classique-chic', 'elegant-gray-serif'].includes(tpl.id);
  const leftRail = ['left-blue-rail', 'formal-blue-sidebar'].includes(tpl.id);
  const rightSidePanel = tpl.id === 'green-side-panel';
  const twoColExec = tpl.id === 'executive-two-column';
  const dateBadge = tpl.id === 'date-badge-classic';
  const aquaBanner = tpl.id === 'aqua-header';
  const boxedHeader = tpl.id === 'association';
  const coralBadge = tpl.id === 'salmon-accent';
  const policeBox = tpl.id === 'police';
  const serifFont = ['artistique', 'cadre-dirigeant', 'secretaire', 'classique-chic', 'elegant-gray-serif', 'beige-editorial'].includes(tpl.id);

  const initials = candidateName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (isLarge) {
    return (
      <div className={`flex h-full w-full flex-col overflow-hidden bg-white text-slate-800 ${serifFont ? 'font-serif' : 'font-sans'}`}>
        {darkBanner ? (
          <div className="flex items-center justify-between px-8 py-6 text-white border-b-4" style={{ backgroundColor: color, borderBottomColor: '#f59e0b' }}>
            <div>
              <div className="text-xl font-black uppercase tracking-wider text-white">{candidateName}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-white/80">{candidateRole}</div>
            </div>
            <div className="text-right text-[11px] text-white/85 space-y-0.5 font-sans">
              <div>{email}</div>
              <div>{phone}</div>
              <div>{location}</div>
            </div>
          </div>
        ) : aquaBanner ? (
          <div className="px-8 py-5 border-b-4" style={{ backgroundColor: `${color}18`, borderBottomColor: color }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-black uppercase tracking-wide text-slate-900">{candidateName}</div>
                <div className="mt-0.5 text-xs font-bold uppercase tracking-wider" style={{ color }}>{candidateRole}</div>
              </div>
              <div className="text-right text-[11px] text-slate-600 space-y-0.5 font-sans">
                <div>{email}</div>
                <div>{phone}</div>
                <div>{location}</div>
              </div>
            </div>
          </div>
        ) : rightSidePanel ? (
          <div className="grid grid-cols-[1fr_170px] border-b border-slate-200">
            <div className="px-8 py-6">
              <div className="text-2xl font-bold text-slate-900">{candidateName}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color }}>{candidateRole}</div>
            </div>
            <div className="p-5 text-[10px] text-white leading-relaxed flex flex-col justify-center font-sans" style={{ backgroundColor: color }}>
              <div className="font-bold text-white/95 truncate">{email}</div>
              <div>{phone}</div>
              <div>{location}</div>
            </div>
          </div>
        ) : null}

        <div className={`flex flex-1 min-h-0 ${leftRail ? 'flex-row' : 'flex-col'}`}>
          {leftRail && <div className="w-3 shrink-0" style={{ backgroundColor: color }} />}
          <div className="flex flex-1 flex-col justify-between p-8">
            <div>
              {!darkBanner && !aquaBanner && !rightSidePanel && (
                <>
                  {centeredHeader ? (
                    <div className="mb-5 border-b pb-4 text-center" style={{ borderColor: `${color}40` }}>
                      {tpl.id === 'infirmiere' && (
                        <div className="mx-auto mb-2.5 h-1 w-24 rounded-full" style={{ backgroundColor: color }} />
                      )}
                      <div className="text-2xl font-black uppercase tracking-widest text-slate-900">{candidateName}</div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color }}>{candidateRole}</div>
                      <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-slate-500 font-sans">
                        <span>{email}</span>
                        <span>•</span>
                        <span>{phone}</span>
                        <span>•</span>
                        <span>{location}</span>
                      </div>
                    </div>
                  ) : boxedHeader ? (
                    <div className="mb-5 flex items-center justify-between rounded-xl border p-4" style={{ backgroundColor: `${color}12`, borderColor: `${color}45` }}>
                      <div>
                        <div className="text-xl font-black text-slate-900">{candidateName}</div>
                        <div className="mt-0.5 text-xs font-bold uppercase tracking-wider" style={{ color }}>{candidateRole}</div>
                      </div>
                      <div className="text-right text-[11px] text-slate-600 font-sans">
                        <div>{email}</div>
                        <div>{phone}</div>
                        <div>{location}</div>
                      </div>
                    </div>
                  ) : policeBox ? (
                    <div className="mb-5 flex items-start justify-between rounded-r-xl border-l-4 p-4" style={{ borderLeftColor: color, backgroundColor: `${color}10` }}>
                      <div>
                        <div className="text-xl font-black uppercase tracking-tight text-slate-900">{candidateName}</div>
                        <div className="mt-0.5 text-xs font-extrabold uppercase tracking-wider" style={{ color }}>{candidateRole}</div>
                      </div>
                      <div className="text-right text-[11px] text-slate-600 font-sans">
                        <div>{email}</div>
                        <div>{phone}</div>
                        <div>{location}</div>
                      </div>
                    </div>
                  ) : coralBadge ? (
                    <div className="mb-5 flex items-center justify-between border-b pb-4" style={{ borderColor: `${color}40` }}>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{candidateName}</div>
                        <div className="mt-0.5 text-xs font-bold uppercase tracking-widest" style={{ color }}>{candidateRole}</div>
                        <div className="mt-2 text-[11px] text-slate-500 font-sans">{email} · {phone} · {location}</div>
                      </div>
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        {initials}
                      </div>
                    </div>
                  ) : twoColExec ? (
                    <div className="mb-5 flex items-start justify-between gap-6 border-b border-slate-300 pb-4">
                      <div className="w-44 border-r border-slate-200 pr-4 text-[11px] text-slate-600 font-sans">
                        <div className="font-bold text-slate-900">{company}</div>
                        <div className="mt-0.5">{recruiter}</div>
                        <div className="mt-2 text-slate-400">{city}, le {dateLabel}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-black uppercase tracking-tight text-slate-900">{candidateName}</div>
                        <div className="mt-1 text-xs font-bold uppercase tracking-wider" style={{ color }}>{candidateRole}</div>
                        <div className="mt-2 text-[11px] text-slate-500 font-sans">{email} · {phone} · {location}</div>
                      </div>
                    </div>
                  ) : dateBadge ? (
                    <div className="mb-5 border-b border-stone-300 pb-4 font-sans">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{candidateName}</span>
                          <div className="text-xs font-semibold" style={{ color }}>{candidateRole}</div>
                        </div>
                        <div className="text-right">
                          <div>{email}</div>
                          <div>{phone} · {location}</div>
                        </div>
                      </div>
                      <div className="mx-auto mt-3 w-fit rounded px-3 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                        {city}, le {dateLabel}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5 flex items-start justify-between border-b-2 pb-4" style={{ borderColor: color }}>
                      <div>
                        <div className="text-2xl font-black uppercase tracking-tight text-slate-900">{candidateName}</div>
                        <div className="mt-0.5 text-xs font-bold uppercase tracking-wider" style={{ color }}>{candidateRole}</div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-sans space-y-0.5">
                        <div>{email}</div>
                        <div>{phone}</div>
                        <div>{location}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!twoColExec && (
                <div className="mb-4 flex items-start justify-between text-[11px] text-slate-600 font-sans">
                  <div>
                    <div className="font-bold text-slate-900">{company}</div>
                    <div>À l’attention de : {recruiter}</div>
                  </div>
                  {!dateBadge && (
                    <div className="italic text-slate-500 shrink-0">
                      Fait à {city}, le {dateLabel}
                    </div>
                  )}
                </div>
              )}

              <div
                className="mb-4 rounded-r-md border-l-4 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 font-sans"
                style={{ borderLeftColor: color }}
              >
                Objet : Candidature au poste de {candidateRole}
              </div>

              <div className="space-y-3 text-[11.5px] leading-[1.65] text-slate-700 font-sans text-justify">
                <p className="font-semibold text-slate-900">Madame, Monsieur,</p>
                {paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
                <p className="italic text-slate-600">
                  Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-3 font-sans">
              <div className="text-[10px] text-slate-400">Pièce jointe : Curriculum Vitae</div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{candidateName}</div>
                <div className="mt-0.5 font-serif text-sm italic font-semibold" style={{ color }}>
                  {candidateName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Miniature card preview ('xs' or 'sm') — matches CompactCvSample density and clarity
  const bodyFontSize = isTiny ? 'text-[3.5px]' : 'text-[4.1px]';
  const padClass = isTiny ? 'p-2' : 'p-2.5';

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden bg-white text-slate-800 select-none ${serifFont ? 'font-serif' : 'font-sans'}`}>
      {/* Full-bleed top banner variants */}
      {darkBanner ? (
        <div
          className="flex items-center justify-between px-2.5 py-2 text-white border-b-2 shrink-0"
          style={{ backgroundColor: color, borderBottomColor: tpl.id === 'cadre-dirigeant' ? '#f59e0b' : `${color}cc` }}
        >
          <div className="min-w-0">
            <div className="text-[6.5px] font-black uppercase tracking-wider text-white truncate">{candidateName}</div>
            <div className="mt-0.5 text-[4px] font-semibold uppercase tracking-wider text-white/80 truncate">{candidateRole}</div>
          </div>
          <div className="text-right text-[3.5px] text-white/75 leading-tight shrink-0 font-sans ml-1">
            <div>{city}</div>
            <div>{phone}</div>
          </div>
        </div>
      ) : aquaBanner ? (
        <div
          className="flex items-center justify-between px-2.5 py-2 border-b-2 shrink-0"
          style={{ backgroundColor: `${color}1f`, borderBottomColor: color }}
        >
          <div className="min-w-0">
            <div className="text-[6.5px] font-black uppercase tracking-wide text-slate-900 truncate">{candidateName}</div>
            <div className="text-[4px] font-bold uppercase tracking-wider truncate" style={{ color }}>{candidateRole}</div>
          </div>
          <div className="text-right text-[3.5px] text-slate-600 leading-tight shrink-0 font-sans ml-1">
            <div>{email}</div>
            <div>{phone}</div>
          </div>
        </div>
      ) : rightSidePanel ? (
        <div className="grid grid-cols-[1fr_54px] border-b border-slate-200 shrink-0">
          <div className="px-2.5 py-2 min-w-0">
            <div className="text-[6.5px] font-black text-slate-900 truncate">{candidateName}</div>
            <div className="text-[3.8px] font-bold uppercase tracking-wider truncate" style={{ color }}>{candidateRole}</div>
          </div>
          <div className="px-1.5 py-1.5 text-[3.3px] text-white leading-tight flex flex-col justify-center font-sans" style={{ backgroundColor: color }}>
            <div className="truncate">{city}</div>
            <div className="truncate">{phone}</div>
          </div>
        </div>
      ) : null}

      <div className={`flex flex-1 min-h-0 ${leftRail ? 'flex-row' : 'flex-col'}`}>
        {leftRail && <div className="w-1.5 shrink-0" style={{ backgroundColor: color }} />}

        <div className={`flex flex-1 flex-col justify-between min-h-0 ${padClass}`}>
          <div className="min-h-0">
            {/* In-page header variants */}
            {!darkBanner && !aquaBanner && !rightSidePanel && (
              <>
                {centeredHeader ? (
                  <div className="mb-1.5 border-b pb-1.5 text-center" style={{ borderColor: `${color}40` }}>
                    {tpl.id === 'infirmiere' && (
                      <div className="mx-auto mb-1 h-[2px] w-10 rounded-full" style={{ backgroundColor: color }} />
                    )}
                    <div className="text-[6.5px] font-black uppercase tracking-widest text-slate-900 truncate">{candidateName}</div>
                    <div className="mt-0.5 text-[4px] font-bold uppercase tracking-wider truncate" style={{ color }}>{candidateRole}</div>
                    <div className="mt-0.5 text-[3.4px] text-slate-500 font-sans truncate">
                      {city} · {email} · {phone}
                    </div>
                  </div>
                ) : boxedHeader ? (
                  <div
                    className="mb-1.5 flex items-center justify-between rounded-md border px-2 py-1.5"
                    style={{ backgroundColor: `${color}12`, borderColor: `${color}45` }}
                  >
                    <div className="min-w-0">
                      <div className="text-[6px] font-black text-slate-900 truncate">{candidateName}</div>
                      <div className="text-[3.8px] font-bold uppercase truncate" style={{ color }}>{candidateRole}</div>
                    </div>
                    <div className="text-right text-[3.4px] text-slate-600 font-sans shrink-0 ml-1">
                      <div>{city}</div>
                      <div>{phone}</div>
                    </div>
                  </div>
                ) : policeBox ? (
                  <div
                    className="mb-1.5 flex items-start justify-between rounded-r border-l-[3px] px-2 py-1"
                    style={{ borderLeftColor: color, backgroundColor: `${color}12` }}
                  >
                    <div className="min-w-0">
                      <div className="text-[6px] font-black uppercase text-slate-900 truncate">{candidateName}</div>
                      <div className="text-[3.8px] font-extrabold uppercase truncate" style={{ color }}>{candidateRole}</div>
                    </div>
                    <div className="text-right text-[3.4px] text-slate-600 font-sans shrink-0 ml-1">
                      <div>{city}</div>
                      <div>{phone}</div>
                    </div>
                  </div>
                ) : coralBadge ? (
                  <div className="mb-1.5 flex items-center justify-between border-b pb-1.5" style={{ borderColor: `${color}40` }}>
                    <div className="min-w-0">
                      <div className="text-[6.5px] font-bold text-slate-900 truncate">{candidateName}</div>
                      <div className="text-[3.8px] font-bold uppercase tracking-wider truncate" style={{ color }}>{candidateRole}</div>
                      <div className="text-[3.3px] text-slate-500 font-sans truncate">{email} · {phone}</div>
                    </div>
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[4.5px] font-black text-white"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                  </div>
                ) : twoColExec ? (
                  <div className="mb-1.5 grid grid-cols-[38%_62%] gap-1.5 border-b border-slate-200 pb-1.5">
                    <div className="border-r border-slate-200 pr-1 text-[3.4px] text-slate-600 font-sans leading-tight">
                      <div className="font-bold text-slate-900 truncate">{company}</div>
                      <div className="truncate">{recruiter}</div>
                      <div className="mt-0.5 text-slate-400">{city}</div>
                    </div>
                    <div className="min-w-0 pl-0.5">
                      <div className="text-[6px] font-black uppercase text-slate-900 truncate">{candidateName}</div>
                      <div className="text-[3.8px] font-bold truncate" style={{ color }}>{candidateRole}</div>
                      <div className="text-[3.3px] text-slate-500 font-sans truncate">{email}</div>
                    </div>
                  </div>
                ) : dateBadge ? (
                  <div className="mb-1.5 border-b border-stone-200 pb-1 font-sans">
                    <div className="flex justify-between items-start text-[3.5px] text-slate-600">
                      <div className="min-w-0">
                        <div className="text-[6px] font-black text-slate-900 truncate">{candidateName}</div>
                        <div className="text-[3.8px] font-bold truncate" style={{ color }}>{candidateRole}</div>
                      </div>
                      <div className="text-right shrink-0 ml-1">
                        <div>{city}</div>
                        <div>{phone}</div>
                      </div>
                    </div>
                    <div
                      className="mx-auto mt-1 w-fit rounded-xs px-1.5 py-[1px] text-[3.3px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {city}, le {dateLabel}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`mb-1.5 flex items-start justify-between pb-1.5 ${
                      tpl.id === 'audacieux-spontanee' ? 'border-b-[2.5px]' : 'border-b'
                    }`}
                    style={{ borderColor: color }}
                  >
                    <div className="min-w-0">
                      <div className="text-[6.5px] font-black uppercase tracking-tight text-slate-900 truncate">{candidateName}</div>
                      <div className="mt-0.5 text-[3.9px] font-bold uppercase tracking-wider truncate" style={{ color }}>
                        {candidateRole}
                      </div>
                    </div>
                    <div className="text-right text-[3.4px] text-slate-500 leading-tight font-sans shrink-0 ml-1">
                      <div className="truncate max-w-[64px]">{email}</div>
                      <div>{phone}</div>
                      <div>{city}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Recipient + Date row */}
            {!twoColExec && (
              <div className="mb-1.5 flex items-start justify-between gap-1 text-[3.6px] leading-tight text-slate-600 font-sans">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{company}</div>
                  <div className="text-slate-500 truncate">{recruiter}</div>
                </div>
                {!dateBadge && (
                  <div className="shrink-0 text-right italic text-slate-400">
                    {city}, le 14 oct.
                  </div>
                )}
              </div>
            )}

            {/* Object Line */}
            <div
              className="mb-1.5 rounded-r-xs border-l-2 bg-slate-50 px-1.5 py-0.5 text-[3.8px] leading-tight text-slate-800 font-sans truncate"
              style={{ borderLeftColor: color }}
            >
              <span className="font-extrabold">Objet :</span> Candidature — {candidateRole}
            </div>

            {/* Real French Cover Letter Body */}
            <div className={`space-y-1 ${bodyFontSize} leading-[1.42] text-slate-600 font-sans text-justify overflow-hidden`}>
              <div className="font-semibold text-slate-800">Madame, Monsieur,</div>
              {paragraphs.slice(0, 3).map((paragraph, index) => (
                <p key={index} className={isTiny ? 'line-clamp-2' : 'line-clamp-3'}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Formal closing & Signature */}
          <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-end justify-between font-sans shrink-0">
            <span className="text-[3.3px] italic text-slate-400 truncate max-w-[65%]">
              Veuillez agréer mes salutations distinguées.
            </span>
            <div className="text-right shrink-0">
              <div className="text-[4px] font-extrabold text-slate-800 leading-none">{candidateName}</div>
              <div className="mt-0.5 h-[2px] w-8 ml-auto rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
