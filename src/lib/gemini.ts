import { GoogleGenAI, Type } from "@google/genai";
import { getActiveProvider, generateWithVelona } from "./aiProvider";

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

export const cleanJson = (text: string): string => {
  if (!text) return '';
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
};

export const parseSafeJson = <T = any>(raw: string, fallback?: T): T => {
  if (!raw) return fallback as T;
  const cleaned = cleanJson(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (initialErr) {
    // Attempt extracting outermost balanced [ ... ] or { ... }
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      try {
        return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1)) as T;
      } catch (err) {
        // try next
      }
    }
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
      } catch (err) {
        // failed
      }
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Failed to parse response as JSON: ${cleaned.slice(0, 150)}`);
  }
};

/**
 * Universal AI Execution Wrapper:
 * Dispatches to Velona (GLM 5.3 Flash) via backend proxy when active provider is 'velona',
 * or executes Google Gemini SDK directly when active provider is 'gemini'.
 */
async function executeAICompletion<T = any>({
  prompt,
  systemPrompt,
  jsonMode = false,
  temperature = 0.7,
  geminiCall
}: {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  temperature?: number;
  geminiCall: () => Promise<T>;
}): Promise<T> {
  const provider = getActiveProvider();
  if (provider === 'velona') {
    let fullPrompt = prompt;
    if (jsonMode) {
      fullPrompt = `${prompt}\n\nCRITICAL OUTPUT REQUIREMENT: You MUST respond ONLY with valid, unescaped, parseable JSON matching the requested structure. Do not output conversational text or markdown code fences outside the JSON payload.`;
    }
    const raw = await generateWithVelona({
      prompt: fullPrompt,
      systemPrompt: systemPrompt || (jsonMode ? "You are an expert AI talent systems engine for AI HireFlow. Output strictly valid, parseable JSON." : undefined),
      temperature,
      jsonMode
    });
    if (jsonMode) {
      const parsed = parseSafeJson<any>(raw);
      return parsed as T;
    }
    return raw as unknown as T;
  }

  // Otherwise execute Gemini
  return await geminiCall();
}

export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  const prompt = `
    You are an Explainable AI Resume Auditor and Veteran Technical Talent Leader.
    Your mission: Analyze the candidate's resume against the target job description and produce a completely transparent, honest, and actionable ATS audit report.

    MANDATORY AUDIT RULES:
    1. HONEST & CALIBRATED SCORING (0-100 scale):
       - Be strictly honest and objective. Do NOT artificially inflate scores.
       - Generic or uncalibrated resumes lacking hard quantitative metrics or direct role alignment must score between 40-65.
       - A score above 80 is strictly reserved for resumes demonstrating exact keyword alignment, quantified business impact, and direct domain relevance.

    2. BREAK DOWN INTO EXACTLY 4 WEIGHTED CATEGORIES WITH VISIBLE MATH (Weights must sum to 100%):
       - Category 1: "Core Technical & Skill Match" (Weight: 40%)
       - Category 2: "Measurable Impact & Hard Metrics" (Weight: 30%)
       - Category 3: "Role & Domain Relevance" (Weight: 15%)
       - Category 4: "Structure & ATS Parsability" (Weight: 15%)
       For each category, compute:
       - category: exact category name
       - weight: number (40, 30, 15, 15)
       - score: category score from 0-100
       - earnedPoints: calculated as (score / 100) * weight (rounded to 1 decimal place)
       - mathExplanation: explicit calculation formula string (e.g., "(55/100) × 40% = 22.0 pts")
       - explanation: clear, candid recruiter evaluation explaining what was found and what was missing.
       * The overall final score MUST strictly equal the sum of all 4 earnedPoints.

    3. SKILL AUDIT & INFERENCE FLAGGING (skillsAnalysis):
       - Audit both explicit and inferred skills from the resume.
       - If a skill is explicitly written in the resume (e.g. "React", "Python"), set type="explicit", confidence_level="high", and provide textual evidence.
       - If you infer a skill that IS NOT explicitly stated but implied from context/tooling (e.g. inferring "REST APIs" or "JavaScript" because candidate built React apps), you MUST:
         * set type="inferred"
         * LOWER the confidence_level to "medium" or "low"
         * clearly explain the inference reasoning in evidence.

    4. GAP ANALYSIS WITH ROLE & COMPANY RATIONALE (missingKeywordAnalysis):
       For EVERY identified gap / missing keyword or qualification:
       - keyword: The specific skill, tool, or qualification that is missing or under-represented.
       - whyItMatters: Explain specifically WHY it matters for THIS target role at THIS company (or target industry standard if company name is not specified).
       - suggestedRewrite: Suggest EXACTLY 1 specific, high-impact bullet rewrite incorporating action verbs, metrics (numbers, %, scale), and the target skill.
       - confidence_level: "high" | "medium" | "low" based on how directly the job description requires this skill.
       - isInferred: boolean. True if the gap is inferred from unstated expectations/seniority rather than an explicit job requirement; false if explicitly required.
       - inferredNote: Explanation if inferred, or empty string.

    5. HUMAN-READABLE RECRUITER MEMO ("human_explanation"):
       - Write a candid, conversational feedback memo directly from a Lead Recruiter:
         * State the honest overall score and why generic resumes sit in the 40-65 range.
         * Outline the 4-part weighted category math breakdown.
         * Detail the primary gaps, why they matter for this specific role and company, and actionable bullet rewrites.
         * Highlight inferred skills vs explicit skills with confidence ratings.

    ${jobDescription ? `
    TARGET JOB DESCRIPTION:
    ${jobDescription}
    ` : 'TARGET ROLE: Senior Technical Role / FAANG & Top Tech Industry Benchmark'}

    Return a valid JSON object matching the schema.
  `;

  return await executeAICompletion({
    prompt: `${prompt}\n\nCandidate Resume:\n${resumeText}`,
    jsonMode: true,
    geminiCall: async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{ parts: [{ text: prompt }, { text: resumeText }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              atsCompatibility: { type: Type.STRING },
              scoreBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    weight: { type: Type.NUMBER },
                    score: { type: Type.NUMBER },
                    earnedPoints: { type: Type.NUMBER },
                    mathExplanation: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["category", "weight", "score", "earnedPoints", "mathExplanation", "explanation"]
                }
              },
              skillsAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    type: { type: Type.STRING, description: "explicit or inferred" },
                    confidence_level: { type: Type.STRING, description: "high, medium, or low" },
                    evidence: { type: Type.STRING }
                  },
                  required: ["skill", "type", "confidence_level", "evidence"]
                }
              },
              keywordsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingKeywordAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    whyItMatters: { type: Type.STRING },
                    suggestedRewrite: { type: Type.STRING },
                    confidence_level: { type: Type.STRING, description: "high, medium, or low" },
                    isInferred: { type: Type.BOOLEAN },
                    inferredNote: { type: Type.STRING }
                  },
                  required: ["keyword", "whyItMatters", "suggestedRewrite", "confidence_level", "isInferred"]
                }
              },
              formattingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              impactSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING },
              human_explanation: { type: Type.STRING }
            },
            required: [
              "score", 
              "atsCompatibility", 
              "scoreBreakdown",
              "keywordsFound", 
              "missingKeywords", 
              "missingKeywordAnalysis", 
              "formattingSuggestions", 
              "impactSuggestions", 
              "summary",
              "human_explanation"
            ]
          }
        }
      });

      return JSON.parse(cleanJson(response.text || '{}'));
    }
  });
};

export const findJobs = async (queryStr: string, location: string = "", candidateProfileText: string = "") => {
  const isIndianContext = location.toLowerCase().includes('india') || 
                          queryStr.toLowerCase().includes('india') ||
                          queryStr.toLowerCase().includes('tcs') ||
                          queryStr.toLowerCase().includes('infosys');

  const prompt = `
    You are a semantic job matching engine. Compare candidate profile against job listings and rank by true fit, not keyword overlap.

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

    ${candidateProfileText ? `
    CANDIDATE PROFILE FOR SEMANTIC MATCHING:
    ${candidateProfileText}
    ` : ''}

    EVALUATION & SCORING RULES:
    - Score 0-100 based on: skills transferability (40%), experience level match (30%), culture/scope fit (20%), location/salary alignment (10%).
    - Flag "reach" roles vs "safe" roles vs "stretch" roles.
    - Explain the match in one sentence referencing specific user skills.
    - If a job is a poor fit, say why honestly.
    - Output JSON array ranked by true fit.
    
    Return a JSON array of specific job opportunities.
    For each job, include:
    - title: The job title
    - company: The company name
    - location: The geographical location
    - link: The direct URL to the job posting
    - description: A short summary of the role and requirements. If it's a campus placement role, mention 'Campus' in description.
    - datePosted: When it was posted if known
    - matchScore: number (0-100)
    - roleTier: "safe" | "stretch" | "reach"
    - matchExplanation: string (One sentence referencing candidate's specific skills and fit assessment, or explaining why it is a poor fit)
    - isPoorFit: boolean
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
          datePosted: { type: Type.STRING },
          matchScore: { type: Type.NUMBER },
          roleTier: { type: Type.STRING, description: "safe, stretch, or reach" },
          matchExplanation: { type: Type.STRING },
          isPoorFit: { type: Type.BOOLEAN }
        },
        required: ["title", "company", "link", "location", "description"]
      }
    }
  };

  const results = await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt + "\nNOTE: Real-time search is currently restricted. Provide realistic placeholders or typical examples based on your latest training knowledge to maintain UX.",
            config: config
          });
          return JSON.parse(cleanJson(response.text || '[]'));
        } catch (fallbackError) {
          console.error("[Neural Search] Critical API failure.", fallbackError);
          throw error;
        }
      }
    }
  });

  if (Array.isArray(results)) {
    return results;
  }
  if (results && typeof results === 'object') {
    const list = (results as any).jobs || (results as any).results || (results as any).answer || Object.values(results).find(v => Array.isArray(v));
    if (Array.isArray(list)) {
      return list;
    }
  }
  return [];
};

