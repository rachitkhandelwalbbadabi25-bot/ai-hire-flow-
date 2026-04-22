import { GoogleGenAI } from "@google/genai";
import { generateInterviewQuestionsContent } from "../src/lib/gemini-server.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[API Registry] generate-interview: Key available:', !!apiKey);

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { jobDescription, resumeText } = req.body;
    const result = await generateInterviewQuestionsContent(ai, jobDescription, resumeText);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[API Error] generate-interview:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
