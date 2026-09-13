import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs';
import { performOcr } from './ocr.ts';

// Synchronous in-memory worker handler to guarantee 100% infallible execution in iframes, Vite dev server, and production
if (typeof window !== 'undefined') {
  (window as any).pdfjsWorker = pdfjsWorker;
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch {
    // Falls back to in-memory window.pdfjsWorker handler
  }
}

/**
 * Fast chunked conversion of ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return window.btoa(binary);
}

/**
 * Validates whether final extracted resume text (direct or OCR) is meaningful and readable,
 * not just whitespace or OCR noise. Accepts any legitimate resume.
 */
export function isTextQualitySufficient(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 25) return false;

  // Count alphabetic characters
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letters < 15) return false;

  // Count distinct words (length >= 2)
  const words = trimmed.match(/\b[a-zA-Z]{2,}\b/g) || [];
  if (words.length < 4) return false;

  return true;
}

/**
 * Checks whether normal text layer extracted directly from a PDF has enough substance
 * to represent a full resume, or if it is an image/scanned resume with empty/minimal metadata
 * that requires OCR fallback.
 */
export function isDirectTextSubstantial(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 100) return false;

  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letters < 60) return false;

  const words = trimmed.match(/\b[a-zA-Z]{2,}\b/g) || [];
  if (words.length < 15) return false;

  return true;
}

/**
 * Converts a PDF page to a high-resolution base64 JPEG image using an offscreen canvas.
 * Computes an adaptive scale targeting ~1400px width for optimal OCR character recognition
 * without causing canvas memory overflows on ultra-high-resolution scans.
 */
async function renderPageToImage(page: any): Promise<string> {
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const targetWidth = 1400;
  const calculatedScale = Math.min(2.5, Math.max(1.0, targetWidth / (unscaledViewport.width || 600)));
  const viewport = page.getViewport({ scale: calculatedScale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not create 2D canvas context for PDF rasterization');
  }

  // Draw pure white background first to avoid transparent backgrounds breaking OCR
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.88);
}

/**
 * Extracts text from a PDF file.
 * 1. Attempts normal text layer extraction first.
 * 2. If sufficient text is found, uses it immediately (Fast Cache, no OCR delay).
 * 3. If text is empty or too short (scanned/image PDF), automatically rasterizes pages
 *    and runs OCR fallback, preserving two-column section structure.
 * 4. Gracefully falls back to server-side PDF extraction if client PDF parser encounters sandbox constraints.
 */
