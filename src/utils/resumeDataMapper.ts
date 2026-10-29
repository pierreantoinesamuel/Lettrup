function ensureIds(items: unknown): Record<string, any>[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, any> => Boolean(item) && typeof item === 'object')
    .map((item) => ({ ...item, id: item.id || `${Date.now()}-${Math.random()}` }));
}

function formatDescription(description: unknown): string {
  if (Array.isArray(description)) {
    const items = description
      .map((item) => String(item).replace(/^[\s•*\-–—\d.)]+/, '').trim())
      .filter(Boolean);
    return items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>` : '';
  }
  if (typeof description !== 'string' || !description.trim()) return '';
  if (description.includes('<ul>') || description.includes('<li>')) return description;

  const lines = description
    .split(/\r?\n|(?=\s*[•●▪◦]\s+)/)
    .map((line) => line.replace(/^[\s•●▪◦*\-–—\d.)]+/, '').trim())
    .filter(Boolean);
  return lines.length > 1
    ? `<ul>${lines.map((line) => `<li>${line}</li>`).join('')}</ul>`
    : description;
}

function splitDuration(rawStart: string, rawEnd: string, rawCurrent: unknown): { startDate: string; endDate: string; current: boolean } {
  const currentRe = /^(?:pr[ée]sent|present|aujourd['’]hui|today|current|en cours|actuel(?:lement)?)$/i;
  if (rawEnd) {
    const isCurrent = Boolean(rawCurrent) || currentRe.test(rawEnd.trim());
    return {
      startDate: rawStart.trim(),
      endDate: isCurrent ? '' : rawEnd.trim(),
      current: isCurrent,
    };
  }
  const rangeParts = rawStart.split(/\s+(?:[-–—]|à|to)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (rangeParts.length === 2) {
    const isCurrent = Boolean(rawCurrent) || currentRe.test(rangeParts[1]);
    return {
      startDate: rangeParts[0],
      endDate: isCurrent ? '' : rangeParts[1],
      current: isCurrent,
    };
  }
  return {
    startDate: rawStart.trim(),
    endDate: '',
    current: Boolean(rawCurrent),
  };
}

export function parseAndBuildResumeData(parsedData: any, fallbackData?: any): any {
  const parsed = parsedData && typeof parsedData === 'object' ? parsedData : {};
  const fallbackCoord = fallbackData?.coordonnees || {};
  const newExperience = ensureIds(parsed.experience).map((experience) => {
    const rawStart = String(experience.startDate || experience.duration || experience.date || '');
    const rawEnd = String(experience.endDate || '');
    const { startDate, endDate, current } = splitDuration(rawStart, rawEnd, experience.current);
    return {
      id: experience.id,
      company: experience.company || experience.entreprise || '',
      jobTitle: experience.role || experience.jobTitle || experience.poste || '',
      startDate,
      endDate,
      current,
      location: experience.location || '',
      description: formatDescription(experience.description),
    };
  });
  const newEducation = ensureIds(parsed.education).map((education) => ({
    id: education.id,
    institution: education.institution || education.school || education.ecole || '',
    degree: education.degree || education.diploma || education.diplome || '',
    date: education.year || education.date || education.periode || '',
  }));
  const newProjects = ensureIds(parsed.projects || parsed.projets).map((project) => ({
    id: project.id,
    name: project.name || project.title || '',
    description: project.description || '',
  }));

  const skills = parsed.skills ?? parsed.competences ?? fallbackData?.competences ?? '';
  const languages = parsed.languages ?? parsed.langues ?? fallbackData?.langues ?? '';
  const interests = parsed.interests ?? parsed.interets ?? fallbackData?.interets ?? '';
  const rawCertifications = parsed.certifications ?? parsed.licences;
  const certificationItems = Array.isArray(rawCertifications)
    ? rawCertifications.map((item) => String(item).trim()).filter(Boolean)
    : typeof rawCertifications === 'string'
      ? rawCertifications.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      : [];

  const existingCustomSections = Array.isArray(parsed.customSections)
    ? parsed.customSections
    : Array.isArray(fallbackData?.customSections)
      ? fallbackData.customSections
      : [];
  const customSections = [...existingCustomSections];
  if (
    certificationItems.length > 0 &&
    !customSections.some((sec: any) => /^certifications?$/i.test(String(sec?.title || '').trim()))
  ) {
    customSections.push({
      id: `custom-certifications-${Date.now()}`,
      title: 'Certifications',
      content: certificationItems,
    });
  }

  return {
    coordonnees: {
      name: parsed.fullName || parsed.name || fallbackCoord.name || 'Candidat',
      jobTitle: parsed.jobTitle || parsed.title || fallbackCoord.jobTitle || '',
      photoUrl: fallbackCoord.photoUrl || '',
      email: parsed.email || fallbackCoord.email || '',
      phone: parsed.phone || fallbackCoord.phone || '',
      website: parsed.website || fallbackCoord.website || '',
      location: parsed.location || parsed.city || fallbackCoord.location || '',
      linkedin: parsed.linkedin || fallbackCoord.linkedin || '',
      github: parsed.github || fallbackCoord.github || '',
      drivingLicense: parsed.drivingLicense || fallbackCoord.drivingLicense || '',
    },
    profil: parsed.summary || parsed.profile || parsed.profil || fallbackData?.profil || '',
    experience: newExperience.length ? newExperience : (fallbackData?.experience || []),
    education: newEducation.length ? newEducation : (fallbackData?.education || []),
    competences: Array.isArray(skills) ? skills.join('\n') : skills,
    langues: Array.isArray(languages) ? languages.join('\n') : languages,
    interets: Array.isArray(interests) ? interests.join('\n') : interests,
    projets: newProjects,
    ...(customSections.length > 0 ? { customSections } : {}),
  };
}
