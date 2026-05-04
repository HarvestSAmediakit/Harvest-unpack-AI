import express from 'express';
import session from 'express-session';
import { TokenSet, XeroClient } from 'xero-node';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import { createRequire } from 'module';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Store the token globally (in-memory) for demonstration purposes
// In production, this should be stored securely in a database per user/tenant
let globalXeroToken: TokenSet | null = null;
let xeroTenantId: string = '';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists in /tmp
  const uploadsDir = path.join(os.tmpdir(), 'digimag-uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({ 
    dest: uploadsDir,
    limits: { fileSize: 50 * 1024 * 1024 }
  });
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(session({
    secret: process.env.JWT_SECRET || 'a-very-secret-key',
    resave: false,
    saveUninitialized: true,
  }));

  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  let xeroClient: XeroClient | null = null;
  const getXeroClient = () => {
    if (!xeroClient) {
      const clientId = process.env.XERO_CLIENT_ID;
      const clientSecret = process.env.XERO_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error('XERO_CLIENT_ID and XERO_CLIENT_SECRET environment variables are required');
      }
      const redirectUri = process.env.XERO_REDIRECT_URI || 
                         (process.env.APP_URL ? `${process.env.APP_URL}/api/xero/callback` : 'http://localhost:3000/api/xero/callback');
      
      xeroClient = new XeroClient({
        clientId,
        clientSecret,
        redirectUris: [redirectUri],
        scopes: 'openid profile email accounting.transactions accounting.contacts offline_access'.split(' '),
      });
    }
    return xeroClient;
  };

  // 1. Upload + Extract PDF
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    console.log("Received upload request:", req.file ? req.file.originalname : "no file");
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const dataBuffer = fs.readFileSync(req.file.path);
      
      // Determine if pdfParse is a function or has a default property
      const extractFunc = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
      
      if (typeof extractFunc !== 'function') {
        throw new Error("pdf-parse is not a function. It is: " + typeof extractFunc);
      }

      const data = await extractFunc(dataBuffer);
      
      // Cleanup file after processing
      fs.unlinkSync(req.file.path);

      console.log("Successfully extracted text, length:", data.text?.length || 0);
      res.json({ text: data.text });
    } catch (err) {
      console.error("PDF Extraction Error:", err);
      // Ensure file is cleaned up even on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "PDF extraction failed: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  // --- Xero OAuth Workflow ---

  app.get('/api/xero/connect', async (_req, res) => {
    try {
      const xero = getXeroClient();
      const consentUrl = await xero.buildConsentUrl();
      res.redirect(consentUrl);
    } catch (err: any) {
      console.error('Xero Build Consent Error:', err);
      res.status(500).send(err.message || 'Error building Xero consent URL');
    }
  });

  app.get('/api/xero/callback', async (req, res) => {
    try {
      const xero = getXeroClient();
      const url = req.url;
      const tokenSet = await xero.apiCallback(url);
      await xero.updateTenants();
      
      globalXeroToken = tokenSet;
      if (xero.tenants && xero.tenants.length > 0) {
          xeroTenantId = xero.tenants[0].tenantId;
      }
      
      console.log('Successfully connected to Xero');
      res.redirect('/?xero=connected');
    } catch (err) {
      console.error('Xero Callback Error:', err);
      res.status(500).send('Error handling Xero callback');
    }
  });

  app.post('/api/xero/invoice', async (req, res) => {
    try {
      const xero = getXeroClient();
      const { amount, email, planName } = req.body;
      
      if (!globalXeroToken || !xeroTenantId) {
        return res.status(401).json({ status: false, message: 'Xero not connected. Please connect Xero first.' });
      }

      await xero.setTokenSet(globalXeroToken);

      // Create a Contact
      const contactsResponse = await xero.accountingApi.createContacts(xeroTenantId, {
        contacts: [{ name: email, emailAddress: email }]
      });
      const contact = contactsResponse.body.contacts?.[0];

      if (!contact) {
         return res.status(500).json({ status: false, message: 'Failed to create Xero contact' });
      }

      // Create an Invoice
      const invoiceResponse = await xero.accountingApi.createInvoices(xeroTenantId, {
        invoices: [{
          type: 'ACCREC' as any,
          contact: { contactID: contact.contactID },
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
          lineItems: [{
            description: `DigiMagAI Podcast - ${planName} Plan`,
            quantity: 1,
            unitAmount: amount,
            accountCode: '200' // Default Sales account in Xero
          }],
          status: 'AUTHORISED' as any
        }]
      });

      const invoice = invoiceResponse.body.invoices?.[0];
      
      if (!invoice) {
          return res.status(500).json({ status: false, message: 'Failed to create Xero invoice' });
      }
      
      // Attempt to get the Online Invoice URL
      const onlineInvoice = await xero.accountingApi.getOnlineInvoice(xeroTenantId, invoice.invoiceID!);
      
      res.json({ 
        status: true, 
        message: 'Invoice created successfully',
        data: {
            invoiceId: invoice.invoiceID,
            invoiceNumber: invoice.invoiceNumber,
            onlineInvoiceUrl: onlineInvoice.body.onlineInvoices?.[0]?.onlineInvoiceUrl
        }
      });
      
    } catch (err: any) {
      console.error('Xero Invoice Error:', err.response?.body || err);
      res.status(500).json({ status: false, message: 'Internal server error attempting to create Xero invoice', data: null });
    }
  });

  // --- REAL API ENDPOINTS for Frontend ---
  app.get('/api/public/magazines', (_req, res) => {
    res.json({
      magazines: [
        { id: '1', title: 'Architecture Digest', coverImage: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&q=80&w=800', description: 'The Future of Sustainable Architecture.' },
        { id: '2', title: 'Tech Trends Weekly', coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800', description: 'AI insights and Web3 developments.' },
      ]
    });
  });

  app.get('/api/public/issues/:issueId', (req, res) => {
    res.json({
      id: req.params.issueId,
      title: 'Monthly Edition ' + req.params.issueId,
      pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
      aiSummary: 'This issue explores the intersection of traditional design and modern sustainability.',
      episodes: [
        { id: 'ep1', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', articleTitle: 'Sustainability in 2024' }
      ]
    });
  });

  app.get('/api/publishers/:publisherId', (req, res) => {
    res.json({
      id: req.params.publisherId,
      name: 'Sample Publisher',
      bio: 'Leading publisher of digital media in South Africa.',
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
      followers: 1200,
      activeIssues: []
    });
  });

  app.get('/api/subscription', (_req, res) => {
    res.json({ tier: 'starter' });
  });

  app.post('/api/subscription/create-checkout', (_req, res) => {
    res.json({ url: '/publisher/billing' });
  });

  // --- AI ENGINE ENDPOINTS ---

  // 1. Native PDF Extraction (Layout-Aware)
  app.post("/api/ai/extract-articles-vision", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const dataBuffer = fs.readFileSync(req.file.path);
      const base64 = dataBuffer.toString('base64');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            {
              text: `Analyze this magazine layout. Extract all distinct articles and features. 
              Correctly identify the human reading order, ignoring layout complexities like sidebars or ads.
              For each article, provide a clear title, a punchy B2B summary, and the full text.
              
              Return as a JSON array of objects.`
            },
            {
              inlineData: {
                data: base64,
                mimeType: "application/pdf"
              }
            }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ["title", "summary", "content"]
            }
          }
        }
      });

      fs.unlinkSync(req.file.path);
      res.json(JSON.parse(response.text || "[]"));
    } catch (err: any) {
      console.error("AI Extraction Error:", err);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Generate Podcast Script
  app.post("/api/ai/generate-script", async (req, res) => {
    try {
      const { text, title } = req.body;
      const prompt = `
        You are an advanced layout-to-narrative parser creating a "DeepDive" podcast episode for global publishers.
        MAGAZINE ARTICLE TITLE: "${title || 'Untitled'}"
        
        TASK: Generate a high-energy, engaging B2B conversation between two expert hosts.
        
        PERSONAS:
        - THANDI: Strategic South African host. Enthusiastic about innovation and tech. Uses occasional subtle South Africanisms like "lekker" for big wins.
        - MICHAEL: Analytical South African host. Focused on data, ROI, and feasibility. Calm and thorough.
        
        DYNAMICS:
        - They are in a modern studio in Sandton, South Africa.
        - Include character cues like [laughs], [sighs], [excited], [intrigued] to guide the TTS.
        - Transform static facts into a lively debate. Thandi pushes the potential, Michael examines the risks.
        
        SOURCE CONTENT:
        ${(text || "").slice(0, 100000)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction: "Return ONLY a JSON array of segments with 'speaker' and 'text' keys. Speaker MUST be 'Thandi' or 'Michael'.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                speaker: { type: Type.STRING, enum: ["Thandi", "Michael"] },
                text: { type: Type.STRING }
              },
              required: ["speaker", "text"]
            }
          }
        }
      });

      res.json(JSON.parse(response.text || "[]"));
    } catch (err: any) {
      console.error("AI Script Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Multi-Speaker Audio Synthesis
  app.post("/api/ai/synthesize", async (req, res) => {
    try {
      const { script } = req.body;
      const conversation = script.map((s: any) => `${s.speaker}: ${s.text}`).join('\n');
      const prompt = `TTS the following conversation between Thandi and Michael. 
      Ensure natural pacing based on punctuation and character cues like [laughs].
      
      CONVERSATION:
      ${conversation}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Thandi',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }
                  }
                },
                {
                  speaker: 'Michael',
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' }
                  }
                }
              ]
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated");

      // Return as base64 so the client can handle it easily with Blob
      res.json({ audioBase64: base64Audio });
    } catch (err: any) {
      console.error("AI Synthesis Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      node_version: process.version,
      env: process.env.NODE_ENV,
      port: PORT,
      ai_configured: !!process.env.GEMINI_API_KEY,
      xero_configured: !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET),
      paystack_configured: !!process.env.PAYSTACK_SECRET_KEY
    });
  });

  // Paystack Initialization Endpoint
  app.post('/api/paystack/initialize', async (req, res) => {
    try {
      const { email, amount, currency } = req.body;
      
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email || 'customer@example.com',
          amount: amount, // e.g. 500000 for 5000 NGN
          currency: currency || 'NGN'
        })
      });

      const data = await paystackRes.json();
      res.json(data);
    } catch (error) {
      console.error('Paystack initialization error:', error);
      res.status(500).json({ status: false, message: 'Internal server error', data: null });
    }
  });

  // Use development mode ONLY if explicitly requested
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    try {
      console.log('Starting server in development mode with Vite middleware');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Failed to load Vite server, falling back to static serving:', err);
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    console.log('Starting server in production mode');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} in ${isDev ? 'development' : 'production'} mode`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});