import { GoogleGenAI, Type } from "@google/genai";

const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const analyzeResumeContent = async (ai: GoogleGenAI, resumeText: string, jobDescription?: string) => {
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

export const searchJobsContent = async (ai: GoogleGenAI, queryStr: string, location: string = "") => {
  const prompt = `Search for recent job listings for "${queryStr}" in "${location}". 
  
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

export const generateInterviewQuestionsContent = async (ai: GoogleGenAI, jobDescription: string, resumeText: string = "") => {
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
};

export const generateCoverLetterContent = async (ai: GoogleGenAI, resumeText: string, jobDescription: string) => {
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

export const evaluateInterviewAnswerContent = async (ai: GoogleGenAI, question: string, answer: string, jobDescription: string) => {
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
};

export const generateLearningPathContent = async (ai: GoogleGenAI, missingSkills: string[], targetRole: string) => {
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
};

export const refactorResumeContent = async (ai: GoogleGenAI, text: string, context: string = "") => {
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
};

export const generateResumeContent = async (ai: GoogleGenAI, userData: any) => {
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
};
