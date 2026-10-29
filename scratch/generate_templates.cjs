const fs = require('fs');

const NEW_TEMPLATE_NAMES = `  mb_tokyo: 'MB Tokyo',
  mb_oslo: 'MB Oslo',
  mb_helsinki: 'MB Helsinki',
  mb_stockholm: 'MB Stockholm',
  mb_berlin: 'MB Berlin',
  mb_london: 'MB London',
  mb_paris: 'MB Paris',
  mb_rome: 'MB Rome',
  mb_madrid: 'MB Madrid',
  mb_vienna: 'MB Vienna',
  mb_tokyo_alt: 'MB Tokyo Alt',
  mb_geneva: 'MB Geneva'`;

const NEW_TEMPLATES = `  mb_tokyo: {
    container: "text-slate-900 font-sans bg-white",
    header: "bg-black text-white p-8 mb-8 border-b-[6px] border-orange-500 [&>div:first-child]:flex-row-reverse [&>div:first-child]:justify-between",
    name: "text-4xl font-black uppercase tracking-wider text-white mb-2",
    profil: "text-sm text-gray-300 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mt-2",
    sectionHeaderContainer: "mb-3",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold uppercase tracking-widest text-orange-500",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 font-medium",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  },
  mb_oslo: {
    container: "text-slate-900 font-sans bg-[#8fa1c9]",
    header: "bg-[#293c66] text-white p-8 mb-6 relative",
    name: "text-5xl font-black uppercase tracking-tight text-white mb-2",
    profil: "text-sm text-blue-100 leading-relaxed mt-4 max-w-2xl",
    contact: "flex flex-col gap-2 text-xs text-blue-200 mt-4 absolute top-8 right-8 text-right",
    sectionHeaderContainer: "mb-3 border-b-2 border-[#293c66] pb-1 mx-8 mt-6",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-base font-bold uppercase tracking-widest text-[#293c66]",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold px-8",
    bodySubtitle: "text-slate-800 font-medium px-8",
    bodyMuted: "text-slate-700 px-8",
    bodyMeta: "text-slate-600 px-8",
  },
  mb_helsinki: {
    container: "text-slate-900 font-sans bg-[#d4d1ed] p-8",
    header: "mb-8 [&>div:first-child]:flex-row-reverse [&>div:first-child]:justify-between",
    name: "text-4xl font-bold text-slate-800 mb-1",
    profil: "text-sm text-slate-700 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600",
    sectionHeaderContainer: "mb-3 border-b border-indigo-900/20 pb-1 mt-6",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold text-indigo-900",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-800",
    bodyMuted: "text-slate-700",
    bodyMeta: "text-slate-600 italic",
  },
  mb_stockholm: {
    container: "text-slate-900 font-sans bg-[#e1d5e3] p-8",
    header: "mb-8 text-center border-b border-pink-900/20 pb-6",
    name: "text-4xl font-normal tracking-widest uppercase text-slate-900 mb-2",
    profil: "text-sm text-slate-700 leading-relaxed max-w-2xl mx-auto mt-4",
    contact: "flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs text-slate-600",
    sectionHeaderContainer: "mb-4 text-center mt-6",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold uppercase tracking-widest text-[#b45d77]",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-800 font-medium",
    bodyMuted: "text-slate-700",
    bodyMeta: "text-slate-600",
  },
  mb_berlin: {
    container: "text-slate-900 font-sans bg-white",
    header: "p-6",
    name: "text-3xl font-black uppercase text-white mb-2",
    profil: "text-sm text-gray-300 leading-relaxed mt-4",
    contact: "flex flex-col gap-2 text-xs text-gray-400 mt-6",
    sectionHeaderContainer: "mb-3 mt-6 border-b-2 border-[#00bcd4] pb-1 inline-block",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-xs font-bold uppercase tracking-widest text-slate-800",
    sectionHeaderLineEnd: "hidden",
    sidebarContainer: "bg-[#4a4a4a] text-white p-8 min-h-full",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 font-medium",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
    sidebarBodyTitle: "text-white",
    sidebarBodySubtitle: "text-gray-300",
    sidebarBodyMuted: "text-gray-400",
    sidebarBodyMeta: "text-gray-500",
    layoutVariant: 'left-sidebar'
  },
  mb_london: {
    container: "text-slate-900 font-sans bg-white p-8",
    header: "mb-8 pb-4 border-b-2 border-blue-600",
    name: "text-4xl font-bold text-slate-900 mb-1",
    profil: "text-sm text-slate-700 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mt-2",
    sectionHeaderContainer: "mb-3 mt-6",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold uppercase text-blue-600",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 font-medium",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  },
  mb_paris: {
    container: "text-slate-900 font-sans bg-white",
    header: "bg-[#1a1a1a] text-white p-8 mb-8",
    name: "text-5xl font-black uppercase tracking-tight text-white mb-2",
    profil: "text-sm text-gray-300 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mt-2",
    sectionHeaderContainer: "mb-3 mt-6 border-b-4 border-black pb-1",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-black uppercase tracking-widest text-black",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 font-medium",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  },
  mb_rome: {
    container: "text-slate-900 font-sans bg-white border-[12px] border-[#81b29a] p-6",
    header: "mb-8 [&>div:first-child]:flex-row-reverse [&>div:first-child]:justify-between border-b border-gray-200 pb-6",
    name: "text-4xl font-bold uppercase text-slate-900 mb-2",
    profil: "text-sm text-slate-700 leading-relaxed mt-4",
    contact: "flex flex-col gap-2 text-xs text-slate-500 mt-2",
    sectionHeaderContainer: "mb-3 mt-6",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold uppercase tracking-widest text-[#81b29a]",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  },
  mb_madrid: {
    container: "text-slate-900 font-serif bg-white p-8",
    header: "mb-8 pb-4 border-b border-black",
    name: "text-3xl font-normal text-black mb-1",
    profil: "text-sm text-slate-700 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500",
    sectionHeaderContainer: "mb-3 mt-6 border-b border-black pb-1",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold uppercase tracking-widest text-black",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 italic",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  },
  mb_vienna: {
    container: "text-slate-900 font-sans bg-white p-8 border-t-8 border-green-600",
    header: "mb-8 [&>div:first-child]:flex-row-reverse [&>div:first-child]:justify-between",
    name: "text-4xl font-bold text-slate-900 mb-1",
    profil: "text-sm text-slate-700 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500",
    sectionHeaderContainer: "mb-3 mt-6",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold text-green-700 border-b-2 border-green-200 pb-1",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 font-medium",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  },
  mb_tokyo_alt: {
    container: "text-slate-900 font-sans bg-white",
    header: "bg-black text-white p-8 mb-8 border-b-[6px] border-orange-500 [&>div:first-child]:flex-row-reverse [&>div:first-child]:justify-between",
    name: "text-4xl font-black uppercase tracking-wider text-white mb-2",
    profil: "text-sm text-gray-300 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-400 mt-2",
    sectionHeaderContainer: "mb-3",
    sectionHeaderLine: "hidden",
    sectionHeaderTitle: "text-sm font-bold uppercase tracking-widest text-orange-500",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 font-medium",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  },
  mb_geneva: {
    container: "text-slate-900 font-sans bg-white p-8",
    header: "mb-8 pb-6 border-b border-slate-200 [&>div:first-child]:items-start",
    name: "text-3xl font-black uppercase tracking-widest text-slate-900 bg-sky-100 px-4 py-2 inline-block mb-4",
    profil: "text-sm text-slate-700 leading-relaxed mt-4",
    contact: "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500",
    sectionHeaderContainer: "mb-3 mt-6 flex items-center gap-4",
    sectionHeaderLine: "h-px bg-slate-200 flex-1",
    sectionHeaderTitle: "text-sm font-bold uppercase tracking-widest text-sky-700 shrink-0",
    sectionHeaderLineEnd: "hidden",
    bodyTitle: "text-slate-900 font-bold",
    bodySubtitle: "text-slate-700 font-medium",
    bodyMuted: "text-slate-600",
    bodyMeta: "text-slate-500",
  }`;

