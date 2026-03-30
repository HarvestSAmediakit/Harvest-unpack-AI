import { GoogleGenAI, Modality } from "@google/genai";
import { pcmToWav, enhanceAudio } from "../utils/audioUtils";
import { PodcastError } from "../types";

const getAi = () => {
  // Prioritize the user-provided key from localStorage first (to bypass platform restrictions)
  // then the platform-selected key, then the environment variable.
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_custom_api_key') : null;
  const key = customKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  // Check if key is missing or is a placeholder
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    throw new PodcastError(
      "API Key Missing",
      "The Gemini API key is not configured or is invalid.",
      "Please provide your own Gemini API key in the settings to continue.",
      "MISSING_API_KEY"
    );
  }
  
  return new GoogleGenAI({ apiKey: key });
};

export type PodcastSpeaker = "Thabo" | "Lindiwe";

export interface PodcastSegment {
  speaker: PodcastSpeaker;
  text: string;
}

export interface Character {
  id: PodcastSpeaker;
  name: string;
  description: string;
  pronunciationGuide?: { term: string; phonetic: string }[];
  samplePhrase?: string;
}

export const AVAILABLE_CHARACTERS: Character[] = [
  { 
    id: "Thabo", 
    name: "Thabo", 
    description: "Senior Agronomist & Market Analyst. Energetic, loves innovation. Naturally uses South African slang like 'lekker', 'howzit', 'sharp sharp', 'eish', 'make a plan', 'boet', and 'bru'.",
    pronunciationGuide: [
      { term: "Agronomy", phonetic: "uh-GRON-uh-mee" },
      { term: "Hydroponics", phonetic: "hahy-druh-PON-iks" }
    ],
    samplePhrase: "Howzit everyone! Welcome to Harvest Unpacked! Let's dive into the latest agricultural innovations, it's going to be lekker."
  },
  { 
    id: "Lindiwe", 
    name: "Lindiwe", 
    description: "Livestock Specialist. Practical, witty. Naturally uses South African slang like 'yoh', 'shame', 'now-now', 'just now', 'ag no man', 'sho', and 'heita'.",
    pronunciationGuide: [
      { term: "Bovine", phonetic: "BOH-vahyn" },
      { term: "Veterinary", phonetic: "VET-er-uh-ner-ee" }
    ],
    samplePhrase: "Heita! Let's get our hands dirty and talk about practical solutions for your livestock, now-now."
  }
];

const parseJson = (text: string) => {
  let cleaned = text.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    // Try direct parse first
    return JSON.parse(cleaned);
  } catch (e) {
    // If it fails, try to extract the JSON array or object
    const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerE) {
        throw new Error("Failed to parse extracted JSON: " + innerE);
      }
    }
    throw e;
  }
};

export type PodcastLanguage = "English" | "Afrikaans";