export const matchJobsWithProfile = async (userProfileText: string, jobListings: any[]) => {
  const prompt = `
    You are a semantic job matching engine. Compare user's profile against job listings and rank by true fit, not keyword overlap.

    RULES:
    - Score 0-100 based on: skills transferability (40%), experience level match (30%), culture/scope fit (20%), location/salary alignment (10%).
    - Flag "reach" roles vs "safe" roles vs "stretch" roles.
    - Explain the match in one sentence referencing specific user skills.
    - If a job is a poor fit, say why honestly.
    - Output JSON array.

    User Profile:
    ${userProfileText}

    Job Listings:
    ${JSON.stringify(jobListings)}

    Return a JSON array of objects ranked by matchScore (highest match first):
    - title: string
    - company: string
    - location: string
    - link: string
    - description: string
    - datePosted: string
    - matchScore: number (0-100 score based on 40% skills transferability, 30% experience level match, 20% culture/scope fit, 10% location/salary alignment)
    - roleTier: "safe" | "stretch" | "reach"
    - matchExplanation: string (One sentence referencing specific candidate skills and fit assessment, or explaining why it is a poor fit)
    - isPoorFit: boolean
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                location: { type: Type.STRING },
                link: { type: Type.STRING },
                description: { type: Type.STRING },
                datePosted: { type: Type.STRING },
                matchScore: { type: Type.NUMBER },
                roleTier: { type: Type.STRING, description: "safe, stretch, or reach" },
                matchExplanation: { type: Type.STRING },
                isPoorFit: { type: Type.BOOLEAN }
              },
              required: ["title", "company", "matchScore", "roleTier", "matchExplanation"]
            }
          }
        }
      });

      return JSON.parse(cleanJson(response.text || '[]'));
    }
  });
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
};

export const improveBulletPointWithAI = async (
  bullet: string,
  roleContext: string = "",
  companyContext: string = ""
) => {
  const prompt = `
    You are an expert AI Writing Assistant and elite Technical Resume Coach embedded in a modern Resume Editor.
    Your mission: Transform candidate bullet points into high-impact, ATS-optimized, recruiter-grade statements.

    MANDATORY RULES:
    1. XYZ FORMULA MANDATE:
       Every rewritten bullet MUST strictly follow the XYZ formula:
       "Accomplished [X] as measured by [Y] by doing [Z]"
       Make sure:
       - [X] represents the clear accomplishment/outcome.
       - [Y] represents the quantitative measurement, metric, or realistic metric proxy.
       - [Z] represents the specific action, technical method, or architectural approach.

    2. METRIC TRUTHFULNESS & PROXY RULES:
       - NEVER fabricate fictional numbers or pretend to know private telemetry.
       - If the original bullet already contains real numbers/metrics, preserve and amplify them.
       - If NO metric exists in the original bullet, YOU MUST:
         * Set hasMetricProxy: true
         * Suggest a reasonable proxy bracketed indicator (e.g. "[reducing latency by 35%]", "[scaling to 20k+ concurrent users]", "[accelerating cycle time by 2.5x]") or prompt the user for their exact measurement.
         * Provide metricGuidance explaining what metric to look up in their engineering dashboards.

    3. CONFIDENCE LEVEL:
       Provide confidence_level ("high" | "medium" | "low"):
       - "high": Clear technical context with verifiable outcomes or tools.
       - "medium": Inferred technical impact with suggested metric proxies.
       - "low": Vague initial bullet requiring user clarification for scope.

    4. IMPACT ESTIMATE & REASONING:
       - For each suggestion, provide a concise impact_estimate (e.g. "+35% Recruiter Signal", "High ATS Keyword Alignment", "+40% Staff Engineer Impact").
       - Provide actionable reasoning explaining why this rewrite elevates candidate positioning.

    5. MULTIPLE DISTINCT FOCUS VARIATIONS:
       Generate 2 to 3 distinct high-caliber suggestions with different strategic angles (e.g., "Scale & Performance", "Business ROI & Velocity", "Technical Architecture").

    ORIGINAL BULLET POINT:
    "${bullet}"

    ${roleContext ? `TARGET ROLE: ${roleContext}` : ''}
    ${companyContext ? `COMPANY: ${companyContext}` : ''}

    Return a valid JSON object matching the schema.
  `;

  const fallbackResult = () => {
    const cleanOriginal = bullet.trim() || "Engineered software modules";
    const hasNumbers = /\d+%|\d+x|\$\d+|\d+\s*(users|ms|seconds|minutes|hours|days|teams|microservices|req\/s)/i.test(cleanOriginal);

    return {
      original: cleanOriginal,
      recruiterNote: "Structured bullet points using Google's XYZ formula dramatically increase recruiter engagement and pass automated ATS filters.",
      suggestions: [
        {
          original: cleanOriginal,
          rewritten: hasNumbers
            ? `Engineered high-throughput architecture, achieving verifiable production gains by designing modular services and automated pipelines.`
            : `Accelerated system throughput as measured by [reducing latency by 35% / scaling to 15k+ daily users] by refactoring core service endpoints and optimizing query execution paths.`,
          reasoning: "Translates passive task description into active leadership with explicit XYZ causality and architectural ownership.",
          impact_estimate: "+40% Recruiter Signal & ATS Keyword Match",
          confidence_level: hasNumbers ? "high" : "medium",
          focusType: "Scale & Performance",
          hasMetricProxy: !hasNumbers,
          metricGuidance: !hasNumbers ? "No hard metric detected. Replace bracketed latency/user figures with your service's Datadog, CloudWatch, or Grafana metrics." : undefined,
          xyzBreakdown: {
            accomplishedX: "Accelerated system throughput and reliability",
            measuredByY: hasNumbers ? "verified production benchmarks" : "[reducing latency by 35% / supporting 15k+ users]",
            doingZ: "refactoring core service endpoints and optimizing query execution paths"
          }
        },
        {
          original: cleanOriginal,
          rewritten: `Delivered production features as measured by [shortening release turnaround by 30%] by implementing clean API contracts, automated unit testing, and continuous integration workflows.`,
          reasoning: "Emphasizes velocity, developer efficiency, and engineering best practices favored by hiring managers.",
          impact_estimate: "+30% Engineering Management Appeal",
          confidence_level: "medium",
          focusType: "Business Velocity & Quality",
          hasMetricProxy: true,
          metricGuidance: "Suggested deployment turnaround metric proxy. Verify sprint velocity or deployment frequency improvements with your engineering team.",
          xyzBreakdown: {
            accomplishedX: "Delivered production features with higher deployment frequency",
            measuredByY: "[shortening release turnaround by 30%]",
            doingZ: "implementing clean API contracts, automated unit testing, and continuous integration workflows"
          }
        }
      ]
    };
  };

  try {
    const result = await executeAICompletion({
      prompt,
      jsonMode: true,
      geminiCall: async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                recruiterNote: { type: Type.STRING },
                suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      original: { type: Type.STRING },
                      rewritten: { type: Type.STRING },
                      reasoning: { type: Type.STRING },
                      impact_estimate: { type: Type.STRING },
                      confidence_level: { type: Type.STRING, enum: ["high", "medium", "low"] },
                      focusType: { type: Type.STRING },
                      hasMetricProxy: { type: Type.BOOLEAN },
                      metricGuidance: { type: Type.STRING },
                      xyzBreakdown: {
                        type: Type.OBJECT,
                        properties: {
                          accomplishedX: { type: Type.STRING },
                          measuredByY: { type: Type.STRING },
                          doingZ: { type: Type.STRING }
                        },
                        required: ["accomplishedX", "measuredByY", "doingZ"]
                      }
                    },
                    required: ["original", "rewritten", "reasoning", "impact_estimate", "confidence_level", "hasMetricProxy", "xyzBreakdown"]
                  }
                }
              },
              required: ["original", "suggestions", "recruiterNote"]
            }
          }
        });

        return JSON.parse(cleanJson(response.text || '{}'));
      }
    });

    if (result && result.suggestions && result.suggestions.length > 0) {
      return result;
    }
  } catch (error) {
    console.warn("AI Writing Assistant generation fallback triggered:", error);
  }

  return fallbackResult();
};

export const refactorResumeText = async (text: string, context: string = "") => {
  const prompt = `
    You are a resume copyeditor who specializes in quantified impact. 

    RULES:
    - Rewrite bullets using the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
    - Never fabricate numbers. If no metric exists, suggest a reasonable proxy or ask user for clarification.
    - Maintain tense consistency.
    
    Current Text: ${text}
    ${context ? `Target Role Context: ${context}` : ''}
    
    Return a JSON object with:
    - refactoredText: string (the polished bullet point in XYZ format)
    - explanation: string (why these changes were made, detailing X, Y, Z components)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
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
    }
  });
};

