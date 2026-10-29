import { AIProviderRegistry } from '../../../../shared/ai/AIProviderRegistry';
import { AI_PROMPTS } from '../../../../domain/constants/aiPrompts';

export interface ResumeAuditResult {
  atsScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
}

export interface GeneratedResumeSection {
  title: string;
  items: string[];
}

export function parseGeneratedBullets(responseText: string): string[] {
  const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const cleanItem = (item: string) =>
    item
      .replace(/^[\s•●▪◦*\-–—\d.)]+/, '')
      .replace(/^["']+|["'],?$/g, '')
      .trim();

  const tryParseJson = (candidate: string): string[] | null => {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        const items = parsed
          .filter((item): item is string => typeof item === 'string')
          .map(cleanItem)
          .filter(Boolean);
        return items.length ? items : null;
      }
      if (parsed && typeof parsed === 'object') {
        const arrayVal = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
        if (Array.isArray(arrayVal)) {
          const items = arrayVal
            .filter((item): item is string => typeof item === 'string')
            .map(cleanItem)
            .filter(Boolean);
          return items.length ? items : null;
        }
      }
    } catch {
      // Fall through
    }
    return null;
  };

  const direct = tryParseJson(cleanText);
  if (direct) return direct;

  const jsonMatch = cleanText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (jsonMatch) {
    const extracted = tryParseJson(jsonMatch[0]);
    if (extracted) return extracted;
  }

  return cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== '[' && line !== ']' && line !== '{' && line !== '}')
    .map(cleanItem)
    .filter(Boolean);
}