export const generatePodcastScript = async (
  articleText: string, 
  language: PodcastLanguage = "English",
  selectedCharacters: PodcastSpeaker[] = ["Thabo", "Lindiwe"]
): Promise<PodcastSegment[]> => {
  const model = "gemini-3.1-pro-preview";
  
  const characterDetails = AVAILABLE_CHARACTERS
    .filter(c => selectedCharacters.includes(c.id))
    .map((c, i) => `${i + 1}. ${c.name}: ${c.description}`)
    .join("\n    ");

  const systemInstruction = `
    You are a scriptwriter for "Harvest Unpacked DeepDive AI Podcasts", a popular, highly entertaining talkshow podcast for the readership of Harvest SA magazine.
    Your task is to create a realistic, incredibly fun, engaging, and highly educational deep dive conversation between EXACTLY the 2 characters provided below.
    The readership of Harvest SA magazine needs to absolutely love this—it should feel like the best talkshow podcast ever!
    
    CRITICAL GOAL: The deep dive MUST deal directly with the content of the uploaded Harvest SA article. The talkshow needs to PROMOTE the content of the article, making the reader understand what it's about in a highly informative and entertaining way. We want the listeners to absolutely fall in love with the presenters! Make them charismatic, witty, passionate, and incredibly lovable.
    Focus PURELY on the content of the article and promote the company and products mentioned in the article.

    DO NOT use any other characters. ONLY use:
    ${selectedCharacters.join(", ")}

    LANGUAGE & SLANG: The podcast MUST be generated in ${language}. 
    - If the language is not English, translate the core concepts and discussion naturally into ${language}.
    - IMPORTANT: Ensure the output is strictly in ${language}. Do not mix with English unless it's a proper noun or technical term that is commonly used in ${language}.
    - Characters should still maintain their unique personalities and cultural backgrounds, but speak in ${language}.
    - INTEGRATE AUTHENTIC SOUTH AFRICAN SLANG: Use local idioms, colloquialisms, and slang contextually and naturally to enhance the local flavor and connection with the audience. Do not force it, but ensure it feels like a genuine South African conversation (e.g., using words like 'lekker', 'howzit', 'eish', 'yoh', 'now-now', 'shame', 'sharp sharp', 'boet', 'bru' where appropriate).

    Core Objectives:
    1. Hook the Audience & Promote the Article: Start the podcast with a fun, high-energy, and catchy radio-style intro that hooks the Harvest SA magazine readership immediately. Enthusiastically introduce the specific article being discussed today.
    2. Lovable Presenters: Make the banter between the two presenters so charming, funny, and warm that the audience falls in love with them. Their chemistry should be electric, like a top-tier morning radio show.
    3. Fun & Informative Deep Dive: The 2 chosen characters should have a natural, highly entertaining, back-and-forth deep dive discussion about the supplied material's contents. They must clearly explain what the article is about to the reader.
    4. Detailed & Accessible Explanation: Break down complex agricultural concepts from the article into simple, understandable, and relatable terms.
    5. Practical Application: Discuss how a farmer can actually use the information from the material in their daily operations, keeping it practical but lively.
    6. Magazine Shoutout: Enthusiastically mention Harvest SA magazine, praise the author/content of the article, and encourage listeners to go read the full piece.
    7. Duration: Aim for EXACTLY ~600 words to ensure a perfect 4-minute radio-style podcast duration.

    The Team (Use ONLY these 2):
    ${characterDetails}

    Tone:
    - Extremely fun, entertaining, and informative.
    - Charismatic, lovable, and warm.
    - Authentic and culturally resonant for ${language}.
    - High energy, like a top-tier radio talkshow.
    - Realistic, witty banter that Harvest SA readers will love.
    - Professional yet accessible.

    Output Format:
    Return a JSON array of objects with "speaker" and "text" fields.
  `;

  // Primary: Gemini
  console.log("Attempting Gemini primary generation for script...");
  try {
    const response = await generateWithTokenGuard(
      [{ parts: [{ text: `Article Content: ${articleText}\n\nGenerate a highly entertaining, fun, and informative 4-minute radio-style podcast script (~600 words) in ${language} that explains the article to the reader using EXACTLY these 2 characters: ${selectedCharacters.join(", ")}. Focus on promoting the company and products in the article.` }] }],
      systemInstruction,
      "application/json"
    );
    
    const script = parseJson(response.text || "[]");
    if (Array.isArray(script) && script.length > 0) {
      return script;
    }
    throw new Error("Empty script from Gemini");
  } catch (e: any) {
    console.error("Gemini Script Generation Error:", e);
    
    if (e instanceof PodcastError) throw e;

    // Fallback: Grok (x.ai)
    console.log("Falling back to x.ai (Grok) for script generation...");
    try {
      const xaiResponse = await fetch("/api/xai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Article Content: ${articleText}\n\nGenerate a highly entertaining, fun, and informative 4-minute radio-style podcast script (~600 words) in ${language} that explains the article to the reader using EXACTLY these 2 characters: ${selectedCharacters.join(", ")}. Focus on promoting the company and products in the article.`,
          systemInstruction,
          responseFormat: "json_object"
        })
      });

      if (xaiResponse.ok) {
        const data = await xaiResponse.json();
        const script = parseJson(data.text || "[]");
        if (Array.isArray(script) && script.length > 0) {
          return script;
        }
      }
    } catch (xaiError) {
      console.error("x.ai Fallback Error (Script):", xaiError);
    }

    // Fallback to OpenAI if Gemini fails (e.g. quota exceeded)
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      // Try Grok fallback first
      console.log("Attempting x.ai (Grok) fallback for script generation...");
      try {
        const xaiResponse = await fetch("/api/xai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Article Content: ${articleText}\n\nGenerate a highly entertaining, fun, and informative deep dive podcast script (~600-800 words) in ${language} with EXACTLY these 2 characters: ${selectedCharacters.join(", ")}.`,
            systemInstruction,
            responseFormat: "json_object"
          })
        });

        if (xaiResponse.ok) {
          const data = await xaiResponse.json();
          const script = parseJson(data.text || "[]");
          if (Array.isArray(script) && script.length > 0) {
            return script;
          }
        }
      } catch (xaiError) {
        console.error("x.ai Fallback Error (Script):", xaiError);
      }

      console.log("Attempting OpenAI fallback for script generation...");
      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Article Content: ${articleText}\n\nGenerate a highly entertaining, fun, and informative deep dive podcast script (~600-800 words) in ${language} with EXACTLY these 2 characters: ${selectedCharacters.join(", ")}.`,
            systemInstruction,
            responseFormat: "json_object"
          })
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const script = parseJson(data.text || "[]");
          if (Array.isArray(script) && script.length > 0) {
            return script;
          }
        } else {
          const errorData = await fallbackResponse.json();
          if (errorData.error?.includes("OPENAI_API_KEY")) {
            throw new PodcastError(
              "Quota Exceeded & Fallback Failed",
              "Gemini quota is full and neither x.ai nor OpenAI fallbacks are configured.",
              "Please add an XAI_API_KEY or OPENAI_API_KEY in the Secrets panel to enable fallback generation.",
              "QUOTA_EXCEEDED_NO_FALLBACK"
            );
          }
        }
      } catch (fallbackError: any) {
        console.error("OpenAI Fallback Error:", fallbackError);
        if (fallbackError instanceof PodcastError) throw fallbackError;
      }
    }

    if (errorMessage.toLowerCase().includes("api key not valid") || errorMessage.toLowerCase().includes("invalid_argument")) {
      throw new PodcastError(
        "Invalid API Key",
        "The Gemini API key provided is not valid.",
        "Please check your GEMINI_API_KEY in the Secrets panel or select a valid key using the 'Select API Key' button.",
        "INVALID_API_KEY"
      );
    }

    if (e.message?.includes("safety")) {
      throw new PodcastError(
        "Content Flagged",
        "The AI safety filters blocked this content.",
        "Try rephrasing the article or removing potentially sensitive topics.",
        "SAFETY_FLAG"
      );
    }

    throw new PodcastError(
      "Script Generation Error",
      errorMessage || "An unexpected error occurred during script generation.",
      "Check your internet connection and try again in a few moments.",
      "GENERIC_SCRIPT_ERROR"
    );
  }
};

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  const prompt = "Analyze this image in detail. If it contains text or is an article, extract the full content accurately. If it is a photograph or diagram, describe in detail what is shown, including any agricultural context, subjects, conditions, and notable features so it can be discussed in a podcast. Return the extracted text and/or detailed description.";

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      }],
    });

    return response.text || "";
  } catch (e: any) {
    console.error("Image Extraction Error:", e);
    throw new PodcastError(
      "Image Analysis Failed",
      e.message || "The AI could not process the image or extract text.",
      "Ensure the image is clear, well-lit, and contains readable text. Try a different file format if possible.",
      "IMAGE_EXTRACTION_ERROR"
    );
  }
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 5, delay = 5000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.message?.includes("429"))) {
      // Add random jitter: delay * (0.5 to 1.5)
      const jitter = delay * (0.5 + Math.random());
      console.log(`Rate limited (429). Retrying in ${Math.round(jitter)}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, jitter));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Simple Queue with concurrency and velocity control
class TaskQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private lastRunTime = 0;
  private concurrency: number;
  private minDelay: number;

  constructor(concurrency: number, minDelay: number = 12000) {
    this.concurrency = concurrency;
    this.minDelay = minDelay;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (e) {
          reject(e);
        }
      });
      this.next();
    });
  }

  private next() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;

    // Check if we need to wait to satisfy the RPM limit
    const now = Date.now();
    const timeSinceLast = now - this.lastRunTime;
    if (timeSinceLast < this.minDelay) {
      setTimeout(() => this.next(), this.minDelay - timeSinceLast);
      return;
    }

    this.running++;
    this.lastRunTime = Date.now();
    const task = this.queue.shift();
    task!().finally(() => {
      this.running--;
      this.next();
    });
  }
}

// Instantiate with a concurrency limit of 2 and 12s delay (5 RPM)
const geminiQueue = new TaskQueue(2, 12000);

const MODELS = {
  PRIMARY: "gemini-3.1-pro-preview",
  FALLBACK: "gemini-3-flash-preview"
};

const PRO_TPM_THRESHOLD = 200000; // Leave 50k buffer for output/thinking

/**
 * Estimates the token count for a prompt without sending it to the generator.
 */
const getPromptTokenCount = async (contents: any, modelName: string): Promise<number> => {
  try {
    const ai = getAi();
    // Use the native SDK method
    const response = await ai.models.countTokens({
      model: modelName,
      contents: contents,
    });
    return response.totalTokens;
  } catch (error) {
    console.error("Token estimation failed, defaulting to character-based guess.");
    // Fallback: ~4 characters per token
    return JSON.stringify(contents).length / 4;
  }
};

