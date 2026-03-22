import * as mammoth from 'mammoth';
import { extractTextFromPdf } from './pdfService';
import { extractTextFromImage } from './geminiService';

export type InputType = 'pdf' | 'image' | 'word' | 'text';

export interface ExtractionResult {
  text: string;
  title: string;
}

export const extractTextFromFile = async (file: File): Promise<ExtractionResult> => {
  const mimeType = file.type;
  const fileName = file.name;
  const title = fileName.replace(/\.[^/.]+$/, ""); // Remove extension

  if (mimeType === 'application/pdf') {
    const text = await extractTextFromPdf(file);
    return { text, title };
  }

  if (mimeType.startsWith('image/')) {
    const base64Data = await fileToBase64(file);
    const text = await extractTextFromImage(base64Data, mimeType);
    return { text, title };
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value, title };
  }

  if (mimeType.startsWith('text/')) {
    const text = await file.text();
    return { text, title };
  }

  throw new Error(`Unsupported file type: \${mimeType}. Please upload a PDF, image, Word, or text document.`);
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
