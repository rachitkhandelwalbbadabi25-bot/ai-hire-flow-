import { GoogleGenAI } from "@google/genai";
import { generateInterviewQuestionsContent } from "../src/lib/gemini.server.ts";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://ai-hire-flow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('API Key exists:', !!process.env.GEMINI_API_KEY);

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { jobDescription, resumeText } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await generateInterviewQuestionsContent(ai, jobDescription, resumeText);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate Interview error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown server error' 
    });
  }
}
