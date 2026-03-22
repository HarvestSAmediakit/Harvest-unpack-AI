import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import fs from "fs";
import multer from "multer";
import RSS from "rss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure storage directories exist
const UPLOADS_DIR = path.join(process.cwd(), "public", "podcasts");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const PODCASTS_JSON = path.join(process.cwd(), "podcasts.json");
if (!fs.existsSync(PODCASTS_JSON)) {
  fs.writeFileSync(PODCASTS_JSON, JSON.stringify([]));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/podcasts", express.static(UPLOADS_DIR));

  // Generic OpenAI Proxy Endpoint
  app.post("/api/openai/generate", async (req, res) => {
    const { prompt, systemInstruction, responseFormat } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }

    try {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          ...(systemInstruction ? [{ role: "system" as const, content: systemInstruction }] : []),
          { role: "user" as const, content: prompt },
        ],
        response_format: responseFormat === "json_object" ? { type: "json_object" } : undefined,
      });

      const content = completion.choices[0].message.content;
      res.json({ text: content });
    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content via OpenAI." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // OpenAI TTS Proxy Endpoint
  app.post("/api/openai/tts", async (req, res) => {
    const { text, voice } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }

    try {
      const openai = new OpenAI({ apiKey });
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice || "alloy",
        input: text,
        response_format: "mp3",
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (error: any) {
      console.error("OpenAI TTS Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate TTS via OpenAI." });
    }
  });

  // Podcast Upload and RSS Endpoints
  app.post("/api/podcasts/publish", upload.single("audio"), (req, res) => {
    try {
      const { title, description, language, date } = req.body;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ error: "No audio file uploaded." });
      }

      const podcasts = JSON.parse(fs.readFileSync(PODCASTS_JSON, "utf-8"));
      const newPodcast = {
        id: Date.now().toString(),
        title,
        description,
        language,
        date: date || new Date().toUTCString(),
        audioUrl: `/podcasts/${file.filename}`,
        fileName: file.filename,
      };

      podcasts.push(newPodcast);
      fs.writeFileSync(PODCASTS_JSON, JSON.stringify(podcasts, null, 2));

      res.json({ success: true, podcast: newPodcast });
    } catch (error: any) {
      console.error("Publish Error:", error);
      res.status(500).json({ error: "Failed to publish podcast." });
    }
  });

  app.get("/rss", (req, res) => {
    try {
      const podcasts = JSON.parse(fs.readFileSync(PODCASTS_JSON, "utf-8"));
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      const feed = new RSS({
        title: "Harvest Unpacked DeepDive AI Podcasts",
        description: "Agricultural insights broken down in a 6-8 minute deep dive.",
        feed_url: `${appUrl}/rss`,
        site_url: appUrl,
        image_url: `${appUrl}/sprout-icon.png`,
        language: "en",
        pubDate: new Date().toUTCString(),
        ttl: 60,
      });

      podcasts.forEach((podcast: any) => {
        feed.item({
          title: podcast.title,
          description: podcast.description,
          url: `${appUrl}/#podcast-${podcast.id}`,
          guid: podcast.id,
          date: podcast.date,
          enclosure: {
            url: `${appUrl}${podcast.audioUrl}`,
            type: "audio/wav",
          },
        });
      });

      res.set("Content-Type", "application/rss+xml");
      res.send(feed.xml());
    } catch (error: any) {
      console.error("RSS Error:", error);
      res.status(500).send("Failed to generate RSS feed.");
    }
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
