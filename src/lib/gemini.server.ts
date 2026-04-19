import { GoogleGenAI } from "@google/genai";

// Server-side initialization (using process.env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const analyzeResumeContent = async (resumeText: string, jobDescription?: string) => {
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

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }, { text: resumeText }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          score: { type: "NUMBER" },
          atsCompatibility: { type: "STRING" },
          keywordsFound: { type: "ARRAY", items: { type: "STRING" } },
          missingKeywords: { type: "ARRAY", items: { type: "STRING" } },
          formattingSuggestions: { type: "ARRAY", items: { type: "STRING" } },
          impactSuggestions: { type: "ARRAY", items: { type: "STRING" } },
          summary: { type: "STRING" }
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
};

export const searchJobsContent = async (queryStr: string, location: string = "") => {
  const prompt = `Search for recent job listings for "${queryStr}" in "${location}". Pay special attention to LinkedIn job posts. 
  
  Return a JSON array of specific job opportunities.
  For each job, include:
  - title: The job title
  - company: The company name
  - location: The geographical location
  - link: The direct URL to the job posting
  - description: A short summary of the role and requirements
  - datePosted: When it was posted if known`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            company: { type: "STRING" },
            location: { type: "STRING" },
            link: { type: "STRING" },
            description: { type: "STRING" },
            datePosted: { type: "STRING" }
          },
          required: ["title", "company", "link", "location", "description"]
        }
      }
    }
  });

  try {
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (e) {
    console.error("Failed to parse jobs JSON:", e);
    return [];
  }
};

export const generateInterviewQuestionsContent = async (jobDescription: string, resumeText: string = "") => {
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

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            question: { type: "STRING" },
            category: { type: "STRING" },
            rationale: { type: "STRING" }
          },
          required: ["id", "question", "category"]
        }
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '[]'));
};

export const generateCoverLetterContent = async (resumeText: string, jobDescription: string) => {
  const prompt = `
    Generate a personalized, persuasive cover letter based on the following resume and job description.
    
    Resume: ${resumeText}
    Job Description: ${jobDescription}
    
    Return a JSON object with:
    - content: string (the full text of the cover letter)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          content: { type: "STRING" }
        }
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

// ... other methods as needed ...
export const evaluateInterviewAnswerContent = async (question: string, answer: string, jobDescription: string) => {
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

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          feedback: { type: "STRING" },
          improvementTips: { type: "ARRAY", items: { type: "STRING" } },
          score: { type: "NUMBER" },
          keyPointsMissing: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["feedback", "score"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

export const generateLearningPathContent = async (missingSkills: string[], targetRole: string) => {
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

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          roadmapTitle: { type: "STRING" },
          sections: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                skillsCovered: { type: "ARRAY", items: { type: "STRING" } },
                resources: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING" },
                      platform: { type: "STRING" },
                      link: { type: "STRING" },
                      description: { type: "STRING" },
                      type: { type: "STRING" }
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
};

export const refactorResumeContent = async (text: string, context: string = "") => {
  const prompt = `
    Refactor the following resume text to be more impactful, professional, and result-oriented.
    Use strong action verbs and quantify achievements where possible.
    
    Current Text: ${text}
    ${context ? `Target Role Context: ${context}` : ''}
    
    Return a JSON object with:
    - refactoredText: string
    - explanation: string (why these changes were made)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          refactoredText: { type: "STRING" },
          explanation: { type: "STRING" }
        },
        required: ["refactoredText"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

export const generateResumeContent = async (userData: any) => {
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
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          skills: { type: "ARRAY", items: { type: "STRING" } },
          experience: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                company: { type: "STRING" },
                role: { type: "STRING" },
                period: { type: "STRING" },
                bullets: { type: "ARRAY", items: { type: "STRING" } }
              }
            }
          },
          education: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                school: { type: "STRING" },
                degree: { type: "STRING" },
                period: { type: "STRING" }
              }
            }
          },
          projects: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                description: { type: "STRING" }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};
