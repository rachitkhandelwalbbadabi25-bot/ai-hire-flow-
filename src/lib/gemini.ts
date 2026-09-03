import { generateWithVelona, generateWithVelonaDetailed } from "./aiProvider";

export const cleanJson = (text: string): string => {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Extract content inside markdown code fence if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    // If opening fence exists without closing fence (e.g. truncated or at boundary)
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  return cleaned;
};

/**
 * Sanitizes raw unescaped control characters (newlines, tabs) inside JSON string literals
 * so standard JSON.parse does not fail with "Bad control character in string literal".
 */
function sanitizeControlCharsInStrings(jsonStr: string): string {
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      result += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Robust, schema-safe JSON extractor:
 * 1. Handles markdown fences and extraneous text.
 * 2. Tracks balanced depth for brackets/braces to ensure complete structure.
 * 3. Sanitizes unescaped control characters and trailing commas.
 * 4. Detects truncation and provides clear structured diagnostics without fabricating data.
 */
export const parseSafeJson = <T = any>(raw: string, fallback?: T): T => {
  if (!raw || typeof raw !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty model response received.');
  }

  const cleaned = cleanJson(raw);

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Proceed to balanced extraction
  }

  // 2. Locate outermost JSON object { ... } or array [ ... ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let targetType: 'object' | 'array' = 'object';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    targetType = 'object';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    targetType = 'array';
  }

  if (startIdx === -1) {
    if (fallback !== undefined) return fallback;
    throw new Error(`No JSON ${targetType} structure found in model response: ${cleaned.slice(0, 100)}`);
  }

  // Scan with balanced depth awareness
  let depth = 0;
  let inString = false;
  let escaped = false;
  let endIdx = -1;

  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }

  // If unclosed structure, fail cleanly without fabricating incomplete jobs or corrupt structures
  if (endIdx === -1 || depth !== 0) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Velona (GLM 5.3 Flash) response was truncated or incomplete (unclosed JSON ${targetType}, depth=${depth}). Please try again with a refined query.`);
  }

  const candidate = cleaned.slice(startIdx, endIdx + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Fallback: sanitize literal unescaped control characters in strings and remove trailing commas
    try {
      const sanitized = sanitizeControlCharsInStrings(candidate).replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(sanitized) as T;
    } catch (parseErr: any) {
      if (fallback !== undefined) return fallback;
      throw new Error(`Failed to parse extracted JSON (${targetType}): ${parseErr.message}`);
    }
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
  maxTokens,
  operation = 'general',
  meta
}: {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  operation?: string;
  meta?: {
    fileType?: string;
    charCount?: number;
    wordCount?: number;
  };
}): Promise<T> {
  let fullPrompt = prompt;
  if (jsonMode) {
    fullPrompt = `${prompt}\n\nCRITICAL: Respond ONLY with valid raw JSON matching the requested fields. No markdown fences, no conversational preamble.`;
  }

  const detailed = await generateWithVelonaDetailed({
    prompt: fullPrompt,
    systemPrompt: systemPrompt || (jsonMode 
      ? "You are an expert AI talent systems engine for AI HireFlow. Output strictly valid, concise JSON." 
      : "You are an expert career intelligence and talent system AI advisor for AI HireFlow."),
    temperature,
    jsonMode,
    maxTokens,
    operation,
    meta
  });

  if (detailed.isTruncated || detailed.finishReason === 'length') {
    throw new Error(`AI response was truncated (token limit reached: ${detailed.usage?.completion_tokens || 'max'}). Please try again with a more specific search query.`);
  }

  if (jsonMode) {
    return parseSafeJson<T>(detailed.text);
  }
  return detailed.text as unknown as T;
}

// =========================================================================
// 1. RESUME ANALYZER & ATS AUDIT ENGINE
// =========================================================================
export const analyzeResume = async (
  resumeText: string,
  jobDescription?: string,
  options?: { fileType?: string }
) => {
  // 1. Sanitize and validate the candidate's actual extracted resume content
  const cleanResume = (resumeText || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, 25000); // Allow up to 25,000 characters to ensure full multi-page resume is audited

  if (!cleanResume || cleanResume.length < 30) {
    throw new Error("The resume text is empty or too short to perform an ATS analysis. Please upload a valid resume with readable text.");
  }

  const cleanJD = (jobDescription || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 4000);

  const charCount = cleanResume.length;
  const wordCount = cleanResume.split(/\s+/).filter(Boolean).length;
  const fileType = options?.fileType || 'resume_file';

  const prompt = `
You are an Explainable AI ATS Resume Auditor & Senior Technical Recruiter for AI HireFlow.
Perform a genuine, rigorous, evidence-based ATS audit of the CANDIDATE RESUME below${cleanJD ? ' against the TARGET JOB DESCRIPTION' : ' against industry benchmarks for the candidate\'s stated role and seniority'}.

