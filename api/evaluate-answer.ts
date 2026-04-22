import { GoogleGenAI } from "@google/genai";
import { evaluateInterviewAnswerContent } from "../src/lib/gemini-server";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not defined");
    
    const ai = new GoogleGenAI({ apiKey: key });
    const { question, answer, jobDescription } = req.body;
    const result = await evaluateInterviewAnswerContent(ai, question, answer, jobDescription);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[API Error] evaluate-answer:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
