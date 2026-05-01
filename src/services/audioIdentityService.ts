import { GoogleGenAI, Modality } from "@google/genai";
import { withRetry } from "../utils/aiUtils";
import { Host } from "../constants";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
});

function getAi(apiKey?: string) {
  if (apiKey) {
    return new GoogleGenAI({ 
      apiKey,
    });
  }
  return ai;
}

export const generateIntroMusic = async (apiKey?: string): Promise<string | null> => {
  try {
    const currentAi = getAi(apiKey);
    const response = await withRetry(() => currentAi.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Create a premium podcast intro track for a South African professional insights show called "DigiMag Podcasts".
...
Audio Style:
Ambient, modern, with subtle African rhythm elements and high-end professional polish.
...
Mood:
Sophisticated, intelligent, grounded, and inspiring.
...
Tempo:
100–110 BPM
...
Structure:
0:00–0:05 → Ambient atmospheric sounds + soft professional pads
0:05–0:10 → Light percussion enters
0:10–0:15 → Melody becomes clear, refined and memorable
0:15–0:20 → Slight drop to allow for voiceover
...
Rules:
- No vocals
- No EDM or heavy electronic drops
- Must sound like a world-class professional podcast intro
- Clean, sophisticated, not cluttered`,
    }));

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (e: any) {
    if (e?.status === 403 || e?.message?.includes('403') || e?.message?.includes('Permission Denied')) {
      console.warn("Lyria model access denied. Falling back to default audio. (Custom API key may be required)");
    } else if (e?.status === 500 || e?.message?.includes('500') || e?.message?.includes('xhr error') || e?.message?.includes('UNKNOWN')) {
      console.warn("Lyria model is currently unavailable on the default platform key. Falling back to default audio.");
    } else {
      console.warn("Failed to generate intro music, falling back to default.", e.message || e);
    }
    return null;
  }
};

export const generateIntroVoiceover = async (script?: string, apiKey?: string, host1?: Host): Promise<string | null> => {
  const currentAi = getAi(apiKey);
  const text = script || `Welcome to DigiMag Podcasts… your source for professional South African insights… with ${host1?.name || 'the team'}.`;
  const response = await withRetry(() => currentAi.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: host1?.defaultVoice || 'Kore' },
        },
      },
    },
  }));

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
};

export const generateSting = async (apiKey?: string): Promise<string | null> => {
  try {
    const currentAi = getAi(apiKey);
    const response = await withRetry(() => currentAi.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Create a short 5-second audio singer for a South African professional podcast.
...
Include:
- Light percussive tap or refined professional sound
- Brief melodic tone from the main theme
- Clean, modern, sophisticated finish
...
Mood:
Professional, quick, recognisable
...
Purpose:
Segment transitions
...
No vocals.`,
    }));

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (e: any) {
    if (e?.status === 403 || e?.message?.includes('403') || e?.message?.includes('Permission Denied')) {
      console.warn("Lyria model access denied. Falling back to default audio. (Custom API key may be required)");
    } else if (e?.status === 500 || e?.message?.includes('500') || e?.message?.includes('xhr error') || e?.message?.includes('UNKNOWN')) {
      console.warn("Lyria model is currently unavailable on the default platform key. Falling back to default audio.");
    } else {
      console.warn("Failed to generate sting, falling back to default.", e.message || e);
    }
    return null;
  }
};

export const generateOutroMusic = async (apiKey?: string): Promise<string | null> => {
  try {
    const currentAi = getAi(apiKey);
    const response = await withRetry(() => currentAi.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Create a 15-second outro track matching the "DigiMag Podcasts" intro theme.
...
Style:
Same instruments and mood, but more relaxed and resolved.
...
Mood:
Closing, reflective, optimistic
...
End with a soft fade-out.`,
    }));

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (e: any) {
    if (e?.status === 403 || e?.message?.includes('403') || e?.message?.includes('Permission Denied')) {
      console.warn("Lyria model access denied. Falling back to default audio. (Custom API key may be required)");
    } else if (e?.status === 500 || e?.message?.includes('500') || e?.message?.includes('xhr error') || e?.message?.includes('UNKNOWN')) {
      console.warn("Lyria model is currently unavailable on the default platform key. Falling back to default audio.");
    } else {
      console.warn("Failed to generate outro music, falling back to default.", e.message || e);
    }
    return null;
  }
};

export const generateOutroVoiceover = async (apiKey?: string, host1?: Host, host2?: Host): Promise<string | null> => {
  const currentAi = getAi(apiKey);
  const h1Name = host1?.name || 'Belininda Strydom';
  const h2Name = host2?.name || 'Peter Johnson';
  const h1Voice = host1?.defaultVoice || 'Kore';
  const h2Voice = host2?.defaultVoice || 'Puck';

  const prompt = `TTS the following conversation between ${h1Name} and ${h2Name}:
      ${h1Name}: That’s it for this edition of DigiMag Podcasts… tap ‘Join the Conversation’ and ask us anything about this issue.
      ${h2Name}: We’re here to provide the insights you need.`;

  const response = await withRetry(() => currentAi.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: h1Name,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: h1Voice }
              }
            },
            {
              speaker: h2Name,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: h2Voice }
              }
            }
          ]
        }
      }
    }
  }));

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
};
