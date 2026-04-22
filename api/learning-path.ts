import { GoogleGenAI } from "@google/genai";
import { generateLearningPathContent } from "../src/lib/gemini-server.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[API Registry] learning-path: Key available:', !!apiKey);

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { missingSkills, targetRole } = req.body;
    const result = await generateLearningPathContent(ai, missingSkills, targetRole);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[API Error] learning-path:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
