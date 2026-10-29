/**
 * Content Safety Layer for the CV renderer.
 *
 * Experience/education/project descriptions can originate from: the Quill
 * rich-text editor (ResumeBuilder.tsx), imported DOCX/PDF parsing
 * (utils/resumeParser.ts, via mammoth), or AI-generated bullets
 * (ResumeAIEngine.ts) — none of those are necessarily safe to inject via
 * `dangerouslySetInnerHTML` as-is. This sanitizes to the small tag set
 * Quill's toolbar can actually produce (bold/italic/underline/strike,
 * ordered/bullet lists) and strips everything else, including all
 * attributes (so no `onerror=`, `javascript:` hrefs, styles, etc. survive).
 */

import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'b', 'i', 'span'];

export function sanitizeDescriptionHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

/** Guards plain-text fields (institution, degree, project name, dates, ...) against null/undefined. */
export function safeText(value: string | null | undefined): string {
  return value ?? '';
}
