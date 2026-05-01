import * as mammoth from 'mammoth';
import { extractTextFromPdf } from './pdfService';
import { PodcastError } from '../types';

export type InputType = 'pdf' | 'image' | 'word' | 'text';

export interface ExtractionResult {
  text: string;
  title: string;
}

export const extractTextFromFile = async (file: File, apiKey?: string): Promise<ExtractionResult> => {
  const mimeType = file.type;
  const fileName = file.name;
  const title = fileName.replace(/\.[^/.]+$/, ""); // Remove extension

  // Use backend API for extraction as per architecture
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (apiKey) {
      formData.append('apiKey', apiKey);
    }

    const response = await fetch('/api/extract-text', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text && data.text.trim()) {
        return { text: data.text, title };
      }
      throw new PodcastError(
        "Extraction Failed",
        "The backend service returned an empty result.",
        "Please try again or upload a different file.",
        "BACKEND_EXTRACTION_EMPTY"
      );
    } else {
      console.warn("Backend extraction failed, falling back to client-side extraction");
    }
  } catch (err: any) {
    console.error("Backend extraction error:", err);
    // Continue to fallback
  }

  // Fallback to client-side extraction if backend fails
  if (mimeType === 'application/pdf') {
    try {
      const text = await extractTextFromPdf(file);
      return { text, title };
    } catch (clientErr: any) {
      console.error("Client-side PDF extraction also failed:", clientErr);
      throw new PodcastError(
        "PDF Extraction Failed",
        "Both server and client-side extraction failed for this PDF.",
        "The PDF might be encrypted, image-only, or corrupted. Please try a different PDF or copy-paste the text.",
        "PDF_EXTRACTION_TOTAL_FAILURE"
      );
    }
  }

  if (mimeType.startsWith('image/')) {
    throw new PodcastError(
      "Unsupported File Type",
      "Image extraction is not supported in this version.",
      "Please upload a PDF, Word document, or plain text file.",
      "UNSUPPORTED_FILE_TYPE"
    );
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value.trim()) {
        throw new Error("The Word document appears to be empty.");
      }
      return { text: result.value, title };
    } catch (err: any) {
      console.error("Word Extraction Error:", err);
      throw new PodcastError(
        "Word Document Error",
        err.message || "Failed to extract text from the Word document.",
        "Try converting the document to a PDF or plain text file and uploading it again.",
        "WORD_EXTRACTION_FAILED"
      );
    }
  }

  if (mimeType.startsWith('text/')) {
    const text = await file.text();
    return { text, title };
  }

  throw new PodcastError(
    "Unsupported File Type",
    `The file type \${mimeType} is not supported.`,
    "Please upload a PDF, Image (PNG/JPG), Word document, or plain text file.",
    "UNSUPPORTED_FILE_TYPE"
  );
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};