/**
 * Enhanced generateContent with Token Guard and Model Fallback
 */
const generateWithTokenGuard = async (
  contents: any,
  systemInstruction?: string,
  responseMimeType?: string
) => {
  // 1. Estimate the "Cost"
  const tokenCount = await getPromptTokenCount(contents, MODELS.PRIMARY);
  
  let selectedModel = MODELS.PRIMARY;

  // 2. Logic: If too heavy, don't even try Pro
  if (tokenCount > PRO_TPM_THRESHOLD) {
    console.warn(`🚀 Prompt too large (${tokenCount} tokens). Bypassing Pro and using Flash.`);
    selectedModel = MODELS.FALLBACK;
  }

  return await withRetry(async () => {
    try {
      console.log(`Attempting generation with: ${selectedModel}`);
      
      const response = await getAi().models.generateContent({
        model: selectedModel,
        contents: contents,
        config: {
          systemInstruction,
          responseMimeType,
        },
      });

      return response;
    } catch (error: any) {
      // Check if it's a Quota Error (429)
      const isQuotaError = error.status === 429 || error.message?.includes("quota") || error.message?.includes("429");
      
      // If we hit a quota error on the Pro model, switch to Flash for the next retry
      if (isQuotaError && selectedModel === MODELS.PRIMARY) {
        console.warn("⚠️ Primary Model Quota Exhausted. Switching to Fallback (Flash)...");
        selectedModel = MODELS.FALLBACK;
        // Throwing the error again so withRetry catches it and triggers a fresh attempt
        throw error; 
      }
      
      throw error;
    }
  }, 3, 10000); // 3 retries, starting at 10s to clear the "minute" limit
};