export function inferSectionTitleFromRequest(sectionRequest: string): string {
  const cleaned = sectionRequest
    .replace(/^(?:s['’]il\s+te\s+pla[îi]t\s*,?\s*|stp\s*,?\s*|svp\s*,?\s*)?/i, '')
    .replace(/^(?:peux-tu\s+|pourrais-tu\s+|veux-tu\s+)?(?:me\s+|m['’])?(?:cr[eé][eé]r?|ajout(?:e|er)|g[eéè]n[eéè]r(?:e|er)|construi(?:s|re)|fai(?:s|re)|r[eé]dig(?:e|er)|propos(?:e|er)|extrai(?:s|re)|create|add|generate|make|build)\s+/i, '')
    .replace(/^(?:une\s+|la\s+|le\s+|un\s+|des\s+|nouvelle\s+)?(?:rubrique|section|cat[eé]gorie|bloc|partie)\s*(?:sur|de|d['’]|pour|intitul[eé]e?|nomm[eé]e?|:)?\s*/i, '')
    .replace(/\s+(?:[àa]\s+partir\s+de\s+mon\s+cv|depuis\s+mon\s+cv|selon\s+mon\s+cv|avec\s+mon\s+cv|dans\s+mon\s+cv|sur\s+mon\s+cv|pour\s+mon\s+cv).*$/i, '')
    .replace(/^[\s"«»':\-–—]+|[\s"«»'.!?:\-–—]+$/g, '')
    .trim();

  if (!cleaned) return 'Informations complémentaires';
  return (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)).slice(0, 80);
}

function buildFallbackSectionItems(sectionRequest: string, resumeText: string): string[] {
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.replace(/^[•●▪◦*\-–—]+\s*/, '').trim())
    .filter((l) => l.length > 2 && !/^(?:Exp[ée]riences?|Formations?|Projets?|Comp[ée]tences?|Langues?|Int[ée]r[êe]ts?)\s*:\s*$/i.test(l));

  const items: string[] = [];
  const pushUnique = (val: string) => {
    const v = val.replace(/^[•●▪◦*\-–—]+\s*/, '').trim();
    if (v && v.length >= 3 && !items.includes(v)) {
      items.push(v);
    }
  };

  for (const line of lines) {
    const labeled = line.match(/^(Candidat|Poste|Profil|Comp[ée]tences|Langues|Int[ée]r[êe]ts|Permis|Localisation)\s*:\s*(.+)$/i);
    if (labeled) {
      const key = labeled[1].toLowerCase();
      const val = labeled[2].trim();
      if (/certif|habilit|permis|qualif|formation|dipl[ôo]me/i.test(sectionRequest)) {
        if (key === 'permis' && val) pushUnique(`Permis : ${val}`);
        if (key.startsWith('comp')) {
          val.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).forEach((s) => {
            if (/certif|permis|ceinture|master|bachelor|licence|mba|scrum|pmp|aws|azure|cisco|google|itil|prince2|toeic|toefl/i.test(s)) {
              pushUnique(s);
            }
          });
        }
      } else if (/comp[ée]tence|outil|techno|skill|atout|force/i.test(sectionRequest) && key.startsWith('comp')) {
        val.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 6).forEach(pushUnique);
      } else if (/langue/i.test(sectionRequest) && key.startsWith('lang')) {
        val.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).forEach(pushUnique);
      } else if (/int[ée]r[êe]t|loisir|b[ée]n[ée]vol/i.test(sectionRequest) && key.startsWith('int')) {
        val.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).forEach(pushUnique);
      }
      continue;
    }

    if (/certif|habilit|qualif|formation|dipl[ôo]me/i.test(sectionRequest)) {
      if (/certif|dipl[ôo]me|master|bachelor|licence|mba|\bba\b|\bbs\b|formation|universit|school|institut|[ée]cole|permis|ceinture|scrum|pmp|aws|azure|cisco|google|toeic|toefl/i.test(line)) {
        pushUnique(line);
      }
    }
  }

  if (items.length === 0) {
    for (const line of lines) {
      if (/^(?:Candidat|Poste|Localisation|Email|T[ée]l[ée]phone)\s*:/i.test(line)) continue;
      const cleaned = line.replace(/^(?:Profil|Comp[ée]tences|Langues|Int[ée]r[êe]ts|Permis)\s*:\s*/i, '').trim();
      if (cleaned.includes(',') && cleaned.length < 180) {
        cleaned.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5).forEach(pushUnique);
      } else if (cleaned.length >= 6 && cleaned.length <= 160) {
        pushUnique(cleaned);
      }
      if (items.length >= 5) break;
    }
  }

  return items.slice(0, 6);
}

export function parseGeneratedResumeSection(responseText: string): GeneratedResumeSection {
  const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanText);
  } catch {
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('La réponse de l’IA pour la rubrique est invalide. Veuillez réessayer.');
    }
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('La réponse de l’IA pour la rubrique est invalide. Veuillez réessayer.');
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('La réponse de l’IA pour la rubrique est invalide. Veuillez réessayer.');
  }

  const result = parsed as {
    title?: unknown;
    name?: unknown;
    heading?: unknown;
    items?: unknown;
    content?: unknown;
    bullets?: unknown;
    entries?: unknown;
  };
  const rawTitle = typeof result.title === 'string'
    ? result.title
    : typeof result.name === 'string'
      ? result.name
      : typeof result.heading === 'string'
        ? result.heading
        : '';
  const title = rawTitle.trim().slice(0, 80);
  const rawItems = Array.isArray(result.items)
    ? result.items
    : Array.isArray(result.content)
      ? result.content
      : Array.isArray(result.bullets)
        ? result.bullets
        : Array.isArray(result.entries)
          ? result.entries
          : [];
  const items = [...new Set(
    rawItems
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.replace(/^[\s•●▪◦*\-–—]+/, '').trim())
      .filter(Boolean)
  )].slice(0, 20);
  if (!title && items.length) throw new Error('La réponse de l’IA pour la rubrique est invalide. Veuillez réessayer.');
  return { title, items };
}

export interface ParsedResumeData {
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  location?: string;
  summary: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  languages?: string[];
  interests?: string[];
  projects?: Array<{
    name: string;
    description: string;
  }>;
  certifications?: string[];
}

export class ResumeAIEngine {
  constructor(private readonly registry = AIProviderRegistry.getInstance()) {}

