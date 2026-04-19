import { GoogleGenAI } from "@google/genai";
import { generateResumeContent } from "./_lib/gemini";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    const { userData } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    const result = await generateResumeContent(ai, userData);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] Generate Resume error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

