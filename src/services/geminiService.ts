import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";
import { pcmToWav } from "../utils/audioUtils";
import { withRetry } from "../utils/aiUtils";
import { HOSTS, Host, VOICES, LANGUAGES } from "../constants";
import { PodcastError } from "../types";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

/**
 * Helper function to get the AI instance with a specific API key if provided.
 */
function getAi(apiKey?: string) {
  if (apiKey) {
    return new GoogleGenAI({
      apiKey,
    });
  }
  return ai;
}

/**
 * Helper function to execute Gemini API calls with exponential backoff retry logic.
 * Moved to shared utility, keeping this for backward compatibility if needed within file.
 */
// export async function withRetry... (can be removed if no longer used internally)

export interface PodcastSegment {
  speaker: string;
  text: string;
  ssml?: string;
  timestamp?: string;
}

export const generatePodcastScript = async (
  articleText: string,
  language: string = "en",
  host1: Host = HOSTS[0],
  host2: Host = HOSTS[1],
  apiKey?: string,
  format: "standard" | "impact" | "unpacked" | "combined" = "standard",
): Promise<PodcastSegment[]> => {
  const model = "gemini-1.5-flash";
  const currentAi = getAi(apiKey);

  const languageName =
    LANGUAGES[language as keyof typeof LANGUAGES] || language;

  const standardInstruction = `
    You are an experienced, award-winning podcast scriptwriter specializing in the "Deep Dive" investigative podcast format. Your goal is to transform complex text into a living, breathing conversation between two smart, relatable hosts. The show is named "DigiMag Podcasts: Deep Dive".

    Transform the article below into a dynamic two-host conversational script between:

    1. ${host1.name}: The Lead Narrator. Sophisticated, articulate, and excellent at framing big-picture questions. She sets the stage and keeps the energy high. Her role is to anchor the conversation and ensure the listener feels guided through the "journey" of the topic.
    2. ${host2.name}: The Curious Analyst. Deeply knowledgeable but translates everything into human terms. He acts as the "interpreter" of complex data. He uses phrases like "Exactly," "Here's the wild part," and "Think of it this way."

    Core Narrative Objectives (NotebookLM "Human-Parity" Style):
    1. THE HOOK: Start with a "Wow" moment or a counter-intuitive observation from the text. Make the listener feel like they're about to hear a secret.
    2. INTELLECTUAL CHEMISTRY: The hosts MUST NOT just take turns reading facts. They must react to each other with genuine intellectual chemistry. Use phrases like "(laughs) Wait, really?", "No kidding?", "That's actually kind of terrifying," or "I never thought of it that way."
    3. SEAMLESS TURN-TAKING: Write dialogue that feels like real banter. One host might finish the other's sentence or jump in with an "And that's the point right there—"
    4. SIMPLIFICATION VIA ANALOGY: Use metaphors and analogies to explain complex technical or business concepts. 
    5. THE "LIGHTBULB" MOMENT: At some point, the hosts should realize the massive, world-changing implication of what they're discussing.
    6. AUDIO TEXTURE: Incorporate micro-pauses (...) and emphasis (ALL CAPS) for key terms. Use natural-sounding conversational fillers where they fit logically.

    Tone: Intellectual chemistry, curious, rhythmic, slightly irreverent, and profoundly relevant.
    - RESPOND IN: ${languageName}.
    
    ENGAGEMENT PATTERNS:
    1. Host A asks a question; Host B answers with a "hook" before the data.
    2. Host B interrupts Host A naturally with a "Wait, let me jump in there—this part is critical."
    3. Both hosts should summarize a section with a "So, the takeaway here is..." mid-episode.
    
    Episode requirements (8-12 minutes, ~1200 words total):
    1. OPENING: High-energy intro. "I'm ${host1.name}, and today we're peeling back the layers on something that... well, it sounds like science fiction but it's actually happening right now."
    2. ANALYSIS: 4-6 distinct "chapters" of the article, treated as a journey of discovery.
    3. THE "IMPLICATION": A specific section focusing on the "Why this matters" for the listener's future.
    4. WRAP-UP: A final, reflective thought. End on a high note.
`;

  const impactInstruction = `
    You are creating a professional, world-class AI podcast segment for a show called "DigiMag Podcasts".
    This is a "DigiMag Impact" audio overview designed to follow Audio-First Awareness.

    FORMAT:
    Two characters having a sophisticated, intelligent, and highly engaging conversation:
    - ${host1.name} (Host: drives the structure, maintains pacing, asks clarifying questions)
    - ${host2.name} (Expert: provides dense information in accessible language)

    TONE & LANGUAGE:
    - POLISHED AND ENGAGING. Implement engagement patterns: restate the topic, build suspense, insert conversational hooks.
    - RESPOND IN: ${languageName}.
    
    AUDIO-FIRST RULES:
    1. Verbally describe any visual references.
    2. Break up complex, multi-clause sentences into shorter, punchier statements.
    3. Utilize contractions and casual language.
    4. Strip out artificial filler words such as "um", "uh", or "basically" - do not use them.
    5. DO NOT read rigid lists or bullet points: convert them into narrative dialogue.

    OBJECTIVE:
    Turn the provided article into a compelling discussion that clearly explains the strategic value of the content. Ensure you enthusiastically promote any companies and products mentioned.

    STRUCTURE:
    1. OPENING: Host introduces the brand and frames the opportunity. Mention the latest insights as the critical moment for strategic decision-making.
    2. CONTEXT SETUP: Briefly explain the subject matter. Position them within the professional industry landscape.
    3. CORE DISCUSSION: The Analyst must break down why this is a critical moment for strategic growth. Highlight the massive impact.
    4. STRATEGIC ADVANTAGE: Explain the unique professional relevance of the content.
    5. EDITORIAL VS ADVERTISING: Explain why high-level editorial is powerful.
    6. MULTI-CHANNEL IMPACT: Mention Audio and AI engagement.
    7. STRATEGIC SUMMARY: Analyst summarizes why this is a smart strategic move.
    8. STRONG CLOSE: Host wraps up with a confident recommendation tone and refined call to action.

    STYLE GUIDELINES:
    - Sound like a highly strategic but immensely engaging discussion.
    - Use real-world business logic.
    - Keep it professional and world-class.
    - No bullet points — natural spoken dialogue only.
    - Duration: 1–2 minutes max (approx. 200-300 words).
  `;

  const unpackedInstruction = `
    You are creating an episode of “DigiMag Unpacked: Professional AI Insights” by DigiMag Media.
    This is a premium South African professional podcast that unpacks corporate innovations, industry trends, and strategic success through intelligent, natural conversation.

    FORMAT:
    - Two speakers:
      1. ${host1.name}
      2. ${host2.name}
    - Professional back-and-forth dialogue.
    - Sounds like a high-end, world-class podcast.

    TONE & LANGUAGE (CRITICAL):
    - POLISHED, INTELLECTUAL, AND ENGAGING. The hosts should sound like experienced professionals with natural chemistry. Use sophisticated reactions, smooth interruptions, and refined banter.
    - Maintain a high-end broadcasting standard.
    - RESPOND IN: ${languageName}.
    - Use clear, articulate South African English.

    HYPER-REALISTIC SPEECH RULES:
    1. Use professional fillers and natural breathing pauses.
    2. Write natural, flowing dialogue that reflects real high-level interviews.
    3. Include refined self-corrections or thoughtful pauses.
    4. Have the hosts build on each other's points naturally.
    5. CRITICAL REQUIREMENT: You MUST include at least two instances where ${host1.name} builds on ${host2.name}'s point with a sophisticated "Wait—" or "That actually brings up—" moment.
    6. The dialogue MUST sound sophisticated and world-class.

    STRUCTURE:
    1. Hook: Catchy but professional opening.
    2. Introduction of topic/innovator. Highlight them with professional excellence.
    3. Deep dive into: Innovations, Strategic advantages, and Industry impact.
    4. Real-world value: Economic impact and professional growth.
    5. Strategic summary: Why this matters now.
    6. Professional close: Highly complementary and refined.

    STYLE RULES:
    - Use professional broadcast language.
    - Include insightful reactions: “That’s a critical distinction…”, “Looking at the broader landscape…”, “From a strategic perspective…”.
    - Break down complex themes with professional clarity.
    - Maintain a tone of professional enthusiasm throughout.

    STRICT RULES:
    - ONLY use the provided content.
    - Do NOT invent facts.
    - Keep it authentic and highly professional.
    - LENGTH: 60-90 seconds (approx. 150–200 words total).

    GOAL:
    Create a highly professional, intelligent, and engaging discussion that positions the subject as a leader in their field.

    END WITH A SIGNATURE CLOSING LINE:
    Choose one:
    - “A masterclass in professional excellence and innovation.”
    - “That is why they remain a key player in South Africa’s professional landscape.”
    - “A compelling look at where the industry is headed.”
    - “Insightful, strategic, and profoundly relevant.”
  `;

  const combinedInstruction = `
    You are creating an episode of “DigiMag Podcasts: The Pulse of Print, Resonating in Audio”.
    This is a premium South African professional podcast that combines conversational deep dives with industry highlights, unpacking companies, innovations, and economic trends through intelligent, polished, and authentic conversation.

    FORMAT:
    - Two speakers:
      1. ${host1.name} (Host: ${host1.description})
      2. ${host2.name} (Analyst: ${host2.description})
    - Professional conversational back-and-forth.
    - Sounds like a top-tier professional podcast.

    TONE & LANGUAGE (CRITICAL):
    - RESPOND IN: ${languageName}. Use professional, sophisticated language with natural South African cadences.
    - Intellectual, credible, and articulate.
    - Professional but engagingly human.
    - Sharp, world-class dialogue between seasoned presenters.
    - Proudly South African but globally relevant.
    - Avoid over-the-top hype — focus on real value and strategic insight.

    HYPER-REALISTIC SPEECH RULES:
    1. Use natural professional fillers and breathing pauses.
    2. Write fluid dialogue that reflects high-end broadcasting.
    3. Include thoughtful self-corrections or reflective pauses.
    4. Have the hosts build on each other's insights naturally with "That is a fascinating angle—" or "Indeed, and if you consider—".
    5. CRITICAL REQUIREMENT: You MUST include at least two instances of high-level conversational building between ${host1.name} and ${host2.name} that highlights their deep professional chemistry.
    6. The dialogue MUST sound incredibly polished and world-class.

    STRUCTURE:
    1. Hook: Sophisticated opening that frames the discussion.
    2. Introduction of topic/brand.
    3. Deep dive: Strategic advantages, Innovation, and Economic context.
    4. Real-world impact: Industry transformation and professional growth.
    5. Strategic summary: The "Why Now" factor.
    6. Refined close: Professional and complementary.

    STYLE RULES:
    - Use polished broadcast language.
    - Include high-level reactions: “Precisely…”, “The data actually suggests…”, “That is where the real disruption is happening…”.
    - Distill complex ideas into strategic clarity.
    - Position the subject as a professional leader.

    STRICT RULES:
    - ONLY use the provided content.
    - Do NOT invent facts.
    - Maintain a world-class professional standard.
    - LENGTH: 3-5 minutes (approx. 450-700 words total).

    GOAL:
    Create a world-class, intelligent discussion that positions the featured subject as a strategic leader — delivering profound insight in a sophisticated South African style.

    END WITH A SIGNATURE CLOSING LINE:
    Choose one:
    - “An essential perspective on today’s professional landscape.”
    - “That highlights the standard of excellence we’re seeing in the industry.”
    - “Proving once again why strategic innovation is the key to growth.”
    - “A compelling look at the leaders shaping our future.”

    Language: ${languageName}.
    Brand: DigiMag Podcasts.
  `;

  const systemInstruction = `
    ${format === "impact" ? impactInstruction : format === "unpacked" ? unpackedInstruction : format === "combined" ? combinedInstruction : standardInstruction}
    
    Output Format:
    Return a JSON array of objects. Each object MUST include:
    - "speaker": The name of the host
    - "text": Spoken line (conversational, 1-2 sentences max)
    - "ssml": SSML with <break time='500ms'/> for natural pauses
    - "timestamp": "MM:SS (cumulative from start)"
  `;

  const isUrl = articleText.startsWith("http");
  let contents: any[] = [];

  if (isUrl) {
    contents = [
      {
        parts: [
          {
            text: `Summarize and generate a podcast script for this article: ${articleText}. Generate a 3-5 minute discussion in ${languageName}.`,
          },
        ],
      },
    ];
  } else {
    contents = [
      {
        parts: [
          {
            text: `Article Content: ${articleText}\n\nGenerate a podcast script for a 3-5 minute discussion in ${languageName}.`,
          },
        ],
      },
    ];
  }

  return await withRetry(async () => {
    const response = await currentAi.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        // @ts-ignore
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    try {
      let rawText = response.text || "[]";
      // Remove think blocks if any
      rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, "");
      rawText = rawText.replace(/```json\n?|```/g, "").trim();
      return JSON.parse(rawText);
    } catch (e: any) {
      console.error("Failed to parse script:", e, response.text);
      throw new PodcastError(
        "Script Generation Failed",
        `JSON Parse Error: ${e?.message}`,
        "Try using a different AI model (e.g., switch to a more capable model in Settings), or try a different article.",
        "GEMINI_SCRIPT_PARSE_FAILED"
      );
    }
  });
};

