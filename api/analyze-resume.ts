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
    const rawKey = process.env.GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY;
    if (!rawKey) {
      console.error('[API] API Key is missing');
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured in Vercel' });
    }

    // Clean key: trim whitespace and remove potential surrounding quotes
    const apiKey = rawKey.trim().replace(/^['"]|['"]$/g, '');

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
