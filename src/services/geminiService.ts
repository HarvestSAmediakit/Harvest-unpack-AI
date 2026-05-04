export interface PodcastSegment {
  speaker: string;
  text: string;
}

/**
 * Native PDF Ingestion loop - processes raw PDF directly for layout-aware extraction
 */
export const extractArticlesFromPdfFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch("/api/ai/extract-articles-vision", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to extract articles via Vision API");
  }

  return await response.json();
};

export const extractArticlesFromText = async (text: string) => {
  // We can repurpose the vision prompt or send raw text
  // For simplicity, let's keep it consistent
  const response = await fetch("/api/ai/generate-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, title: "Magazine Issue" })
  });

  if (!response.ok) throw new Error("Failed to extract articles from text");
  return await response.json();
};

export const generatePodcastScript = async (text: string, title?: string) => {
  const response = await fetch("/api/ai/generate-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, title })
  });

  if (!response.ok) throw new Error("Failed to generate script");
  return await response.json();
};

export const synthesizePodcastAudio = async (script: { speaker: string, text: string }[]) => {
  const response = await fetch("/api/ai/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to synthesize audio");
  }

  const data = await response.json();
  const base64Audio = data.audioBase64;

  const binaryString = atob(base64Audio);
  const pcmData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  const wavBlob = createWavBlob(pcmData, 24000);
  return URL.createObjectURL(wavBlob);
};

function createWavBlob(pcmData: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);
  const wavFile = new Uint8Array(header.byteLength + pcmData.length);
  wavFile.set(new Uint8Array(header), 0);
  wavFile.set(pcmData, 44);
  return new Blob([wavFile], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
