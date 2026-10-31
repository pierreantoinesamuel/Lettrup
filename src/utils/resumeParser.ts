import JSZip from 'jszip';
import pako from 'pako';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

export { parseAndBuildResumeData } from './resumeDataMapper';

// Register the worker message handler on globalThis so pdfjs-dist runs its
// parser via LoopbackPort in-process instead of spawning an external Worker
// URL (which Vite dev mode corrupts by injecting /@vite/client, and which
// strict CSP rules can block in production).
if (typeof globalThis !== 'undefined') {
  const handler =
    (pdfjsWorker as any)?.WorkerMessageHandler ||
    (pdfjsWorker as any)?.default?.WorkerMessageHandler ||
    (pdfjsWorker as any);
  if (handler) {
    (globalThis as any).pdfjsWorker = {
      WorkerMessageHandler: handler,
      ...((globalThis as any).pdfjsWorker || {}),
    };
  }
}

if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }
  } catch {
    // Ignore in non-browser environments
  }
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
    // Decompression bomb defense: cap file count and target word XML parts
    if (fileNames.length > 500) {
      console.warn('[resumeParser] DOCX zip contains excessive file entries, aborting decompression.');
      return '';
    }

    const orderedXmlPaths = [
      ...fileNames.filter((name) => /^word\/header\d*\.xml$/i.test(name)).sort(),
      ...fileNames.filter((name) => /^word\/document\.xml$/i.test(name)),
      ...fileNames.filter((name) => /^word\/footer\d*\.xml$/i.test(name)).sort(),
    ].slice(0, 50);

    let totalXmlBytes = 0;
    const MAX_DOCX_UNCOMPRESSED_BYTES = 10 * 1024 * 1024; // 10MB
    const parts: string[] = [];
    for (const xmlPath of orderedXmlPaths) {
      if (totalXmlBytes > MAX_DOCX_UNCOMPRESSED_BYTES) break;
      const xml = await zip.files[xmlPath].async('string');
      totalXmlBytes += xml.length;
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

function parsePdfString(str: string): string {
  return str
    .replace(/\\\\/g, '\x00')
    .replace(/\\([nrtbf])/g, (_, c) => (c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : ' '))
    .replace(/\\([0-7]{1,3})/g, (_, oct) => {
      const code = parseInt(oct, 8);
      return String.fromCharCode(code);
    })
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\x00/g, '\\');
}

function parseHexPdfString(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  let result = '';
  if (
    clean.startsWith('FEFF') ||
    clean.startsWith('feff') ||
    (clean.length >= 8 && clean.length % 4 === 0 && clean.startsWith('00'))
  ) {
    const start = clean.startsWith('FEFF') || clean.startsWith('feff') ? 4 : 0;
    for (let i = start; i + 3 < clean.length; i += 4) {
      result += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
    }
    return result;
  }
  for (let i = 0; i + 1 < clean.length; i += 2) {
    result += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  }
  return result;
}

