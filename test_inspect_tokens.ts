import { generateWithVelonaDetailed } from './src/lib/aiProvider.ts';
import { cleanJson, parseSafeJson } from './src/lib/gemini.ts';

async function test() {
  const sampleResume = `
John Doe
Senior Full Stack Engineer
San Francisco, CA | john.doe@example.com | (555) 123-4567 | linkedin.com/in/johndoe | github.com/johndoe

PROFESSIONAL SUMMARY
Senior Full Stack Engineer with 8+ years of experience building scalable web applications with React, Node.js, TypeScript, PostgreSQL, and AWS.

CORE SKILLS: React, TypeScript, Node.js, Next.js, PostgreSQL, Docker, AWS, GraphQL

EXPERIENCE
Lead Software Engineer | Acme Inc | 2021 - Present
- Led a team of 8 engineers building cloud analytics microservices with React, Next.js, and Node.js.
- Reduced PostgreSQL query latency by 45% using Redis caching.
- Spearheaded migration to AWS EKS with Docker, saving $120k annually.

Software Engineer | Beta Corp | 2018 - 2021
- Developed payment processing APIs in Node.js processing $20M monthly.
- Built dashboard in React with 99.9% uptime.

EDUCATION
B.S. in Computer Science, UC Berkeley
`;

  const prompt = `
You are an Explainable AI ATS Resume Auditor & Senior Technical Recruiter for AI HireFlow.
Perform a genuine, rigorous, evidence-based ATS audit of the CANDIDATE RESUME below against industry benchmarks for the candidate's stated role and seniority.

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
   - "missingKeywords": array of 3-6 critical keywords/skills missing or under-represented for this role level.
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

TARGET ROLE CONTEXT:
General ATS Industry Benchmark for the candidate's stated field & experience level

CANDIDATE RESUME (ACTUAL EXTRACTED CONTENT):
${sampleResume}

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

  console.log("Calling generateWithVelonaDetailed with maxTokens: 2400...");
  const detailed = await generateWithVelonaDetailed({
    prompt,
    systemPrompt: "You are an expert, objective ATS Resume Auditor API for AI HireFlow powered by Velona GLM 5.3 Flash. Output strictly valid, concise raw JSON only.",
    jsonMode: true,
    temperature: 0.7,
    maxTokens: 2400,
    operation: 'resume_analysis'
  });

  console.log("finishReason:", detailed.finishReason);
  console.log("isTruncated:", detailed.isTruncated);
  console.log("usage:", detailed.usage);
  console.log("text length:", detailed.text.length);
  console.log("text preview ends with:", detailed.text.slice(-200));

  try {
    const parsed = parseSafeJson(detailed.text);
    console.log("parseSafeJson SUCCESS! Keys:", Object.keys(parsed));
  } catch (e: any) {
    console.error("parseSafeJson FAILED:", e.message);
  }
}

test();
