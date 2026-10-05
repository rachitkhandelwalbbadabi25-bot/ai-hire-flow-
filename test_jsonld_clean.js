import http from 'http';
import fs from 'fs';

const pagesToTest = [
  { path: '/resume-analyzer', name: 'AI Resume Analyzer', canonical: 'https://www.aihireflow.in/resume-analyzer', file: 'dist/resume-analyzer.html' },
  { path: '/resume-editor', name: 'AI Resume Editor', canonical: 'https://www.aihireflow.in/resume-editor', file: 'dist/resume-editor.html' },
  { path: '/job-finder', name: 'AI Job Finder', canonical: 'https://www.aihireflow.in/job-finder', file: 'dist/job-finder.html' },
  { path: '/job-tracker', name: 'AI Job Tracker', canonical: 'https://www.aihireflow.in/job-tracker', file: 'dist/job-tracker.html' },
  { path: '/career-advisor', name: 'AI Career Advisor', canonical: 'https://www.aihireflow.in/career-advisor', file: 'dist/career-advisor.html' },
  { path: '/interview-lab', name: 'AI Interview Lab', canonical: 'https://www.aihireflow.in/interview-lab', file: 'dist/interview-lab.html' }
];

function fetchPage(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:3000${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('=== VERIFYING JSON-LD & CANONICAL ON LIVE SERVER ===\n');
  let allClean = true;

  for (const page of pagesToTest) {
    const res = await fetchPage(page.path);
    console.log(`Route: ${page.path}`);

    // Check status
    console.log(`  HTTP Status: ${res.statusCode}`);
    if (res.statusCode !== 200) allClean = false;

    // Check Canonical
    const canMatch = res.body.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i);
    const canHref = canMatch ? canMatch[1] : null;
    const canValid = canHref === page.canonical;
    console.log(`  Canonical: ${canHref} (${canValid ? 'MATCH' : 'MISMATCH'})`);
    if (!canValid) allClean = false;

    // Check JSON-LD
    const jsonLdMatch = res.body.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (!jsonLdMatch) {
      console.log(`  JSON-LD: MISSING`);
      allClean = false;
      continue;
    }

    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      const graph = parsed['@graph'] || [parsed];
      const org = graph.find(e => e['@type'] === 'Organization');
      const website = graph.find(e => e['@type'] === 'WebSite');
      const app = graph.find(e => e['@type'] === 'SoftwareApplication');

      console.log(`  JSON-LD Valid JSON: YES`);
      console.log(`  - Organization entity: ${org ? org.name : 'MISSING'}`);
      console.log(`  - WebSite entity: ${website ? website.url : 'MISSING'}`);
      console.log(`  - SoftwareApplication entity: ${app ? app.name + ' (' + app.url + ')' : 'MISSING'}`);
      
      const hasFakeOffer = JSON.stringify(parsed).includes('"price":"0"') || JSON.stringify(parsed).includes('"price": "0"');
      console.log(`  - Has $0 Offer block: ${hasFakeOffer ? 'YES (UNWANTED)' : 'NO - Cleaned Factual Entity (CORRECT)'}`);
      if (hasFakeOffer) allClean = false;

      if (!org || !website || !app || app.url !== page.canonical) {
        allClean = false;
      }
    } catch (err) {
      console.error(`  JSON-LD Parse Error:`, err);
      allClean = false;
    }

    console.log('');
  }

  // Check index.html as well
  const indexHtml = fs.readFileSync('dist/index.html', 'utf-8');
  const indexHasFakeOffer = indexHtml.includes('"price": "0"') || indexHtml.includes('"price":"0"');
  console.log(`dist/index.html has $0 Offer: ${indexHasFakeOffer ? 'YES (UNWANTED)' : 'NO (CORRECT)'}`);
  if (indexHasFakeOffer) allClean = false;

  console.log(`\nOVERALL: ${allClean ? 'ALL CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
}

verify().catch(console.error);
