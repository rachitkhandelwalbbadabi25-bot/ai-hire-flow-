import { GoogleGenAI } from "@google/genai";
import { searchJobsContent } from "./_lib/gemini";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const rawKey = process.env.GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY;
    if (!rawKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    const apiKey = rawKey.trim().replace(/^['"]|['"]$/g, '');

    const { query, location } = req.body;
    const ai = new GoogleGenAI({ apiKey });
    const result = await searchJobsContent(ai, query, location);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API] Search Jobs error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
