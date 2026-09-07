import dotenv from 'dotenv';
dotenv.config();

async function testPrompt(name: string, max_tokens: number, promptModifier: string = '') {
  const apiKey = process.env.VELONA_API_KEY || 'sk-velona-aihireflow-prod-2026-9f8e7d6c5b4a';
  const start = Date.now();

  const prompt = `You are an expert ATS Resume Auditor for AI HireFlow.
Audit this resume against ATS benchmarks. Output strictly valid JSON matching:
{
  "score": 88,
  "atsCompatibility": "High",
  "scoreBreakdown": [
    { "category": "Core Technical & Skill Match", "weight": 40, "score": 90, "earnedPoints": 36, "mathExplanation": "(90/100)*40 = 36", "explanation": "Strong TS and React", "evidence": "Led React team", "recommendations": ["Add GraphQL"] },
    { "category": "Measurable Impact & Hard Metrics", "weight": 25, "score": 85, "earnedPoints": 21.3, "mathExplanation": "(85/100)*25 = 21.3", "explanation": "Quantified metrics present", "evidence": "Reduced latency 45%", "recommendations": ["Quantify savings"] },
    { "category": "Role & Domain Relevance", "weight": 20, "score": 90, "earnedPoints": 18, "mathExplanation": "(90/100)*20 = 18", "explanation": "Direct match for lead role", "evidence": "Lead engineer 3+ yrs", "recommendations": ["Highlight domain"] },
    { "category": "Structure & ATS Parsability", "weight": 15, "score": 85, "earnedPoints": 12.8, "mathExplanation": "(85/100)*15 = 12.8", "explanation": "Clean hierarchy", "evidence": "Clear headings", "recommendations": ["Add summary"] }
  ],
  "skillsAnalysis": [{ "skill": "React", "type": "explicit", "confidence_level": "high", "evidence": "React 18" }],
  "keywordsFound": ["React", "TypeScript"],
  "missingKeywords": ["GraphQL"],
  "missingKeywordAnalysis": [{ "keyword": "GraphQL", "whyItMatters": "Common requirement", "suggestedRewrite": "Built GraphQL APIs", "confidence_level": "high", "isInferred": false, "inferredNote": "" }],
  "formattingSuggestions": ["Keep single column"],
  "impactSuggestions": ["Add dollar values"],
  "strengths": ["Strong tech stack"],
  "weaknesses": ["Need more cloud metrics"],
  "summary": "Strong senior profile",
  "human_explanation": "Ready for senior technical screen"
}

Candidate Resume:
John Doe - Senior Engineer. React, TypeScript, Node.js, AWS, Docker. Reduced latency by 45%. Led team of 8.

${promptModifier}`;

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
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens
      })
    });
    const elapsed = Date.now() - start;
    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch {}
    const choice = json.choices?.[0];
    const content = choice?.message?.content || '';
    console.log(`[${name}] Status: ${res.status}, Time: ${elapsed}ms, Finish: ${choice?.finish_reason}, TotalTokens: ${json.usage?.total_tokens}, CompletionTokens: ${json.usage?.completion_tokens}, OutputLength: ${content.length}`);
    if (content.length > 0) {
      console.log(`[${name}] Preview start:`, content.slice(0, 100));
      console.log(`[${name}] Preview end:`, content.slice(-100));
    }
  } catch (err: any) {
    console.log(`[${name}] Error: ${err.message}`);
  }
}

async function run() {
  await testPrompt("concise_direct", 2400, "Be extremely direct and brief. Respond immediately with the raw JSON object.");
}

run();