function extractTextFromStreamContent(streamContent: string): string {
  const lines: string[] = [];
  const textBlocks = streamContent.matchAll(/BT([\s\S]*?)ET/g);
  for (const blockMatch of textBlocks) {
    const block = blockMatch[1];

    // Tj / ' / " operators
    const tjMatches = block.matchAll(/(?:\(([^()\\]*(?:\\.[^()\\]*)*)\)|<([0-9a-fA-F\s]+)>)\s*(?:Tj|'|")/g);
    for (const m of tjMatches) {
      if (m[1] !== undefined) lines.push(parsePdfString(m[1]));
      else if (m[2] !== undefined) lines.push(parseHexPdfString(m[2]));
    }

    // TJ array operator: [ (str) 100 <hex> ] TJ
    const tjArrayMatches = block.matchAll(/\[([\s\S]*?)\]\s*TJ/g);
    for (const arrayMatch of tjArrayMatches) {
      const inner = arrayMatch[1];
      let currentWord = '';
      const tokenMatches = inner.matchAll(/(?:\(([^()\\]*(?:\\.[^()\\]*)*)\)|<([0-9a-fA-F\s]+)>|(-?\d+(?:\.\d+)?))/g);
      for (const tm of tokenMatches) {
        if (tm[1] !== undefined) {
          currentWord += parsePdfString(tm[1]);
        } else if (tm[2] !== undefined) {
          currentWord += parseHexPdfString(tm[2]);
        } else if (tm[3] !== undefined) {
          const num = parseFloat(tm[3]);
          if (num < -120) currentWord += ' ';
        }
      }
      if (currentWord.trim()) lines.push(currentWord.trim());
    }
  }
  return lines.join('\n');
}

/**
 * Fallback parser that inspects every PDF stream, inflates FlateDecode compressed
 * streams using pako, and extracts text operators without requiring web workers.
 * Includes decompression bomb safeguards (stream count limit, size limit).
 */
function extractTextFromPdfStreams(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const streamMarker = [115, 116, 114, 101, 97, 109]; // 'stream'
  const endMarker = [101, 110, 100, 115, 116, 114, 101, 97, 109]; // 'endstream'

  const MAX_STREAMS = 150;
  const MAX_DECOMPRESSED_BYTES_PER_STREAM = 2 * 1024 * 1024; // 2 MB
  const MAX_TOTAL_DECOMPRESSED_BYTES = 10 * 1024 * 1024; // 10 MB

  function indexOfSeq(arr: Uint8Array, seq: number[], start = 0): number {
    for (let i = start; i <= arr.length - seq.length; i++) {
      let match = true;
      for (let j = 0; j < seq.length; j++) {
        if (arr[i + j] !== seq[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }

  const inflateFn = (pako as any).inflate || (pako as any).default?.inflate;
  const extractedBlocks: string[] = [];
  let idx = 0;
  let streamCount = 0;
  let totalDecompressedBytes = 0;

  while (idx < bytes.length && streamCount < MAX_STREAMS && totalDecompressedBytes < MAX_TOTAL_DECOMPRESSED_BYTES) {
    const s = indexOfSeq(bytes, streamMarker, idx);
    if (s === -1) break;
    let start = s + 6;
    while (bytes[start] === 10 || bytes[start] === 13) start++;
    const e = indexOfSeq(bytes, endMarker, start);
    if (e === -1) break;
    let end = e;
    while (bytes[end - 1] === 10 || bytes[end - 1] === 13) end--;

    streamCount++;
    const slice = bytes.slice(start, end);
    let streamText = '';

    // Ignore oversized raw streams to protect against decompression explosion
    if (slice.length > 0 && slice.length < 5 * 1024 * 1024) {
      try {
        if (typeof inflateFn === 'function') {
          const inflated = inflateFn(slice);
          if (inflated && inflated.length <= MAX_DECOMPRESSED_BYTES_PER_STREAM) {
            totalDecompressedBytes += inflated.length;
            streamText = new TextDecoder('latin1').decode(inflated);
          }
        }
      } catch {
        try {
          streamText = new TextDecoder('latin1').decode(slice);
        } catch {
          // Ignore unreadable binary
        }
      }
    }

    if (streamText && (streamText.includes('BT') || streamText.includes('Tj') || streamText.includes('TJ'))) {
      const extracted = extractTextFromStreamContent(streamText);
      if (extracted.trim()) extractedBlocks.push(extracted.trim());
    }
    idx = e + 9;
  }

  return extractedBlocks.join('\n\n');
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

async function extractViaServer(file: File): Promise<string> {
  try {
    let base64 = '';
    if (typeof FileReader !== 'undefined') {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = (reader.result as string) || '';
          const commaIndex = res.indexOf(',');
          resolve(commaIndex !== -1 ? res.slice(commaIndex + 1) : res);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    } else {
      const buffer = await file.arrayBuffer();
      base64 = Buffer.from(buffer).toString('base64');
    }

    if (!base64) return '';

    const { supabase } = await import('../lib/supabase');
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;

    const res = await fetch('/api/resume/extract-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        base64,
        fileName: file.name,
        mimeType: file.type,
      }),
    });

    const data = await res.json().catch(() => null);

    if (res.status === 401 || data?.code === 'AUTH_REQUIRED_FOR_OCR') {
      throw new Error(data?.error || "L'analyse par OCR d'un CV scanné ou image nécessite de vous connecter à votre compte.");
    }
    if (res.status === 413 || data?.code === 'PAYLOAD_TOO_LARGE') {
      throw new Error(data?.error || "Le fichier est trop volumineux pour être analysé (limite 40 Mo).");
    }

    if (!res.ok) {
      console.warn(`[resumeParser] /api/resume/extract-text returned status ${res.status}`);
      return '';
    }

    if (data?.success && typeof data?.text === 'string' && data.text.trim().length >= 10) {
      return data.text.trim();
    }
    console.warn('[resumeParser] Server extraction unsuccessful:', data);
  } catch (err) {
    if (err instanceof Error && (err.message.includes('OCR') || err.message.includes('volumineux'))) {
      throw err;
    }
    console.warn('[resumeParser] Server-side extraction fallback failed:', err);
  }
  return '';
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const mimeType = (file.type || '').toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  // Detect PDF by extension, mime type, or %PDF- magic header
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const isPdfHeader =
    headerBytes.length >= 4 &&
    headerBytes[0] === 0x25 && // %
    headerBytes[1] === 0x50 && // P
    headerBytes[2] === 0x44 && // D
    headerBytes[3] === 0x46;   // F

  const isPdf = fileName.endsWith('.pdf') || mimeType === 'application/pdf' || isPdfHeader;

  // 1. PDF extraction (pdfjs-dist + robust pako decompressed stream fallback)
  if (isPdf) {
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
      if (textContent.trim().length > 15) {
        return textContent;
      }
    } catch (pdfErr) {
      console.warn('pdfjs-dist primary extraction failed, using internal stream decompression:', pdfErr);
    }

    // Secondary Strategy: Decompress FlateDecode streams with pako and extract text operators
    const streamExtracted = extractTextFromPdfStreams(arrayBuffer);
    if (streamExtracted.trim().length > 15) {
      return streamExtracted;
    }

    // Tertiary Strategy: Raw regex literal scan
    const fallbackPdf = extractFallbackPdfText(arrayBuffer);
    if (fallbackPdf.trim().length > 15) {
      return fallbackPdf;
    }

    // Quaternary Strategy: Server-side PDF parser & Gemini Multimodal OCR
    const serverExtracted = await extractViaServer(file);
    if (serverExtracted.trim().length > 15) {
      return serverExtracted;
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

  // Final universal fallback: server-side extraction (Node pdfjs + Gemini Multimodal OCR)
  const finalServerAttempt = await extractViaServer(file);
  if (finalServerAttempt.trim().length >= 15) {
    return finalServerAttempt;
  }

  console.warn(`Unsupported or unreadable file format: ${file.name}`);
  return '';
}
