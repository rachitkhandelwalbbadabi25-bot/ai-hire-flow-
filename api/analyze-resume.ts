import { GoogleGenAI } from "@google/genai";
import { analyzeResumeContent } from "../src/lib/gemini.server.ts";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://ai-hire-flow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API Key exists:', !!process.env.GEMINI_API_KEY);

  if (!process.env.GEMINI_API_KEY) {
    console.error('CRITICAL: GEMINI_API_KEY is missing');
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { resumeText, jobDescription } = req.body;
    
    // Initialize inside handler as requested
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const result = await analyzeResumeContent(ai, resumeText, jobDescription);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Analyze Resume error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown server error' 
    });
  }
}
