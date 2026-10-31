/**
 * Server-side sanitization of LLM-generated text before it reaches the client.
 * Strips HTML/script injection, data-URI payloads, and markdown-based link
 * injection that could survive client-side rendering in a non-DOMPurify context.
 */

const SCRIPT_TAG_RE = /<script[\s\S]*?<\/script>/gi;
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;
const DATA_URI_RE = /data:[a-z]+\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+/gi;
const JAVASCRIPT_URI_RE = /javascript\s*:/gi;

export function sanitizeAiText(text: string): string {
  return text
    .replace(SCRIPT_TAG_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(DATA_URI_RE, '[removed]')
    .replace(JAVASCRIPT_URI_RE, '[removed]');
}

export function sanitizeAiJson<T>(obj: T): T {
  if (typeof obj === 'string') return sanitizeAiText(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(sanitizeAiJson) as unknown as T;
  if (obj && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      cleaned[key] = sanitizeAiJson(value);
    }
    return cleaned as T;
  }
  return obj;
}
