import { generateWithVelona } from "./aiProvider";

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
    throw new Error(`Failed to parse Velona (GLM 5.3 Flash) response as JSON: ${cleaned.slice(0, 150)}`);
  }
};

/**
 * Universal AI Execution Engine:
 * Routes all AI reasoning, extraction, and generation directly through
 * Velona → GLM 5.3 Flash (z-ai/glm-5.3-flash) via secure backend proxy.
 */
async function executeAICompletion<T = any>({
  prompt,
  systemPrompt,
  jsonMode = false,
  temperature = 0.2,
  maxTokens
}: {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  let fullPrompt = prompt;
  if (jsonMode) {
    fullPrompt = `${prompt}\n\nCRITICAL: Respond ONLY with valid raw JSON matching the requested fields. No markdown fences, no conversational preamble.`;
  }

  const raw = await generateWithVelona({
    prompt: fullPrompt,
    systemPrompt: systemPrompt || (jsonMode 
      ? "You are an expert AI talent systems engine for AI HireFlow. Output strictly valid, concise JSON." 
      : "You are an expert career intelligence and talent system AI advisor for AI HireFlow."),
    temperature,
    jsonMode,
    maxTokens
  });

  if (jsonMode) {
    return parseSafeJson<T>(raw);
  }
  return raw as unknown as T;
}

// =========================================================================
// 1. RESUME ANALYZER & ATS AUDIT ENGINE
// =========================================================================
export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  // Sanitize and bound resume and job description length to preserve fast token generation
  const cleanResume = (resumeText || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, 6000);

  const cleanJD = (jobDescription || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 2500);

  const prompt = `
    You are an Explainable AI Resume Auditor and Veteran Technical Talent Leader for AI HireFlow.
    Analyze the candidate's resume against the target role/job description and produce a transparent, calibrated ATS audit report.

    AUDIT INSTRUCTIONS (KEEP STRICTLY CONCISE FOR FAST PROCESSING):
    1. HONEST SCORING (0-100 scale):
       - Generic resumes score 40-65. Above 80 is strictly for strong keyword alignment & quantifiable impact.
    2. 4 WEIGHTED CATEGORIES (Sum of earnedPoints = overall score):
       - "Core Technical & Skill Match" (Weight: 40)
       - "Measurable Impact & Hard Metrics" (Weight: 30)
       - "Role & Domain Relevance" (Weight: 15)
       - "Structure & ATS Parsability" (Weight: 15)
       For each: category, weight, score (0-100), earnedPoints ((score/100)*weight), mathExplanation (e.g. "(60/100) × 40% = 24.0 pts"), explanation (1 concise sentence under 12 words).
    3. SKILLS AUDIT (top 4 key skills):
       - skill, type ("explicit"|"inferred"), confidence_level ("high"|"medium"|"low"), evidence (max 6 words).
    4. GAP ANALYSIS (top 3 key gaps):
       - keyword, whyItMatters (max 10 words), suggestedRewrite (1 high-impact XYZ bullet under 25 words), confidence_level ("high"|"medium"|"low"), isInferred (boolean), inferredNote (max 8 words).
    5. SUGGESTIONS & RECRUITER MEMO:
       - formattingSuggestions (2 concise strings)
       - impactSuggestions (2 concise strings)
       - summary (1 concise sentence)
       - human_explanation (1 short recruiter paragraph under 40 words)

    ${cleanJD ? `TARGET JOB DESCRIPTION:\n${cleanJD}` : 'TARGET ROLE: Senior Technical Role / Industry Benchmark'}

    CANDIDATE RESUME:
    ${cleanResume}

    Return a JSON object with fields:
    - score: number (0-100)
    - atsCompatibility: "High" | "Moderate" | "Low"
    - scoreBreakdown: array of 4 objects { category, weight, score, earnedPoints, mathExplanation, explanation }
    - skillsAnalysis: array of objects { skill, type, confidence_level, evidence }
    - keywordsFound: string[]
    - missingKeywords: string[]
    - missingKeywordAnalysis: array of objects { keyword, whyItMatters, suggestedRewrite, confidence_level, isInferred, inferredNote }
    - formattingSuggestions: string[]
    - impactSuggestions: string[]
    - summary: string
    - human_explanation: string
  `;

  return await executeAICompletion({
    prompt,
    systemPrompt: "You are a fast, high-signal ATS Resume Auditor API for AI HireFlow. Output strictly valid, concise raw JSON only.",
    jsonMode: true,
    temperature: 0.1,
    maxTokens: 1600
  });
};

