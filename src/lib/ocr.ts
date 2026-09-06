/**
 * Client-Side OCR Service Interface
 * Coordinates rendering of PDF pages/scanned resumes to images and invoking the OCR engine.
 */

export interface OcrResponse {
  success: boolean;
  text: string;
  pageCount?: number;
  durationMs?: number;
  charCount?: number;
}

/**
 * Sends one or more high-resolution page images (base64 data URLs) to the OCR engine.
 * Employs server-side OCR with layout reconstruction (preserving two-column structures)
 * and falls back to in-browser Tesseract if offline or if the server is unreachable.
 */
export async function performOcr(
  images: string[],
  meta?: { fileType?: string; fileName?: string },
  onProgress?: (msg: string) => void
): Promise<string> {
  if (!images || images.length === 0) {
    throw new Error('Could not extract readable text from this resume.');
  }

  onProgress?.(`Processing ${images.length} page(s) with OCR engine...`);

  // PRIMARY: Call server-side /api/ocr (fast, pre-cached model, reliable layout analysis)
  try {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images,
        meta: {
          fileType: meta?.fileType || 'pdf',
          fileName: meta?.fileName,
          pageCount: images.length
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && typeof data.text === 'string' && data.text.trim().length >= 25) {
        return data.text.trim();
      }
    } else {
      const errData = await response.json().catch(() => null);
      console.warn('[AI HireFlow][Client OCR] /api/ocr responded with status:', response.status, errData);
    }
  } catch (err) {
    console.warn('[AI HireFlow][Client OCR] /api/ocr call error, checking browser fallback:', err);
  }

  // SECONDARY FALLBACK: In-Browser Tesseract if /api/ocr is unavailable
  try {
    onProgress?.('Scanning resume in browser...');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    
    const pageTexts: string[] = [];
    for (let i = 0; i < images.length; i++) {
      onProgress?.(`Scanning page ${i + 1} of ${images.length} in browser...`);
      const ret = await worker.recognize(images[i]);
      if (ret.data && ret.data.text) {
        pageTexts.push(ret.data.text.trim());
      }
    }
    await worker.terminate();

    const fullBrowserText = pageTexts.join('\n\n--- Page Break ---\n\n').trim();
    if (fullBrowserText && fullBrowserText.length >= 25) {
      return fullBrowserText;
    }
  } catch (err: any) {
    console.warn('[AI HireFlow][Client OCR] Browser Tesseract fallback failed:', err);
  }

  throw new Error('Could not extract readable text from this resume.');
}