export const generatePodcastAudio = async (
  script: PodcastSegment[], 
  language: PodcastLanguage = "English",
  onProgress?: (current: number, total: number) => void
): Promise<Blob | null> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  const voiceMap: Record<string, string> = {
    "Thabo": "Fenrir",
    "Lindiwe": "Kore"
  };

  try {
    const groupedSegments: PodcastSegment[] = [];
    for (const segment of script) {
      const last = groupedSegments[groupedSegments.length - 1];
      if (last && last.speaker === segment.speaker) {
        last.text += " " + segment.text;
      } else {
        groupedSegments.push({ ...segment });
      }
    }

    const totalSegments = groupedSegments.length;
    let completedSegments = 0;

    const results: { bytes: Uint8Array, speaker: string }[] = new Array(totalSegments);
    
    const processSegment = async (index: number) => {
      const segment = groupedSegments[index];
      const voiceName = voiceMap[segment.speaker] || "Fenrir";
      
      let pcmData: string | undefined;

      // Use the queue to manage execution
      pcmData = await geminiQueue.add(async () => {
        try {
          return await withRetry(async () => {
            const response = await getAi().models.generateContent({
              model,
              contents: [{ parts: [{ text: `Say the following in ${language} as ${segment.speaker}. IMPORTANT: The output MUST be in ${language}. If the text is in ${language}, read it naturally: ${segment.text}` }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                  },
                },
              },
            });
            return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          }, 5, 5000);
        } catch (e: any) {
          console.error(`Gemini TTS Error for ${segment.speaker}:`, e);
          const errorMessage = e.message || "";
          if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429")) {
            console.log(`Attempting OpenAI TTS fallback for ${segment.speaker}...`);
            try {
              const openAiVoiceMap: Record<string, string> = {
                "Thabo": "onyx",
                "Lindiwe": "shimmer"
              };
              const fallbackResponse = await fetch("/api/openai/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: segment.text,
                  voice: openAiVoiceMap[segment.speaker] || "alloy"
                }),
              });
              if (!fallbackResponse.ok) throw new Error("OpenAI TTS failed");
              const blob = await fallbackResponse.blob();
              const arrayBuffer = await blob.arrayBuffer();
              return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            } catch (fallbackError: any) {
              console.error("OpenAI Fallback Error:", fallbackError);
              throw new PodcastError(
                "Audio Generation Failed",
                "Both Gemini and OpenAI TTS services are currently unavailable or have reached their quota.",
                "Please try again in a few minutes or check your API key settings.",
                "TTS_SERVICE_UNAVAILABLE"
              );
            }
          }
          if (errorMessage.toLowerCase().includes("key")) {
            throw new PodcastError(
              "Invalid API Key",
              "The API key provided is invalid or has insufficient permissions.",
              "Please check your API key in the settings and ensure it is valid.",
              "INVALID_API_KEY"
            );
          }
          throw new PodcastError(
            "Audio Generation Failed",
            `An error occurred while generating audio for ${segment.speaker}: ${errorMessage}`,
            "Please try again or check the console for more details.",
            "TTS_GENERATION_FAILED"
          );
        }
      });
      
      if (pcmData) {
        const binaryString = atob(pcmData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        results[index] = { bytes, speaker: segment.speaker };
      }

      completedSegments++;
      if (onProgress) {
        onProgress(completedSegments, totalSegments);
      }
    };

    // Run all processes using the queue
    await Promise.all(groupedSegments.map((_, index) => processSegment(index)));

    const audioChunks = results.filter(r => r !== undefined);

    if (audioChunks.length === 0) {
      throw new PodcastError(
        "Audio Generation Failed",
        "The AI failed to produce any audio segments.",
        "This might be a temporary service issue. Try generating the podcast again.",
        "EMPTY_AUDIO"
      );
    }

    const totalLength = audioChunks.reduce((acc, curr) => acc + curr.bytes.length, 0);
    const combinedPcm = new Uint8Array(totalLength);
    let offset = 0;
    let sampleOffset = 0;
    const markers: { title: string; sampleOffset: number }[] = [];
    
    for (const chunk of audioChunks) {
      markers.push({ title: chunk.speaker, sampleOffset });
      combinedPcm.set(chunk.bytes, offset);
      offset += chunk.bytes.length;
      sampleOffset += chunk.bytes.length / 2;
    }

    // Convert combined PCM to base64 for enhanceAudio
    let binary = '';
    for (let i = 0; i < combinedPcm.length; i++) {
      binary += String.fromCharCode(combinedPcm[i]);
    }
    const finalBase64 = window.btoa(binary);

    return enhanceAudio(finalBase64, markers);
  } catch (e: any) {
    console.error("Failed to generate audio", e);
    if (e instanceof PodcastError) throw e;
    
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429")) {
      throw new PodcastError(
        "Audio Quota Exceeded",
        "The text-to-speech service has reached its limit for now.",
        "Please wait a few minutes before trying again, or use a shorter script.",
        "TTS_QUOTA_EXCEEDED"
      );
    }
    
    throw new PodcastError(
      "Audio Synthesis Error",
      errorMessage || "An error occurred while converting the script to audio.",
      "Try refreshing the page or generating a shorter podcast.",
      "GENERIC_AUDIO_ERROR"
    );
  }
};

