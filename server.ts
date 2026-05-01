import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const parsePdf = typeof pdf === "function" ? pdf : (pdf.default || pdf);
const mammoth = require("mammoth");
const parseMammoth = mammoth.extractRawText || mammoth.default || mammoth;

import { HOSTS, LANGUAGES } from "./src/constants";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { google } from "googleapis";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Initialize Firebase Admin
let db: any;
try {
  // Use the same project ID as the app
  const firebaseConfig = require("./firebase-applet-config.json");
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
  db = getFirestore();
} catch (error) {
  console.error("Firebase Admin Init Error:", error);
}

const app = express();
const PORT = 3000;
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Google OAuth Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

app.use(express.json({ limit: "50mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "dummy",
});

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
});

/**
 * Helper function to execute AI API calls with exponential backoff retry logic.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message?.toLowerCase() || "";
      const isRateLimit = errorMessage.includes("429") || err?.status === 429 || err?.code === 429 || errorMessage.includes("resource_exhausted") || errorMessage.includes("high demand");
      if (isRateLimit && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`AI Error (${err?.message}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

app.get("/api/auth/google/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/drive/upload", upload.single("file"), async (req, res) => {
  try {
    const { tokens, title, description } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!tokens) return res.status(401).json({ error: "Not authenticated with Google" });

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials(JSON.parse(tokens));

    const drive = google.drive({ version: "v3", auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "1XonAi82cECXvVde8VGCugDkS-vLA5mjn";

    const fileMetadata = {
      name: `${title || 'DeepDive'}.wav`,
      parents: [folderId],
      description: description || "",
    };

    const media = {
      mimeType: req.file.mimetype,
      body: Buffer.from(req.file.buffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    // Make the file public
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    res.json({ 
      id: response.data.id, 
      link: response.data.webViewLink 
    });
  } catch (error: any) {
    console.error("Drive Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/generate-podcast", async (req, res) => {
  try {
    const { text, language = 'en', apiKey } = req.body;
    const host1 = HOSTS[0];
    const host2 = HOSTS[1];
    
    // Debug log to verify key usage
    console.log(`[DEBUG] Gemini Podcast Generation: Using ${apiKey ? 'Custom' : 'Platform'} API Key`);

    const key = apiKey || process.env.GEMINI_API_KEY || "";
    if (!key || key === "dummy") {
      return res.status(400).json({ error: "GEMINI_API_KEY is not set" });
    }
    
    // Re-initialize AI client with the key for this request
    const aiClient = new GoogleGenAI({ 
      apiKey: key,
    });

    // 1. Generate Script with Gemini
    const prompt = `
      You are creating a NotebookLM-style Audio Overview podcast in ${LANGUAGES[language as keyof typeof LANGUAGES]}.
      Length: The podcast should be between 4 and 6 minutes long.
      Hosts: Two South African professional broadcasters – ${host1.name} (${host1.description}) and ${host2.name} (${host2.description}).
      Accent: ${language === 'en' ? 'Refined, world-class South African English (en-ZA) – articulate, professional, and insightful.' : 'Natural, professional Afrikaans (af-ZA) – use appropriate terminology, reference local professional landscapes, and maintain a polished standard.'}
      Topic: Professional South African insights based ONLY on this content:
      ${text.substring(0, 8000)}
      
      Make it sound like two seasoned broadcasters having an intellectually engaging discussion – insightful, strategic, and world-class.
      Format: Natural dialogue only. Start with a greeting where you explicitly mention that you are discussing the latest DigiMag insights. End with a professional sign-off.
      Return a JSON array of objects. Each object MUST include:
      - "speaker": The name of the host
      - "text": Spoken line (conversational, 1-2 sentences max)
      - "ssml": SSML with <break time='500ms'/> for natural pauses
      - "timestamp": "MM:SS (cumulative from start)"
    `;

    const response = await withRetry(() => aiClient.models.generateContent({
      model: "gemini-1.5-flash", // Use stable model
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    }));

    const script = JSON.parse(response.text || "[]");

    // 2. Generate Audio with ElevenLabs (Placeholder for now)
    // In a real implementation, you'd call the ElevenLabs API here
    // for each speaker in the script.
    
    res.json({ script });
  } catch (error: any) {
    console.error("Podcast Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/extract-text", upload.single("file"), async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (req.file.mimetype === "application/pdf") {
      try {
        const key = apiKey || process.env.GEMINI_API_KEY || "";
        const aiClient = new GoogleGenAI({ 
          apiKey: key,
        });

        const response = await withRetry(() => aiClient.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: "application/pdf",
                  },
                },
                { text: "Extract all text from this PDF accurately, maintaining the logical flow of articles and sections. Do not include page numbers or headers/footers if possible. Return ONLY the extracted text." },
              ],
            },
          ],
        }));

        if (!response.text || !response.text.trim()) {
          throw new Error("Gemini failed to extract text from this PDF.");
        }
        res.json({ text: response.text });
      } catch (geminiError: any) {
        console.error("Gemini PDF Extraction Error:", geminiError);
        // Fallback to pdf-parse if Gemini fails
        const data = await parsePdf(req.file.buffer);
        if (!data || !data.text || !data.text.trim()) {
          throw new Error("No text could be extracted from this PDF on the server.");
        }
        res.json({ text: data.text });
      }
    } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await parseMammoth.extractRawText({ buffer: req.file.buffer });
      res.json({ text: result.value });
    } else if (req.file.mimetype === "text/plain") {
      res.json({ text: req.file.buffer.toString() });
    } else {
      res.status(400).json({ error: "Unsupported file type" });
    }
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/claude/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, responseFormat, apiKey } = req.body;
    const key = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!key || key === "dummy") {
      return res.status(400).json({ error: "ANTHROPIC_API_KEY is not set" });
    }

    const client = new Anthropic({ apiKey: key });

    let finalPrompt = prompt;
    if (responseFormat === "json_object") {
      finalPrompt += "\n\nPlease return ONLY valid JSON. Do not include any markdown formatting like ```json or any conversational text.";
    }

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 8192,
      system: systemInstruction || undefined,
      messages: [
        { role: "user", content: finalPrompt }
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      res.json({ text: content.text });
    } else {
      res.status(500).json({ error: "Unexpected response format from Claude" });
    }
  } catch (error: any) {
    console.error("Claude Generate Error:", error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message });
  }
});

app.post("/api/openai/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, responseFormat, apiKey } = req.body;
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key || key === "dummy") {
      return res.status(400).json({ error: "OPENAI_API_KEY is not set" });
    }

    const client = new OpenAI({ apiKey: key });

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: responseFormat === "json_object" ? { type: "json_object" } : undefined,
    });

    res.json({ text: response.choices[0].message.content });
  } catch (error: any) {
    console.error("OpenAI Generate Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/xai/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, responseFormat, apiKey } = req.body;
    const key = apiKey || process.env.XAI_API_KEY;

    if (!key || key === "dummy") {
      return res.status(400).json({ error: "XAI_API_KEY is not set" });
    }

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages,
        model: "grok-beta",
        stream: false,
        temperature: 0,
        response_format: responseFormat === "json_object" ? { type: "json_object" } : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "x.ai API error");
    }

    const data = await response.json();
    res.json({ text: data.choices[0].message.content });
  } catch (error: any) {
    console.error("x.ai Generate Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/openai/tts", async (req, res) => {
  try {
    const { text, voice, apiKey } = req.body;
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key || key === "dummy") {
      return res.status(400).json({ error: "OPENAI_API_KEY is not set" });
    }

    const client = new OpenAI({ apiKey: key });

    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: voice || "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error: any) {
    console.error("OpenAI TTS Error:", error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message });
  }
});

app.post("/api/google/tts", async (req, res) => {
  try {
    const { text, voice, apiKey } = req.body;
    const key = apiKey || process.env.GOOGLE_API_KEY;

    if (!key || key === "dummy") {
      return res.status(400).json({ error: "GOOGLE_API_KEY is not set" });
    }

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.substring(0, 5), name: voice },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Google Cloud TTS API error");
    }

    const data = await response.json();
    const audioContent = data.audioContent; // Base64 encoded string
    const buffer = Buffer.from(audioContent, "base64");
    
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error: any) {
    console.error("Google Cloud TTS Error:", error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message });
  }
});

app.post("/api/rss/publish", async (req, res) => {
  try {
    const { id, feedData } = req.body;
    if (!id || !feedData) {
      return res.status(400).json({ error: "Missing id or feedData" });
    }
    
    if (db) {
      await db.collection("rssFeeds").doc(id).set(feedData);
    }
    
    res.json({ url: `${process.env.APP_URL || 'http://localhost:3000'}/api/rss/${id}` });
  } catch (error: any) {
    console.error("RSS Publish Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/rss/:id", async (req, res) => {
  try {
    let feedData: any;
    
    if (db) {
      const doc = await db.collection("rssFeeds").doc(req.params.id).get();
      if (doc.exists) {
        feedData = doc.data();
      }
    }
    
    if (!feedData) return res.status(404).send("Feed not found");
    
    const items = feedData.items.map((item: any) => `
      <item>
        <title><![CDATA[${item.title}]]></title>
        <description><![CDATA[${item.description}]]></description>
        <enclosure url="${item.audioUrl}" length="0" type="audio/mpeg" />
        <guid>${item.id}</guid>
        <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      </item>
    `).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title><![CDATA[${feedData.title}]]></title>
    <description><![CDATA[${feedData.description}]]></description>
    <link>${feedData.link}</link>
    <language>en-us</language>
    ${items}
  </channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml");
    res.send(xml);
  } catch (error: any) {
    console.error("RSS Generate Error:", error);
    res.status(500).send("Error generating RSS feed");
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