// =========================================================================
// 2. JOB SEARCH & SEMANTIC MATCHING ENGINE
// =========================================================================
export const findJobs = async (queryStr: string, location: string = "", candidateProfileText: string = "") => {
  const isIndianContext = location.toLowerCase().includes('india') || 
                          queryStr.toLowerCase().includes('india') ||
                          queryStr.toLowerCase().includes('bangalore') ||
                          queryStr.toLowerCase().includes('bengaluru') ||
                          queryStr.toLowerCase().includes('tcs') ||
                          queryStr.toLowerCase().includes('infosys');

  const cleanProfile = (candidateProfileText || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 800);

  const prompt = `
    You are a semantic job matching engine for AI HireFlow.
    Synthesize 4 active, realistic job opportunities for "${queryStr}" in "${location || 'Remote / Worldwide'}".

    ${isIndianContext ? `
    Context: Prioritize Indian tech ecosystems (top portals: Naukri, Instahyre, LinkedIn India; MNCs vs Startups).
    ` : ''}

    ${cleanProfile ? `CANDIDATE PROFILE HIGHLIGHTS:\n${cleanProfile}` : ''}

    RULES:
    - Score 0-100 based on skills (40%), experience (30%), domain fit (20%), location (10%).
    - Return a JSON array of exactly 4 job opportunities. Keep descriptions under 20 words and match explanations to 1 concise sentence.

    For each job, include:
    - title: string
    - company: string
    - location: string
    - link: string (realistic application URL)
    - description: string (concise summary under 20 words)
    - datePosted: string (e.g. "1 day ago", "Just now")
    - matchScore: number (0-100)
    - roleTier: "safe" | "stretch" | "reach"
    - matchExplanation: string (1 concise sentence explaining fit)
    - isPoorFit: boolean
  `;

  const results = await executeAICompletion({
    prompt,
    systemPrompt: "You are an expert AI talent systems engine for AI HireFlow. Output strictly valid, concise JSON array only.",
    jsonMode: true,
    temperature: 0.1,
    maxTokens: 1100
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
    - Output JSON array ranked by matchScore (highest first).

    User Profile:
    ${(userProfileText || '').slice(0, 1000)}

    Job Listings:
    ${JSON.stringify(jobListings).slice(0, 2000)}

    Return a JSON array of objects with:
    - title: string
    - company: string
    - location: string
    - link: string
    - description: string
    - datePosted: string
    - matchScore: number (0-100)
    - roleTier: "safe" | "stretch" | "reach"
    - matchExplanation: string
    - isPoorFit: boolean
  `;

  const results = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.1,
    maxTokens: 1000
  });

  if (Array.isArray(results)) {
    return results;
  }
  if (results && typeof results === 'object') {
    const list = (results as any).jobs || (results as any).results || Object.values(results).find(v => Array.isArray(v));
    if (Array.isArray(list)) return list;
  }
  return [];
};

// =========================================================================
// 3. INTERVIEW SIMULATOR & ANSWER EVALUATOR
// =========================================================================
export const generateInterviewQuestions = async (jobDescription: string, resumeText: string = "") => {
  const prompt = `
    Based on the following job description and candidate resume, generate a list of 5 high-signal interview questions.
    Mix behavioral, technical, and architectural questions. Keep questions crisp and rationales under 15 words.
    
    SPECIAL CONTEXT: 
    - If the role is in India, include questions typical of Indian Campus Placements (Aptitude, OOPS, DBMS, OS for MNCs like TCS/Infosys).
    - If it's for a high-growth startup, focus on ownership, distributed systems, and rapid delivery culture.
    
    Job Description: ${(jobDescription || 'Senior Software Engineer / Full Stack Developer').slice(0, 1000)}
    Candidate Resume: ${(resumeText || 'Candidate with full-stack engineering background').slice(0, 1500)}
    
    Return a JSON array where each item is:
    - id: string (unique e.g. "q1", "q2")
    - question: string
    - category: "behavioral" | "technical" | "situational"
    - rationale: string (why this question is critical for this role)
  `;

  const results = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 800
  });

  if (Array.isArray(results)) {
    return results;
  }
  if (results && typeof results === 'object') {
    const list = (results as any).questions || Object.values(results).find(v => Array.isArray(v));
    if (Array.isArray(list)) return list;
  }
  return [];
};

export const evaluateInterviewAnswer = async (question: string, answer: string, jobDescription: string) => {
  const prompt = `
    Evaluate the candidate's answer to the interview question using the STAR (Situation, Task, Action, Result) framework.
    Keep feedback under 40 words and 3 concise tips.
    
    Role Context: ${(jobDescription || '').slice(0, 500)}
    Question: ${question}
    Candidate Answer: ${(answer || '').slice(0, 1000)}
    
    Return a JSON object with:
    - feedback: string (concise recruiter feedback)
    - improvementTips: string[] (3 actionable bullet points)
    - score: number (0-10 scale)
    - keyPointsMissing: string[] (aspects omitted)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 500
  });
};