export const generateSampleAudio = async (speaker: PodcastSpeaker, text: string, language: PodcastLanguage = "English"): Promise<Blob | null> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  const voiceMap: Record<string, string> = {
    "Thabo": "Fenrir",
    "Lindiwe": "Kore"
  };

  const voiceName = voiceMap[speaker] || "Fenrir";

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: `Say the following in ${language} as ${speaker} with a strong, authentic South African accent. If the text is in ${language}, read it naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return enhanceAudio(base64Audio);
    }
    return null;
  } catch (e: any) {
    console.error(`Failed to generate sample audio for ${speaker}`, e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      console.log(`Attempting OpenAI TTS fallback for sample audio (${speaker})...`);
      try {
        const openAiVoiceMap: Record<string, string> = {
          "Thabo": "onyx",
          "Lindiwe": "shimmer",
          "Dr. Thandi": "nova",
          "Dr. Thandi Mthembu": "nova",
          "JP BoerBot": "echo",
          "JP \"BoerBot\" van der Merwe": "echo",
          "Gogo Nomsa": "fable",
          "Prof. Dewald": "alloy"
        };
        const fallbackResponse = await fetch("/api/openai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: openAiVoiceMap[speaker] || "alloy"
          })
        });
        if (fallbackResponse.ok) {
          const blob = await fallbackResponse.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          
          // Resample to 24kHz mono to match enhanceAudio expectations
          const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * 24000), 24000);
          const source = offlineCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineCtx.destination);
          source.start();
          const resampledBuffer = await offlineCtx.startRendering();
          
          const channelData = resampledBuffer.getChannelData(0);
          const pcmData = new Int16Array(channelData.length);
          for (let i = 0; i < channelData.length; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          let binary = '';
          const bytes = new Uint8Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const finalBase64 = window.btoa(binary);
          return enhanceAudio(finalBase64);
        }
      } catch (fallbackError) {
        console.error("OpenAI TTS Fallback Error (Sample):", fallbackError);
      }
    }
    return null;
  }
};

export const generatePodcastSummary = async (script: PodcastSegment[], language: PodcastLanguage = "English"): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Based on the following podcast script, provide a very brief (1-2 sentence) summary or description in ${language} that would entice a listener.
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  `;

  try {
    const response = await generateWithTokenGuard(
      [{ parts: [{ text: prompt }] }],
      "You are a helpful podcast assistant."
    );

    return response.text || "A deep dive into agricultural insights.";
  } catch (e: any) {
    console.error("Failed to generate summary", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      // Try Grok fallback first
      try {
        const xaiResponse = await fetch("/api/xai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (xaiResponse.ok) {
          const data = await xaiResponse.json();
          return data.text || "A deep dive into agricultural insights.";
        }
      } catch (xaiError) {
        console.error("x.ai Fallback Error (Summary):", xaiError);
      }

      console.log("Attempting OpenAI fallback for summary...");
      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt })
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return data.text || "A deep dive into agricultural insights.";
        }
      } catch (fallbackError) {
        console.error("OpenAI Fallback Error (Summary):", fallbackError);
      }
    }
    return "A deep dive into agricultural insights.";
  }
};

export interface PodcastChapter {
  title: string;
  description: string;
}

