// Client-side wrappers that call the backend API instead of direct Gemini SDK
// This ensures that the GEMINI_API_KEY is never exposed to the frontend.

const apiFetch = async (endpoint: string, data: any) => {
  const response = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
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