// =========================================================================
// 4. LEARNING PATH & SKILL GAP ROADMAP
// =========================================================================
export const generateLearningPath = async (missingSkills: string[], targetRole: string) => {
  const prompt = `
    Generate a curated, professional learning roadmap for a candidate who is missing the following skills: ${missingSkills.join(', ')}.
    The target role is "${targetRole}".
    
    Provide curated, industry-standard learning resources from platforms like Coursera, Udemy, edX, YouTube, Official Documentation, and freeCodeCamp.
    
    Return a JSON object with:
    - roadmapTitle: string
    - sections: array of objects {
        title: string,
        skillsCovered: string[],
        resources: array of objects {
          name: string,
          platform: string,
          link: string,
          description: string,
          type: "video" | "course" | "book" | "documentation"
        }
      }
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 800
  });
};

// =========================================================================
// 5. RESUME BULLET ENHANCER & COPYEDITOR (XYZ FORMULA)
// =========================================================================
export const improveBulletPointWithAI = async (
  bullet: string,
  roleContext: string = "",
  companyContext: string = ""
) => {
  const prompt = `
    You are an expert AI Writing Assistant and elite Technical Resume Coach embedded in a modern Resume Editor.
    Your mission: Transform candidate bullet points into high-impact, ATS-optimized statements using Google's XYZ formula:
    "Accomplished [X] as measured by [Y] by doing [Z]"

    MANDATORY RULES:
    1. XYZ FORMULA MANDATE:
       - [X] represents the accomplishment/outcome.
       - [Y] represents the quantitative measurement or realistic metric proxy.
       - [Z] represents the specific technical action or architectural approach.

    2. METRIC TRUTHFULNESS & PROXY:
       - If the original bullet contains numbers/metrics, preserve them.
       - If NO metric exists, set hasMetricProxy: true and provide realistic bracketed metric suggestions.

    3. CONFIDENCE & IMPACT:
       - confidence_level: "high" | "medium" | "low"
       - impact_estimate: (e.g. "+40% Recruiter Signal", "High ATS Keyword Match")

    ORIGINAL BULLET POINT:
    "${(bullet || '').slice(0, 400)}"

    ${roleContext ? `TARGET ROLE: ${roleContext.slice(0, 100)}` : ''}
    ${companyContext ? `COMPANY: ${companyContext.slice(0, 100)}` : ''}

    Return a JSON object with:
    - original: string
    - recruiterNote: string
    - suggestions: array of 2 objects {
        original: string,
        rewritten: string,
        reasoning: string,
        impact_estimate: string,
        confidence_level: "high" | "medium" | "low",
        focusType: string,
        hasMetricProxy: boolean,
        metricGuidance: string,
        xyzBreakdown: {
          accomplishedX: string,
          measuredByY: string,
          doingZ: string
        }
      }
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
        }
      ]
    };
  };

  try {
    const result = await executeAICompletion({
      prompt,
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 800
    });

    if (result && result.suggestions && result.suggestions.length > 0) {
      return result;
    }
  } catch (error) {
    console.warn("[Velona AI] Bullet improvement fallback triggered:", error);
  }

  return fallbackResult();
};

