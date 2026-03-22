import { GoogleGenAI, Modality } from "@google/genai";
import { pcmToWav, enhanceAudio } from "../utils/audioUtils";

const getAi = () => {
  // Prioritize the user-selected API key if available
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
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

export type PodcastLanguage = "English" | "Afrikaans" | "isiZulu" | "isiXhosa" | "Sesotho" | "Setswana";

export const generatePodcastScript = async (
  articleText: string, 
  language: PodcastLanguage = "English",
  selectedCharacters: PodcastSpeaker[] = ["Thabo", "Lindiwe"]
): Promise<PodcastSegment[]> => {
  const model = "gemini-3.1-flash-lite-preview";
  
  const characterDetails = AVAILABLE_CHARACTERS
    .filter(c => selectedCharacters.includes(c.id))
    .map((c, i) => `${i + 1}. ${c.name}: ${c.description}`)
    .join("\n    ");

  const systemInstruction = `
    You are a scriptwriter for "Harvest Unpacked DeepDive AI Podcasts", a popular, highly entertaining talkshow podcast for the readership of Harvest SA magazine.
    Your task is to create a realistic, incredibly fun, engaging, and highly educational deep dive conversation between EXACTLY the 2 characters provided below.
    The readership of Harvest SA magazine needs to absolutely love this—it should feel like the best talkshow podcast ever!
    
    CRITICAL GOAL: The deep dive MUST deal directly with the content of the uploaded Harvest SA article. The talkshow needs to PROMOTE the content of the article, making the reader understand what it's about in a highly informative and entertaining way. We want the listeners to absolutely fall in love with the presenters! Make them charismatic, witty, passionate, and incredibly lovable.

    DO NOT use any other characters. ONLY use:
    \${selectedCharacters.join(", ")}

    LANGUAGE & SLANG: The podcast MUST be generated in \${language}. 
    - If the language is not English, translate the core concepts and discussion naturally into \${language}.
    - IMPORTANT: Ensure the output is strictly in \${language}. Do not mix with English unless it's a proper noun or technical term that is commonly used in \${language}.
    - Characters should still maintain their unique personalities and cultural backgrounds, but speak in \${language}.
    - INTEGRATE AUTHENTIC SOUTH AFRICAN SLANG: Use local idioms, colloquialisms, and slang contextually and naturally to enhance the local flavor and connection with the audience. Do not force it, but ensure it feels like a genuine South African conversation (e.g., using words like 'lekker', 'howzit', 'eish', 'yoh', 'now-now', 'shame', 'sharp sharp', 'boet', 'bru' where appropriate).

    Core Objectives:
    1. Hook the Audience & Promote the Article: Start the podcast with a fun, high-energy, and catchy intro that hooks the Harvest SA magazine readership immediately. Enthusiastically introduce the specific article being discussed today.
    2. Lovable Presenters: Make the banter between the two presenters so charming, funny, and warm that the audience falls in love with them. Their chemistry should be electric.
    3. Fun & Informative Deep Dive: The 2 chosen characters should have a natural, highly entertaining, back-and-forth deep dive discussion about the supplied material's contents. They must clearly explain what the article is about.
    4. Detailed & Accessible Explanation: Break down complex agricultural concepts from the article into simple, understandable, and relatable terms.
    5. Practical Application: Discuss how a farmer can actually use the information from the material in their daily operations, keeping it practical but lively.
    6. Magazine Shoutout: Enthusiastically mention Harvest SA magazine, praise the author/content of the article, and encourage listeners to go read the full piece.
    7. Duration: Aim for ~600-800 words to ensure a substantial, engaging podcast duration.

    The Team (Use ONLY these 2):
    \${characterDetails}

    Tone:
    - Extremely fun, entertaining, and informative.
    - Charismatic, lovable, and warm.
    - Authentic and culturally resonant for \${language}.
    - High energy, like a top-tier radio talkshow.
    - Realistic, witty banter that Harvest SA readers will love.

    Output Format:
    Return a JSON array of objects with "speaker" and "text" fields.
  `;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: `Article Content: \${articleText}\n\nGenerate a highly entertaining, fun, and informative deep dive podcast script (~600-800 words) in \${language} with EXACTLY these 2 characters: \${selectedCharacters.join(", ")}.` }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const script = parseJson(response.text || "[]");
    if (!Array.isArray(script) || script.length === 0) {
      throw new Error("The AI generated an empty or invalid script. Please try again.");
    }
    return script;
  } catch (e: any) {
    console.error("Gemini Script Generation Error:", e);
    
    // Fallback to OpenAI if Gemini fails (e.g. quota exceeded)
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
      console.log("Attempting OpenAI fallback for script generation...");
      try {
        const fallbackResponse = await fetch("/api/openai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Article Content: \${articleText}\n\nGenerate a highly entertaining, fun, and informative deep dive podcast script (~600-800 words) in \${language} with EXACTLY these 2 characters: \${selectedCharacters.join(", ")}.`,
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
            throw new Error("Gemini quota exceeded and OpenAI fallback is not configured. Please add your OPENAI_API_KEY to the Secrets panel.");
          }
        }
      } catch (fallbackError: any) {
        console.error("OpenAI Fallback Error:", fallbackError);
        if (fallbackError.message?.includes("OPENAI_API_KEY")) throw fallbackError;
      }
    }

    if (e instanceof Error) {
      if (e.message.includes("safety")) {
        throw new Error("The content was flagged by safety filters. Please try a different article.");
      }
      throw e;
    }
    throw new Error("Failed to generate the podcast script. Please check your connection and try again.");
  }
};

