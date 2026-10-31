import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
import { GoogleGenAI } from '@google/genai';
import * as mammoth from 'mammoth';

// Wire pdfjsWorker in Node environment
if (typeof globalThis !== 'undefined' && !(globalThis as any).pdfjsWorker) {
  (globalThis as any).pdfjsWorker = pdfjsWorker;
}

export interface ExtractTextRequest {
  base64: string;
  fileName?: string;
  mimeType?: string;
}

export interface ExtractTextResponse {
  success: boolean;
  text?: string;
  source?: 'pdfjs' | 'gemini_ocr' | 'mammoth' | 'plaintext';
  error?: string;
}

export async function handleResumeExtractRoute(
  body: ExtractTextRequest
): Promise<ExtractTextResponse> {
  const { base64, fileName = '', mimeType = '' } = body;
  if (!base64 || typeof base64 !== 'string') {
    return { success: false, error: 'Fichier manquant ou invalide.' };
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) {
    return { success: false, error: 'Fichier vide.' };
  }

  const nameLower = fileName.toLowerCase();
  const mimeLower = mimeType.toLowerCase();

  const isPdf =
    nameLower.endsWith('.pdf') ||
    mimeLower === 'application/pdf' ||
    (buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46);

  if (isPdf) {
    // 1. First attempt: Server-side pdfjs in-process extraction
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });
      const pdfDoc = await loadingTask.promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const parts: string[] = [];
        let previousY: number | undefined;

        for (const item of content.items) {
          if (!('str' in item)) continue;
          const str = item.str;
          if (!str) continue;

          const y = Array.isArray(item.transform) ? Number(item.transform[5]) : undefined;
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
            parts.push(' ');
          }

          parts.push(str);
          if (y !== undefined) previousY = y;
        }

        const pageText = parts
          .join('')
          .split(/\r?\n/)
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('\n');
        if (pageText) pages.push(pageText);
      }

      const extracted = pages.join('\n\n').trim();
      if (extracted.length >= 15) {
        return { success: true, text: extracted, source: 'pdfjs' };
      }
    } catch (pdfErr) {
      console.warn('[handleResumeExtractRoute] pdfjs extraction failed, attempting OCR fallback:', pdfErr);
    }

    // 2. Second attempt: Scanned PDF or rasterized pages -> Gemini Multimodal OCR
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
      ];
      const prompt = `System: Tu es un expert en extraction et OCR de CV.
Extrais l'intégralité du texte de ce document de CV, fidèlement et sans inventer d'information.
Conserve les coordonnées complètes, le titre du poste, l'accroche, toutes les expériences professionnelles avec dates et descriptions, les formations et diplômes, les compétences et les langues.
Ne résume pas. Rends le texte intégralement sous forme de texte brut structuré.`;

      const ai = new GoogleGenAI({ apiKey });

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: base64,
                    },
                  },
                ],
              },
            ],
          });

          const ocrText = (response.text || '').trim();
          if (ocrText.length >= 15) {
            return { success: true, text: ocrText, source: 'gemini_ocr' };
          }
        } catch (ocrErr: any) {
          console.warn(`[handleResumeExtractRoute] OCR with model ${model} failed, trying next:`, ocrErr?.message || ocrErr);
        }
      }
    }

    return {
      success: false,
      error: "Aucun texte lisible n'a pu être extrait de ce PDF (fichier protégé ou image illisible).",
    };
  }

  // Handle Image formats (PNG, JPG, WebP) -> Direct Multimodal OCR
  const isImage =
    mimeLower.startsWith('image/') ||
    nameLower.endsWith('.png') ||
    nameLower.endsWith('.jpg') ||
    nameLower.endsWith('.jpeg') ||
    nameLower.endsWith('.webp');

  if (isImage) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
      ];
      const prompt = `System: Tu es un expert en OCR de CV.
Extrais fidèlement tout le texte de cette image de CV sans rien omettre (coordonnées, poste, profil, expériences, formations, compétences, langues).`;

      const ai = new GoogleGenAI({ apiKey });
      const imageMime = mimeLower.startsWith('image/') ? mimeLower : nameLower.endsWith('.png') ? 'image/png' : 'image/jpeg';

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: imageMime,
                      data: base64,
                    },
                  },
                ],
              },
            ],
          });

          const ocrText = (response.text || '').trim();
          if (ocrText.length >= 15) {
            return { success: true, text: ocrText, source: 'gemini_ocr' };
          }
        } catch (ocrErr: any) {
          console.warn(`[handleResumeExtractRoute] Image OCR with model ${model} failed:`, ocrErr?.message || ocrErr);
        }
      }
    }
  }

  // Handle DOCX / Word
  if (
    nameLower.endsWith('.docx') ||
    mimeLower.includes('wordprocessingml') ||
    (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b)
  ) {
    try {
      const extractRawText =
        mammoth.extractRawText ?? (mammoth as unknown as { default?: typeof mammoth }).default?.extractRawText;
      if (typeof extractRawText === 'function') {
        const result = await extractRawText({ buffer });
        if (result?.value && result.value.trim().length >= 15) {
          return { success: true, text: result.value.trim(), source: 'mammoth' };
        }
      }
    } catch (docxErr) {
      console.warn('[handleResumeExtractRoute] Mammoth DOCX extraction failed:', docxErr);
    }
  }

  // Plaintext fallback
  const plainText = buffer.toString('utf-8').trim();
  if (plainText.length >= 15) {
    return { success: true, text: plainText, source: 'plaintext' };
  }

  return {
    success: false,
    error: 'Impossible d’extraire le texte de ce fichier.',
  };
}
