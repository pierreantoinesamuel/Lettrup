import type { ApplicationPack } from '../application/application-pack/GenerateApplicationPack';

/**
 * Builds one A4 PDF with the three documents of the pack (CV, cover letter,
 * STAR sheets). Plain, selectable text on purpose: it stays readable by the
 * applicant tracking systems recruiters use.
 */

// jsPDF's built-in fonts only cover Latin-1: map the typographic characters
// that fall outside it, instead of printing garbage.
function toLatin1(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●▪]/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[   ]/g, ' ')
    .replace(/€/g, 'EUR')
    .replace(/[^\u0009\u000A -ÿ]/g, '');
}

export function packFileName(pack: ApplicationPack): string {
  const slug = (pack.jobTitle || 'candidature')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `Pack_candidature_${slug || 'poste'}.pdf`;
}

export async function downloadApplicationPackPdf(
  pack: ApplicationPack,
  header: { name: string; contact: string[] }
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const margin = 18;
  const width = pageW - margin * 2;
  let y = margin;

  const ink: [number, number, number] = [16, 45, 62];
  const accent: [number, number, number] = [0, 117, 104];
  const muted: [number, number, number] = [86, 104, 116];

  const ensure = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; indent?: number } = {}
  ) => {
    const { size = 10, bold = false, color = ink, gap = 1.5, indent = 0 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineH = size * 0.42;
    const lines: string[] = doc.splitTextToSize(toLatin1(text), width - indent);
    for (const line of lines) {
      ensure(lineH);
      doc.text(line, margin + indent, y + lineH * 0.8);
      y += lineH;
    }
    y += gap;
  };

  const section = (title: string) => {
    ensure(14);
    write(title.toUpperCase(), { size: 9, bold: true, color: accent, gap: 1 });
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 0.5, margin + width, y - 0.5);
    y += 3;
  };

  const newDocument = () => {
    doc.addPage();
    y = margin;
  };

  // ── 1. CV ────────────────────────────────────────────────────────────────
  write(header.name || 'Candidat', { size: 20, bold: true, gap: 1 });
  if (pack.tailoredCv.headline || pack.jobTitle) {
    write(pack.tailoredCv.headline || pack.jobTitle, { size: 11, color: accent, gap: 1 });
  }
  if (header.contact.length) write(header.contact.join('  |  '), { size: 9, color: muted, gap: 4 });

  if (pack.tailoredCv.summary) {
    section('Profil');
    write(pack.tailoredCv.summary, { gap: 3 });
  }
  if (pack.tailoredCv.experience.length) {
    section('Experience professionnelle');
    for (const exp of pack.tailoredCv.experience) {
      write(`${exp.title}${exp.company ? ` - ${exp.company}` : ''}`, { size: 10.5, bold: true, gap: 0 });
      if (exp.dates) write(exp.dates, { size: 9, color: muted, gap: 1 });
      for (const bullet of exp.bullets) write(`- ${bullet}`, { indent: 3, gap: 0.8 });
      y += 2.5;
    }
  }
  if (pack.tailoredCv.education.length) {
    section('Formation');
    for (const edu of pack.tailoredCv.education) {
      write([edu.degree, edu.institution].filter(Boolean).join(' - '), { bold: true, gap: 0 });
      if (edu.dates) write(edu.dates, { size: 9, color: muted, gap: 1.5 });
    }
    y += 1.5;
  }
  if (pack.tailoredCv.skills.length) {
    section('Competences');
    write(pack.tailoredCv.skills.join('  -  '), { gap: 2 });
  }

  // ── 2. Cover letter ─────────────────────────────────────────────────────
  newDocument();
  write('Lettre de motivation', { size: 16, bold: true, gap: 3 });
  if (pack.coverLetter.subject) write(`Objet : ${pack.coverLetter.subject}`, { bold: true, gap: 4 });
  for (const paragraph of pack.coverLetter.body.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)) {
    write(paragraph, { size: 10.5, gap: 3.5 });
  }

  // ── 3. STAR sheets ──────────────────────────────────────────────────────
  if (pack.starSheets.length) {
    newDocument();
    write("Fiches STAR pour l'entretien", { size: 16, bold: true, gap: 1 });
    write(
      `Poste visé : ${pack.jobTitle || 'à préciser'}${pack.companyName ? ` - ${pack.companyName}` : ''}. Les passages "À compléter" sont à rédiger avec votre propre expérience.`,
      { size: 9, color: muted, gap: 5 }
    );
    pack.starSheets.forEach((sheet, index) => {
      ensure(40);
      write(`${index + 1}. ${sheet.question}`, { size: 11, bold: true, gap: 1.5 });
      const rows: Array<[string, string]> = [
        ['Situation', sheet.situation],
        ['Tâche', sheet.task],
        ['Action', sheet.action],
        ['Résultat', sheet.result],
      ];
      for (const [label, value] of rows) {
        if (!value) continue;
        write(label, { size: 8.5, bold: true, color: accent, gap: 0 });
        write(value, { indent: 3, gap: 1.5 });
      }
      if (sheet.tip) write(`Conseil : ${sheet.tip}`, { size: 9, color: muted, gap: 6 });
    });
  }

  doc.save(packFileName(pack));
}