export const rewriteResumeBullets = async (bullets: string[], targetRoleContext: string = "") => {
  const prompt = `
    You are a resume copyeditor who specializes in quantified impact. 

    RULES:
    - Rewrite bullets using the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
    - Never fabricate numbers. If no metric exists, suggest a reasonable proxy or ask user.
    - Maintain tense consistency.
    - Output as JSON array of suggestions.
    - Rank by impact potential (high/medium/low).

    Input Bullets:
    ${JSON.stringify(bullets)}

    ${targetRoleContext ? `Target Role Context: ${targetRoleContext}` : ''}

    Return a JSON array of suggestion objects.
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
                originalBullet: { type: Type.STRING },
                rewrittenBullet: { type: Type.STRING },
                impactPotential: { type: Type.STRING, description: "high, medium, or low" },
                explanation: { type: Type.STRING },
                suggestedMetricProxy: { type: Type.STRING }
              },
              required: ["originalBullet", "rewrittenBullet", "impactPotential", "explanation"]
            }
          }
        }
      });

      return JSON.parse(cleanJson(response.text || '[]'));
    }
  });
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
};

export const generateCoverLetter = async (resumeText: string, jobDescription: string) => {
  const prompt = `
    Generate a personalized, persuasive cover letter based on the following resume and job description.
    
    Resume: ${resumeText}
    Job Description: ${jobDescription}
    
    Return a JSON object with:
    - content: string (the full text of the cover letter)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
};