export const refactorResumeText = async (text: string, context: string = "") => {
  const prompt = `
    You are a resume copyeditor who specializes in quantified impact. 

    RULES:
    - Rewrite bullets using the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
    - Never fabricate numbers. If no metric exists, suggest a reasonable proxy or bracketed placeholder.
    - Maintain tense consistency.
    
    Current Text: ${(text || '').slice(0, 500)}
    ${context ? `Target Role Context: ${context.slice(0, 100)}` : ''}
    
    Return a JSON object with:
    - refactoredText: string (the polished bullet point in XYZ format)
    - explanation: string (why these changes were made, detailing X, Y, Z components)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 400
  });
};

export const rewriteResumeBullets = async (bullets: string[], targetRoleContext: string = "") => {
  const prompt = `
    You are a resume copyeditor who specializes in quantified impact. 

    RULES:
    - Rewrite bullets using the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
    - Never fabricate numbers. If no metric exists, suggest a reasonable proxy.
    - Maintain tense consistency.
    - Rank by impact potential (high/medium/low).

    Input Bullets:
    ${JSON.stringify(bullets.slice(0, 5))}

    ${targetRoleContext ? `Target Role Context: ${targetRoleContext.slice(0, 100)}` : ''}

    Return a JSON array of suggestion objects:
    - originalBullet: string
    - rewrittenBullet: string
    - impactPotential: "high" | "medium" | "low"
    - explanation: string
    - suggestedMetricProxy: string
  `;

  const results = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 800
  });

  if (Array.isArray(results)) return results;
  if (results && typeof results === 'object') {
    const list = Object.values(results).find(v => Array.isArray(v));
    if (Array.isArray(list)) return list;
  }
  return [];
};

export const generateResume = async (userData: any) => {
  const prompt = `
    Generate a professional, ATS-friendly resume based on the following user details:
    ${JSON.stringify(userData).slice(0, 3000)}
    
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
    temperature: 0.2,
    maxTokens: 1200
  });
};

export const generateCoverLetter = async (resumeText: string, jobDescription: string) => {
  const cleanResume = (resumeText || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 3000);

  const cleanJD = (jobDescription || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 1500);

  const prompt = `
    Generate a personalized, persuasive cover letter based on the following resume and job description.
    Keep it concise, high-impact, and under 250 words across 3 focused paragraphs.
    
    Resume: ${cleanResume}
    Job Description: ${cleanJD}
    
    Return a JSON object with:
    - content: string (the full 3-paragraph text of the cover letter)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 600
  });
};

// =========================================================================
// 6. NETWORKING & COLD OUTREACH EMAIL GENERATOR
// =========================================================================
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
    - Output JSON with subject + body.

    Candidate Context:
    ${(candidateContext || '').slice(0, 1000)}

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
    temperature: 0.2,
    maxTokens: 500
  });
};

// =========================================================================
// 7. CODE RABBIT: AUTOMATED CODE AUDIT & DEBUGGER
// =========================================================================
export const auditCode = async (code: string, context: any = {}) => {
  const prompt = `
    You are CodeRabbit AI, an expert static analysis and code review auditor.
    Analyze the provided source code for syntax errors, performance bottlenecks, security vulnerabilities, and architectural anti-patterns.

    Context:
    Platform: ${context.platform || 'React / TypeScript'}
    Environment: ${context.env || 'Vite'}

    Source Code to Audit:
    \`\`\`
    ${(code || '').slice(0, 3000)}
    \`\`\`

    Return a JSON object with:
    - explanation: string (Clear technical summary of the code's behavior, flaws, or architecture)
    - rootCause: string (The exact root cause of any bug, memory leak, or performance bottleneck found)
    - fixedCode: string (The complete, optimized, cleaned-up replacement code)
    - bestPractices: string[] (3-5 actionable engineering best practice recommendations)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 1100
  });
};

// =========================================================================
// 8. AI CAREER COACH & ADVISOR
// =========================================================================
export const askAICoach = async (question: string, context: string = "") => {
  const prompt = `
    You are the AI Career Advisor inside AI HireFlow. You have REAL access to the user's uploaded resume, pipeline, interview scores, and credit balance.

    REAL CANDIDATE DATA & CONTEXT:
    ${(context || 'No specific candidate context provided.').slice(0, 1200)}

    MANDATORY RULES:
    1. Reference at least one specific fact from their profile (e.g. ATS score, tracked jobs count, missing keywords, current role).
    2. If they ask about salary or negotiation, reference their current role and target role.
    3. Keep responses STRICTLY UNDER 150 WORDS total. Be crisp, strategic, and high-impact.
    4. End every response with exactly 1 specific next action in the app (e.g. "Next step: Run an ATS audit in Resume Analyzer").
    5. Tone: Strategic, direct, empathetic — like a senior engineering leader.

    Candidate Question: ${question}

    Return a JSON object with:
    - answer: string (The direct, strategic advice under 150 words)
    - actionItems: string[] (3 specific immediate action steps)
  `;

  try {
    return await executeAICompletion({
      prompt,
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 500
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

// =========================================================================
// 9. CAMPUS PLACEMENT & RECRUITMENT SUITE
// =========================================================================
export const generateCompanyPrep = async (companyName: string) => {
  const prompt = `
    You are an elite tech campus placement consultant and recruitment lead.
    Generate a tailored preparation bundle for the target company: "${companyName}".
    
    Return a JSON object with:
    - companyName: string
    - difficulty: string (e.g. "Easy", "Medium", "Hard")
    - estimatedPrepTime: string (e.g. "2-3 Weeks", "1 Month")
    - roundBreakdown: array of objects:
      - roundName: string (e.g. "Round 1: Online Assessment")
      - description: string (briefly what they ask)
      - focusTopics: string[] (specific sub-topics)
    - topQuestions: array of objects:
      - question: string (frequently asked coding or core conceptual question for this company)
      - topic: string
      - tip: string (how to tackle this)
    - prepStrategy: string (holistic advice on how to secure an offer here)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 800
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
      - options: string[] (exactly 4 options)
      - correctIndex: number (0 to 3)
      - explanation: string (detailed step-by-step logic)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 800
  });
};

