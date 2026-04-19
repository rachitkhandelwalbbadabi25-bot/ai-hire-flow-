import { GoogleGenAI } from "@google/genai";
import { generateInterviewQuestionsContent } from "./_lib/gemini";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    const { jobDescription, resumeText } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    const result = await generateInterviewQuestionsContent(ai, jobDescription, resumeText);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] Generate Interview error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
