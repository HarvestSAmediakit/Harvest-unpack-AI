import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import multer from "multer";
import dotenv from "dotenv";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const parsePdf = pdf;
const mammoth = require("mammoth");
const parseMammoth = mammoth.extractRawText || mammoth.default || mammoth;

import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

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
    const { text, characters } = req.body;

    // 1. Generate Script with Gemini
    const prompt = `
      You are creating a NotebookLM-style Audio Overview podcast.
      Length: The podcast should be between 4 and 6 minutes long.
      Hosts: Two white South African farmers/journalists – ${characters[0]} and ${characters[1]}.
      Accent: Strong white South African English (en-ZA) – use words like "boet", "lekker", "ja no", reference load-shedding, export markets, rainfall in the Karoo, etc. when natural.
      Topic: South African agriculture based ONLY on this content:
      ${text.substring(0, 8000)}
      
      Make it sound like two mates chatting over coffee on a stoep – engaging, humorous at times, explain jargon, highlight practical takeaways for SA farmers.
      Format: Natural dialogue only. Start with greeting, end with sign-off.
      Return a JSON array of objects with "speaker" and "text" fields.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (req.file.mimetype === "application/pdf") {
      const data = await parsePdf(req.file.buffer);
      res.json({ text: data.text });
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

app.post("/api/openai/generate", async (req, res) => {
  try {
    const { prompt, systemInstruction, responseFormat } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: "OPENAI_API_KEY is not set" });
    }

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await openai.chat.completions.create({
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
    const { prompt, systemInstruction, responseFormat } = req.body;

    if (!process.env.XAI_API_KEY) {
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
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
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
    const { text, voice } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: "OPENAI_API_KEY is not set" });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice || "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error: any) {
    console.error("OpenAI TTS Error:", error);
    res.status(500).json({ error: error.message });
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
