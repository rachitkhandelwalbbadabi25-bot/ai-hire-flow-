// Client-side wrappers that call the backend API instead of direct Gemini SDK
// This ensures that the GEMINI_API_KEY is never exposed to the frontend.

const apiFetch = async (endpoint: string, data: any) => {
  const url = `/api/${endpoint}`;
  console.log(`[API Request] Initiating ${url}`, data);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.status === 405) {
      console.error(`[API 405] Method Not Allowed for ${url}. This often means the request hit a static server instead of the Express backend.`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[API Error] ${endpoint}: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[API Success] ${endpoint}`, result);
    return result;
  } catch (err: any) {
    console.error(`[Network Error] ${endpoint}:`, err);
    throw err;
  }
};

export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  return apiFetch('analyze-resume', { resumeText, jobDescription });
};

export const generateResume = async (userData: any) => {
  return apiFetch('generate-resume', { userData });
};

export const generateCoverLetter = async (resumeText: string, jobDescription: string) => {
  return apiFetch('generate-cover-letter', { resumeText, jobDescription });
};

export const findJobs = async (query: string, location: string = "") => {
  return apiFetch('search-jobs', { query, location });
};

export const generateInterviewQuestions = async (jobDescription: string, resumeText: string = "") => {
  return apiFetch('generate-interview', { jobDescription, resumeText });
};

export const evaluateInterviewAnswer = async (question: string, answer: string, jobDescription: string) => {
  return apiFetch('evaluate-answer', { question, answer, jobDescription });
};

export const generateLearningPath = async (missingSkills: string[], targetRole: string) => {
  return apiFetch('learning-path', { missingSkills, targetRole });
};

export const refactorResumeText = async (text: string, context: string = "") => {
  return apiFetch('refactor-resume', { text, context });
};

export const auditCode = async (code: string, context: any = {}) => {
  return apiFetch('code-rabbit', { code, context });
};
