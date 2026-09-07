import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.VELONA_API_KEY || 'sk-velona-aihireflow-prod-2026-9f8e7d6c5b4a';
  const start = Date.now();
  console.log("Calling Velona directly...");

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

  const prompt = `You are an expert ATS Resume Auditor. Analyze this candidate resume and respond with a concise JSON object:
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
      "recommendations": ["string"]
    },
    {
      "category": "Measurable Impact & Hard Metrics",
      "weight": 25,
      "score": number,
      "earnedPoints": number,
      "mathExplanation": string,
      "explanation": string,
      "evidence": string,
      "recommendations": ["string"]
    },
    {
      "category": "Role & Domain Relevance",
      "weight": 20,
      "score": number,
      "earnedPoints": number,
      "mathExplanation": string,
      "explanation": string,
      "evidence": string,
      "recommendations": ["string"]
    },
    {
      "category": "Structure & ATS Parsability",
      "weight": 15,
      "score": number,
      "earnedPoints": number,
      "mathExplanation": string,
      "explanation": string,
      "evidence": string,
      "recommendations": ["string"]
    }
  ],
  "skillsAnalysis": [
    { "skill": "string", "type": "explicit", "confidence_level": "high", "evidence": "string" }
  ],
  "keywordsFound": ["string"],
  "missingKeywords": ["string"],
  "missingKeywordAnalysis": [
    { "keyword": "string", "whyItMatters": "string", "suggestedRewrite": "string", "confidence_level": "high", "isInferred": false, "inferredNote": "" }
  ],
  "formattingSuggestions": ["string"],
  "impactSuggestions": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "summary": "string",
  "human_explanation": "string"
}

Candidate Resume:
${sampleResume}

Keep all string values under 20 words. Return RAW JSON ONLY.`;

  try {
    const res = await fetch("https://velona.in/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "z-ai/glm-5.3-flash",
        messages: [
          { role: "system", content: "You are an ATS Auditor. Return valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    const elapsed = Date.now() - start;
    const text = await res.text();
    console.log("Status:", res.status, "Elapsed:", elapsed, "ms", "Body:", text.slice(0, 300));
    let json: any = {};
    try { json = JSON.parse(text); } catch {}
    console.log("Finish reason:", json.choices?.[0]?.finish_reason);
    console.log("Content length:", json.choices?.[0]?.message?.content?.length);
    console.log("Content start:", json.choices?.[0]?.message?.content?.slice(0, 150));
    console.log("Content end:", json.choices?.[0]?.message?.content?.slice(-150));
  } catch (err) {
    console.error("Fetch error after", Date.now() - start, "ms:", err);
  }
}

run();
