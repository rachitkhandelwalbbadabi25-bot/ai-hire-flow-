import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import { 
  analyzeResumeContent, 
  searchJobsContent, 
  generateInterviewQuestionsContent, 
  generateCoverLetterContent,
  evaluateInterviewAnswerContent,
  generateLearningPathContent,
  refactorResumeContent,
  generateResumeContent
} from './api/_lib/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for local dev
  app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  
  app.use(express.json());

  // API Routes for local development
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', apiKeyExists: !!process.env.GEMINI_API_KEY });
  });

  app.post('/api/analyze-resume', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await analyzeResumeContent(ai, req.body.resumeText, req.body.jobDescription);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/search-jobs', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await searchJobsContent(ai, req.body.query, req.body.location);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/generate-interview', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await generateInterviewQuestionsContent(ai, req.body.jobDescription, req.body.resumeText);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/generate-cover-letter', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await generateCoverLetterContent(ai, req.body.resumeText, req.body.jobDescription);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/evaluate-answer', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await evaluateInterviewAnswerContent(ai, req.body.question, req.body.answer, req.body.jobDescription);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/learning-path', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await generateLearningPathContent(ai, req.body.missingSkills, req.body.targetRole);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/refactor-resume', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await refactorResumeContent(ai, req.body.text, req.body.context);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/generate-resume', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const result = await generateResumeContent(ai, req.body.userData);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  app.post('/api/code-rabbit', async (req, res) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        You are "Code Rabbit", an elite AI software engineer.
        Analyze the following code/error and provide:
        1. Root cause of the bug.
        2. Impact analysis.
        3. A corrected code snippet with best practices (TypesScript, React, etc).
        
        Context provided:
        ${JSON.stringify(req.body.context, null, 2)}
        
        Error/Snippet:
        ${req.body.code}
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              explanation: { type: "string" },
              rootCause: { type: "string" },
              fixedCode: { type: "string" },
              bestPractices: { type: "array", items: { type: "string" } }
            },
            required: ["explanation", "rootCause", "fixedCode", "bestPractices"]
          }
        }
      });
      
      res.json(JSON.parse(response.text));
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Internal Server Error' });
    }
  });

  // Client serving (Vite in dev, Static in prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