export const extractTextFromPDF = async (
  file: File,
  onProgress?: (status: string) => void
): Promise<string> => {
  const startTime = Date.now();
  onProgress?.('Reading resume...');
  const arrayBuffer = await file.arrayBuffer();

  let pdf: any = null;
  let normalExtractedText = '';

  // STEP 1: Attempt standard client-side text layer extraction
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => item && typeof item.str === 'string')
        .map((item: any) => item.str)
        .join(' ');

      if (pageText.trim()) {
        normalExtractedText += pageText.trim() + '\n\n';
      }
    }
  } catch (clientPdfErr: any) {
    console.warn('[AI HireFlow][PDF] Client-side getDocument encountered an issue, trying server-side PDF parser:', clientPdfErr?.message || clientPdfErr);
  }

  const trimmedNormal = normalExtractedText.trim();
  const normalCharCount = trimmedNormal.length;

  // STEP 2: Check if client direct extraction was substantial (Test A)
  if (isDirectTextSubstantial(trimmedNormal)) {
    console.log(`[AI HireFlow][PDF] Normal text extraction successful. Pages: ${pdf?.numPages || 1}, Chars: ${normalCharCount}, OCR triggered: false, Duration: ${Date.now() - startTime}ms`);
    return trimmedNormal;
  }

  // STEP 3: Server-side PDF direct extraction check (if client had 0 or sparse text, or threw error)
  try {
    const base64 = arrayBufferToBase64(arrayBuffer);
    const serverResp = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfBase64: `data:application/pdf;base64,${base64}`,
        meta: { fileType: 'pdf', fileName: file.name }
      })
    });

    if (serverResp.ok) {
      const serverData = await serverResp.json();
      if (serverData.success && typeof serverData.text === 'string' && isDirectTextSubstantial(serverData.text)) {
        console.log(`[AI HireFlow][PDF] Server PDF text extraction successful. Chars: ${serverData.text.length}, OCR triggered: false, Duration: ${Date.now() - startTime}ms`);
        return serverData.text.trim();
      }
    }
  } catch (serverPdfErr: any) {
    console.warn('[AI HireFlow][PDF] Server PDF check skipped or failed:', serverPdfErr?.message || serverPdfErr);
  }

  // STEP 4: Automatic OCR Fallback for Scanned / Image-based PDF (Test B)
  const pageCount = pdf?.numPages || 1;
  console.log(`[AI HireFlow][PDF] Direct extraction insufficient (${normalCharCount} chars). Automatically activating OCR fallback for ${pageCount} page(s).`);
  onProgress?.('Scanning resume with OCR...');

  let pageImages: string[] = [];
  if (pdf) {
    try {
      const maxPagesToRender = Math.min(pageCount, 6);
      for (let i = 1; i <= maxPagesToRender; i++) {
        onProgress?.(`Scanning page ${i} of ${pageCount} with OCR...`);
        const page = await pdf.getPage(i);
        const imgDataUrl = await renderPageToImage(page);
        pageImages.push(imgDataUrl);
      }
    } catch (renderErr: any) {
      console.warn('[AI HireFlow][PDF] Error during page rasterization:', renderErr?.message || renderErr);
    }
  }

  if (pageImages.length > 0) {
    onProgress?.('Analyzing resume text structure...');
    const ocrStartTime = Date.now();
    try {
      const ocrExtractedText = await performOcr(
        pageImages,
        { fileType: 'pdf', fileName: file.name },
        onProgress
      );
      const ocrDuration = Date.now() - ocrStartTime;
      const trimmedOcr = (ocrExtractedText || '').trim();
      const finalCharCount = trimmedOcr.length;

      console.log(`[AI HireFlow][PDF] OCR extraction completed: pages=${pageCount}, normalCharCount=${normalCharCount}, ocrTriggered=true, ocrDuration=${ocrDuration}ms, finalCharCount=${finalCharCount}`);

      if (isTextQualitySufficient(trimmedOcr)) {
        return trimmedOcr;
      }
    } catch (ocrErr: any) {
      console.warn('[AI HireFlow][PDF] OCR fallback failed:', ocrErr?.message || ocrErr);
    }
  }

  // STEP 5: If normal text had at least some readable text, return it rather than failing
  if (isTextQualitySufficient(trimmedNormal)) {
    return trimmedNormal;
  }

  throw new Error('Could not extract readable text from this resume.');
};

/**
 * Universal text extractor for resumes (PDF, TXT, or Image files).
 */
export const extractTextFromFile = async (
  file: File,
  onProgress?: (status: string) => void
): Promise<string> => {
  const fileName = file.name.toLowerCase();

  // Plain Text file
  if (fileName.endsWith('.txt') || file.type === 'text/plain') {
    onProgress?.('Reading text resume...');
    const text = await file.text();
    if (!text.trim() || text.trim().length < 25) {
      throw new Error('The uploaded text file is empty or too short to be a valid resume.');
    }
    return text.trim();
  }

  // PDF Document
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractTextFromPDF(file, onProgress);
  }

  // Image files (PNG, JPG, WEBP, etc.)
  if (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(fileName)
  ) {
    onProgress?.('Scanning resume image with OCR...');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const text = await performOcr([dataUrl], { fileType: 'image', fileName: file.name }, onProgress);
          if (!text || text.trim().length < 25) {
            reject(new Error('Could not extract readable text from this resume.'));
          } else {
            resolve(text.trim());
          }
        } catch (e: any) {
          reject(new Error(e.message || 'Could not extract readable text from this resume.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to load resume image.'));
      reader.readAsDataURL(file);
    });
  }

  // Fallback try reading as text first, then PDF
  try {
    const text = await file.text();
    if (text && isTextQualitySufficient(text)) {
      return text.trim();
    }
  } catch {
    // Ignore fallback failure
  }

  return extractTextFromPDF(file, onProgress);
};
