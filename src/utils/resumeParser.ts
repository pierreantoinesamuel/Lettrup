import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

export { parseAndBuildResumeData } from './resumeDataMapper';

// Register the worker message handler on globalThis so pdfjs-dist runs its
// parser via LoopbackPort in-process instead of spawning an external Worker
// URL (which Vite dev mode corrupts by injecting /@vite/client, and which
// strict CSP rules can block in production).
if (typeof globalThis !== 'undefined' && !(globalThis as any).pdfjsWorker) {
  (globalThis as any).pdfjsWorker = pdfjsWorker;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractTextFromWordXml(xml: string): string {
  const withBreaks = xml
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<\/w:tr>/gi, '\n')
    .replace(/<w:br\b[^>]*\/?>/gi, '\n')
    .replace(/<w:tab\b[^>]*\/?>/gi, ' ')
    .replace(/<\/w:tc>/gi, ' | ');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return decodeXmlEntities(stripped)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').replace(/^(?:\|\s*)+|(?:\s*\|)+$/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

async function extractTextFromDocxZip(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const fileNames = Object.keys(zip.files);
    const orderedXmlPaths = [
      ...fileNames.filter((name) => /^word\/header\d*\.xml$/i.test(name)).sort(),
      ...fileNames.filter((name) => /^word\/document\.xml$/i.test(name)),
      ...fileNames.filter((name) => /^word\/footer\d*\.xml$/i.test(name)).sort(),
    ];
    const parts: string[] = [];
    for (const xmlPath of orderedXmlPaths) {
      const xml = await zip.files[xmlPath].async('string');
      const extracted = extractTextFromWordXml(xml);
      if (extracted) parts.push(extracted);
    }
    return parts.join('\n\n').trim();
  } catch {
    return '';
  }
}

function stripRtfToPlainText(rtf: string): string {
  return rtf
    .replace(/\\par\b|\\line\b/gi, '\n')
    .replace(/\\tab\b/gi, ' ')
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
      const byte = parseInt(hex, 16);
      return new TextDecoder('windows-1252').decode(new Uint8Array([byte]));
    })
    .replace(/\\u(-?\d+)\??/g, (_, code) => {
      const num = Number(code);
      return String.fromCharCode(num < 0 ? num + 65536 : num);
    })
    .replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict|object|header|footer)[^}]*\}/gi, '')
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const OLE_NOISE_LINE =
  /^(?:Root Entry|WordDocument|[01]Table|Data|CompObj|SummaryInformation|DocumentSummaryInformation|Normal(?:\.dotm?)?|Default Paragraph Font|Times New Roman|Calibri|Arial|Cambria|Helvetica|Symbol|Wingdings|MS WordDoc|Word\.Document\.\d+|Microsoft(?:\s+Office)?\s+Word|HYPERLINK|PAGEREF|TOC\s|EMBED\s|MERGEFORMAT)$/i;

function isReadableCharCode(code: number): boolean {
  return (
    code === 9 ||
    code === 10 ||
    code === 13 ||
    (code >= 32 && code <= 126) ||
    (code >= 160 && code <= 0x024f) ||
    (code >= 0x2010 && code <= 0x203a) ||
    code === 0x20ac
  );
}

function cleanLegacyDocRuns(runs: string[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const run of runs) {
    for (const rawLine of run.split(/[\r\n\u0007\u000b\u000c]+/)) {
      const line = rawLine
        .replace(/[\u0000-\u0008\u000e-\u001f]+/g, ' ')
        .replace(/HYPERLINK\s+"[^"]*"/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (line.length < 3) continue;
      if (OLE_NOISE_LINE.test(line)) continue;
      const letterCount = (line.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
      if (letterCount < 2 || letterCount / line.length < 0.35) continue;
      if (seen.has(line)) continue;
      seen.add(line);
      lines.push(line);
    }
  }

  return lines.join('\n').trim();
}

function extractTextFromLegacyDoc(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const asciiHeader = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 512)));

  // 1. RTF file saved with a .doc extension
  if (asciiHeader.trimStart().startsWith('{\\rtf')) {
    const rtfText = new TextDecoder('windows-1252').decode(bytes);
    return stripRtfToPlainText(rtfText);
  }

  // 2. XML / HTML document saved with a .doc extension
  if (/^\s*(?:<\?xml|<!DOCTYPE|<html|<w:wordDocument)/i.test(asciiHeader)) {
    const xmlText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return extractTextFromWordXml(xmlText);
  }

  // 3. Binary OLE2 Word 97-2003 (.doc): scan for both UTF-16LE and CP1252 text runs
  const utf16Runs: string[] = [];
  let currentUtf16: number[] = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (isReadableCharCode(code)) {
      currentUtf16.push(code);
    } else {
      if (currentUtf16.length >= 12) {
        utf16Runs.push(String.fromCharCode(...currentUtf16));
      }
      currentUtf16 = [];
    }
  }
  if (currentUtf16.length >= 12) {
    utf16Runs.push(String.fromCharCode(...currentUtf16));
  }

  const cp1252Decoded = new TextDecoder('windows-1252').decode(bytes);
  const ansiRuns = cp1252Decoded.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9\s@.,:;+\-–—/()'"’•%\r\n]{16,}/g) || [];

  const utf16Text = cleanLegacyDocRuns(utf16Runs);
  const ansiText = cleanLegacyDocRuns(ansiRuns);
  return utf16Text.length >= ansiText.length ? utf16Text : ansiText;
}

