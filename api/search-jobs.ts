import { GoogleGenAI } from "@google/genai";
import { searchJobsContent } from "../src/lib/gemini-server.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[API Registry] search-jobs: Key available:', !!apiKey);
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not configured on the server. Please set it in your Vercel/environment variables." 
      });
    }
    
    const ai = new GoogleGenAI({ apiKey });
    const { query, queryStr, location } = req.body;
    const result = await searchJobsContent(ai, query || queryStr, location);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[API Error] search-jobs:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
