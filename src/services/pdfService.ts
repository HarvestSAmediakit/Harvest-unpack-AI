import * as pdfjsLib from 'pdfjs-dist';
import { PodcastError } from '../types';

// Initialize PDF.js worker using unpkg for better reliability with newer versions
// Note: Newer versions of pdfjs-dist use .mjs for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer, 
      disableFontFace: true,
      verbosity: 0, // Suppress console noise for malformed PDFs
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`
    }).promise;
    let fullText = '';

    if (pdf.numPages === 0) {
      throw new PodcastError(
        "Empty PDF",
        "The uploaded PDF has no pages.",
        "Please upload a valid PDF document with content.",
        "EMPTY_PDF"
      );
    }

    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Ensure items exist and are strings
        const pageText = (textContent.items || [])
          .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
          .join(' ');
          
        fullText += pageText + '\n';
      } catch (pageError: any) {
        console.warn(`Error extracting text from page ${i}:`, pageError);
        // Continue to next page if one page fails
      }
    }

    if (!fullText.trim()) {
      throw new PodcastError(
        "No Text Found",
        "Could not extract any readable text from the PDF.",
        "The PDF might be an image-only scan or encrypted. Try converting it to an image and uploading it again.",
        "PDF_EXTRACTION_FAILED"
      );
    }

    return fullText;
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    if (error instanceof PodcastError) throw error;
    
    if (error instanceof Error) {
      if (error.message.includes("Password")) {
        throw new PodcastError(
          "Password Protected",
          "This PDF is encrypted or password protected.",
          "Please upload an unprotected version of the document.",
          "PDF_PASSWORD_PROTECTED"
        );
      }
      throw new PodcastError(
        "PDF Reading Error",
        error.message,
        "Try refreshing the page or using a different PDF document.",
        "PDF_GENERIC_ERROR"
      );
    }
    throw new PodcastError(
      "Unexpected Error",
      "An unexpected error occurred while reading the PDF.",
      "Please try again or contact support if the issue persists.",
      "PDF_UNKNOWN_ERROR"
    );
  }
};
