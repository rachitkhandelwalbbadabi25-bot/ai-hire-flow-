import { GoogleGenAI, Type } from "@google/genai";

// Initialize client-side GenAI
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
};

const ai = getAI();

const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  const prompt = `
    Analyze the following resume text. 
    ${jobDescription ? `Compare it against this job description: ${jobDescription}` : 'Provide a general analysis.'}
    
    Return a JSON object with:
    - score: number (0-100)
    - atsCompatibility: string
    - keywordsFound: string[]
    - missingKeywords: string[]
    - formattingSuggestions: string[]
    - impactSuggestions: string[]
    - summary: string
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
          required: [
            "score", 
            "atsCompatibility", 
            "keywordsFound", 
            "missingKeywords", 
            "formattingSuggestions", 
            "impactSuggestions", 
            "summary"
          ]
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (err: any) {
    console.error('[Analyze Resume Error]', err);
    throw err;
  }
};

export const generateResume = async (userData: any) => {
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (err: any) {
    console.error('[Generate Resume Error]', err);
    throw err;
  }
};

export const generateCoverLetter = async (resumeText: string, jobDescription: string) => {
  const prompt = `
    Generate a personalized, persuasive cover letter based on the following resume and job description.
    
    Resume: ${resumeText}
    Job Description: ${jobDescription}
    
    Return a JSON object with:
    - content: string (the full text of the cover letter)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (err: any) {
    console.error('[Generate Cover Letter Error]', err);
    throw err;
  }
};

export const findJobs = async (queryStr: string, location: string = "") => {
  const prompt = `Search for recent job listings for "${queryStr}" in "${location}". Pay special attention to LinkedIn job posts. 
  
  Return a JSON array of specific job opportunities.
  For each job, include:
  - title: The job title
  - company: The company name
  - location: The geographical location
  - link: The direct URL to the job posting
  - description: A short summary of the role and requirements
  - datePosted: When it was posted if known`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (err: any) {
    console.error('[Find Jobs Error]', err);
    throw err;
  }
};

export const generateInterviewQuestions = async (jobDescription: string, resumeText: string = "") => {
  const prompt = `
    Based on the following job description and (optionally) the candidate's resume, generate a list of challenging interview questions.
    Mix behavioral and technical questions.
    
    Job Description: ${jobDescription}
    Candidate Resume: ${resumeText}
    
    Return a JSON array where each item is:
    - id: string (unique)
    - question: string
    - category: "behavioral" | "technical" | "situational"
    - rationale: string (why this question is being asked for this role)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (err: any) {
    console.error('[Generate Interview Error]', err);
    throw err;
  }
};

export const evaluateInterviewAnswer = async (question: string, answer: string, jobDescription: string) => {
  const prompt = `
    Evaluate the candidate's answer to the following interview question for a specific role.
    
    Role Context: ${jobDescription}
    Question: ${question}
    Candidate Answer: ${answer}
    
    Return a JSON object with:
    - feedback: string
    - improvementTips: string[]
    - score: number (0-10)
    - keyPointsMissing: string[]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (err: any) {
    console.error('[Evaluate Answer Error]', err);
    throw err;
  }
};

export const generateLearningPath = async (missingSkills: string[], targetRole: string) => {
  const prompt = `
    Generate a highly-rated, professional learning path for a candidate who is missing the following skills: ${missingSkills.join(', ')}.
    The target role is "${targetRole}".
    
    Use Google Search to find real, highly-rated courses from Coursera, Udemy, edX, and YouTube.
    
    Return a JSON object with:
    - roadmapTitle: string
    - sections: {
        title: string,
        skillsCovered: string[],
        resources: {
          name: string,
          platform: string,
          link: string,
          description: string,
          type: "video" | "course" | "book" | "documentation"
        }[]
      }[]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roadmapTitle: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  skillsCovered: { type: Type.ARRAY, items: { type: Type.STRING } },
                  resources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        platform: { type: Type.STRING },
                        link: { type: Type.STRING },
                        description: { type: Type.STRING },
                        type: { type: Type.STRING }
                      },
                      required: ["name", "platform", "link", "type"]
                    }
                  }
                },
                required: ["title", "skillsCovered", "resources"]
              }
            }
          },
          required: ["roadmapTitle", "sections"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (err: any) {
    console.error('[Learning Path Error]', err);
    throw err;
  }
};

export const refactorResumeText = async (text: string, context: string = "") => {
  const prompt = `
    Refactor the following resume text to be more impactful, professional, and result-oriented.
    Use strong action verbs and quantify achievements where possible.
    
    Current Text: ${text}
    ${context ? `Target Role Context: ${context}` : ''}
    
    Return a JSON object with:
    - refactoredText: string
    - explanation: string (why these changes were made)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refactoredText: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["refactoredText"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (err: any) {
    console.error('[Refactor Resume Error]', err);
    throw err;
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
