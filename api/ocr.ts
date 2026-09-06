import type { Request, Response } from 'express';

interface WordItem {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence?: number;
}

interface LineItem {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words?: WordItem[];
}

interface PageOcrData {
  text: string;
  words?: WordItem[];
  lines?: LineItem[];
  width?: number;
  height?: number;
}

// Global cached Tesseract worker to avoid slow re-initialization
let cachedWorker: any = null;
let workerInitPromise: Promise<any> | null = null;

async function getWorker() {
  if (cachedWorker) return cachedWorker;
  if (!workerInitPromise) {
    workerInitPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      cachedWorker = worker;
      return worker;
    })().catch(err => {
      workerInitPromise = null;
      cachedWorker = null;
      throw err;
    });
  }
  return await workerInitPromise;
}

/**
 * Intelligent Two-Column Detection and Reordering:
 * Detects if a page contains a two-column layout (common in modern tech resumes)
 * and reconstructs text in natural reading order:
 * Header (Full Width) -> Left Column -> Right Column -> Footer (Full Width)
 * Prevents interleaving of left and right column bullets.
 */
export function reconstructPageText(data: any): string {
  const rawText = typeof data.text === 'string' ? data.text : '';
  const words: WordItem[] = Array.isArray(data.words) ? data.words : [];

  // If word list is missing or tiny, fallback to raw text
  if (words.length < 15) {
    return rawText.trim();
  }

  // Derive page dimensions from bounding boxes or metadata
  let maxX = 0;
  let maxY = 0;
  for (const w of words) {
    if (w.bbox) {
      if (w.bbox.x1 > maxX) maxX = w.bbox.x1;
      if (w.bbox.y1 > maxY) maxY = w.bbox.y1;
    }
  }

  const pageWidth = maxX > 0 ? maxX : 1000;
  const pageHeight = maxY > 0 ? maxY : 1400;

  // Search for a column split / gutter between 25% and 60% of page width
  const minSplitX = Math.round(pageWidth * 0.25);
  const maxSplitX = Math.round(pageWidth * 0.60);
  const step = Math.max(3, Math.round(pageWidth * 0.01));

  let bestSplitX = -1;
  let minCrossing = Infinity;
  let bestLeftCount = 0;
  let bestRightCount = 0;

  for (let x = minSplitX; x <= maxSplitX; x += step) {
    let crossing = 0;
    let leftCount = 0;
    let rightCount = 0;

    for (const w of words) {
      if (!w.bbox || !w.text || !w.text.trim()) continue;
      // Exclude top 8% from column gutter calculation to avoid header title interference
      if (w.bbox.y0 < pageHeight * 0.08) continue;

      if (w.bbox.x0 < x - 5 && w.bbox.x1 > x + 5) {
        crossing++;
      } else if (w.bbox.x1 <= x + 5) {
        leftCount++;
      } else if (w.bbox.x0 >= x - 5) {
        rightCount++;
      }
    }

    // A two-column resume must have significant text in both columns
    if (leftCount >= 8 && rightCount >= 12) {
      if (crossing < minCrossing) {
        minCrossing = crossing;
        bestSplitX = x;
        bestLeftCount = leftCount;
        bestRightCount = rightCount;
      }
    }
  }

  const totalBodyWords = bestLeftCount + bestRightCount + minCrossing;
  const isTwoColumn = bestSplitX > 0 && (minCrossing <= 4 || minCrossing / Math.max(1, totalBodyWords) < 0.05);

  // If single column layout, return clean raw text or line-sorted text
  if (!isTwoColumn) {
    return cleanOcrText(rawText);
  }

  // Find where the two columns visually start (y-boundary below header)
  let columnTopY = 0;
  const yStep = Math.max(10, Math.round(pageHeight * 0.02));
  for (let y = 0; y < pageHeight * 0.45; y += yStep) {
    const rowWords = words.filter(w => w.bbox && w.bbox.y0 <= y + yStep && w.bbox.y1 >= y);
    const hasLeft = rowWords.some(w => w.bbox.x1 <= bestSplitX);
    const hasRight = rowWords.some(w => w.bbox.x0 >= bestSplitX);
    if (hasLeft && hasRight) {
      columnTopY = y;
      break;
    }
  }

  // Group words into sections
  // 1. Header (above the two columns)
  const headerWords = words.filter(w => w.bbox && w.bbox.y1 <= columnTopY + 5);

  // 2. Left Column
  const leftWords = words.filter(w => w.bbox && w.bbox.y1 > columnTopY + 5 && w.bbox.x1 <= bestSplitX + 12);

  // 3. Right Column
  const rightWords = words.filter(w => w.bbox && w.bbox.y1 > columnTopY + 5 && w.bbox.x0 >= bestSplitX - 12);

  const headerText = assembleWordsIntoLines(headerWords);
  const leftText = assembleWordsIntoLines(leftWords);
  const rightText = assembleWordsIntoLines(rightWords);

  const sections: string[] = [];
  if (headerText) sections.push(headerText);
  if (leftText) sections.push(`=== CORE SKILLS & BACKGROUND ===\n${leftText}`);
  if (rightText) sections.push(`=== EXPERIENCE & ACHIEVEMENTS ===\n${rightText}`);

  return sections.join('\n\n');
}

