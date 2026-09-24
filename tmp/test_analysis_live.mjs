import 'dotenv/config';

async function test() {
  const key = (process.env.VELONA_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  
  const resumeText = 'Senior Full Stack Engineer with 7 years experience designing high-scale React, TypeScript, and Node.js applications. Built microservices handling 10k req/sec.';
  const jobDesc = 'Seeking Senior Full Stack Developer proficient in React, TypeScript, Node.js, and PostgreSQL for distributed systems.';

  const prompt = `You are an ATS Resume Auditor. Analyze this resume against the target job and output strictly valid JSON.

Schema:
{
  "targetRole": "Senior Full Stack Engineer",
  "score": 88,
  "atsCompatibility": "High",
  "summary": "Strong stack match across React, TypeScript, and Node.js with scalable microservices experience.",
  "strengths": ["Deep TypeScript and React expertise", "High-throughput microservices architecture"],
  "weaknesses": [
    { "problem": "PostgreSQL query optimization details omitted", "whyItMatters": "Crucial for distributed system scale", "howToFix": "Highlight database indexing and schema work" }
  ],
  "scoreBreakdown": [
    { "category": "Core Technical & Skill Match", "weight": 40, "score": 92, "explanation": "React, TypeScript, Node.js alignment", "evidence": "7 years experience", "recommendations": ["Add PostgreSQL metrics"] },
    { "category": "Measurable Impact & Hard Metrics", "weight": 25, "score": 85, "explanation": "10k req/sec high-throughput metric", "evidence": "Microservices benchmark", "recommendations": ["Add latency reduction"] },
    { "category": "Role & Domain Relevance", "weight": 20, "score": 88, "explanation": "Senior role title and scope match", "evidence": "Full stack role", "recommendations": ["Emphasize system architecture"] },
    { "category": "Structure & ATS Parsability", "weight": 15, "score": 90, "explanation": "Clean standard sections and formatting", "evidence": "Parsed accurately", "recommendations": ["Maintain clean layout"] }
  ],
  "skillsAnalysis": [
    { "skill": "React", "type": "explicit", "confidence_level": "high", "evidence": "Frontend design" },
    { "skill": "Node.js", "type": "explicit", "confidence_level": "high", "evidence": "Microservices" }
  ],
  "keywordsFound": ["React", "TypeScript", "Node.js", "PostgreSQL"],
  "missingKeywords": ["AWS"],
  "recommendations": ["Detail distributed caching", "Add database benchmarks"]
}
STRICT CONSTRAINTS:
- All 4 categories in scoreBreakdown MUST be present.
- Keep all explanations, problem statements, and recommendations strictly under 12 words.
- Output raw valid JSON only without markdown code fences or conversational text.

TARGET JOB:
${jobDesc}

CANDIDATE RESUME:
${resumeText}
`;

  const startTime = Date.now();
  console.log('[Safe Diagnostic] Request started at:', new Date(startTime).toISOString());

  const res = await fetch('https://velona.in/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: 'z-ai/glm-5.3-flash',
      messages: [
        { role: 'system', content: 'You are an ultra-fast ATS scoring engine for AI HireFlow. Output raw valid JSON only. Keep explanations concise and adhere to schema limits.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      stream: false,
      max_tokens: 1800
    })
  });

  const duration = Date.now() - startTime;
  console.log('[Safe Diagnostic] Request finished at:', new Date().toISOString(), 'Elapsed:', duration, 'ms', 'HTTP status:', res.status);

  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content || '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  console.log('[Result] ATS Score:', parsed.score);
  console.log('[Result] Target Role:', parsed.targetRole);
  console.log('[Result] Categories in ScoreBreakdown:', parsed.scoreBreakdown?.length);
  console.log('[Result] Keywords Found:', parsed.keywordsFound);
  console.log('[Success] Complete ATS payload generated and parsed in', duration, 'ms without timeout.');
}

test().catch(e => console.error('Test error:', e));
