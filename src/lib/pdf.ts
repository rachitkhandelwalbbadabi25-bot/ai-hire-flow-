import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { performOcr } from './ocr.ts';

// Configure local Vite-bundled worker to prevent cross-origin or CDN worker failures
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Validates whether the extracted text layer has sufficient quality and substance
 * to represent a readable resume, or if it is an empty/scanned document requiring OCR.
 */
export function isTextQualitySufficient(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 40) return false;

  // Count alphabetic characters
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letters < 25) return false;

  // Count distinct words (length >= 2)
  const words = trimmed.match(/\b[a-zA-Z]{2,}\b/g) || [];
  if (words.length < 6) return false;

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
    canvas,
    canvasContext: ctx,
    viewport
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.88);
}

/**
 * Extracts text from a PDF file.
 * 1. Attempts normal text layer extraction first.
 * 2. If sufficient text is found, uses it immediately (no OCR delay).
 * 3. If text is empty or too short (scanned/image PDF), automatically rasterizes pages
 *    and runs OCR fallback, preserving two-column section structure.
 */
export const extractTextFromPDF = async (
  file: File,
  onProgress?: (status: string) => void
): Promise<string> => {
  const startTime = Date.now();
  try {
    onProgress?.('Reading resume...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let normalExtractedText = '';

    // Step 1: Attempt standard text layer extraction
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => 'str' in item && typeof item.str === 'string')
        .map((item: any) => item.str)
        .join(' ');

      if (pageText.trim()) {
        normalExtractedText += pageText.trim() + '\n\n';
      }
    }

    const trimmedNormal = normalExtractedText.trim();
    const normalCharCount = trimmedNormal.length;

    // Step 2: Quality Check
    if (isTextQualitySufficient(trimmedNormal)) {
      console.log(`[AI HireFlow][PDF] Normal text extraction successful. Pages: ${pdf.numPages}, Chars: ${normalCharCount}, OCR triggered: false, Duration: ${Date.now() - startTime}ms`);
      return trimmedNormal;
    }

    // Step 3: Automatic OCR Fallback for Scanned / Image-based PDF
    console.log(`[AI HireFlow][PDF] Normal extraction insufficient (${normalCharCount} chars). Automatically activating OCR fallback for ${pdf.numPages} page(s).`);
    onProgress?.('Scanning resume with OCR...');

    const pageImages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Scanning page ${i} of ${pdf.numPages} with OCR...`);
      const page = await pdf.getPage(i);
      const imgDataUrl = await renderPageToImage(page);
      pageImages.push(imgDataUrl);
    }

    onProgress?.('Analyzing resume text structure...');
    const ocrStartTime = Date.now();
    const ocrExtractedText = await performOcr(
      pageImages,
      { fileType: 'pdf', fileName: file.name },
      onProgress
    );
    const ocrDuration = Date.now() - ocrStartTime;

    const trimmedOcr = (ocrExtractedText || '').trim();
    const finalCharCount = trimmedOcr.length;

    console.log(`[AI HireFlow][PDF] OCR extraction completed: pages=${pdf.numPages}, normalCharCount=${normalCharCount}, ocrTriggered=true, ocrDuration=${ocrDuration}ms, finalCharCount=${finalCharCount}`);

    if (!trimmedOcr || trimmedOcr.length < 25) {
      throw new Error('Could not extract readable text from this resume.');
    }

    return trimmedOcr;
  } catch (err: any) {
    console.error('[AI HireFlow][PDF] Extraction error:', err.message || err);
    throw new Error(err.message || 'Could not extract readable text from this resume.');
  }
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