/**
 * Assembles an array of positioned words into coherent lines and paragraphs,
 * maintaining horizontal and vertical alignment without jitter.
 */
function assembleWordsIntoLines(wordList: WordItem[]): string {
  if (!wordList || wordList.length === 0) return '';

  // Sort primarily by vertical position (y center), secondarily by x0
  const sorted = [...wordList].sort((a, b) => {
    const yCenterA = (a.bbox.y0 + a.bbox.y1) / 2;
    const yCenterB = (b.bbox.y0 + b.bbox.y1) / 2;
    const yDiff = yCenterA - yCenterB;
    if (Math.abs(yDiff) > 8) {
      return yDiff;
    }
    return a.bbox.x0 - b.bbox.x0;
  });

  const lines: string[] = [];
  let currentLine: string[] = [];
  let lastY = -1;

  for (const w of sorted) {
    const cleanWord = (w.text || '').trim();
    if (!cleanWord) continue;

    const yCenter = (w.bbox.y0 + w.bbox.y1) / 2;
    if (lastY === -1 || Math.abs(yCenter - lastY) <= 8) {
      currentLine.push(cleanWord);
      lastY = yCenter;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      currentLine = [cleanWord];
      lastY = yCenter;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }

  return cleanOcrText(lines.join('\n'));
}

/**
 * Cleans OCR artifacts such as isolated symbols or excessive blank lines
 * while strictly preserving all real words, numbers, and bullet points.
 */
function cleanOcrText(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      // Filter out lines that are only 1-2 random punctuation symbols (e.g. "|", "~", "_")
      if (line.length <= 2 && /^[^a-zA-Z0-9]+$/.test(line)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Handle POST /api/ocr
 * Processes one or multiple page images using Tesseract OCR,
 * applies layout analysis and two-column reordering,
 * and logs safe diagnostics without exposing private resume data.
 */
export async function handleOcrRequest(req: Request, res: Response) {
  const startTime = Date.now();
  try {
    const { images, meta } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "images" array in request body' });
    }

    const fileType = meta?.fileType || 'pdf';
    const pageCount = images.length;

    const worker = await getWorker();
    const pageResults: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const imgData = images[i];
      if (typeof imgData !== 'string' || !imgData.trim()) continue;

      let imageTarget: any = imgData;
      // If base64 data URL, convert to buffer safely without regex backtracking
      if (imgData.startsWith('data:')) {
        const commaIdx = imgData.indexOf(',');
        if (commaIdx !== -1) {
          const rawBase64 = imgData.slice(commaIdx + 1).replace(/\s+/g, '');
          imageTarget = Buffer.from(rawBase64, 'base64');
        }
      }

      const ocrResult = await worker.recognize(imageTarget);
      const reconstructed = reconstructPageText(ocrResult.data);
      if (reconstructed && reconstructed.trim()) {
        pageResults.push(reconstructed.trim());
      }
    }

    const ocrDuration = Date.now() - startTime;
    const combinedText = pageResults.join('\n\n--- Page Break ---\n\n').trim();
    const finalCharCount = combinedText.length;

    // Safe diagnostics logging (Requirement 10: NEVER log resume text, email, or keys)
    console.log(`[AI HireFlow][OCR] Completed OCR: fileType=${fileType}, pages=${pageCount}, ocrDuration=${ocrDuration}ms, finalCharCount=${finalCharCount}, success=${finalCharCount > 30}`);

    if (!combinedText || finalCharCount < 20) {
      return res.status(422).json({
        error: 'Could not extract readable text from this resume.',
        code: 'OCR_EMPTY_TEXT'
      });
    }

    return res.json({
      success: true,
      text: combinedText,
      pageCount,
      durationMs: ocrDuration,
      charCount: finalCharCount
    });
  } catch (err: any) {
    const ocrDuration = Date.now() - startTime;
    console.error(`[AI HireFlow][OCR] Error during OCR processing (${ocrDuration}ms):`, err.message || err);
    return res.status(500).json({
      error: 'Could not extract readable text from this resume.',
      code: 'OCR_EXECUTION_ERROR'
    });
  }
}