export const generateStartupChallenge = async (specialization: string) => {
  const prompt = `
    Generate a real-world, hands-on startup software development interview challenge for a candidate specializing in: "${specialization}".
    
    Return a JSON object with:
    - title: string
    - description: string (the functional product requirements)
    - scaleContext: string (e.g., "Must handle 1M webhooks per hour under $10 monthly budget")
    - coreTask: string (explicit step-by-step instructions of what they must propose or implement)
    - checklist: string[] (criteria for passing)
    - modelSolutionArchitecture: string (a concise summary of how an expert would build it in modern tech stacks)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 800
  });
};

export const generateOnboardingPlan = async (resumeText: string, careerGoals: string) => {
  const prompt = `
    You are the AI Career Strategist for AI HireFlow. Analyze candidate resume and career goals, then output a hyper-personalized 7-day onboarding action plan.

    Candidate Resume Context:
    ${(resumeText || 'No resume uploaded yet.').slice(0, 1500)}

    Candidate Career Goals:
    ${(careerGoals || 'Targeting full stack engineering roles and top tier software opportunities.').slice(0, 500)}

    Return a JSON array of objects representing Day 1 through Day 7 tasks:
    - day: number (1 to 7)
    - title: string
    - description: string (under 120 characters)
    - creditCost: number (5-25 CR)
    - unlockedFeature: string
    - note: string
  `;

  const results = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 700
  });

  if (Array.isArray(results)) return results;
  if (results && typeof results === 'object') {
    const list = Object.values(results).find(v => Array.isArray(v));
    if (Array.isArray(list)) return list;
  }
  return [];
};

export const evaluateStartupSolution = async (challengeTitle: string, challengeRequirements: string, proposedSolution: string) => {
  const prompt = `
    You are a CTO from a high-growth startup.
    Evaluate the candidate's proposed solution/architecture for the startup challenge: "${challengeTitle}".
    
    Challenge Context & Requirements:
    ${(challengeRequirements || '').slice(0, 800)}
    
    Candidate's Proposed Solution:
    ${(proposedSolution || '').slice(0, 2000)}
    
    Return a JSON object with:
    - score: number (from 0 to 100)
    - grade: string (e.g. "Elite", "Strong Pass", "Needs Revision")
    - feedback: string (CTO level technical assessment, bullet points on strengths and bottlenecks)
    - scaleCheck: string (specific critique on how well they handled the scaling context)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 700
  });
};