export const generatePodcastChapters = async (script: PodcastSegment[], language: PodcastLanguage = "English"): Promise<PodcastChapter[]> => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Based on the following podcast script, identify 3-4 key "chapters" or segments. For each, provide a short title and a brief description in ${language} of what is discussed in that part.
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  
  Return a JSON array of objects with "title" and "description" fields.`;

  try {
    const response = await generateWithTokenGuard(
      [{ parts: [{ text: prompt }] }],
      "You are a helpful podcast assistant.",
      "application/json"
    );

    return parseJson(response.text || "[]");
  } catch (e: any) {
    console.error("Failed to generate chapters", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      // Try Grok fallback first
      try {
        const xaiResponse = await fetch("/api/xai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (xaiResponse.ok) {
          const data = await xaiResponse.json();
          return parseJson(data.text || "[]");
        }
      } catch (xaiError) {
        console.error("x.ai Fallback Error (Chapters):", xaiError);
      }

      console.log("Attempting OpenAI fallback for chapters...");
      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return parseJson(data.text || "[]");
        }
      } catch (fallbackError) {
        console.error("OpenAI Fallback Error (Chapters):", fallbackError);
      }
    }
    return [];
  }
};

export const generateShowNotes = async (script: PodcastSegment[], chapters: PodcastChapter[], language: PodcastLanguage = "English"): Promise<string> => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Generate detailed show notes for a podcast episode in ${language} based on the following script and chapters.
  
  The show notes should include:
  1. A catchy episode title in ${language}.
  2. A detailed overview of the discussion in ${language}, highlighting the fun and informative deep dive.
  3. Key takeaways (bullet points) in ${language}.
  4. Mention of the Harvest Unpacked experts involved and a shoutout to the Harvest SA magazine readership.
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  
  Chapters:
  ${chapters.map(c => `- ${c.title}: ${c.description}`).join("\n")}
  
  Format the output in clean Markdown. Do NOT include triple backticks around the markdown itself.`;

  try {
    const response = await generateWithTokenGuard(
      [{ parts: [{ text: prompt }] }],
      "You are a helpful podcast assistant."
    );

    return response.text || "Show notes are being prepared.";
  } catch (e: any) {
    console.error("Failed to generate show notes", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      // Try Grok fallback first
      try {
        const xaiResponse = await fetch("/api/xai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (xaiResponse.ok) {
          const data = await xaiResponse.json();
          return data.text || "Failed to generate show notes.";
        }
      } catch (xaiError) {
        console.error("x.ai Fallback Error (Show Notes):", xaiError);
      }

      console.log("Attempting OpenAI fallback for show notes...");
      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt })
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          return data.text || "Show notes are being prepared.";
        }
      } catch (fallbackError) {
        console.error("OpenAI Fallback Error (Show Notes):", fallbackError);
      }
    }
    return "Failed to generate show notes.";
  }
};

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const generateGlossary = async (script: PodcastSegment[], language: PodcastLanguage = "English"): Promise<GlossaryTerm[]> => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Identify any technical agricultural terms, jargon, or complex concepts used in the following podcast script.
  Create a glossary that defines these terms in simple, easy-to-understand language.
  The glossary MUST be in ${language}.
  
  Return the output strictly as a JSON array of objects, where each object has a "term" and a "definition" property.
  Do NOT wrap the JSON in markdown code blocks. Just return the raw JSON array.
  If there are no technical terms, return an empty array [].
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  `;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "[]";
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse glossary JSON", parseError);
      return [];
    }
  } catch (e: any) {
    console.error("Failed to generate glossary", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      // Try Grok fallback first
      try {
        const xaiResponse = await fetch("/api/xai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (xaiResponse.ok) {
          const data = await xaiResponse.json();
          if (data.text) {
             try {
               const parsed = JSON.parse(data.text);
               if (Array.isArray(parsed)) return parsed;
               if (parsed.glossary && Array.isArray(parsed.glossary)) return parsed.glossary;
               if (parsed.terms && Array.isArray(parsed.terms)) return parsed.terms;
             } catch (e) {
               console.error("Failed to parse Grok glossary JSON", e);
             }
          }
        }
      } catch (xaiError) {
        console.error("x.ai Fallback Error (Glossary):", xaiError);
      }

      console.log("Attempting OpenAI fallback for glossary...");
      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          // OpenAI might return it wrapped in an object if we used json_object
          if (data.text) {
             try {
               const parsed = JSON.parse(data.text);
               if (Array.isArray(parsed)) return parsed;
               if (parsed.glossary && Array.isArray(parsed.glossary)) return parsed.glossary;
               if (parsed.terms && Array.isArray(parsed.terms)) return parsed.terms;
             } catch (e) {
               return [];
             }
          }
        }
      } catch (fallbackError) {
        console.error("OpenAI Fallback Error (Glossary):", fallbackError);
      }
    }
    return [];
  }
};

export const aiSearchPodcasts = async (query: string, podcasts: { id: string, title: string, description: string }[]): Promise<string[]> => {
  if (podcasts.length === 0 || !query.trim()) return [];
  
  const model = "gemini-3.1-pro-preview";
  const prompt = `You are an AI search assistant. A user is searching for podcasts with the query: "${query}".
  
  Here is the list of available podcasts:
  ${JSON.stringify(podcasts, null, 2)}
  
  Analyze the user's natural language query and the podcast titles and descriptions. Find the podcasts that best match the query conceptually, not just by exact keyword.
  Return a JSON array of strings containing ONLY the IDs of the matching podcasts. If none match, return an empty array [].`;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = parseJson(response.text || "[]");
    return Array.isArray(result) ? result : [];
  } catch (e: any) {
    console.error("AI Search Error:", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      // Try Grok fallback first
      try {
        const xaiResponse = await fetch("/api/xai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (xaiResponse.ok) {
          const data = await xaiResponse.json();
          const result = parseJson(data.text || "[]");
          return Array.isArray(result) ? result : [];
        }
      } catch (xaiError) {
        console.error("x.ai Fallback Error (AI Search):", xaiError);
      }

      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const result = parseJson(data.text || "[]");
          return Array.isArray(result) ? result : [];
        }
      } catch (fallbackError) {
        console.error("OpenAI Fallback Error (AI Search):", fallbackError);
      }
    }
    // Fallback to basic text search if AI fails
    return podcasts
      .filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase()))
      .map(p => p.id);
  }
};

export const generateMetadata = async (script: PodcastSegment[], language: PodcastLanguage = "English"): Promise<{ keywords: string[], topics: string[] }> => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `Based on the following podcast script, generate a list of 5-8 relevant keywords and 2-4 main topics discussed.
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  
  Return a JSON object with "keywords" (array of strings) and "topics" (array of strings).`;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = parseJson(response.text || "{}");
    return {
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      topics: Array.isArray(result.topics) ? result.topics : []
    };
  } catch (e: any) {
    console.error("Failed to generate metadata", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      // Try Grok fallback first
      try {
        const xaiResponse = await fetch("/api/xai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (xaiResponse.ok) {
          const data = await xaiResponse.json();
          const result = parseJson(data.text || "{}");
          return {
            keywords: Array.isArray(result.keywords) ? result.keywords : [],
            topics: Array.isArray(result.topics) ? result.topics : []
          };
        }
      } catch (xaiError) {
        console.error("x.ai Fallback Error (Metadata):", xaiError);
      }

      // Fallback to OpenAI if Gemini and Grok fail
      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, responseFormat: "json_object" })
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const result = parseJson(data.text || "{}");
          return {
            keywords: Array.isArray(result.keywords) ? result.keywords : [],
            topics: Array.isArray(result.topics) ? result.topics : []
          };
        }
      } catch (fallbackError) {
        console.error("OpenAI Fallback Error (Metadata):", fallbackError);
      }
    }
    return { keywords: [], topics: [] };
  }
};

export const generatePodcastCover = async (title: string, topics: string[], inputImage?: string): Promise<string | null> => {
  const model = "gemini-2.5-flash-image";
  const prompt = `A professional, high-quality podcast cover art for a show titled "Harvest Unpacked". 
  The episode title is "${title}". 
  Topics discussed: ${topics.join(", ")}.
  Style: Modern, agricultural, vibrant, cinematic photography or clean graphic design. 
  ${inputImage ? "Use the provided image as a visual reference for the theme and color palette." : ""}
  No text other than "Harvest Unpacked" if necessary, but focus on visual metaphors for agriculture and innovation.
  High resolution, 1:1 aspect ratio.`;

  try {
    const contents: any = {
      parts: [
        { text: prompt }
      ]
    };

    if (inputImage) {
      contents.parts.push({
        inlineData: {
          data: inputImage,
          mimeType: "image/jpeg" // Assuming jpeg for simplicity, could be dynamic
        }
      });
    }

    const response = await getAi().models.generateContent({
      model,
      contents: [contents],
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to generate podcast cover", e);
    return null;
  }
};
