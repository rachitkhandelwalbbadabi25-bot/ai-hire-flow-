import fs from 'fs';
import path from 'path';

interface SEOPageConfig {
  path: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  category: string;
  features: { title: string; desc: string }[];
  aliases?: string[];
}

const pages: SEOPageConfig[] = [
  {
    path: '/resume-analyzer',
    name: 'AI Resume Analyzer',
    title: 'AI Resume Analyzer | ATS Compatibility & Keyword Audit — AI HireFlow',
    description: 'Analyze your resume with AI HireFlow\'s advanced AI Resume Analyzer. Get instant ATS compatibility scores, keyword gap audits, metric density evaluations, and actionable bullet rewrites.',
    h1: 'AI Resume Analyzer',
    lead: 'Audit your resume with senior recruiter rigor. Detect missing technical keywords, eliminate ATS parsing roadblocks, evaluate quantifiable impact metrics, and optimize your qualifications for target positions.',
    category: 'BusinessApplication',
    features: [
      { title: 'Explainable ATS Compatibility Scoring', desc: 'Transparent 4-category weighted breakdown across technical skills, impact metrics, role relevance, and parsability.' },
      { title: 'Target Keyword Gap Analysis', desc: 'Compares your actual resume evidence against target job descriptions with situational rewrite recommendations.' },
      { title: 'STAR Impact & Metric Evaluation', desc: 'Identifies vague task descriptions and upgrades bullets with verifiable business outcomes and scale.' }
    ],
    aliases: ['/ats-resume-checker']
  },
  {
    path: '/resume-editor',
    name: 'AI Resume Editor',
    title: 'AI Resume Editor | ATS-Compliant Resume Builder — AI HireFlow',
    description: 'Create and edit ATS-compliant resumes with AI HireFlow\'s AI Resume Editor. Transform bullet points with STAR impact metrics, single-column formatting, and instant PDF download.',
    h1: 'AI Resume Editor',
    lead: 'Craft beautiful, ATS-optimized resumes engineered for recruiter review. Upgrade your bullets with quantifiable impact metrics, maintain clean section hierarchy, and download ready-to-submit PDFs instantly.',
    category: 'BusinessApplication',
    features: [
      { title: 'Single-Column ATS Compliance', desc: 'Engineered specifically to parse flawlessly through Workday, Taleo, Greenhouse, and Lever screening algorithms.' },
      { title: 'AI Bullet Polish & STAR Metrics', desc: 'Enhance responsibilities into high-impact accomplishments using proven action verbs and quantifiable frameworks.' },
      { title: 'One-Click Instant PDF Export', desc: 'Clean vector typography with standard section header tags and zero formatting corruption.' }
    ],
    aliases: ['/resume-builder']
  },
  {
    path: '/job-finder',
    name: 'AI Job Finder',
    title: 'AI Job Finder | Semantic Job Search & Match Engine — AI HireFlow',
    description: 'Discover targeted job openings with AI HireFlow\'s AI Job Finder. Compare your skills directly against job descriptions with semantic compatibility scoring and instant application intelligence.',
    h1: 'AI Job Finder',
    lead: 'Stop scrolling endless generic job boards. Discover roles that genuinely match your tech stack, evaluate qualification alignment in seconds, and target opportunities with verified hiring velocity.',
    category: 'BusinessApplication',
    features: [
      { title: 'Semantic Keyword Matching', desc: 'Matches target positions based on deep skill overlap rather than superficial job title keyword matches.' },
      { title: 'Real-Time Match Percentage', desc: 'See your qualification score against every listed opportunity before investing time into applying.' },
      { title: 'Direct Application Intelligence', desc: 'Identify target hiring managers, required qualifications, and interview preparation tracks instantly.' }
    ],
    aliases: ['/ai-job-search']
  },
  {
    path: '/job-tracker',
    name: 'AI Job Tracker',
    title: 'AI Job Tracker | Kanban Application Pipeline & Follow-Ups — AI HireFlow',
    description: 'Organize your job search with AI HireFlow\'s AI Job Tracker. Manage applications, interview rounds, recruiter follow-ups, and offer negotiations in a dedicated career Kanban board.',
    h1: 'AI Job Tracker',
    lead: 'Eliminate messy spreadsheets and forgotten recruiter emails. Track your active applications through every stage of the hiring pipeline with automated stage progression, timeline tracking, and interview scheduling.',
    category: 'BusinessApplication',
    features: [
      { title: 'Visual Kanban Pipeline', desc: 'Drag-and-drop management for Applied, Screening, Technical Loop, and Offer Negotiation stages.' },
      { title: 'Automated Follow-Up Reminders', desc: 'Never lose momentum with timely notifications for recruiter check-ins and thank-you notes.' },
      { title: 'Centralized Role Notes & Collateral', desc: 'Attach customized resumes, cover letters, and interview notes to each application card.' }
    ],
    aliases: []
  },
  {
    path: '/career-advisor',
    name: 'AI Career Advisor',
    title: 'AI Career Advisor | Personalized Skill Roadmaps & Growth — AI HireFlow',
    description: 'Accelerate your tech career with AI HireFlow\'s AI Career Advisor. Identify technical skill gaps, generate milestone-driven learning roadmaps, and build project portfolios that recruiters notice.',
    h1: 'AI Career Advisor',
    lead: 'Navigate your tech career with clarity. Automatically detect missing qualifications between your current profile and target senior roles, then generate actionable, milestone-driven learning roadmaps.',
    category: 'EducationalApplication',
    features: [
      { title: 'Gap-to-Milestone Roadmaps', desc: 'Convert detected technical deficiencies into step-by-step project-based learning objectives.' },
      { title: 'Market Demand Calibration', desc: 'Prioritize skills based on hiring volume and compensation benchmarks across tier-1 tech companies.' },
      { title: 'Proof-of-Work Project Blueprints', desc: 'Receive detailed architecture outlines for portfolio projects that validate technical competency.' }
    ],
    aliases: ['/career-roadmap']
  },
  {
    path: '/interview-lab',
    name: 'AI Interview Lab',
    title: 'AI Interview Lab | Technical & Behavioral Mock Simulator — AI HireFlow',
    description: 'Practice realistic mock interviews with AI HireFlow\'s AI Interview Lab. Get real-time AI feedback on technical accuracy, STAR behavioral structure, communication conciseness, and delivery.',
    h1: 'AI Interview Lab',
    lead: 'Master your technical loops and behavioral rounds before speaking to recruiters. Conduct simulated interviews with adaptive AI interviewers and receive instant, objective critiques on clarity, STAR structure, and technical depth.',
    category: 'EducationalApplication',
    features: [
      { title: 'Role-Specific Adaptive Scenarios', desc: 'Practice real questions asked at top tech employers tailored to your exact tech stack and seniority.' },
      { title: 'Instant STAR Delivery Feedback', desc: 'Get analyzed on Situation, Task, Action, and Result framing with actionable pointers on conciseness.' },
      { title: 'Technical Architecture Deep-Dives', desc: 'Defend system design decisions and trade-offs under probing technical interviewer prompts.' }
    ],
    aliases: ['/ai-interview-preparation']
  }
];