function extractFallbackPdfText(arrayBuffer: ArrayBuffer): string {
  try {
    const raw = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));
    const chunks: string[] = [];
    const literalMatches = raw.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g);
    for (const match of literalMatches) {
      const cleaned = match[1]
        .replace(/\\([nrtbf()\\])/g, (_, ch) => (ch === 'n' ? '\n' : ch === 'r' ? '\r' : ch === 't' ? ' ' : ch))
        .trim();
      if (cleaned) chunks.push(cleaned);
    }
    if (chunks.join(' ').trim().length > 15) {
      return chunks.join(' ');
    }
  } catch {
    // Ignore fallback errors
  }
  return '';
}

function decodePlainTextBuffer(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (utf8.includes('\uFFFD')) {
    return new TextDecoder('windows-1252').decode(bytes);
  }
  return utf8;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  // 1. PDF extraction (pdfjs-dist legacy build + in-process worker handler)
  if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer.slice(0)),
        useSystemFonts: true,
      });
      const pdfDoc = await loadingTask.promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const parts: string[] = [];
        let previousY: number | undefined;
        let previousEndX: number | undefined;

        for (const item of content.items) {
          if (!('str' in item)) continue;
          const str = item.str;
          if (!str) continue;

          const x = Array.isArray(item.transform) ? Number(item.transform[4]) : undefined;
          const y = Array.isArray(item.transform) ? Number(item.transform[5]) : undefined;
          const width = typeof item.width === 'number' ? item.width : 0;

          if (previousY !== undefined && y !== undefined && Math.abs(previousY - y) > 2.5) {
            if (parts.length > 0 && !parts[parts.length - 1].endsWith('\n')) {
              parts.push('\n');
            }
          } else if (
            parts.length > 0 &&
            !parts[parts.length - 1].endsWith('\n') &&
            !parts[parts.length - 1].endsWith(' ') &&
            !str.startsWith(' ')
          ) {
            const gap = previousEndX !== undefined && x !== undefined ? x - previousEndX : 2;
            if (gap > 1.2) {
              parts.push(' ');
            }
          }

          parts.push(str);
          if (item.hasEOL && !str.endsWith('\n')) {
            parts.push('\n');
          }
          if (y !== undefined) previousY = y;
          if (x !== undefined) previousEndX = x + width;
        }

        const pageText = parts
          .join('')
          .split(/\r?\n/)
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('\n');
        if (pageText) pages.push(pageText);
      }

      const textContent = pages.join('\n\n');
      if (textContent.trim().length > 10) {
        return textContent;
      }
    } catch (pdfErr) {
      console.error('PDF text extraction failed:', pdfErr);
    }

    const fallbackPdf = extractFallbackPdfText(arrayBuffer);
    if (fallbackPdf.trim().length > 10) {
      return fallbackPdf;
    }
    return '';
  }

  // 2. DOCX & DOC extraction (mammoth + JSZip XML fallback + legacy .doc parser)
  if (
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc') ||
    mimeType.includes('wordprocessingml') ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.ms-word'
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const isZipContainer =
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04;

    if (fileName.endsWith('.docx') || mimeType.includes('wordprocessingml') || isZipContainer) {
      try {
        const extractRawText =
          mammoth.extractRawText ?? (mammoth as unknown as { default?: typeof mammoth }).default?.extractRawText;
        if (typeof extractRawText === 'function') {
          const mammothInput = {
            arrayBuffer: arrayBuffer.slice(0),
            ...(typeof Buffer !== 'undefined' ? { buffer: Buffer.from(arrayBuffer) } : {}),
          } as unknown as { arrayBuffer: ArrayBuffer };
          const result = await extractRawText(mammothInput);
          if (result?.value && result.value.trim().length > 5) {
            return result.value.trim();
          }
        }
      } catch (docxErr) {
        console.warn('mammoth docx extraction error, trying XML fallback:', docxErr);
      }

      const zipText = await extractTextFromDocxZip(arrayBuffer);
      if (zipText.trim().length > 5) {
        return zipText;
      }
    }

    const legacyDocText = extractTextFromLegacyDoc(arrayBuffer);
    if (legacyDocText.trim().length > 5) {
      return legacyDocText;
    }
    return '';
  }

  // 3. Plain text (.txt / .text / text/plain)
  if (
    fileName.endsWith('.txt') ||
    fileName.endsWith('.text') ||
    mimeType.startsWith('text/plain') ||
    mimeType === 'text/markdown'
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = decodePlainTextBuffer(arrayBuffer);
      if (decoded.trim().length > 0) {
        return decoded;
      }
      return await file.text();
    } catch (err) {
      console.error('TXT file text read error:', err);
      return '';
    }
  }

  console.warn(`Unsupported or unreadable file format: ${file.name}`);
  return '';
}