CRITICAL AUDIT RULES:
1. BASE ALL SCORES DIRECTLY ON ACTUAL RESUME EVIDENCE:
   - Evaluate only skills, technologies, metrics, accomplishments, and structure genuinely present in the resume text.
   - Quote real evidence directly from the resume for each category.
   - Do NOT produce generic, fabricated, or placeholder analysis.
   - Realistic ATS scoring distribution:
     * Unquantified or poorly aligned resumes score 40-60.
     * Solid resumes with clear experience and relevant skills score 65-80.
     * High-impact resumes with strong metrics and deep keyword alignment score 80-95.

2. FOUR REQUIRED WEIGHTED CATEGORIES (Weights must sum exactly to 100):
   - Category 1: "Core Technical & Skill Match" (Weight: 40)
   - Category 2: "Measurable Impact & Hard Metrics" (Weight: 25)
   - Category 3: "Role & Domain Relevance" (Weight: 20)
   - Category 4: "Structure & ATS Parsability" (Weight: 15)

   For EACH of the 4 categories, provide:
   - "category": string (Exact category title as listed above)
   - "weight": number (40, 25, 20, or 15)
   - "score": number (0-100 score for this category based on candidate's actual resume)
   - "earnedPoints": number (Calculated as (score / 100) * weight, rounded to 1 decimal)
   - "mathExplanation": string (e.g. "(75/100) × 40% = 30.0 pts")
   - "explanation": string (1-2 concise sentences explaining the score based on actual resume text)
   - "evidence": string (Specific quote or excerpt directly from the candidate's resume demonstrating or lacking this requirement)
   - "recommendations": array of strings (2-3 concrete, actionable improvements for this category)

3. SKILLS AUDIT:
   - "skillsAnalysis": array of 4-6 key technical & domain skills found in the resume. Each object:
     {
       "skill": string,
       "type": "explicit" | "inferred",
       "confidence_level": "high" | "medium" | "low",
       "evidence": string (Specific quote from resume where this skill appears)
     }

4. KEYWORD & GAP ANALYSIS:
   - "keywordsFound": array of 4-8 important technical keywords/tools identified in the resume.
   - "missingKeywords": array of 3-6 critical keywords/skills missing or under-represented${cleanJD ? ' based on the Job Description' : ' for this role level'}.
   - "missingKeywordAnalysis": array of 3-4 objects for the most critical missing keywords:
     {
       "keyword": string,
       "whyItMatters": string (1 concise sentence explaining ATS impact),
       "suggestedRewrite": string (1 high-impact bullet formatted with Google's XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]"),
       "confidence_level": "high" | "medium" | "low",
       "isInferred": boolean,
       "inferredNote": string
     }

5. ACTIONABLE IMPROVEMENTS & SUMMARY:
   - "formattingSuggestions": array of 2-3 specific formatting / ATS parsing suggestions.
   - "impactSuggestions": array of 2-3 concrete suggestions to quantify accomplishments with metrics.
   - "strengths": array of 2-3 standout strengths found in the candidate's resume.
   - "weaknesses": array of 2-3 key vulnerabilities or missing elements.
   - "summary": string (1-2 sentence overall assessment of candidate's profile).
   - "human_explanation": string (A candid 30-50 word hiring manager / recruiter memo on candidate readiness).

${cleanJD ? `TARGET JOB DESCRIPTION:\n${cleanJD}\n` : 'TARGET ROLE CONTEXT:\nGeneral ATS Industry Benchmark for the candidate\'s stated field & experience level\n'}

CANDIDATE RESUME (ACTUAL EXTRACTED CONTENT):
${cleanResume}

OUTPUT FORMAT:
Respond with a single raw JSON object matching these exact keys:
{
  "score": number,
  "atsCompatibility": "High" | "Moderate" | "Low",
  "scoreBreakdown": [
    {
      "category": "Core Technical & Skill Match",
      "weight": 40,
      "score": number,
      "earnedPoints": number,
      "mathExplanation": string,
      "explanation": string,
      "evidence": string,
      "recommendations": ["..."]
    },
    {
      "category": "Measurable Impact & Hard Metrics",
      "weight": 25,
      "score": number,
      "earnedPoints": number,
      "mathExplanation": string,
      "explanation": string,
      "evidence": string,
      "recommendations": ["..."]
    },
    {
      "category": "Role & Domain Relevance",
      "weight": 20,
      "score": number,
      "earnedPoints": number,
      "mathExplanation": string,
      "explanation": string,
      "evidence": string,
      "recommendations": ["..."]
    },
    {
      "category": "Structure & ATS Parsability",
      "weight": 15,
      "score": number,
      "earnedPoints": number,
      "mathExplanation": string,
      "explanation": string,
      "evidence": string,
      "recommendations": ["..."]
    }
  ],
  "skillsAnalysis": [
    { "skill": string, "type": "explicit" | "inferred", "confidence_level": "high" | "medium" | "low", "evidence": string }
  ],
  "keywordsFound": string[],
  "missingKeywords": string[],
  "missingKeywordAnalysis": [
    { "keyword": string, "whyItMatters": string, "suggestedRewrite": string, "confidence_level": "high" | "medium" | "low", "isInferred": boolean, "inferredNote": string }
  ],
  "formattingSuggestions": string[],
  "impactSuggestions": string[],
  "strengths": string[],
  "weaknesses": string[],
  "summary": string,
  "human_explanation": string
}

CONCISENESS RULES:
1. In scoreBreakdown, keep explanation under 20 words, evidence under 15 words, and recommendations to exactly 1 bullet under 15 words.
2. In skillsAnalysis, include at most 6 top technical skills.
3. In missingKeywordAnalysis, include at most 3 items with 1-sentence whyItMatters.
4. Keep formattingSuggestions, impactSuggestions, strengths, and weaknesses to exactly 2 crisp items each under 15 words.
5. Keep summary and human_explanation under 30 words each.
`;

  const rawData = await executeAICompletion({
    prompt,
    systemPrompt: "You are an expert, objective ATS Resume Auditor API for AI HireFlow powered by Velona GLM 5.3 Flash. Output strictly valid, concise raw JSON only.",
    jsonMode: true,
    temperature: 0.15,
    maxTokens: 3200,
    operation: 'resume_analysis',
    meta: {
      fileType,
      charCount,
      wordCount
    }
  });

  if (!rawData || typeof rawData !== 'object') {
    throw new Error("Resume analysis failed. Please try again.");
  }

  // Define canonical 4 categories with strict weights (40 + 25 + 20 + 15 = 100)
  const canonicalCategories = [
    { name: "Core Technical & Skill Match", weight: 40 },
    { name: "Measurable Impact & Hard Metrics", weight: 25 },
    { name: "Role & Domain Relevance", weight: 20 },
    { name: "Structure & ATS Parsability", weight: 15 }
  ];

  let rawBreakdown = Array.isArray(rawData.scoreBreakdown) ? rawData.scoreBreakdown : [];
  
  // Normalize and strictly compute earnedPoints from actual category scores
  let totalEarnedPoints = 0;
  const normalizedBreakdown = canonicalCategories.map((canon, idx) => {
    const matched = rawBreakdown.find((item: any) => 
      item?.category && item.category.toLowerCase().includes(canon.name.toLowerCase().split('&')[0].trim().toLowerCase())
    ) || rawBreakdown[idx] || {};

    const rawCatScore = typeof matched.score === 'number' ? matched.score : Number(matched.score);
    const catScore = !isNaN(rawCatScore) ? Math.min(100, Math.max(0, Math.round(rawCatScore))) : 70;
    const earned = Math.round(((catScore / 100) * canon.weight) * 10) / 10;
    totalEarnedPoints += earned;

    const explanation = typeof matched.explanation === 'string' && matched.explanation.trim()
      ? matched.explanation.trim()
      : `Evaluation of ${canon.name} based on provided resume details.`;

    const evidence = typeof matched.evidence === 'string' && matched.evidence.trim()
      ? matched.evidence.trim()
      : 'Identified relevant experience in resume.';

    const recommendations = Array.isArray(matched.recommendations) && matched.recommendations.length > 0
      ? matched.recommendations.map((r: any) => String(r).trim()).filter(Boolean)
      : [`Enhance ${canon.name.toLowerCase()} with further specific achievements.`];

    return {
      category: canon.name,
      weight: canon.weight,
      score: catScore,
      earnedPoints: earned,
      mathExplanation: `(${catScore}/100) × ${canon.weight}% = ${earned.toFixed(1)} pts`,
      explanation,
      evidence,
      recommendations
    };
  });

  const finalScore = Math.min(100, Math.max(0, Math.round(totalEarnedPoints)));
  const atsCompatibility = finalScore >= 80 ? 'High' : (finalScore >= 60 ? 'Moderate' : 'Low');

  return {
    score: finalScore,
    atsCompatibility: rawData.atsCompatibility || atsCompatibility,
    scoreBreakdown: normalizedBreakdown,
    skillsAnalysis: Array.isArray(rawData.skillsAnalysis) ? rawData.skillsAnalysis.map((s: any) => ({
      skill: String(s.skill || '').trim(),
      type: s.type === 'inferred' ? 'inferred' : 'explicit',
      confidence_level: ['high', 'medium', 'low'].includes(s.confidence_level) ? s.confidence_level : 'high',
      evidence: String(s.evidence || '').trim()
    })).filter((s: any) => s.skill) : [],
    keywordsFound: Array.isArray(rawData.keywordsFound) ? rawData.keywordsFound.map(String).filter(Boolean) : [],
    missingKeywords: Array.isArray(rawData.missingKeywords) ? rawData.missingKeywords.map(String).filter(Boolean) : [],
    missingKeywordAnalysis: Array.isArray(rawData.missingKeywordAnalysis) ? rawData.missingKeywordAnalysis.map((k: any) => ({
      keyword: String(k.keyword || '').trim(),
      whyItMatters: String(k.whyItMatters || '').trim(),
      suggestedRewrite: String(k.suggestedRewrite || '').trim(),
      confidence_level: ['high', 'medium', 'low'].includes(k.confidence_level) ? k.confidence_level : 'high',
      isInferred: Boolean(k.isInferred),
      inferredNote: String(k.inferredNote || '').trim()
    })).filter((k: any) => k.keyword) : [],
    formattingSuggestions: Array.isArray(rawData.formattingSuggestions) && rawData.formattingSuggestions.length > 0
      ? rawData.formattingSuggestions.map(String).filter(Boolean)
      : ["Ensure consistent bullet point formatting and clear section headers throughout."],
    impactSuggestions: Array.isArray(rawData.impactSuggestions) && rawData.impactSuggestions.length > 0
      ? rawData.impactSuggestions.map(String).filter(Boolean)
      : ["Incorporate quantifiable metrics and percentage growth numbers in experience bullets."],
    strengths: Array.isArray(rawData.strengths) ? rawData.strengths.map(String).filter(Boolean) : [],
    weaknesses: Array.isArray(rawData.weaknesses) ? rawData.weaknesses.map(String).filter(Boolean) : [],
    summary: typeof rawData.summary === 'string' && rawData.summary.trim()
      ? rawData.summary.trim()
      : `ATS resume audit completed with a score of ${finalScore}/100.`,
    human_explanation: typeof rawData.human_explanation === 'string' && rawData.human_explanation.trim()
      ? rawData.human_explanation.trim()
      : `The candidate presents relevant foundational capabilities with an ATS compatibility rating of ${atsCompatibility}.`
  };
};

// =========================================================================
// 2. JOB SEARCH & SEMANTIC MATCHING ENGINE
// =========================================================================
export interface JobOpportunity {
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
  datePosted: string;
  matchScore?: number;
  roleTier?: 'safe' | 'stretch' | 'reach' | string;
  matchExplanation?: string;
  isPoorFit?: boolean;
}

/**
 * Validates and normalizes job opportunities returned from the AI engine.
 * Ensures all required fields are present and safe defaults exist for optional fields.
 */
export function validateAndNormalizeJobs(rawJobs: any): JobOpportunity[] {
  let list: any[] = [];
  if (Array.isArray(rawJobs)) {
    list = rawJobs;
  } else if (rawJobs && typeof rawJobs === 'object') {
    const candidate = (rawJobs as any).jobs || (rawJobs as any).results || (rawJobs as any).opportunities || Object.values(rawJobs).find(v => Array.isArray(v));
    if (Array.isArray(candidate)) {
      list = candidate;
    }
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("No job opportunities were returned by the AI engine. Please refine your search query or location.");
  }

  const normalized: JobOpportunity[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;

    const title = String(item.title || item.role || '').trim();
    const company = String(item.company || item.employer || '').trim();
    if (!title && !company) continue;

    const location = String(item.location || 'Remote / Worldwide').trim();
    let link = String(item.link || item.url || item.applyUrl || '').trim();
    if (!link || !link.startsWith('http')) {
      link = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((company ? company + ' ' : '') + (title || 'Software Engineer'))}`;
    }

    const description = String(item.description || item.summary || 'Core responsibilities and technical deliverables.').trim();
    const datePosted = String(item.datePosted || item.posted || 'Recent').trim();

    let matchScore = typeof item.matchScore === 'number' ? Math.round(item.matchScore) : parseInt(String(item.matchScore), 10);
    if (isNaN(matchScore) || matchScore <= 0 || matchScore > 100) matchScore = 85;

    let roleTier = typeof item.roleTier === 'string' ? item.roleTier.toLowerCase().trim() : '';
    if (!['safe', 'stretch', 'reach'].includes(roleTier)) {
      roleTier = matchScore >= 85 ? 'safe' : (matchScore >= 75 ? 'stretch' : 'reach');
    }

    const matchExplanation = String(item.matchExplanation || item.explanation || 'Matches candidate core competencies and background criteria.').trim();
    const isPoorFit = Boolean(item.isPoorFit);

    normalized.push({
      title: title || 'Software Engineer',
      company: company || 'Tech Company',
      location: location || 'Remote',
      link,
      description,
      datePosted,
      matchScore,
      roleTier: roleTier as 'safe' | 'stretch' | 'reach',
      matchExplanation,
      isPoorFit
    });
  }

  if (normalized.length === 0) {
    throw new Error("Received malformed job items from AI response. Please try again.");
  }

  return normalized;
}

export const findJobs = async (queryStr: string, location: string = "", candidateProfileText: string = ""): Promise<JobOpportunity[]> => {
  const isIndianContext = location.toLowerCase().includes('india') || 
                          queryStr.toLowerCase().includes('india') ||
                          queryStr.toLowerCase().includes('bangalore') ||
                          queryStr.toLowerCase().includes('bengaluru') ||
                          queryStr.toLowerCase().includes('tcs') ||
                          queryStr.toLowerCase().includes('infosys') ||
                          queryStr.toLowerCase().includes('hyderabad') ||
                          queryStr.toLowerCase().includes('pune') ||
                          queryStr.toLowerCase().includes('delhi') ||
                          queryStr.toLowerCase().includes('gurugram') ||
                          queryStr.toLowerCase().includes('noida');

  const cleanProfile = (candidateProfileText || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 400);

  const prompt = `You are the AI Job Finder matching engine for AI HireFlow.
Synthesize 4 active, realistic job opportunities for "${queryStr}" in "${location || 'Remote / Worldwide'}".

${isIndianContext ? 'Context: Prioritize Indian tech ecosystems (top portals: Naukri, Instahyre, LinkedIn India; MNCs vs Startups).' : ''}
${cleanProfile ? `Candidate Profile Context:\n${cleanProfile}` : ''}

Output a single compact JSON array of exactly 4 job objects with these exact keys:
- title: string (exact role title)
- company: string (company name)
- location: string (city or Remote)
- link: string (realistic application URL)
- description: string (concise core duty summary under 20 words)
- datePosted: string (e.g. "Just now", "1d ago", "3d ago")
- matchScore: number (integer 60-98 based on skills/domain fit)
- roleTier: "safe" | "stretch" | "reach"
- matchExplanation: string (single crisp sentence under 15 words explaining candidate fit)
- isPoorFit: boolean (false)

OUTPUT RULES:
- Output ONLY the raw JSON array.
- No markdown formatting, no code fences, no introductory or concluding text.`;

  const results = await executeAICompletion<any>({
    prompt,
    systemPrompt: "You are an AI talent search backend API for AI HireFlow. Output strictly valid, compact JSON arrays only.",
    jsonMode: true,
    temperature: 0.15,
    maxTokens: 1600,
    operation: 'job_finder'
  });

  return validateAndNormalizeJobs(results);
};

export const matchJobsWithProfile = async (userProfileText: string, jobListings: any[]): Promise<JobOpportunity[]> => {
  const prompt = `You are a semantic job matching engine for AI HireFlow. Compare the user's profile against the given job listings and rank by true fit.

RULES:
- Score 0-100 based on skills transferability (40%), experience level match (30%), culture/scope fit (20%), location alignment (10%).
- Keep match explanations to 1 concise sentence under 15 words.
- Flag roleTier as "reach" vs "safe" vs "stretch".
- Output a compact JSON array ranked by matchScore (highest first).

User Profile:
${(userProfileText || '').slice(0, 600)}

Job Listings:
${JSON.stringify(jobListings.map(j => ({ title: j.title, company: j.company, location: j.location, description: (j.description || '').slice(0, 80) }))).slice(0, 1200)}

Return a JSON array of objects with:
- title: string
- company: string
- location: string
- link: string
- description: string (concise under 20 words)
- datePosted: string
- matchScore: number (0-100)
- roleTier: "safe" | "stretch" | "reach"
- matchExplanation: string (single sentence under 15 words)
- isPoorFit: boolean`;

  const results = await executeAICompletion({
    prompt,
    systemPrompt: "You are an AI job ranking engine for AI HireFlow. Output strictly valid, compact JSON arrays only.",
    jsonMode: true,
    temperature: 0.15,
    maxTokens: 1600,
    operation: 'job_matching'
  });

  return validateAndNormalizeJobs(results);
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
    maxTokens: 2048,
    operation: 'interview_questions'
  });

  let list: any[] = [];
  if (Array.isArray(results)) {
    list = results;
  } else if (results && typeof results === 'object') {
    list = (results as any).questions || (results as any).interviewQuestions || (results as any).items || Object.values(results).find(v => Array.isArray(v)) as any[] || [];
  }

  if (Array.isArray(list) && list.length > 0) {
    return list.map((q: any, idx: number) => ({
      id: q.id || `q${idx + 1}`,
      question: q.question || `Technical assessment question ${idx + 1}`,
      category: q.category || 'technical',
      rationale: q.rationale || 'Assesses core technical competence and role alignment.'
    }));
  }
  return [];
};

