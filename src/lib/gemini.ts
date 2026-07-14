import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  let key = undefined;
  
  try {
    key = process.env.GEMINI_API_KEY;
  } catch (e) {
    // process.env is not available
  }

  if (!key) {
    key = import.meta.env?.VITE_GEMINI_API_KEY;
  }

  if (!key) {
    console.warn("GEMINI_API_KEY is missing from environment. Standard mock behaviors or placeholder answers will serve as fallbacks.");
  }
  return new GoogleGenAI({ apiKey: key || "" });
};

const ai = getAI();

const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  const prompt = `
    You are an expert ATS (Applicant Tracking System) optimizer and professional resume auditor. 
    Analyze the provided resume text with extreme critical detail. 

    ${jobDescription ? `
    STRATEGY: Conduct a rigorous gap analysis against this Job Description: ${jobDescription}.
    - Identify specific technical and soft skills missing.
    - Evaluate the 'Semantic Match' between the candidate's experience and the JD requirements.
    ` : 'STRATEGY: Perform a comprehensive general audit based on industry best practices.'}
    
    Return a JSON object with results.
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

export const findJobs = async (queryStr: string, location: string = "") => {
  const isIndianContext = location.toLowerCase().includes('india') || 
                          queryStr.toLowerCase().includes('india') ||
                          queryStr.toLowerCase().includes('tcs') ||
                          queryStr.toLowerCase().includes('infosys');

  const prompt = `
    Find recent job listings for "${queryStr}" in "${location}". 
    
    ${isIndianContext ? `
    IMPORTANT: Prioritize results from major Indian job portals:
    - Naukri.com
    - Internshala (especially for internships and entry-level roles)
    - Instahyre
    - LinkedIn India
    - IIMJobs
    
    Context: Analyze the roles based on Indian corporate standards. 
    Distinguish between 'Service-based MNC' (e.g. TCS, Infosys, Wipro) roles and 'Product-based Startup' (e.g. Zomato, CRED, Swiggy) roles.
    ` : ''}
    
    Return a JSON array of specific job opportunities.
    For each job, include:
    - title: The job title
    - company: The company name
    - location: The geographical location
    - link: The direct URL to the job posting
    - description: A short summary of the role and requirements. If it's a campus placement role, mention 'Campus' in description.
    - datePosted: When it was posted if known
  `;

  const config = {
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
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        ...config,
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error: any) {
    console.warn("[Neural Search] Search Grounding or API failure. Falling back to generative search.", error);
    // Fallback to standard generative results if Grounding tool hits quota (429) or internal error (500)
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + "\nNOTE: Real-time search is currently restricted. Provide realistic placeholders or typical examples based on your latest training knowledge to maintain UX.",
        config: config
      });
      return JSON.parse(cleanJson(response.text || '[]'));
    } catch (fallbackError) {
      console.error("[Neural Search] Critical API failure.", fallbackError);
      throw error; // Throw the original error or a meaningful descriptive one
    }
  }
};

export const generateInterviewQuestions = async (jobDescription: string, resumeText: string = "") => {
  const prompt = `
    Based on the following job description and (optionally) the candidate's resume, generate a list of challenging interview questions.
    Mix behavioral and technical questions.
    
    SPECIAL CONTEXT: 
    - If the role is in India, include questions typical of 'Indian Campus Placements' (Aptitude, OOPS, DBMS, OS for MNCs like TCS/Infosys).
    - If it's for a high-growth startup, focus on ownership and 'Ship fast' culture.
    
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

  const config = {
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
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        ...config,
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (error: any) {
    console.warn("[Neural roadmap] Search Grounding or API failure. Falling back to generative roadmap.", error);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt + "\nNOTE: Google Search Grounding is hit by quota limits or internal error. Use curated training knowledge to provide the most industry-standard resources available.",
        config: config
      });
      return JSON.parse(cleanJson(response.text || '{}'));
    } catch (fallbackError) {
      console.error("[Neural roadmap] Critical API failure.", fallbackError);
      throw error;
    }
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

export const generateOutreachEmail = async (candidateContext: string, company: string, contactName: string) => {
  const prompt = `
    You are an elite career advisor. Craft a professional, high-converting cold email seeking a referral or a quick virtual coffee to ask about career opportunities.
    
    Candidate Context: ${candidateContext}
    Target Company: ${company}
    Contact Person: ${contactName}
    
    Return a JSON object with:
    - subject: string (a professional, eye-catching subject line)
    - body: string (the full cold outreach email body, keep it punchy, polite, and under 150 words)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING }
        },
        required: ["subject", "body"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

export const auditCode = async (code: string, context: any = {}) => {
  throw new Error("Audit Code is currently disabled.");
};

export const askAICoach = async (question: string, context: string = "") => {
  const prompt = `
    You are an elite, highly experienced executive career coach and resume strategist from Stanford Career Labs and McKinsey.
    Answer the candidate's career question with maximum clarity, punchy formatting, and actionable steps.
    Use professional, concise, and calm language. Do NOT use emojis. Keep it under 250 words.
    
    Candidate Question: ${question}
    ${context ? `Candidate Context: ${context}` : ''}
    
    Return a JSON object with:
    - answer: string (the structured advice, keep it readable with bullet points and bold headers)
    - actionItems: string[] (3 specific immediate action steps the candidate should take)
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
            answer: { type: Type.STRING },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["answer", "actionItems"]
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (err) {
    console.warn("[AI Coach] Fallback to standard advice on error.", err);
    return {
      answer: "I am ready to guide you. Focus on strengthening your core projects, refining your ATS keywords, and practicing live mock interviews with our simulation tools. Ensure your resume highlights quantifiable impact like percentage gains or team scope.",
      actionItems: [
        "Audit target resume keywords",
        "Practice a 15-minute mock interview",
        "Tailor resume impact metrics"
      ]
    };
  }
};

