import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
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
};

export const generateCoverLetter = async (resumeText: string, jobDescription: string) => {
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
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

export const findJobs = async (query: string, location: string = "") => {
  const prompt = `Search for recent job listings for "${query}" in "${location}". Pay special attention to LinkedIn job posts. 
  
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

  try {
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (e) {
    console.error("Failed to parse jobs JSON:", e);
    return [];
  }
};