export const evaluateInterviewAnswer = async (question: string, answer: string, jobDescription: string) => {
  const prompt = `
    You are an expert technical hiring manager and system design interviewer for AI HireFlow.
    Evaluate the candidate's answer to the interview question using the STAR (Situation, Task, Action, Result) methodology and technical competency standards.

    Role Context: ${(jobDescription || 'Software Engineering / Technical Role').slice(0, 500)}
    Question: ${question}
    Candidate Answer: ${(answer || '').slice(0, 1500)}

    Return a JSON object with:
    - score: number (calibrated integer 1-10 scale)
    - starScores: object with { situation: number, task: number, action: number, result: number } (each 1-10 scale)
    - strengths: string[] (2-3 key technical strengths demonstrated)
    - weaknesses: string[] (2-3 critical gaps or missed edge cases)
    - feedback: string (2-3 sentences of candid, constructive recruiter feedback)
    - improvementTips: string[] (2-3 actionable improvements for higher scoring)
    - keyPointsMissing: string[] (2-3 key technical topics omitted)
  `;

  const res = await executeAICompletion({
    prompt,
    systemPrompt: "You are an expert technical interviewer evaluating candidate answers. Output strictly valid, concise raw JSON only.",
    jsonMode: true,
    temperature: 0.1,
    maxTokens: 2048,
    operation: 'interview_evaluation'
  });

  const parsedScore = typeof res?.score === 'number' 
    ? res.score 
    : Number(String(res?.score || '').replace(/[^0-9.]/g, '')) || 7;

  const rawStar = res?.starScores || {};
  const normalizeStarScore = (val: any, fallback: number) => {
    const num = typeof val === 'number' ? val : Number(String(val || '').replace(/[^0-9.]/g, '')) || fallback;
    return Math.min(10, Math.max(1, Math.round(num)));
  };

  const finalScore = Math.min(10, Math.max(1, Math.round(parsedScore)));

  return {
    score: finalScore,
    starScores: {
      situation: normalizeStarScore(rawStar.situation, finalScore),
      task: normalizeStarScore(rawStar.task, finalScore),
      action: normalizeStarScore(rawStar.action, finalScore),
      result: normalizeStarScore(rawStar.result, Math.max(1, finalScore - 1))
    },
    strengths: Array.isArray(res?.strengths) && res.strengths.length > 0 
      ? res.strengths 
      : ["Clear structural understanding of the core technical concept."],
    weaknesses: Array.isArray(res?.weaknesses) && res.weaknesses.length > 0 
      ? res.weaknesses 
      : (Array.isArray(res?.keyPointsMissing) ? res.keyPointsMissing : ["Could provide more quantified benchmarks and concrete failure-mode handling."]),
    feedback: res?.feedback || (finalScore >= 8 
      ? "Strong, structured answer demonstrating clear technical competence and production awareness." 
      : "Solid response covering the foundational concepts with opportunities to deepen edge-case analysis."),
    improvementTips: Array.isArray(res?.improvementTips) && res.improvementTips.length > 0 
      ? res.improvementTips 
      : ["Structure responses explicitly with the STAR framework (Situation, Task, Action, Result)."],
    keyPointsMissing: Array.isArray(res?.keyPointsMissing) ? res.keyPointsMissing : []
  };
};