export const extractTextFromImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const model = "gemini-3.1-flash-lite-preview";
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
  } catch (e) {
    console.error("Image Extraction Error:", e);
    throw new Error("Failed to extract text from the image. Please ensure the image is clear and contains readable text.");
  }
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.message?.includes("429"))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const generatePodcastAudio = async (script: PodcastSegment[], language: PodcastLanguage = "English"): Promise<Blob | null> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  const voiceMap: Record<string, string> = {
    "Thabo": "Fenrir",
    "Lindiwe": "Kore",
    "Dr. Thandi": "Puck",
    "Dr. Thandi Mthembu": "Puck",
    "JP BoerBot": "Zephyr",
    "JP \"BoerBot\" van der Merwe": "Zephyr",
    "Gogo Nomsa": "Kore",
    "Prof. Dewald": "Charon"
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

    const audioChunks: { bytes: Uint8Array, speaker: string }[] = [];

    for (const segment of groupedSegments) {
      const voiceName = voiceMap[segment.speaker] || "Fenrir";
      
      let pcmData: string | undefined;
      try {
        pcmData = await withRetry(async () => {
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
        });
      } catch (e: any) {
        console.error(`Gemini TTS Error for ${segment.speaker}:`, e);
        const errorMessage = e.message || "";
        if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
          console.log(`Attempting OpenAI TTS fallback for ${segment.speaker}...`);
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
                text: segment.text,
                voice: openAiVoiceMap[segment.speaker] || "alloy"
              }),
            });
            if (!fallbackResponse.ok) throw new Error("OpenAI TTS failed");
            const blob = await fallbackResponse.blob();
            const arrayBuffer = await blob.arrayBuffer();
            pcmData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          } catch (fallbackError: any) {
            console.error("OpenAI Fallback Error:", fallbackError);
            if (fallbackError.message?.includes("OPENAI_API_KEY")) throw fallbackError;
          }
        }
      }
      
      if (pcmData) {
        // Convert base64 to Uint8Array
        const binaryString = atob(pcmData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioChunks.push({ bytes, speaker: segment.speaker });
      }
    }

    if (audioChunks.length === 0) {
      throw new Error("The AI failed to generate any audio data.");
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
    if (e instanceof Error) {
      if (e.message.includes("quota")) {
        throw new Error("AI quota exceeded. Please wait a moment and try again.");
      }
      throw e;
    }
    throw new Error("Failed to generate the podcast audio. Please check your connection and try again.");
  }
};

export const generateSampleAudio = async (speaker: PodcastSpeaker, text: string, language: PodcastLanguage = "English"): Promise<Blob | null> => {
  const model = "gemini-2.5-flash-preview-tts";
  
  const voiceMap: Record<string, string> = {
    "Thabo": "Fenrir",
    "Lindiwe": "Kore",
    "Dr. Thandi": "Puck",
    "Dr. Thandi Mthembu": "Puck",
    "JP BoerBot": "Zephyr",
    "JP \"BoerBot\" van der Merwe": "Zephyr",
    "Gogo Nomsa": "Kore",
    "Prof. Dewald": "Charon"
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
  const model = "gemini-3.1-flash-lite-preview";
  const prompt = `Based on the following podcast script, provide a very brief (1-2 sentence) summary or description in ${language} that would entice a listener.
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  `;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "A deep dive into agricultural insights.";
  } catch (e: any) {
    console.error("Failed to generate summary", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
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
  const model = "gemini-3.1-flash-lite-preview";
  const prompt = `Based on the following podcast script, identify 3-4 key "chapters" or segments. For each, provide a short title and a brief description in ${language} of what is discussed in that part.
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  
  Return a JSON array of objects with "title" and "description" fields.`;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    return parseJson(response.text || "[]");
  } catch (e: any) {
    console.error("Failed to generate chapters", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
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
  const model = "gemini-3.1-flash-lite-preview";
  const prompt = `Generate detailed show notes for a podcast episode in \${language} based on the following script and chapters.
  
  The show notes should include:
  1. A catchy episode title in \${language}.
  2. A detailed overview of the discussion in \${language}, highlighting the fun and informative deep dive.
  3. Key takeaways (bullet points) in \${language}.
  4. Mention of the Harvest Unpacked experts involved and a shoutout to the Harvest SA magazine readership.
  
  Script:
  ${script.map(s => `${s.speaker}: ${s.text}`).join("\n")}
  
  Chapters:
  ${chapters.map(c => `- ${c.title}: ${c.description}`).join("\n")}
  
  Format the output in clean Markdown. Do NOT include triple backticks around the markdown itself.`;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "Show notes are being prepared.";
  } catch (e: any) {
    console.error("Failed to generate show notes", e);
    const errorMessage = e.message || "";
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("key")) {
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
  const model = "gemini-3.1-flash-lite-preview";
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
  
  const model = "gemini-3.1-flash-lite-preview";
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
  const model = "gemini-3.1-flash-lite-preview";
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
