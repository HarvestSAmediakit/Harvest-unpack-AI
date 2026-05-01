import { Host } from "../constants";
import { PodcastSegment } from "./geminiService";
import { PodcastError } from "../types";

export const generatePodcastAudioGoogle = async (
  script: PodcastSegment[],
  apiKey: string,
  language: string,
  host1: Host,
  host2: Host
): Promise<string | null> => {
  try {
    const audioChunks: Uint8Array[] = [];
    for (const segment of script) {
      // Match speaker name to host to get the correct Google voice
      let voice = "";
      if (segment.speaker === host1.name) {
        voice = host1.googleVoices[language] || host1.googleVoices['en'];
      } else {
        voice = host2.googleVoices[language] || host2.googleVoices['en'];
      }
      
      const response = await fetch("/api/google/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: segment.text,
          voice,
          apiKey,
        }),
      });

      if (!response.ok) {
        let errorMsg = "Google Cloud TTS API error";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error?.message || errorData.error || errorMsg;
        } catch (e) {
          errorMsg = `${errorMsg}: ${response.statusText}`;
        }
        throw new PodcastError(
          "Google TTS Error",
          errorMsg,
          "Please verify your Google Cloud API key has Text-to-Speech enabled.",
          "GOOGLE_TTS_FAILED"
        );
      }
      
      const arrayBuffer = await response.arrayBuffer();
      audioChunks.push(new Uint8Array(arrayBuffer));
    }
    
    // Combine Uint8Arrays
    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedArray = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      combinedArray.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(combinedArray);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  } catch (e: any) {
    console.error("Failed to generate Google Cloud audio", e);
    throw e;
  }
};