// =========================================================================
// 4. LEARNING PATH & SKILL GAP ROADMAP
// =========================================================================
export const generateLearningPath = async (missingSkills: string[], targetRole: string) => {
  const prompt = `
    Generate a curated, professional learning roadmap for a candidate who is missing the following skills: ${missingSkills.join(', ')}.
    The target role is "${targetRole}".
    
    Provide curated, industry-standard learning resources from platforms like Coursera, Udemy, edX, YouTube, Official Documentation, and freeCodeCamp.
    Limit roadmap to at most 3 focused sections. For each section, provide at most 2 high-quality resources with descriptions under 15 words.
    
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

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2048
  });

  const roadmapTitle = res?.roadmapTitle || res?.title || `Accelerated Learning Path: ${targetRole}`;
  let rawSections = Array.isArray(res?.sections) ? res.sections : (Array.isArray(res?.modules) ? res.modules : (Array.isArray(res) ? res : []));

  if (!rawSections || rawSections.length === 0) {
    rawSections = (missingSkills && missingSkills.length > 0 ? missingSkills : ['Full Stack Development']).map(skill => ({
      title: `Mastering ${skill}`,
      skillsCovered: [skill],
      resources: [
        {
          name: `${skill} Official Docs & Guides`,
          platform: 'Documentation',
          link: `https://google.com/search?q=${encodeURIComponent(skill + ' official documentation tutorial')}`,
          description: `Core conceptual foundation and production best practices for ${skill}.`,
          type: 'documentation'
        },
        {
          name: `${skill} Deep Dive Crash Course`,
          platform: 'YouTube / Tech Guides',
          link: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' full tutorial crash course')}`,
          description: `Interactive project-based tutorials covering ${skill}.`,
          type: 'video'
        }
      ]
    }));
  }

  return {
    roadmapTitle,
    sections: rawSections.map((sec: any) => ({
      title: sec.title || 'Technical Module',
      skillsCovered: Array.isArray(sec.skillsCovered) ? sec.skillsCovered : [],
      resources: Array.isArray(sec.resources) ? sec.resources.map((r: any) => ({
        name: r.name || 'Learning Resource',
        platform: r.platform || 'Online',
        link: r.link || 'https://google.com',
        description: r.description || 'Recommended educational resource.',
        type: r.type || 'course'
      })) : []
    }))
  };
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
      maxTokens: 1800
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
    - Keep explanation under 25 words.
    
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
    maxTokens: 1600
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
    - Keep explanation under 20 words.

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
    maxTokens: 1800
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
    - summary: string (under 40 words)
    - skills: string[] (top 10 skills)
    - experience: { company: string, role: string, period: string, bullets: string[] }[] (max 2 bullets per role)
    - education: { school: string, degree: string, period: string }[]
    - projects: { name: string, description: string }[] (max 2 projects, description under 25 words)
  `;

  return await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2400
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
    Keep it concise, high-impact, and under 200 words across 3 focused paragraphs.
    
    Resume: ${cleanResume}
    Job Description: ${cleanJD}
    
    Return a JSON object with:
    - content: string (the full 3-paragraph text of the cover letter)
  `;

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 1800
  });

  if (res && typeof res === 'object' && res.content) {
    return { content: String(res.content).trim() };
  }
  if (typeof res === 'string') {
    return { content: res.trim() };
  }
  return { content: "Dear Hiring Team,\n\nI am eager to submit my application for this role. My technical background in building scalable, reliable applications aligns directly with the requirements outlined in the job description.\n\nThroughout my work, I have focused on delivering measurable impact, clean architecture, and rapid feature execution. I welcome the opportunity to discuss how my skill set can support your team's goals.\n\nSincerely,\nCandidate" };
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

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 1600
  });

  let subject = res?.subject || (res?.email?.subject) || `Quick note regarding ${company} engineering`;
  let body = res?.body || (res?.email?.body) || (typeof res === 'string' ? res : '');

  if (!body) {
    body = `Hi ${contactName},\n\nI’ve been following ${company}’s recent engineering advancements and wanted to reach out regarding the exciting work your team is shipping.\n\nWith my background in software architecture and full-stack systems, I'd love to connect for 15 minutes to learn more about the team's engineering roadmap.\n\nBest regards,\nCandidate`;
  }

  return {
    subject: String(subject).replace(/^["']|["']$/g, '').trim(),
    body: String(body).replace(/^```[a-z]*\n|```$/gi, '').trim()
  };
};

// =========================================================================
// 7. CODE RABBIT: AUTOMATED CODE AUDIT & DEBUGGER
// =========================================================================
export const auditCode = async (code: string, context: any = {}) => {
  const cleanCode = (code || '')
    .replace(/```/g, "'''")
    .slice(0, 3000);

  const prompt = `
    You are CodeRabbit AI, an expert static analysis and code review auditor.
    Analyze the provided source code for syntax errors, performance bottlenecks, security vulnerabilities, and architectural anti-patterns.

    Context:
    Platform: ${context.platform || 'React / TypeScript'}
    Environment: ${context.env || 'Vite'}

    Source Code to Audit:
    ${cleanCode}

    Return a JSON object with:
    - explanation: string (Clear technical summary of the code's behavior, flaws, or architecture under 50 words)
    - rootCause: string (The exact root cause under 30 words)
    - fixedCode: string (The complete, optimized, cleaned-up replacement code)
    - bestPractices: string[] (3 actionable engineering best practice recommendations, each under 15 words)
  `;

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2400
  });

  return {
    explanation: res?.explanation || "Analyzed codebase for syntax validity and performance bottlenecks.",
    rootCause: res?.rootCause || "No critical breaking exceptions identified; suggested optimizations for clean code.",
    fixedCode: res?.fixedCode || cleanCode,
    bestPractices: Array.isArray(res?.bestPractices) ? res.bestPractices : [
      "Use memoization for heavy computations",
      "Ensure clean prop drilling separation",
      "Add strict TypeScript return types"
    ]
  };
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
      maxTokens: 1600
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
    Keep round descriptions concise (under 20 words) and limit topQuestions to at most 3 questions.
    
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
    - prepStrategy: string (holistic advice under 40 words)
  `;

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2048
  });

  return {
    companyName: res?.companyName || companyName,
    difficulty: res?.difficulty || "Medium",
    estimatedPrepTime: res?.estimatedPrepTime || "3-4 Weeks",
    roundBreakdown: Array.isArray(res?.roundBreakdown) ? res.roundBreakdown : [
      { roundName: "Round 1: Online Assessment", description: "DSA & core aptitude problems", focusTopics: ["Arrays", "Strings", "Logical Reasoning"] },
      { roundName: "Round 2: Technical Interview", description: "System fundamentals & live coding", focusTopics: ["OOP", "DBMS", "Operating Systems"] },
      { roundName: "Round 3: Managerial / HR", description: "Behavioral & culture fit evaluation", focusTopics: ["STAR format", "Project walk-through"] }
    ],
    topQuestions: Array.isArray(res?.topQuestions) ? res.topQuestions : [
      { question: `Explain architectural tradeoffs in your largest project for ${companyName}.`, topic: "System Design", tip: "Focus on scalability and caching." }
    ],
    prepStrategy: res?.prepStrategy || `Focus on fundamental data structures, mock technical interviews, and company-specific past year questions for ${companyName}.`
  };
};

export const generateAptitudeQuestions = async (topic: string) => {
  const prompt = `
    Generate 5 realistic technical placement interview questions or aptitude questions for the topic: "${topic}".
    These should replicate actual questions asked in MNCs and top tech firms (TCS, Infosys, Zoho, Cognizant, Amazon, etc.).
    Keep explanations under 25 words each.
    
    Return a JSON object with:
    - topicName: string
    - questions: array of objects:
      - question: string
      - options: string[] (exactly 4 options)
      - correctIndex: number (0 to 3)
      - explanation: string (step-by-step logic under 25 words)
  `;

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2048
  });

  let rawQuestions: any[] = [];
  if (Array.isArray(res?.questions)) {
    rawQuestions = res.questions;
  } else if (Array.isArray(res)) {
    rawQuestions = res;
  } else if (res && typeof res === 'object') {
    rawQuestions = Object.values(res).find(v => Array.isArray(v)) as any[] || [];
  }

  return {
    topicName: res?.topicName || topic,
    questions: rawQuestions.map((q: any, i: number) => {
      let optionsList: string[] = [];
      if (Array.isArray(q.options)) {
        optionsList = q.options.map(String);
      } else if (q.options && typeof q.options === 'object') {
        optionsList = Object.values(q.options).map(String);
      } else {
        optionsList = ["Option A", "Option B", "Option C", "Option D"];
      }

      let correctIdx = 0;
      if (typeof q.correctIndex === 'number') {
        correctIdx = Math.min(optionsList.length - 1, Math.max(0, q.correctIndex));
      } else if (typeof q.correctOption === 'number') {
        correctIdx = Math.min(optionsList.length - 1, Math.max(0, q.correctOption));
      } else if (typeof q.correct_option === 'string') {
        const match = q.correct_option.trim().toUpperCase();
        if (match === 'A') correctIdx = 0;
        else if (match === 'B') correctIdx = 1;
        else if (match === 'C') correctIdx = 2;
        else if (match === 'D') correctIdx = 3;
      }

      return {
        question: q.question || `Practice problem ${i + 1}`,
        options: optionsList,
        correctIndex: correctIdx,
        explanation: q.explanation || "Review the step-by-step mathematical or logical solution for this problem."
      };
    })
  };
};

export const generateStartupChallenge = async (specialization: string) => {
  const prompt = `
    Generate a real-world, hands-on startup software development interview challenge for a candidate specializing in: "${specialization}".
    
    Return a JSON object with:
    - title: string
    - description: string (the functional product requirements under 40 words)
    - scaleContext: string (e.g., "Must handle 1M webhooks per hour under $10 monthly budget")
    - coreTask: string (step-by-step instructions under 40 words)
    - checklist: string[] (3 criteria for passing)
    - modelSolutionArchitecture: string (concise summary under 40 words)
  `;

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2048
  });

  return {
    title: res?.title || `High-Throughput ${specialization} Microservice`,
    description: res?.description || "Design and implement a scalable distributed service handling high concurrency.",
    scaleContext: res?.scaleContext || "Must sustain 50k requests/min with sub-50ms p99 latency.",
    coreTask: res?.coreTask || "Propose the architectural flow, database schema, and queuing strategy.",
    checklist: Array.isArray(res?.checklist) ? res.checklist : ["Data persistence strategy", "Rate limiting mechanism", "Graceful degradation under load"],
    modelSolutionArchitecture: res?.modelSolutionArchitecture || "Use Redis for caching and rate limiting, backed by PostgreSQL and BullMQ workers."
  };
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
    - description: string (under 100 characters)
    - creditCost: number (5-25 CR)
    - unlockedFeature: string
    - note: string
  `;

  const results = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2048
  });

  let list: any[] = [];
  if (Array.isArray(results)) {
    list = results;
  } else if (results && typeof results === 'object') {
    list = (results as any).plan || (results as any).days || Object.values(results).find(v => Array.isArray(v)) as any[] || [];
  }

  if (Array.isArray(list) && list.length > 0) {
    return list.map((item: any, idx: number) => ({
      day: Number(item.day) || (idx + 1),
      title: item.title || `Day ${idx + 1} Action Step`,
      description: item.description || "Complete target module in career accelerator.",
      creditCost: Number(item.creditCost) || 10,
      unlockedFeature: item.unlockedFeature || "System Access",
      note: item.note || "Recommended sequence"
    }));
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
    - feedback: string (CTO level technical assessment, 2 bullet points on strengths and bottlenecks, under 60 words)
    - scaleCheck: string (specific critique on scalability under 40 words)
  `;

  const res = await executeAICompletion({
    prompt,
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 2048
  });

  const parsedScore = typeof res?.score === 'number' ? res.score : Number(String(res?.score || '').replace(/[^0-9.]/g, '')) || 78;
  return {
    score: Math.min(100, Math.max(0, Math.round(parsedScore))),
    grade: res?.grade || (parsedScore >= 85 ? "Elite" : parsedScore >= 70 ? "Strong Pass" : "Needs Revision"),
    feedback: res?.feedback || "Solid technical approach with effective microservice decomposition.",
    scaleCheck: res?.scaleCheck || "Demonstrates reasonable understanding of asynchronous queues and throughput constraints."
  };
};
