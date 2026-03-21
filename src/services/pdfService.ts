import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker using unpkg for better reliability with newer versions
// Note: Newer versions of pdfjs-dist use .mjs for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    if (pdf.numPages === 0) {
      throw new Error("The uploaded PDF appears to be empty.");
    }

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    if (!fullText.trim()) {
      throw new Error("Could not extract any readable text from the PDF. It might be an image-only PDF or encrypted.");
    }

    return fullText;
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    if (error instanceof Error) {
      if (error.message.includes("Password")) {
        throw new Error("This PDF is password protected. Please upload an unprotected version.");
      }
      throw error;
    }
    throw new Error("An unexpected error occurred while reading the PDF.");
  }
};