export const generateVoiceSample = async (
  voiceName: string,
  language: string = "en",
  apiKey?: string,
): Promise<string | null> => {
  const model = "gemini-1.5-flash";
  const currentAi = getAi(apiKey);
  const voice = VOICES.find((v) => v.id === voiceName);
  const displayName = voice ? voice.name : voiceName;
  const description = voice ? voice.description : "South African voice";
  const languageName =
    LANGUAGES[language as keyof typeof LANGUAGES] || language;

  const text = `Speak with a clear, authentic ${description}. Say: "Hello, I am ${displayName}. I'm excited to dive into some professional insights with you today on DigiMag Podcasts in ${languageName}."`;

  const response = await withRetry(() =>
    currentAi.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }),
  );

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
};

export const generatePodcastAudio = async (
  script: PodcastSegment[],
  language: string = "en",
  host1: Host = HOSTS[0],
  host2: Host = HOSTS[1],
  voice1: string = HOSTS[0].defaultVoice,
  voice2: string = HOSTS[1].defaultVoice,
  apiKey?: string,
  onProgress?: (progress: number) => void,
): Promise<string | null> => {
  const model = "gemini-1.5-flash";
  const currentAi = getAi(apiKey);
  const languageName =
    LANGUAGES[language as keyof typeof LANGUAGES] || language;

  // Chunk the script to parallelize generation (4 segments per chunk is optimal for speed/reliability)
  const chunkSize = 4;
  const chunks: PodcastSegment[][] = [];
  for (let i = 0; i < script.length; i += chunkSize) {
    chunks.push(script.slice(i, i + chunkSize));
  }

  const totalChunks = chunks.length;
  let completedChunks = 0;

  try {
    const validChunks: string[] = [];
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      const prompt = chunk.map((s) => `${s.speaker}: ${s.text}`).join("\n");

      try {
        const response = await withRetry(() =>
          currentAi.models.generateContent({
            model,
            contents: [
              {
                parts: [
                  {
                    text: `Generate a high-quality audio recording for the "DigiMag Podcasts" podcast in ${languageName} (Part ${index + 1}).
          
          STRICT REQUIREMENT: Every speaker MUST have a thick, authentic South African accent appropriate to their background. 
          - ${host1.name}: ${host1.description}. 
          - ${host2.name}: ${host2.description}. 
          
          Make them sound incredibly human, energetic, and engaging. Give them distinct cadences and rhythms. Feel free to add subtle breath sounds, slight chuckles where appropriate, and natural inflections to make it sound exactly like an unscripted, highly expressive human conversation rather than AI reading text. Speak the provided text exactly as written in ${languageName}, applying authentic South African cadences, emphasis, and pronunciation.
          
          Script:\n\n${prompt}`,
                  },
                ],
              },
            ],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: [
                    {
                      speaker: host1.name,
                      voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice1 },
                      },
                    },
                    {
                      speaker: host2.name,
                      voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice2 },
                      },
                    },
                  ],
                },
              },
            },
          }),
        );

        completedChunks++;
        if (onProgress) {
          onProgress(Math.round((completedChunks / totalChunks) * 100));
        }

        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (data) {
          validChunks.push(data);
        }

        // Add a 2 second delay between chunks to avoid rate limits
        if (index < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err: any) {
        if (err?.status === 403 || err?.message?.includes("403") || err?.message?.toLowerCase().includes("permission denied")) {
          console.error(
            `Permission Denied for Gemini TTS model (Chunk ${index + 1}). This model requires a valid API key with appropriate permissions.`,
          );
          throw new PodcastError(
            "Gemini Audio Generation Failed",
            "Permission denied for the requested TTS model.",
            "Please verify your Gemini API key has access to the flash-preview-tts model and billing is enabled.",
            "GEMINI_TTS_403"
          );
        } else if (err?.status === 429 || err?.message?.includes("429")) {
          throw new PodcastError(
            "Gemini Audio Generation Failed",
            "Rate limit exceeded while generating audio.",
            "Please wait a moment and try again, or check your API quotas.",
            "GEMINI_TTS_RATE_LIMIT"
          );
        } else {
          console.error(`Failed to generate chunk ${index + 1}`, err);
          throw new PodcastError(
            "Gemini Audio Generation Failed",
            `An error occurred while generating audio chunk ${index + 1}: ${err?.message || "Unknown error"}`,
            "Please try again or check your network connection.",
            "GEMINI_TTS_FAILED"
          );
        }
      }
    }

    if (validChunks.length === 0) return null;

    // Concatenate raw PCM data
    const binaryChunks = validChunks.map((c) => {
      const binary = atob(c);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    });

    const totalLength = binaryChunks.reduce(
      (acc, chunk) => acc + chunk.length,
      0,
    );
    const fullBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of binaryChunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert Uint8Array to base64
    let binary = "";
    for (let i = 0; i < fullBuffer.length; i++) {
      binary += String.fromCharCode(fullBuffer[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("Failed to generate Gemini audio", e);
    throw e;
  }
};
