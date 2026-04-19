import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { 
  analyzeResumeContent, 
  searchJobsContent, 
  generateInterviewQuestionsContent, 
  generateCoverLetterContent,
  evaluateInterviewAnswerContent,
  generateLearningPathContent,
  refactorResumeContent,
  generateResumeContent
} from './src/lib/gemini.server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Gemini API Routes (Simulating Cloud Functions)
  app.post('/api/analyze-resume', async (req, res) => {
    try {
      const { resumeText, jobDescription } = req.body;
      const result = await analyzeResumeContent(resumeText, jobDescription);
      res.json(result);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to analyze resume" });
    }
  });

  app.post('/api/search-jobs', async (req, res) => {
    try {
      const { query, location } = req.body;
      const result = await searchJobsContent(query, location);
      res.json(result);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search jobs" });
    }
  });

  app.post('/api/generate-interview', async (req, res) => {
    try {
      const { jobDescription, resumeText } = req.body;
      const result = await generateInterviewQuestionsContent(jobDescription, resumeText);
      res.json(result);
    } catch (error) {
      console.error("Interview generator error:", error);
      res.status(500).json({ error: "Failed to generate interview" });
    }
  });

  app.post('/api/generate-cover-letter', async (req, res) => {
    try {
      const { resumeText, jobDescription } = req.body;
      const result = await generateCoverLetterContent(resumeText, jobDescription);
      res.json(result);
    } catch (error) {
      console.error("Cover letter error:", error);
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  app.post('/api/evaluate-answer', async (req, res) => {
    try {
      const { question, answer, jobDescription } = req.body;
      const result = await evaluateInterviewAnswerContent(question, answer, jobDescription);
      res.json(result);
    } catch (error) {
      console.error("Evaluation error:", error);
      res.status(500).json({ error: "Failed to evaluate answer" });
    }
  });

  app.post('/api/learning-path', async (req, res) => {
    try {
      const { missingSkills, targetRole } = req.body;
      const result = await generateLearningPathContent(missingSkills, targetRole);
      res.json(result);
    } catch (error) {
      console.error("Learning path error:", error);
      res.status(500).json({ error: "Failed to generate learning path" });
    }
  });

  app.post('/api/refactor-resume', async (req, res) => {
    try {
      const { text, context } = req.body;
      const result = await refactorResumeContent(text, context);
      res.json(result);
    } catch (error) {
      console.error("Refactor error:", error);
      res.status(500).json({ error: "Failed to refactor resume" });
    }
  });

  app.post('/api/generate-resume', async (req, res) => {
    try {
      const { userData } = req.body;
      const result = await generateResumeContent(userData);
      res.json(result);
    } catch (error) {
      console.error("Resume generator error:", error);
      res.status(500).json({ error: "Failed to generate resume" });
    }
  });

  // Fallback for API routes to prevent falling through to Vite/Static
  app.all('/api/*', (req, res) => {
    console.warn(`Untrapped API request: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'API route not found' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
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