function generateHtmlForPage(templateHtml: string, config: SEOPageConfig): string {
  const canonicalUrl = `https://www.aihireflow.in${config.path}`;
  
  // Construct Schema.org JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.aihireflow.in/#organization",
        "name": "AI HireFlow",
        "url": "https://www.aihireflow.in/",
        "logo": "https://www.aihireflow.in/logo.svg",
        "description": "AI-powered career operating system for resume analysis, ATS optimization, semantic job search, application tracking, and AI interview simulations."
      },
      {
        "@type": "WebSite",
        "@id": "https://www.aihireflow.in/#website",
        "url": "https://www.aihireflow.in/",
        "name": "AI HireFlow",
        "description": "AI-Powered Career Platform — Resume Analyzer, Job Finder, Resume Editor, Job Tracker, Career Advisor, and Interview Lab.",
        "publisher": {
          "@id": "https://www.aihireflow.in/#organization"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${canonicalUrl}#software`,
        "name": `AI HireFlow ${config.name}`,
        "url": canonicalUrl,
        "applicationCategory": config.category,
        "operatingSystem": "Web",
        "description": config.description
      }
    ]
  };

  const jsonLdScript = `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`;

  // Semantic crawlable static body content inside #root
  const semanticRootContent = `
    <div class="min-h-screen bg-[#0a0a0a] text-white">
      <header class="border-b border-[#262626] bg-[#121212]/90 px-6 py-4 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2 font-black text-sm tracking-wider uppercase text-white">
          <span class="text-emerald-400">AI</span> HireFlow
        </a>
        <nav class="flex items-center gap-4 text-xs font-mono text-neutral-400">
          <a href="/resume-analyzer" class="hover:text-white">Resume Analyzer</a>
          <a href="/resume-editor" class="hover:text-white">Resume Editor</a>
          <a href="/job-finder" class="hover:text-white">Job Finder</a>
          <a href="/job-tracker" class="hover:text-white">Job Tracker</a>
          <a href="/career-advisor" class="hover:text-white">Career Advisor</a>
          <a href="/interview-lab" class="hover:text-white">Interview Lab</a>
        </nav>
      </header>
      <main class="max-w-5xl mx-auto px-6 py-16 text-center">
        <div class="inline-block bg-[#1a1a1a] border border-[#333] px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-6">
          AI HireFlow Core Capability
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-white">${config.h1}</h1>
        <p class="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto mb-10 leading-relaxed">${config.lead}</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-16">
          ${config.features.map(f => `
            <div class="p-6 rounded-2xl bg-[#141414] border border-[#262626]">
              <h2 class="text-base font-bold text-white mb-2">${f.title}</h2>
              <p class="text-xs text-neutral-400 leading-relaxed">${f.desc}</p>
            </div>
          `).join('')}
        </div>
      </main>
    </div>
  `.trim();

  let html = templateHtml;

  // Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${config.title}</title>`);

  // Replace Meta Description
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${config.description}" />`);

  // Replace Canonical Tag
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  // Replace OpenGraph Title & Description & URL
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${config.title}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${config.description}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

  // Replace Twitter Title & Description & URL
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${config.title}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${config.description}" />`);
  html = html.replace(/<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);

  // Replace JSON-LD Schema
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);

  // Inject semantic crawlable markup inside #root
  html = html.replace(/<div\s+id="root">\s*<\/div>/i, `<div id="root">${semanticRootContent}</div>`);

  return html;
}

