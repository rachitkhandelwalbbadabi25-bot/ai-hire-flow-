import * as pdfjsLib from 'pdfjs-dist';

// Setting the worker source is required for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => 'str' in item && typeof item.str === 'string')
        .map((item: any) => item.str)
        .join(' ');
      
      if (pageText.trim()) {
        fullText += pageText.trim() + '\n\n';
      }
    }

    const trimmed = fullText.trim();
    if (!trimmed || trimmed.length < 30) {
      throw new Error("No selectable text found in the PDF. If this is a scanned image, please upload a text-based PDF or document.");
    }

    return trimmed;
  } catch (err: any) {
    if (err.message && err.message.includes('selectable text')) {
      throw err;
    }
    throw new Error(`Failed to read PDF (${err.message || 'Corrupted or unreadable PDF'}). Please ensure the file is a valid PDF.`);
  }
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.txt') || file.type === 'text/plain') {
    const text = await file.text();
    if (!text.trim() || text.trim().length < 30) {
      throw new Error("The uploaded text file is empty or too short to be a valid resume.");
    }
    return text.trim();
  }
  
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractTextFromPDF(file);
  }

  // Fallback try reading as text
  try {
    const text = await file.text();
    if (text && text.trim().length >= 30) {
      return text.trim();
    }
  } catch {
    // Ignore fallback failure
  }

  return extractTextFromPDF(file);
};