  async generateSummary(jobTitle: string, experience: string, skills: string[]): Promise<string> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.summary(jobTitle, experience, skills);
    const res = await provider.complete({ prompt });
    return this.stripMarkdown(res.text);
  }

  /**
   * Models occasionally ignore "no markdown" instructions and prepend a
   * heading/bold lead-in. data.profil renders in a plain <p>, so any
   * leftover #/** would show up as literal characters on the CV.
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^(accroche( professionnelle)?|r[ée]sum[ée]( de profil)?|profil( professionnel)?|about|summary)\s*[:\-–—]?\s*/i, '')
      .trim();
  }

  async generateBullets(role: string, company: string, description: string): Promise<string[]> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.bullets(role, company, description);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });
    return parseGeneratedBullets(res.text);
  }

  async bulletifyText(text: string): Promise<string[]> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.bulletify(text);
    const res = await provider.complete({ prompt });
    return res.text
      .split('\n')
      .map((line) => line.replace(/^[\s•*-]+/, '').trim())
      .filter(Boolean);
  }

  async optimizeText(text: string, targetRole: string): Promise<string> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.optimizeText(text, targetRole);
    const res = await provider.complete({ prompt });
    return res.text.trim();
  }

  async generateResumeSection(sectionRequest: string, resumeText: string): Promise<GeneratedResumeSection> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.createSection(sectionRequest, resumeText);
    const res = await provider.complete({ prompt, maxTokens: 2048, responseMimeType: 'application/json' });
    const parsed = parseGeneratedResumeSection(res.text);
    const title = parsed.title || inferSectionTitleFromRequest(sectionRequest);
    const items = parsed.items.length > 0 ? parsed.items : buildFallbackSectionItems(sectionRequest, resumeText);
    return { title, items };
  }

  async boostSeniority(text: string, targetLevel: string): Promise<string> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.boostSeniority(text, targetLevel);
    const res = await provider.complete({ prompt });
    return res.text.trim();
  }

  async auditResume(resumeText: string, jobDescription?: string): Promise<ResumeAuditResult> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.audit(resumeText, jobDescription);
    const res = await provider.complete({ prompt, maxTokens: 2048, responseMimeType: 'application/json' });
    const cleanText = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanText);
      if (
        !parsed ||
        typeof parsed.atsScore !== 'number' ||
        !Number.isFinite(parsed.atsScore) ||
        parsed.atsScore < 0 ||
        parsed.atsScore > 100
      ) {
        throw new Error('The ATS provider returned an invalid score.');
      }
      return {
        atsScore: Math.round(parsed.atsScore),
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((value: unknown) => typeof value === 'string') : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((value: unknown) => typeof value === 'string') : [],
        missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.filter((value: unknown) => typeof value === 'string') : [],
      };
    } catch (error) {
      console.error('Resume ATS audit returned invalid JSON:', error);
      throw new Error('Analyse ATS indisponible. Veuillez réessayer.');
    }
  }

  async autoOptimizeResume(resumeData: any, jobDesc: string): Promise<any> {
    const provider = await this.registry.getFor('resume-builder');
    const prompt = AI_PROMPTS.resume.autoOptimize(resumeData, jobDesc);
    const res = await provider.complete({ prompt, responseMimeType: 'application/json' });
    try {
      return JSON.parse(res.text);
    } catch {
      return resumeData;
    }
  }

  async parseResumeWithAI(fileText: string): Promise<ParsedResumeData> {
    const prompt = AI_PROMPTS.resume.parse(fileText);

    let responseText: string;
    try {
      const provider = await this.registry.getFor('resume-builder');
      const res = await provider.complete({
        prompt,
        maxTokens: 8192,
        responseMimeType: 'application/json',
      });
      responseText = res.text;
    } catch (err) {
      console.warn('All AI providers unavailable for resume parsing, falling back to heuristic extraction:', err);
      return this.mergeParsedResumeWithSource(this.buildHeuristicParsedData(fileText), fileText);
    }

    try {
      const cleanStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanStr);
      return this.mergeParsedResumeWithSource(parsed, fileText);
    } catch (err) {
      console.warn('Direct JSON parse failed, trying regex extraction:', err);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return this.mergeParsedResumeWithSource(JSON.parse(jsonMatch[0]), fileText);
        } catch (e) {
          console.error('Regex JSON parse also failed:', e);
        }
      }

      return this.mergeParsedResumeWithSource(this.buildHeuristicParsedData(fileText), fileText);
    }
  }

  /**
   * Best-effort extraction used when every AI provider is unreachable
   * (outage/quota) so the user still lands in the editor with real
   * contact details and their full CV text, instead of a hard failure.
   */
  private buildHeuristicParsedData(fileText: string): ParsedResumeData {
    const emailMatch = fileText.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = fileText.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}/);
    const nonEmptyLines = fileText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((line) =>
        line.length > 1 &&
        line.length < 90 &&
        !/^(?:cv|curriculum vitae|r[ée]sum[ée]|profil(?:\s+professionnel)?|exp[ée]riences?(?:\s+professionnelles?)?|formations?|[ée]ducation|comp[ée]tences?(?:\s+cl[ée]s?)?)$/i.test(line)
      );

    const firstLine = nonEmptyLines.find((line) => !line.includes('@') && !/\d{4}/.test(line));
    const secondLine = nonEmptyLines.find(
      (line) =>
        line !== firstLine &&
        !line.includes('@') &&
        !line.includes('|') &&
        line.length < 70 &&
        !/^(?:\+?\d[\d\s.-]{6,})$/.test(line)
    );
    const contactLine = nonEmptyLines.find((line) => line.includes('|') || line.includes('@'));
    const locationPart = contactLine
      ?.split('|')
      .map((part) => part.trim())
      .find((part) => part && !part.includes('@') && !/\d{2}[\s.-]\d{2}/.test(part) && !/freelance|cdi|cdd|stage|alternance|linkedin|github|http/i.test(part));

    return {
      fullName: firstLine || 'Candidat',
      email: emailMatch?.[0] || '',
      phone: phoneMatch?.[0]?.trim() || '',
      jobTitle: secondLine || '',
      location: locationPart || '',
      summary: '',
      skills: [],
      experience: [],
      education: [],
    };
  }

  private mergeParsedResumeWithSource(parsedData: any, fileText: string): ParsedResumeData {
    const parsed = parsedData && typeof parsedData === 'object' ? parsedData : {};
    const contact = parsed.contact || parsed.personalInfo || parsed.coordonnees || {};
    const text = fileText.replace(/\r/g, '\n');
    const sectionHeadings: Array<{ key: string; pattern: RegExp }> = [
      { key: 'experience', pattern: /^(?:exp[ée]riences?(?:\s+professionnelles?)?|parcours(?:\s+professionnel)?|work experience|professional experience|employment history)\s*[:\-–—]*$/i },
      { key: 'education', pattern: /^(?:formations?(?:\s+academiques?)?|[ée]ducation|cursus(?:\s+scolaire)?|academic background|education|qualifications?|dipl[ôo]mes?)\s*[:\-–—]*$/i },
      { key: 'skills', pattern: /^(?:comp[ée]tences?(?:\s+(?:cl[ée]s?|techniques?|informatiques?|fonctionnelles?(?:\s*(?:&|et)\s*m[ée]tiers?)?|m[ée]tiers?))?|skills|technical skills|core competencies)\s*[:\-–—]*$/i },
      { key: 'languages', pattern: /^(?:langues?(?:\s*&?\s*centres? d['’]int[ée]r[êe]ts?)?|languages?)\s*[:\-–—]*$/i },
      { key: 'interests', pattern: /^(?:centres? d['’]int[ée]r[êe]ts?|loisirs|interests?|hobbies)\s*[:\-–—]*$/i },
      { key: 'projects', pattern: /^(?:projets?(?:\s+(?:personnels?|r[ée]alis[ée]s?))?|projects?)\s*[:\-–—]*$/i },
      { key: 'summary', pattern: /^(?:profil(?:\s+professionnel)?|r[ée]sum[ée](?:\s+professionnel)?|accroche|about(?:\s+me)?|professional summary)\s*[:\-–—]*$/i },
      { key: 'certifications', pattern: /^(?:certifications?(?:\s*(?:&|et)\s*formations?\s*compl[ée]mentaires?)?|licences?\s*(?:&|et)?\s*certifications?)\s*[:\-–—]*$/i },
    ];
    const sections: Record<string, string[]> = {};
    let activeSection = '';
    const lines = text.split(/\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const heading = sectionHeadings.find(({ pattern }) => pattern.test(line));
      if (heading) {
        activeSection = heading.key;
        sections[activeSection] ||= [];
      } else if (activeSection) {
        sections[activeSection].push(line);
      }
    }

    const arrayValue = (...values: unknown[]): unknown[] => {
      const value = values.find((item) =>
        (Array.isArray(item) && item.length > 0) ||
        (item && typeof item === 'object' && !Array.isArray(item)) ||
        (typeof item === 'string' && item.trim())
      );
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') return [value];
      if (typeof value === 'string') {
        return value
          .split(/\r?\n|[•●▪◦]+|,(?![^()]*\))(?=\s)/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [];
    };

    const listItems = (key: string) =>
      (sections[key] || [])
        .flatMap((line) => {
          const withoutCategory =
            line.includes(':') && line.indexOf(':') < 50 && line.includes(',')
              ? line.slice(line.indexOf(':') + 1)
              : line;
          return withoutCategory.split(/[•●▪◦;|]+|,(?![^()]*\))(?=\s)/);
        })
        .map((item) => item.replace(/^[\s\d.)\-–—]+/, '').trim())
        .filter(Boolean);

    const datePattern =
      /(?:(?:janv?(?:ier)?|f[ée]vr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[ûu]t|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+)?(?:19|20)\d{2}(?:\s*(?:[-–—àa]|to)\s*(?:(?:(?:janv?(?:ier)?|f[ée]vr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[ûu]t|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+)?(?:19|20)\d{2}|pr[ée]sent|present|aujourd['’]hui|today|current|en cours))?/i;

    const expLines = sections['experience'] || [];
    const sourceExperience: Array<{ role: string; company: string; duration: string; description: string }> = [];
    let pendingRoleLine = '';

    for (const rawLine of expLines) {
      const line = rawLine.replace(/^[•●▪◦]\s*/, '').trim();
      if (!line) continue;

      const roleAtCompany = line.match(/^(.+?)\s+(?:chez|at|@)\s+(.+?)(?:\s*[|,–—-]\s*((?:19|20)\d{2}.*))?$/i);
      const dateMatch = line.match(datePattern)?.[0] || '';
      const pipeOrDashParts = line.split(/\s+\|\s+|\s+[–—]\s+|\s+-\s+/).map((part) => part.trim()).filter(Boolean);

      if (roleAtCompany) {
        pendingRoleLine = '';
        sourceExperience.push({
          role: roleAtCompany[1].trim(),
          company: roleAtCompany[2].replace(/\s*[|,–—-]?\s*(?:19|20)\d{2}.*$/, '').trim(),
          duration: (roleAtCompany[3] || dateMatch).trim(),
          description: '',
        });
      } else if (dateMatch && pipeOrDashParts.length >= 2 && line.length < 120) {
        const nonDateParts = pipeOrDashParts.filter((part) => !datePattern.test(part));
        if (pendingRoleLine) {
          sourceExperience.push({
            role: pendingRoleLine,
            company: nonDateParts[0] || pipeOrDashParts[0],
            duration: dateMatch,
            description: '',
          });
          pendingRoleLine = '';
        } else {
          sourceExperience.push({
            role: nonDateParts[1] || nonDateParts[0] || '',
            company: nonDateParts[0] || '',
            duration: dateMatch,
            description: '',
          });
        }
      } else if (
        !dateMatch &&
        !/^[•●▪◦\-–—]/.test(rawLine) &&
        !line.endsWith('.') &&
        !(line.includes(':') && line.indexOf(':') < 45) &&
        line.length < 75
      ) {
        pendingRoleLine = line;
      } else {
        if (pendingRoleLine && sourceExperience.length === 0) {
          sourceExperience.push({ role: pendingRoleLine, company: '', duration: '', description: line });
          pendingRoleLine = '';
        } else if (sourceExperience.length > 0) {
          const current = sourceExperience[sourceExperience.length - 1];
          current.description = [current.description, line].filter(Boolean).join('\n');
        } else {
          sourceExperience.push({ role: '', company: '', duration: dateMatch, description: line });
        }
      }
    }

    const eduLines = sections['education'] || [];
    const sourceEducation: Array<{ degree: string; institution: string; year: string }> = [];
    for (const rawLine of eduLines) {
      const line = rawLine.replace(/^[•●▪◦]\s*/, '').trim();
      if (!line) continue;
      const yearMatch = line.match(datePattern)?.[0] || '';
      const parts = line.split(/\s+\|\s+|\s+[–—]\s+|\s+-\s+/).map((part) => part.trim()).filter(Boolean);

      if (parts.length >= 2 && yearMatch && !line.includes('(')) {
        const nonYearParts = parts.filter((part) => !datePattern.test(part));
        const prev = sourceEducation[sourceEducation.length - 1];
        if (prev && !prev.institution && !prev.year) {
          prev.institution = nonYearParts.join(' - ') || parts[0] || '';
          prev.year = yearMatch;
        } else {
          sourceEducation.push({
            degree: nonYearParts[0] || parts[0],
            institution: nonYearParts.slice(1).join(' - ') || parts[1] || '',
            year: yearMatch,
          });
        }
      } else if (yearMatch) {
        const degreeClean = line.replace(/\(\s*(?:19|20)\d{2}[^)]*\)/g, '').replace(datePattern, '').replace(/[\s|–—-]+$/, '').trim();
        const prev = sourceEducation[sourceEducation.length - 1];
        if (prev && !prev.institution && !prev.year && degreeClean) {
          prev.institution = degreeClean;
          prev.year = yearMatch;
        } else {
          sourceEducation.push({
            degree: degreeClean || line,
            institution: '',
            year: yearMatch,
          });
        }
      } else if (sourceEducation.length > 0 && !sourceEducation[sourceEducation.length - 1].institution) {
        sourceEducation[sourceEducation.length - 1].institution = line;
      } else {
        sourceEducation.push({ degree: line, institution: '', year: '' });
      }
    }

    const experience = arrayValue(parsed.experience, parsed.experiences, parsed.workExperience, parsed.employmentHistory)
      .map((item) => typeof item === 'string' ? { role: '', company: '', duration: '', description: item } : item);
    const education = arrayValue(parsed.education, parsed.educations, parsed.training)
      .map((item) => typeof item === 'string' ? { degree: item, institution: '', year: '' } : item);
    const projects = arrayValue(parsed.projects, parsed.projets)
      .map((item) => typeof item === 'string' ? { name: item, description: '' } : item);
    const skills = arrayValue(parsed.skills, parsed.competences);
    const languages = arrayValue(parsed.languages, parsed.langues);
    const interests = arrayValue(parsed.interests, parsed.interets);
    const certifications = arrayValue(parsed.certifications, parsed.licences)
      .map((item) => typeof item === 'string' ? item.trim() : String((item as any)?.name || (item as any)?.title || '').trim())
      .filter(Boolean);
    const summaryLines = (sections['summary'] || []).join(' ').trim();
    const parsedSummary = parsed.summary || parsed.profile || parsed.profil || summaryLines;
    const summaryIsWholeDocument = Object.keys(sections).length > 0 &&
      typeof parsedSummary === 'string' &&
      fileText.length > 800 &&
      parsedSummary.replace(/\s+/g, '').length >= fileText.replace(/\s+/g, '').length * 0.75;

    return {
      ...parsed,
      fullName: parsed.fullName || parsed.name || contact.fullName || contact.name ||
        [contact.firstName, contact.lastName].filter(Boolean).join(' '),
      email: parsed.email || contact.email || '',
      phone: parsed.phone || contact.phone || '',
      jobTitle: parsed.jobTitle || parsed.title || contact.jobTitle || '',
      location: parsed.location || contact.location || '',
      linkedin: parsed.linkedin || contact.linkedin || '',
      github: parsed.github || contact.github || '',
      website: parsed.website || contact.website || '',
      summary: summaryIsWholeDocument ? summaryLines :
        (parsedSummary || (Object.keys(sections).length === 0 ? fileText.trim() : '')),
      experience: experience.length ? experience : sourceExperience,
      education: education.length ? education : sourceEducation,
      skills: skills.length ? skills : listItems('skills'),
      languages: languages.length ? languages : listItems('languages'),
      interests: interests.length ? interests : listItems('interests'),
      projects: projects.length ? projects : (sections['projects'] || []).map((name) => ({ name, description: '' })),
      certifications: certifications.length ? certifications : listItems('certifications'),
    };
  }
}

export const resumeAIEngine = new ResumeAIEngine();
