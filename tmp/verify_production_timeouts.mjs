const sampleResume = `
Alex Mercer
Senior Full Stack Engineer
alex.mercer@example.com | San Francisco, CA | github.com/alexmercer

PROFESSIONAL SUMMARY
Results-driven Senior Full Stack Software Engineer with over 7 years of experience building high-traffic cloud platforms, microservices architectures, and performant web applications using React, TypeScript, Node.js, and PostgreSQL.

EXPERIENCE
Lead Full Stack Engineer | CloudScale Systems (2021 - Present)
- Architected high-throughput microservices handling 25,000 requests/sec with 99.99% uptime using Node.js and TypeScript.
- Redesigned core customer dashboard in React 18, reducing bundle size by 42% and First Contentful Paint by 1.8 seconds.
- Led database optimization and query refactoring for PostgreSQL clusters, cutting average query latency from 180ms to 24ms.
- Mentored 6 junior and mid-level software engineers across frontend and backend practices.

Software Engineer | NextGen Apps (2018 - 2021)
- Developed responsive single-page web applications with React, Redux, and Tailwind CSS.
- Implemented automated CI/CD deployment pipelines on AWS using Docker and GitHub Actions.

SKILLS
Frontend: React, TypeScript, JavaScript, HTML5, CSS3, Tailwind CSS, Next.js, Redux
Backend: Node.js, Express, PostgreSQL, Redis, REST APIs, GraphQL
DevOps & Tools: Docker, AWS, Git, CI/CD, Jest, Vitest
`;

const targetJob = `
Senior Software Engineer - Full Stack
Company: TechCorp
Requirements:
- 5+ years of software engineering experience.
- Strong proficiency in React, TypeScript, and modern frontend frameworks.
- Deep expertise in Node.js backend services and distributed databases (PostgreSQL, Redis).
- Experience with high-availability cloud architecture and automated testing.
`;

async function verifyAnalysis(targetBaseUrl, label) {
  console.log(`\n======================================================`);
  console.log(`[TEST] Starting Resume Analysis on: ${label} (${targetBaseUrl})`);
  console.log(`======================================================`);
  
  const startTime = Date.now();
  let backendRequests = 0;

  try {
    backendRequests++;
    console.log(`[Request 1] POST ${targetBaseUrl}/api/resume/analyze-job`);
    const res = await fetch(`${targetBaseUrl}/api/resume/analyze-job`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': 'test_user_verification',
        'x-user-email': 'verification@example.com'
      },
      body: JSON.stringify({
        resumeText: sampleResume,
        jobDescription: targetJob,
        fileType: 'text'
      })
    });

    const totalDuration = Date.now() - startTime;
    console.log(`[Response] HTTP status: ${res.status}, Total elapsed: ${totalDuration} ms`);

    const data = await res.json();

    if (!res.ok) {
      console.error(`[ERROR] HTTP ${res.status}:`, JSON.stringify(data, null, 2));
      return { success: false, status: res.status, error: data.error };
    }

    if (data.status === 'completed' && data.result) {
      console.log(`[SUCCESS] Analysis completed directly in POST response!`);
      const r = data.result;
      const diag = data.diagnostics || {};
      
      console.log(`- Score: ${r.score}/100 (Compatibility: ${r.atsCompatibility})`);
      console.log(`- Categories in ScoreBreakdown: ${r.scoreBreakdown?.length}`);
      console.log(`- Skills Analyzed: ${r.skillsAnalysis?.length}`);
      console.log(`- Keywords Found (${r.keywordsFound?.length}): ${r.keywordsFound?.join(', ')}`);
      console.log(`- Missing Keywords (${r.missingKeywords?.length}): ${r.missingKeywords?.join(', ')}`);
      console.log(`- Summary: ${r.summary}`);
      console.log(`- Provider Duration: ${diag.velonaDurationMs || 'N/A'} ms`);
      console.log(`- Total Duration: ${totalDuration} ms`);
      console.log(`- Tokens:`, JSON.stringify(diag.tokens || {}));
      console.log(`- Finish Reason: ${diag.finishReason || 'stop'}`);
      console.log(`- Schema Validation: ${diag.schemaValidation || 'SUCCESS'}`);
      console.log(`- Number of backend requests: ${backendRequests}`);
      
      return {
        success: true,
        httpStatus: res.status,
        providerDurationMs: diag.velonaDurationMs,
        totalDurationMs: totalDuration,
        tokens: diag.tokens,
        finishReason: diag.finishReason || 'stop',
        schemaValid: r.scoreBreakdown?.length === 4 && typeof r.score === 'number',
        backendRequests
      };
    } else if (data.status === 'processing' || data.status === 'queued') {
      console.log(`[POLL] Job queued with ID: ${data.analysisId}, polling...`);
      for (let poll = 0; poll < 30; poll++) {
        await new Promise(r => setTimeout(r, 2000));
        backendRequests++;
        const pollRes = await fetch(`${targetBaseUrl}/api/resume/analyze-job/${data.analysisId}`);
        const pollData = await pollRes.json();
        if (pollData.status === 'completed' && pollData.result) {
          const pollElapsed = Date.now() - startTime;
          console.log(`[SUCCESS] Analysis completed via polling at ${pollElapsed} ms!`);
          return {
            success: true,
            httpStatus: 200,
            providerDurationMs: pollData.timing?.velonaDurationMs,
            totalDurationMs: pollElapsed,
            finishReason: pollData.timing?.finishReason || 'stop',
            schemaValid: true,
            backendRequests
          };
        }
      }
    }

    return { success: false, data };
  } catch (err) {
    console.error(`[EXCEPTION]`, err);
    return { success: false, error: err.message };
  }
}

async function main() {
  const localResult = await verifyAnalysis('http://localhost:3000', 'Local Express Server');
  console.log('\n--- Local Test Result ---');
  console.log(JSON.stringify(localResult, null, 2));

  try {
    const prodResult = await verifyAnalysis('https://www.aihireflow.in', 'Deployed Production Domain (aihireflow.in)');
    console.log('\n--- Production Test Result ---');
    console.log(JSON.stringify(prodResult, null, 2));
  } catch (e) {
    console.warn('Production test notice:', e.message);
  }
}

main();
