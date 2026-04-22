import { GoogleGenAI, Type } from "@google/genai";

// Initialize client-side GenAI
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
};

const ai = getAI();

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
      const errorText = await response.text();
      console.warn(`[Neural Warning] Backend rejected signal (${response.status}). Activating Client-Side Buffer.`);
      throw new Error(errorText || `API failure: ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`[Neural Link Error] ${endpoint}:`, err);
    throw err;
  }
};

export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  try {
    return await apiFetch('analyze-resume', { resumeText, jobDescription });
  } catch (backendError) {
    console.log('[Neural Buffer] Performing deep-scan client-side analysis...');
    const prompt = `
      You are an expert ATS (Applicant Tracking System) optimizer and professional resume auditor. 
      Analyze the provided resume text with extreme critical detail. 

      ${jobDescription ? `
      STRATEGY: Conduct a rigorous gap analysis against this Job Description: ${jobDescription}.
      - Identify specific technical and soft skills missing.
      - Evaluate the 'Semantic Match' between the candidate's experience and the JD requirements.
      ` : 'STRATEGY: Perform a comprehensive general audit based on industry best practices.'}
      
      Return a JSON object with:
      - score (number 0-100): Calculated based on JD alignment, keyword density, and achievement quantification. Be strict.
      - atsCompatibility: Detailed assessment of parseability and sectioning.
      - keywordsFound: Technical and domain-specific keywords identified.
      - missingKeywords: Critical keywords from the JD or industry that should be added.
      - formattingSuggestions: Precise feedback on layout, white space, and visual hierarchy.
      - impactSuggestions: Actionable advice on rewriting bullets to be more 'result-oriented' (e.g., 'Led project X' vs 'Increased efficiency by 15% via project X').
      - summary: A professional executive summary of the audit findings.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: prompt }, { text: resumeText }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            atsCompatibility: { type: Type.STRING },
            keywordsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            formattingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            impactSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ["score", "atsCompatibility", "keywordsFound", "missingKeywords", "formattingSuggestions", "impactSuggestions", "summary"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  }
};

export const generateResume = async (userData: any) => {
  try {
    return await apiFetch('generate-resume', { userData });
  } catch (backendError) {
    console.log('[Neural Buffer] Performing direct client-side generation...');
    const prompt = `
      Generate a professional, ATS-friendly resume based on the following user details:
      ${JSON.stringify(userData)}
      
      Return a JSON object with sections:
      - summary: string
      - skills: string[]
      - experience: { company: string, role: string, period: string, bullets: string[] }[]
      - education: { school: string, degree: string, period: string }[]
      - projects: { name: string, description: string }[]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  period: { type: Type.STRING },
                  bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  school: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  period: { type: Type.STRING }
                }
              }
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  }
};

export const generateCoverLetter = async (resumeText: string, jobDescription: string) => {
  try {
    const result = await apiFetch('generate-cover-letter', { resumeText, jobDescription });
    return result;
  } catch (backendError) {
    console.log('[Neural Buffer] Performing direct client-side generation...');
    const prompt = `
      Generate a personalized, persuasive cover letter based on the following resume and job description.
      
      Resume: ${resumeText}
      Job Description: ${jobDescription}
      
      Return a JSON object with:
      - content: string (the full text of the cover letter)
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  }
};

export const findJobs = async (queryStr: string, location: string = "") => {
  try {
    return await apiFetch('search-jobs', { query: queryStr, location });
  } catch (backendError) {
    console.log('[Neural Buffer] Performing direct client-side search...');
    const prompt = `Search for recent job listings for "${queryStr}" in "${location}". 
    Return a JSON array of specific job opportunities.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              company: { type: Type.STRING },
              location: { type: Type.STRING },
              link: { type: Type.STRING },
              description: { type: Type.STRING },
              datePosted: { type: Type.STRING }
            },
            required: ["title", "company", "link", "location", "description"]
          }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '[]'));
  }
};

export const generateInterviewQuestions = async (jobDescription: string, resumeText: string = "") => {
  try {
    return await apiFetch('generate-interview', { jobDescription, resumeText });
  } catch (backendError) {
    console.log('[Neural Buffer] Performing direct client-side generation...');
    const prompt = `Generate interview questions for: ${jobDescription}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              category: { type: Type.STRING },
              rationale: { type: Type.STRING }
            },
            required: ["id", "question", "category"]
          }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '[]'));
  }
};

export const evaluateInterviewAnswer = async (question: string, answer: string, jobDescription: string) => {
  try {
    return await apiFetch('evaluate-answer', { question, answer, jobDescription });
  } catch (backendError) {
    console.log('[Neural Buffer] Performing direct client-side evaluation...');
    const prompt = `Evaluate answer: ${answer}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            score: { type: Type.NUMBER },
            keyPointsMissing: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["feedback", "score"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  }
};

export const generateLearningPath = async (missingSkills: string[], targetRole: string) => {
  try {
    return await apiFetch('learning-path', { missingSkills, targetRole });
  } catch (backendError) {
    const prompt = `Learning path for: ${missingSkills.join(', ')}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  }
};

export const refactorResumeText = async (text: string, context: string = "") => {
  try {
    return await apiFetch('refactor-resume', { text, context });
  } catch (backendError) {
    const prompt = `Refactor: ${text}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{}'));
  }
};

export const auditCode = async (code: string, context: any = {}) => {
  const ai = getAI();
  const prompt = `
    You are "Code Rabbit", an elite AI software engineer.
    Analyze the following code/error and provide:
    1. Root cause of the bug.
    2. Impact analysis.
    3. A corrected code snippet with best practices (TypesScript, React, etc).
    
    Context provided:
    ${JSON.stringify(context, null, 2)}
    
    Error/Snippet:
    ${code}
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            rootCause: { type: Type.STRING },
            fixedCode: { type: Type.STRING },
            bestPractices: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["explanation", "rootCause", "fixedCode", "bestPractices"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Neural response buffer is empty.");
    }

    return JSON.parse(response.text);
  } catch (err: any) {
    console.error('[Code Rabbit Error]', err);
    throw err;
  }
};
