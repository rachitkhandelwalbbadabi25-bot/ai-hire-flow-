import express from 'express';
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
} from '../src/lib/gemini.server.ts';

const app = express();

// Middleware
app.use(cors({
  origin: true, // Echoes the request origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 1. Health check FIRST
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Gemini API Routes
app.post('/api/analyze-resume', async (req, res) => {
  console.log("Analyzing resume...");
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
  console.log("Searching jobs...");
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
  console.log("Generating interview...");
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
  console.log("Generating cover letter...");
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
  console.log("Evaluating answer...");
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
  console.log("Generating learning path...");
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
  console.log("Refactoring resume...");
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
  console.log("Generating resume template...");
  try {
    const { userData } = req.body;
    const result = await generateResumeContent(userData);
    res.json(result);
  } catch (error) {
    console.error("Resume generator error:", error);
    res.status(500).json({ error: "Failed to generate resume" });
  }
});

// 3. Fallback for API routes
app.all('/api/*', (req, res) => {
  console.warn(`Untrapped API request: ${req.method} ${req.url}`);
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

export default app;