export function generateAllSeoPages() {
  const distDir = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('Error: dist/index.html not found! Run vite build first.');
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  console.log('[AI HireFlow SEO Generator] Generating pre-rendered SEO pages...');

  for (const page of pages) {
    const slug = page.path.replace(/^\//, '');
    const pageHtml = generateHtmlForPage(templateHtml, page);

    // 1. Output as dist/{slug}.html
    const flatFile = path.join(distDir, `${slug}.html`);
    fs.writeFileSync(flatFile, pageHtml, 'utf-8');
    console.log(`✓ Generated ${flatFile}`);

    // 2. Output as dist/{slug}/index.html (for directory-style static resolution)
    const subDir = path.join(distDir, slug);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    const nestedFile = path.join(subDir, 'index.html');
    fs.writeFileSync(nestedFile, pageHtml, 'utf-8');
    console.log(`✓ Generated ${nestedFile}`);

    // 3. Handle backward-compatible aliases
    if (page.aliases && page.aliases.length > 0) {
      for (const alias of page.aliases) {
        const aliasSlug = alias.replace(/^\//, '');
        const aliasFlat = path.join(distDir, `${aliasSlug}.html`);
        fs.writeFileSync(aliasFlat, pageHtml, 'utf-8');
        console.log(`✓ Generated alias ${aliasFlat}`);

        const aliasSubDir = path.join(distDir, aliasSlug);
        if (!fs.existsSync(aliasSubDir)) {
          fs.mkdirSync(aliasSubDir, { recursive: true });
        }
        const aliasNested = path.join(aliasSubDir, 'index.html');
        fs.writeFileSync(aliasNested, pageHtml, 'utf-8');
        console.log(`✓ Generated alias ${aliasNested}`);
      }
    }
  }

  console.log('[AI HireFlow SEO Generator] All SEO pages pre-rendered successfully.');
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllSeoPages();
}