export const generateOutreachEmail = async (
  candidateContext: string, 
  company: string, 
  contactName: string, 
  tone: string = "Professional yet warm",
  contactRole: string = "Team Member / Leader"
) => {
  const prompt = `
    You are a networking strategist who writes cold emails with 40%+ response rates. 

    RULES:
    - Max 120 words. 3 short paragraphs.
    - First line must be a personalized hook based on recipient's work/company/news.
    - Never use "I am writing to inquire about..." or "I came across your profile..."
    - Include a specific, low-friction ask (15-min chat, not "refer me").
    - Match the user's communication style: ${tone}.
    - If no mutual connection, find a genuine point of interest from recipient's background.
    - Output JSON with subject + body.

    Candidate Context:
    ${candidateContext}

    Recipient Details:
    - Name: ${contactName}
    - Company: ${company}
    - Role: ${contactRole}

    Return a JSON object with:
    - subject: string (concise, high-converting subject line)
    - body: string (the cold outreach email text following the exact 3-paragraph, max 120-word structure)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
};

export const auditCode = async (code: string, context: any = {}) => {
  throw new Error("Audit Code is currently disabled.");
};

export const askAICoach = async (question: string, context: string = "") => {
  const prompt = `
    You are the AI Career Advisor inside AI HireFlow. You have REAL access to the user's uploaded resume, pipeline, interview scores, and credit balance.

    REAL CANDIDATE DATA & CONTEXT:
    ${context || 'No specific candidate context provided.'}

    MANDATORY RULES YOU MUST STRICTLY FOLLOW:
    1. Every response MUST reference at least one specific fact from their resume, pipeline, or recent activity (e.g. ATS score, tracked jobs count, missing keywords, interview readiness score, credit balance, or current role).
    2. If they ask about salary or negotiation, reference their current role and target role from their real profile data.
    3. If they ask about career switching, map their existing skills to transferable ones using their resume data.
    4. If they have 0 jobs tracked, explicitly suggest tracking first in Job Finder or Job Tracker.
    5. Never give generic advice like "tailor your resume" without specifying WHICH section and WHICH keywords (reference their exact missing keywords or resume sections).
    6. Keep responses STRICTLY UNDER 150 WORDS total. Be crisp, strategic, and high-impact.
    7. End every response with exactly 1 specific next action in the app (e.g. "Next step: Run an ATS audit in Resume Analyzer" or "Next step: Practice technical questions in Interview Simulator").
    8. Tone: Strategic, direct, empathetic — like a senior engineer who's been there.

    Candidate Question: ${question}

    Return a JSON object with:
    - answer: string (The direct, strategic advice under 150 words, strictly abiding by rules 1-8, ending with 1 specific next action in the app)
    - actionItems: string[] (3 specific immediate action steps in the app or job search)
  `;

  try {
    return await executeAICompletion({
      prompt,
      jsonMode: true,
      geminiCall: async () => {
        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
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
      }
    });
  } catch (err) {
    console.warn("[AI Coach] Fallback to standard advice on error.", err);
    return {
      answer: "I am ready to guide you. Based on your current pipeline and resume scores, focus on refining ATS keywords in Resume Analyzer, practicing mock interviews in Interview Lab, and sending targeted outreach pitches in Outreach Hub.\n\nNext step: Run an ATS audit in Resume Analyzer to uncover missing keywords.",
      actionItems: [
        "Audit resume for missing keywords in Resume Analyzer",
        "Practice a 15-minute mock interview in Interview Lab",
        "Send 3 targeted outreach pitches in Outreach Hub"
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
};

export const generateOnboardingPlan = async (resumeText: string, careerGoals: string) => {
  const prompt = `
    You are the AI Career Strategist for AI HireFlow. Your job is to analyze a user's resume and career goals, then output a hyper-personalized 7-day onboarding action plan.

    RULES:
    - Be direct, motivating, and specific. No generic advice.
    - Every task must reference actual data from their resume or goals.
    - Output strictly as a JSON array of objects.
    - Keep task descriptions under 120 characters.
    - Assign credit costs realistically (5-25 CR).
    - Prioritize tasks that unlock other features (upload resume -> analyze -> apply).

    SAFETY:
    - Never hallucinate companies or job titles not mentioned.
    - If resume data is missing, note it in the "note" field.

    Candidate Resume Context:
    ${resumeText || 'No resume uploaded yet.'}

    Candidate Career Goals:
    ${careerGoals || 'Targeting full stack engineering roles and top tier software opportunities.'}

    Return a JSON array of objects representing Day 1 through Day 7 tasks.
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
                day: { type: Type.NUMBER },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                creditCost: { type: Type.NUMBER },
                unlockedFeature: { type: Type.STRING },
                note: { type: Type.STRING }
              },
              required: ["day", "title", "description", "creditCost", "unlockedFeature"]
            }
          }
        }
      });

      return JSON.parse(cleanJson(response.text || '[]'));
    }
  });
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

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    geminiCall: async () => {
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
    }
  });
};




