import OpenAI from "openai";
import { Host, LANGUAGES } from "../constants";
import { PodcastSegment } from "./geminiService";
import { PodcastError } from "../types";

/**
 * Helper function to execute OpenAI API calls with exponential backoff retry logic.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // OpenAI uses 429 for rate limits
      const isRateLimit = err?.status === 429;
      const isParseError = err?.message?.includes("JSON") || err?.name === 'SyntaxError';
      
      if ((isRateLimit || isParseError) && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`OpenAI rate limit or error hit. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export const generatePodcastScriptOpenAI = async (
  articleText: string,
  apiKey: string,
  language: string = 'en',
  host1: Host,
  host2: Host,
  format: 'standard' | 'impact' | 'unpacked' | 'combined' = 'standard',
  baseURL?: string,
  model: string = "gpt-4o"
): Promise<PodcastSegment[]> => {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true, baseURL });

  const languageName = LANGUAGES[language as keyof typeof LANGUAGES] || language;

  const standardInstruction = `
    You are an expert podcast producer creating premium, high-quality professional episodes for digital magazines under the DigiMag brand.
    Transform the article below into a natural, engaging two-host conversation between:

    1. ${host1.name}: ${host1.description} (Lead host, polished professional, articulate and insightful)
    2. ${host2.name}: ${host2.description} (Co-host, dynamic professional, engaging and business-savvy)

    Core Objectives:
    1. Intellectual Insight: Break down complex topics into clear, strategic, and high-level advice.
    2. Brand & Industry Promotion: Enthusiastically but professionally promote any companies or products featured.
    3. Editorial Analysis: Analyze the provided content naturally and intelligently.

    Tone: Professional Podcast - 70% insightful journalism, 20% refined conversation, 10% sophisticated enthusiasm.
    Sound human: articulate delivery, appropriate pauses, professional South African cadences.
    - EXTREMELY PROFESSIONAL AND POLISHED. The hosts should sound like two seasoned broadcasters with deep chemistry. Use intelligent reactions (Indeed, exactly, fascinating, *brief chuckle*), smooth transitions, and intellectual engagement. 
    - Maintain a high-end, world-class broadcasting standard while staying deeply relatable to the South African professional landscape.
    - RESPOND IN: ${languageName}.
    - Use clear, professional South African English. Avoid over-using slang unless it feels naturally appropriate for a professional context.

    HYPER-REALISTIC SPEECH RULES:
    1. Use natural professional fillers and breathing pauses.
    2. Write natural, flowing dialogue that reflects real high-level interviews.
    3. Include refined self-corrections or thoughtful pauses.
    4. Have the hosts build on each other's points naturally.
    5. CRITICAL REQUIREMENT: You MUST include at least two instances where ${host1.name} builds on ${host2.name}'s point with a sophisticated "Wait—" or "That actually brings up—" moment.
    6. The dialogue MUST sound sophisticated and world-class.

    Episode requirements (8-12 minutes, ~1200 words total):
    1. OPENING (0:00-0:45): Branded intro - "Welcome to DigiMag's Audio Edition... ${host1.name} and ${host2.name} here with this week's must-know [TOPIC]..."
    2. HOOK (0:45-1:30): Tease 2-3 key takeaways with professional banter
    3. DEEP DIVE (1:30-9:00): Break down article in 4-6 chapters with back-and-forth:
       - ${host1.name} explains data/facts with authority
       - ${host2.name} asks smart questions, adds world-class SA context
       - Natural conversational flow
    4. SPONSOR/ADVERTISER DISCUSSIONS (9:00-9:30): Woven naturally, promoting companies featured.
    5. WRAP-UP (9:30-end): Key takeaways + CTA ("Subscribe to DigiMag's channel" or "Tap 'Join the Conversation' and ask us anything").
  `;

  const impactInstruction = `
    You are creating a professional, radio-ready AI podcast segment for a show called "DigiMag Insights: High-Level Analysis".
    This is a "DigiMag Impact" audio overview designed to showcase strategic value.

    FORMAT:
    Two AI characters having a sophisticated, intelligent, and highly engaging conversation:
    - ${host1.name} (Host: seasoned professional, insightful broadcaster)
    - ${host2.name} (Analyst: expert, articulate, explains strategic value)

    TONE & LANGUAGE:
    - POLISHED, ENGAGING, AND PROFESSIONAL. The hosts should sound like two seasoned broadcaster with deep chemistry. Use refined reactions.
    - Persuasive, professional, and world-class.
    - RESPOND IN: ${languageName}.
    - Use clear, professional South African English.

    HYPER-REALISTIC SPEECH RULES:
    1. Use professional filler words and natural breathing pauses.
    2. Write fluid dialogue that reflects high-end broadcasting.
    3. Include thoughtful self-corrections or reflective pauses.
    4. Have the hosts build on each other's points naturally.
    5. CRITICAL REQUIREMENT: You MUST include at least two instances of high-level conversational building between ${host1.name} and ${host2.name}.
    6. The dialogue MUST sound incredibly polished and world-class.

    OBJECTIVE:
    Turn the provided article into a compelling discussion that clearly explains the strategic value of the content. Ensure you enthusiastically promote any companies and products mentioned.

    STRUCTURE:
    1. OPENING: Host introduces the brand and frames the opportunity.
    2. CONTEXT SETUP: Briefly explain the subject matter.
    3. CORE DISCUSSION: Analyst breaks down the key value propositions.
    4. STRATEGIC ADVANTAGE: Explain the unique professional relevance of the content.
    5. MULTI-CHANNEL IMPACT: Mention digital and AI engagement.
    6. STRATEGIC SUMMARY: Analyst summarizes why this is significant.
    7. STRONG CLOSE: Host wraps up with a confident recommendation tone and refined call to action.

    STYLE GUIDELINES:
    - Sound like a highly strategic but immensely fun discussion.
    - Use real-world business logic.
    - Keep it engaging and easy to follow.
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
    - POLISHED, INTELLECTUAL, AND ENGAGING. The hosts should sound like experienced professionals with natural chemistry. Use sophisticated reactions and refined banter.
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
    You are creating an episode of “DigiMag Insights: High-Level Analysis” by DigiMag Media.
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
  `;

  const systemInstruction = `
    ${format === 'impact' ? impactInstruction : format === 'unpacked' ? unpackedInstruction : format === 'combined' ? combinedInstruction : standardInstruction}
    
    Output Format:
    Return a JSON object with a "script" key containing an array of objects. Each object MUST include:
    - "speaker": The name of the host
    - "text": Spoken line (conversational, 1-2 sentences max)
    - "ssml": SSML with <break time='500ms'/> for natural pauses
    - "timestamp": "MM:SS (cumulative from start)"
  `;

  return await withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: `Article Content: ${articleText}\n\nGenerate a podcast script for a 3-5 minute discussion in ${languageName}.` }
      ],
      response_format: { type: "json_object" }
    });

    try {
      let content = response.choices[0].message.content || "{}";
      // Remove think blocks if any
      content = content.replace(/<think>[\s\S]*?<\/think>/g, "");
      content = content.replace(/```json\n?|```/g, "").trim();
      const parsed = JSON.parse(content);
      // Handle cases where the model might wrap the array in a property
      if (Array.isArray(parsed)) return parsed as PodcastSegment[];
      if (parsed.script && Array.isArray(parsed.script)) return parsed.script as PodcastSegment[];
      if (parsed.segments && Array.isArray(parsed.segments)) return parsed.segments as PodcastSegment[];
      // If it's just an object with a key that is the array
      const firstKey = Object.keys(parsed)[0];
      if (Array.isArray(parsed[firstKey])) return parsed[firstKey] as PodcastSegment[];
      return [];
    } catch (e: any) {
      console.error("Failed to parse OpenAI script:", e);
      throw new PodcastError(
        "Script Generation Failed",
        `JSON Parse Error: ${e?.message}`,
        "Try using a different AI model (e.g., switch to a more capable model in Settings), or try a different article.",
        "OPENAI_SCRIPT_PARSE_FAILED"
      );
    }
  });
};

export const generatePodcastAudioOpenAI = async (
  script: PodcastSegment[],
  apiKey: string,
  host1: Host,
  host2: Host,
  baseURL?: string
): Promise<string | null> => {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true, baseURL });

  try {
    const audioChunks: Uint8Array[] = [];
    for (const segment of script) {
      // Match speaker name to host to get the correct OpenAI voice
      const voice = segment.speaker === host1.name ? host1.openaiVoice : host2.openaiVoice;
      
      const response = await withRetry(() => openai.audio.speech.create({
        model: "tts-1",
        voice: voice as any,
        input: segment.text,
        response_format: "mp3",
      }));
      
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
    if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota')) {
      console.warn("OpenAI Quota/Rate Limit Exceeded.");
      throw new PodcastError(
        "OpenAI Audio Generation Failed",
        "Rate limit or quota exceeded while generating audio.",
        "Please check your API quotas, plan, and billing details at https://platform.openai.com/account/billing.",
        "OPENAI_TTS_RATE_LIMIT"
      );
    } else {
      console.error("Failed to generate OpenAI audio", e);
      throw new PodcastError(
        "OpenAI Audio Generation Failed",
        `An error occurred: ${e?.message || "Unknown error"}`,
        "Please check your network and API key, and try again.",
        "OPENAI_TTS_FAILED"
      );
    }
  }
};
