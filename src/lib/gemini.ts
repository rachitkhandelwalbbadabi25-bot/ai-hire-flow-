import { GoogleGenAI, Type } from "@google/genai";

const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const apiFetch = async (endpoint: string, data: any) => {
  const url = `/api/${endpoint}`;
  console.log(`[Neural Link] Routing to ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API failure: ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`[Neural Link Error] ${endpoint}:`, err);
    throw err;
  }
};

export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  return await apiFetch('analyze-resume', { resumeText, jobDescription });
};

export const generateResume = async (userData: any) => {
  return await apiFetch('generate-resume', { userData });
};

export const generateCoverLetter = async (resumeText: string, jobDescription: string) => {
  return await apiFetch('generate-cover-letter', { resumeText, jobDescription });
};

export const findJobs = async (queryStr: string, location: string = "") => {
  return await apiFetch('search-jobs', { query: queryStr, location });
};

export const generateInterviewQuestions = async (jobDescription: string, resumeText: string = "") => {
  return await apiFetch('generate-interview', { jobDescription, resumeText });
};

export const evaluateInterviewAnswer = async (question: string, answer: string, jobDescription: string) => {
  return await apiFetch('evaluate-answer', { question, answer, jobDescription });
};

export const generateLearningPath = async (missingSkills: string[], targetRole: string) => {
  return await apiFetch('learning-path', { missingSkills, targetRole });
};

export const refactorResumeText = async (text: string, context: string = "") => {
  return await apiFetch('refactor-resume', { text, context });
};

export const auditCode = async (code: string, context: any = {}) => {
  throw new Error("Audit Code is currently disabled. All AI features are transitioning to secure server-side execution.");
};