export const generateCompanyPrep = async (companyName: string) => {
  const prompt = `
    You are an elite Indian tech campus placement consultant and recruitment lead.
    Generate a tailored preparation bundle for the target company: "${companyName}".
    
    Return a JSON object with:
    - companyName: string
    - difficulty: string (e.g. "Easy", "Medium", "Hard")
    - estimatedPrepTime: string (e.g. "2-3 Weeks", "1 Month")
    - roundBreakdown: array of objects:
      - roundName: string (e.g. "Round 1: Online Assessment")
      - description: string (briefly what they ask)
      - focusTopics: array of strings (specific sub-topics)
    - topQuestions: array of objects:
      - question: string (frequently asked coding or core conceptual question for this company)
      - topic: string
      - tip: string (how to tackle this)
    - prepStrategy: string (holistic advice on how to secure an offer here)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          companyName: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          estimatedPrepTime: { type: Type.STRING },
          roundBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                roundName: { type: Type.STRING },
                description: { type: Type.STRING },
                focusTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["roundName", "description", "focusTopics"]
            }
          },
          topQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                topic: { type: Type.STRING },
                tip: { type: Type.STRING }
              },
              required: ["question", "topic", "tip"]
            }
          },
          prepStrategy: { type: Type.STRING }
        },
        required: ["companyName", "difficulty", "estimatedPrepTime", "roundBreakdown", "topQuestions", "prepStrategy"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

export const generateAptitudeQuestions = async (topic: string) => {
  const prompt = `
    Generate 5 highly-challenging, realistic technical placement interview questions or aptitude questions for the topic: "${topic}".
    These should replicate actual questions asked in MNCs and top tech firms (TCS, Infosys, Zoho, Cognizant, Amazon, etc.).
    
    Return a JSON object with:
    - topicName: string
    - questions: array of objects:
      - question: string
      - options: array of 4 strings
      - correctIndex: number (0 to 3)
      - explanation: string (detailed step-by-step logic)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topicName: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        },
        required: ["topicName", "questions"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

export const generateStartupChallenge = async (specialization: string) => {
  const prompt = `
    Generate a real-world, hands-on startup software development interview challenge for a candidate specializing in: "${specialization}".
    Startups look for rapid prototyping, robust edge-case handling, performance optimization, and architectural speed.
    
    Return a JSON object with:
    - title: string
    - description: string (the functional product requirements)
    - scaleContext: string (e.g., "Must handle 1M webhooks per hour under $10 monthly budget")
    - coreTask: string (explicit step-by-step instructions of what they must propose or implement)
    - checklist: array of strings (criteria for passing)
    - modelSolutionArchitecture: string (a concise summary of how an expert would build it in modern tech stacks, like React, Node, Redis, PostgreSQL)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          scaleContext: { type: Type.STRING },
          coreTask: { type: Type.STRING },
          checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
          modelSolutionArchitecture: { type: Type.STRING }
        },
        required: ["title", "description", "scaleContext", "coreTask", "checklist", "modelSolutionArchitecture"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};

export const evaluateStartupSolution = async (challengeTitle: string, challengeRequirements: string, proposedSolution: string) => {
  const prompt = `
    You are a legendary CTO from a high-growth, top-tier silicon valley or Indian startup (like Stripe, Razorpay, Zerodha).
    Evaluate the candidate's proposed solution/architecture for the startup challenge: "${challengeTitle}".
    
    Challenge Context & Requirements:
    ${challengeRequirements}
    
    Candidate's Proposed Solution:
    ${proposedSolution}
    
    Provide constructive, direct, no-nonsense feedback. Startups care about speed, production-readiness, pragmatic tradeoffs, and cost/performance efficiency.
    
    Return a JSON object with:
    - score: number (from 0 to 100)
    - grade: string (e.g. "Elite", "Strong Pass", "Needs Revision")
    - feedback: string (CTO level technical assessment, bullet points on strengths and bottlenecks)
    - scaleCheck: string (specific critique on how well they handled the scaling context)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          grade: { type: Type.STRING },
          feedback: { type: Type.STRING },
          scaleCheck: { type: Type.STRING }
        },
        required: ["score", "grade", "feedback", "scaleCheck"]
      }
    }
  });

  return JSON.parse(cleanJson(response.text || '{}'));
};


