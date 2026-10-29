import { ResumeProfile } from '../../types';

export function serializeCvToText(cv: ResumeProfile): string {
  const lines: string[] = [];

  lines.push(`NAME: ${cv.fullName}`);

  if (cv.location) lines.push(`LOCATION: ${cv.location}`);
  if (cv.linkedin) lines.push(`LINKEDIN: ${cv.linkedin}`);
  if (cv.website) lines.push(`WEBSITE: ${cv.website}`);

  if (cv.summary) {
    lines.push('');
    lines.push('PROFESSIONAL SUMMARY:');
    lines.push(cv.summary);
  }

  if (cv.experience?.length) {
    lines.push('');
    lines.push('EXPERIENCE:');
    for (const exp of cv.experience) {
      const dateRange = exp.current
        ? `${exp.startDate} – Present`
        : `${exp.startDate} – ${exp.endDate}`;
      lines.push(`  ${exp.role} at ${exp.company} (${dateRange})`);
      if (exp.description) {
        const bulletLines = exp.description
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        for (const b of bulletLines) {
          lines.push(`    • ${b.replace(/^[-•]\s*/, '')}`);
        }
      }
    }
  }

  if (cv.skills?.length) {
    lines.push('');
    lines.push(`SKILLS: ${cv.skills.join(', ')}`);
  }

  if (cv.education?.length) {
    lines.push('');
    lines.push('EDUCATION:');
    for (const edu of cv.education) {
      const dateRange = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
      lines.push(`  ${edu.degree}, ${edu.institution}${dateRange ? ` (${dateRange})` : ''}`);
    }
  }

  if (cv.projects?.length) {
    lines.push('');
    lines.push('PROJECTS:');
    for (const proj of cv.projects) {
      lines.push(`  ${proj.name}: ${proj.description}${proj.link ? ` (${proj.link})` : ''}`);
    }
  }

  return lines.join('\n').trim();
}
