import { GoogleGenAI } from "@google/genai";
import { analyzeResumeContent } from "./_lib/gemini";

export default async function handler(req, res) {
  // Liberal CORS for debugging
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[API] GEMINI_API_KEY is undefined');
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured in Vercel' });
    }

    const { resumeText, jobDescription } = req.body;
    if (!resumeText) {
      return res.status(400).json({ error: 'Missing resumeText' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await analyzeResumeContent(ai, resumeText, jobDescription);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] Analyze Resume handler error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    });
  }
}