let content = fs.readFileSync('src/templates.ts', 'utf8');

const typeReplacement = `export type TemplateType =
  | 'minimalist'
  | 'swiss' | 'admin'
  | 'elegant' | 'stylish'
  | 'executive' | 'editorial'
  | 'classic_french' | 'modern_it'
  | 'luxury_black' | 'pastel_green'
  | 'comptabilite_simple' | 'comptable_osc' 
  | 'comptable_classique' | 'juriste' 
  | 'propre_elegant'
  | 'mb_tokyo' | 'mb_oslo' | 'mb_helsinki' 
  | 'mb_stockholm' | 'mb_berlin' | 'mb_london' 
  | 'mb_paris' | 'mb_rome' | 'mb_madrid' 
  | 'mb_vienna' | 'mb_tokyo_alt' | 'mb_geneva';`;

content = content.replace(/export type TemplateType =[\s\S]*?propre_elegant';/, typeReplacement);

// Add to TEMPLATE_NAMES
const namesEnd = content.indexOf('};', content.indexOf('TEMPLATE_NAMES'));
content = content.slice(0, namesEnd) + ',\\n' + NEW_TEMPLATE_NAMES + '\\n' + content.slice(namesEnd);

// Add to TEMPLATES
const templatesEnd = content.lastIndexOf('};');
content = content.slice(0, templatesEnd) + ',\\n' + NEW_TEMPLATES + '\\n' + content.slice(templatesEnd);

fs.writeFileSync('src/templates.ts', content);
console.log('Fixed syntax templates.ts');
