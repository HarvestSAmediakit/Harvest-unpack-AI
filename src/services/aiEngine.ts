import { GoogleGenAI } from "@google/genai";
import { PodcastSegment } from "./geminiService";
import { withRetry } from "../utils/aiUtils";

// Initialize Gemini
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
});

export async function generateAIResponse(prompt: string, systemInstruction: string): Promise<PodcastSegment[]> {
  const provider = process.env.AI_PROVIDER || "gemini";

  if (provider === "gemini") {
    return await callGemini(prompt, systemInstruction);
  }

  if (provider === "openai") {
    return await callOpenAI(prompt, systemInstruction);
  }

  throw new Error("Invalid AI provider");
}

async function callGemini(prompt: string, systemInstruction: string): Promise<PodcastSegment[]> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    }));
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

async function callOpenAI(prompt: string, systemInstruction: string): Promise<PodcastSegment[]> {
  try {
    const response = await fetch("/api/openai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        prompt, 
        systemInstruction,
        responseFormat: "json_object"
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI failed");
    }

    const data = await response.json();
    // The server returns { text: "..." }
    const parsed = JSON.parse(data.text);
    return Array.isArray(parsed) ? parsed : (parsed.script || []);
  } catch (error) {
    console.error("OpenAI Error:", error);
    throw error;
  }
}
