import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const SITE_URL = 'https://www.aihireflow.in';
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

interface SEOPageConfig {
  path: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  category: string;
  priority: string;
  changefreq: string;
  steps: { title: string; desc: string }[];
  features: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
  aliases?: string[];
}

interface LegalPageConfig {
  path: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  priority: string;
  changefreq: string;
}

const featurePages: SEOPageConfig[] = [
  {
    path: '/resume-analyzer',
    name: 'AI Resume Analyzer',
    title: 'Free ATS Resume Checker & AI Resume Analyzer — AI HireFlow',
    description: 'Check your ATS resume score free with AI HireFlow. Get a transparent 4-part weighted audit, missing keyword gap analysis, and evidence-grounded bullet rewrites.',
    h1: 'AI Resume Analyzer & Free ATS Checker',
    lead: 'Audit your resume with senior recruiter rigor. Detect missing technical keywords, eliminate ATS parsing roadblocks, evaluate quantifiable impact metrics, and optimize your qualifications for target positions.',
    category: 'BusinessApplication',
    priority: '0.95',
    changefreq: 'weekly',
    steps: [
      { title: 'Upload Resume or Paste Text', desc: 'Upload PDF or DOCX files or select your saved Master Resume profile.' },
      { title: 'Provide Target Job Description', desc: 'Paste the exact job description to extract required technical qualifications and domain keywords.' },
      { title: 'Run Deep-Layer ATS Audit', desc: 'Evaluate keyword density, explicit vs. inferred skills, quantifiable metrics, and single-column ATS parsability.' },
      { title: 'Implement High-Impact Upgrades', desc: 'Review your weighted audit memo, copy evidence-based bullet rewrites, and push improvements into the Resume Editor.' }
    ],
    features: [
      { title: 'Explainable ATS Compatibility Scoring', desc: 'Transparent 4-category weighted breakdown across technical skills (40%), measurable impact (25-30%), role relevance, and ATS parsability.' },
      { title: 'Target Keyword Gap Analysis', desc: 'Compares your actual resume evidence against target job descriptions with situational rewrite recommendations.' },
      { title: 'STAR & XYZ Impact Evaluation', desc: 'Identifies vague task descriptions and upgrades bullets with verifiable business outcomes and scale without inventing fake data.' }
    ],
    faqs: [
      { q: 'How does AI HireFlow calculate the ATS Compatibility Score?', a: 'Our engine uses an explainable 4-category weighted breakdown: Core Technical & Skill Match, Measurable Impact & Hard Metrics, Role & Domain Relevance, and Structure & ATS Parsability.' },
      { q: 'Does the analyzer invent fake metrics or experience?', a: 'Never. Every recommendation, bullet rewrite, and skill gap is anchored strictly in your actual resume content.' },
      { q: 'Is the Resume Analyzer free to try?', a: 'Yes. Every new account receives 150 renewing daily free AI credits to scan resumes, inspect keyword gaps, and review full recruiter audit reports.' }
    ],
    aliases: ['/ats-resume-checker']
  },
  {
    path: '/resume-editor',
    name: 'AI Resume Editor',
    title: 'Free ATS Resume Builder & Single-Column Editor — AI HireFlow',
    description: 'Build an ATS-friendly single-column resume with AI HireFlow. Rewrite bullets with STAR/XYZ metrics, preview live formatting, and export clean vector PDFs.',
    h1: 'AI Resume Editor & Single-Column ATS Builder',
    lead: 'Craft clean, ATS-optimized resumes engineered for recruiter review. Upgrade bullets with quantifiable impact metrics, maintain clean section hierarchy, and download ready-to-submit PDFs instantly.',
    category: 'BusinessApplication',
    priority: '0.95',
    changefreq: 'weekly',
    steps: [
      { title: 'Import or Start Clean', desc: 'Load an existing parsed resume or start from a verified single-column ATS template.' },
      { title: 'Polish Bullets with AI', desc: 'Convert passive duty descriptions into action-verb, impact-focused XYZ and STAR accomplishments.' },
      { title: 'Verify ATS Structure', desc: 'Maintain standard section headers, clean typography, and zero multi-column parser traps.' },
      { title: 'Export Clean Vector PDF', desc: 'Download a crisp, machine-readable PDF ready for Workday, Greenhouse, Lever, and Taleo.' }
    ],
    features: [
      { title: 'Single-Column ATS Compliance', desc: 'Engineered specifically to parse flawlessly through Workday, Taleo, Greenhouse, and Lever screening algorithms.' },
      { title: 'AI Bullet Polish & STAR Metrics', desc: 'Enhance responsibilities into high-impact accomplishments using proven action verbs and quantifiable frameworks.' },
      { title: 'One-Click Instant PDF Export', desc: 'Clean vector typography with standard section header tags and zero formatting corruption.' }
    ],
    faqs: [
      { q: 'Why does AI HireFlow use single-column resume templates?', a: 'Multi-column layouts, tables, and graphics frequently scramble text order inside enterprise ATS parsers like Workday and Taleo. Single-column hierarchy ensures 100% accurate parsing.' },
      { q: 'Can I export my resume as a clean PDF?', a: 'Yes. You can export crisp, text-selectable vector PDFs with standard headings directly from the Resume Editor.' }
    ],
    aliases: ['/resume-builder']
  },
  {
    path: '/job-finder',
    name: 'AI Job Finder',
    title: 'AI Job Finder & Semantic Job Match Engine — AI HireFlow',
    description: 'Discover live tech & corporate jobs ranked by real resume skill overlap. Filter remote and local roles, inspect match percentages, and see missing requirements.',
    h1: 'AI Job Finder & Semantic Job Matcher',
    lead: 'Stop scrolling endless generic job boards. Discover live roles that genuinely match your tech stack, evaluate qualification alignment in seconds, and target opportunities with verified hiring velocity.',
    category: 'BusinessApplication',
    priority: '0.95',
    changefreq: 'weekly',
    steps: [
      { title: 'Sync Your Skills Profile', desc: 'Connect your Master Resume so the matcher understands your stack, seniority, and domain.' },
      { title: 'Search Live Roles & Locations', desc: 'Query real live openings across remote and target cities with clean role filters.' },
      { title: 'Inspect Semantic Match Scores', desc: 'See matched skills, missing criteria, and safe/stretch/reach tiering before investing application time.' },
      { title: 'Save Directly to Job Tracker', desc: 'One-click import high-fit roles into your Kanban application pipeline.' }
    ],
    features: [
      { title: 'Semantic Skill Matching', desc: 'Matches live positions based on deep technical skill overlap rather than superficial keyword spam.' },
      { title: 'Real-Time Match Percentage', desc: 'See your qualification alignment score and missing skills against every listed opportunity before applying.' },
      { title: 'Direct Pipeline Integration', desc: 'Send matched roles directly into the Application Tracker and tailor your resume for each listing.' }
    ],
    faqs: [
      { q: 'Are the jobs shown in AI Job Finder real live openings?', a: 'Yes. AI HireFlow fetches real external job listings from verified job providers and never invents fictional job postings.' },
      { q: 'How does skill match scoring work?', a: 'We compare your resume skills and target experience against each job description to highlight exact matches, related matches, and missing requirements.' }
    ],
    aliases: ['/ai-job-search']
  },
  {
    path: '/job-tracker',
    name: 'AI Job Tracker',
    title: 'Free Job Application Tracker & Kanban Pipeline — AI HireFlow',
    description: 'Organize every job application in a visual Kanban pipeline. Track Applied, Interview, Offer, and Rejected stages, notes, resume versions, and follow-ups free.',
    h1: 'AI Job Tracker & Application Pipeline',
    lead: 'Eliminate messy spreadsheets and forgotten recruiter emails. Track active applications through every hiring stage with visual pipeline columns, role notes, and interview milestones.',
    category: 'BusinessApplication',
    priority: '0.90',
    changefreq: 'weekly',
    steps: [
      { title: 'Log or Auto-Import Positions', desc: 'Track roles directly from AI Job Finder or add company, role, salary range, and application link manually.' },
      { title: 'Attach Tailored Resumes', desc: 'Record the exact resume version and notes used for each employer.' },
      { title: 'Track Interview Cycles', desc: 'Move roles across Applied, Interview, Offer, and Rejected stages with round-by-round notes.' },
      { title: 'Compare Offers & Follow Up', desc: 'Review response rates, deadlines, and compensation details in one place.' }
    ],
    features: [
      { title: 'Visual Kanban Pipeline', desc: 'Clean pipeline columns for Applied, Interview, Offer, and Rejected stages aligned with real recruitment workflows.' },
      { title: 'Centralized Role Notes & History', desc: 'Keep recruiter details, interview topics, deadlines, and compensation notes attached to every card.' },
      { title: 'Cloud-Synced & Free', desc: 'All tracked roles sync securely to your Google account so you can update your search from any device.' }
    ],
    faqs: [
      { q: 'Is the AI Job Tracker free to use?', a: 'Yes. The Kanban application tracker is free for all registered users to manage unlimited job applications.' },
      { q: 'Is my application data synced to the cloud?', a: 'Yes. Your tracked roles, notes, and stage updates sync securely to your signed-in account in Firebase.' }
    ],
    aliases: []
  },
  {
    path: '/career-advisor',
    name: 'AI Career Advisor',
    title: 'AI Career Roadmap & Skill Gap Advisor — AI HireFlow',
    description: 'Identify missing skills for your target role and generate step-by-step career learning roadmaps with proof-of-work portfolio project blueprints.',
    h1: 'AI Career Advisor & Skill Roadmaps',
    lead: 'Navigate your career progression with clarity. Detect missing qualifications between your current resume and target roles, then follow milestone-driven learning roadmaps and portfolio blueprints.',
    category: 'EducationalApplication',
    priority: '0.90',
    changefreq: 'weekly',
    steps: [
      { title: 'Compare Current vs. Target Role', desc: 'Input your current skill profile and desired target position or seniority level.' },
      { title: 'Pinpoint High-Leverage Gaps', desc: 'Identify the exact missing frameworks, system design concepts, or domain qualifications recruiters expect.' },
      { title: 'Follow Milestone Roadmaps', desc: 'Execute structured multi-week learning stages prioritized by hiring demand.' },
      { title: 'Build Proof-of-Work Projects', desc: 'Use curated project blueprints to add verifiable technical evidence back into your resume.' }
    ],
    features: [
      { title: 'Gap-to-Milestone Roadmaps', desc: 'Convert detected technical deficiencies into step-by-step project-based learning objectives.' },
      { title: 'Market Demand Calibration', desc: 'Prioritize high-impact skills based on real engineering and product role expectations.' },
      { title: 'Proof-of-Work Project Blueprints', desc: 'Receive architecture outlines for portfolio projects that validate technical competency to hiring managers.' }
    ],
    faqs: [
      { q: 'Who is AI Career Advisor built for?', a: 'Students, fresh graduates, software engineers, data/AI practitioners, and professionals transitioning into higher-seniority or new technical roles.' },
      { q: 'Can I save and track my roadmap progress?', a: 'Yes. Generated learning roadmaps and completed milestones are saved directly to your workspace.' }
    ],
    aliases: ['/career-roadmap']
  },
  {
    path: '/interview-lab',
    name: 'AI Interview Lab',
    title: 'AI Mock Interview Simulator & STAR Prep Lab — AI HireFlow',
    description: 'Practice technical, system design, and behavioral mock interviews with AI. Get instant 100-point scoring, STAR framework critiques, and concrete follow-ups.',
    h1: 'AI Interview Lab & Mock Simulator',
    lead: 'Master technical loops and behavioral rounds before speaking to recruiters. Practice role-specific mock interviews with adaptive AI interviewers and receive structured STAR and technical feedback.',
    category: 'EducationalApplication',
    priority: '0.95',
    changefreq: 'weekly',
    steps: [
      { title: 'Choose Target Role & Round Type', desc: 'Select Technical, Behavioral (STAR), System Design, or HR rounds tailored to your target company and stack.' },
      { title: 'Answer Realistic Questions', desc: 'Respond to adaptive interviewer prompts calibrated to your seniority level.' },
      { title: 'Receive 100-Point Rubric Feedback', desc: 'Review clarity, technical depth, STAR structure, strengths, and concrete missing points.' },
      { title: 'Drill Weak Areas', desc: 'Re-practice improved responses and save transcripts to review before your real interview.' }
    ],
    features: [
      { title: 'Role-Specific Adaptive Scenarios', desc: 'Practice realistic questions asked at top tech employers tailored to your exact stack and seniority.' },
      { title: 'Instant STAR Delivery Feedback', desc: 'Analyze Situation, Task, Action, and Result structure with concrete pointers on conciseness and metrics.' },
      { title: 'Technical & System Design Deep-Dives', desc: 'Defend architectural decisions, edge cases, and trade-offs under realistic interviewer follow-ups.' }
    ],
    faqs: [
      { q: 'What interview types can I practice in AI Interview Lab?', a: 'You can practice Technical coding/architecture rounds, Behavioral STAR interviews, System Design discussions, and Campus Placement HR interviews.' },
      { q: 'How are my mock interview answers evaluated?', a: 'Each answer is graded on technical accuracy, STAR structure, communication clarity, and concrete evidence, accompanied by an improved model answer.' }
    ],
    aliases: ['/ai-interview-preparation']
  }
];

const legalPages: LegalPageConfig[] = [
  {
    path: '/privacy',
    name: 'Privacy Policy',
    title: 'Privacy Policy | AI HireFlow',
    description: 'Learn how AI HireFlow collects, uses, and safeguards your resume data, Google account information, and Razorpay payment details.',
    h1: 'Privacy Policy',
    lead: 'Transparent data protection practices explaining how AI HireFlow secures your resumes, job tracker records, and account information.',
    priority: '0.5',
    changefreq: 'monthly'
  },
  {
    path: '/terms',
    name: 'Terms & Conditions',
    title: 'Terms & Conditions | AI HireFlow',
    description: 'Read the Terms and Conditions for AI HireFlow covering account usage, AI career guidance disclaimers, credit packs, and Razorpay billing.',
    h1: 'Terms & Conditions',
    lead: 'Terms governing use of the AI HireFlow platform, daily free AI credits, subscription plans, and billing policies.',
    priority: '0.5',
    changefreq: 'monthly'
  },
  {
    path: '/refund',
    name: 'Refund & Cancellation Policy',
    title: 'Refund & Cancellation Policy | AI HireFlow',
    description: 'Review AI HireFlow subscription cancellation terms, digital credit pack refund rules, and failed transaction resolution support.',
    h1: 'Refund & Cancellation Policy',
    lead: 'Clear guidelines covering subscription cancellations, consumable AI credit packs, and duplicate payment resolution.',
    priority: '0.5',
    changefreq: 'monthly'
  },
  {
    path: '/contact',
    name: 'Contact Support',
    title: 'Contact Support | AI HireFlow',
    description: 'Contact AI HireFlow support for help with ATS resume analysis, Google sign-in, AI credits, subscriptions, or Razorpay billing inquiries.',
    h1: 'Contact AI HireFlow Support',
    lead: 'Reach our support team for billing questions, account help, feature feedback, or privacy requests.',
    priority: '0.6',
    changefreq: 'monthly'
  }
];

const privateAppRoutes = [
  'dashboard',
  'jobs',
  'tracker',
  'finder',
  'analyzer',
  'interview',
  'learning',
  'roadmap',
  'editor',
  'campus',
  'outreach',
  'profile',
  'credits'
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNavHeaderHtml(): string {
  return `
      <header style="border-bottom:1.5px solid #141413;background:#F7F4ED;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <a href="/" style="font-weight:800;font-size:18px;color:#141413;text-decoration:none;letter-spacing:-0.02em;">AI HireFlow</a>
        <nav aria-label="Main Navigation" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:13px;">
          <a href="/resume-analyzer" style="color:#4B4944;text-decoration:none;">Resume Analyzer</a>
          <a href="/resume-editor" style="color:#4B4944;text-decoration:none;">Resume Editor</a>
          <a href="/job-finder" style="color:#4B4944;text-decoration:none;">Job Finder</a>
          <a href="/job-tracker" style="color:#4B4944;text-decoration:none;">Job Tracker</a>
          <a href="/interview-lab" style="color:#4B4944;text-decoration:none;">Interview Lab</a>
          <a href="/career-advisor" style="color:#4B4944;text-decoration:none;">Career Roadmap</a>
        </nav>
      </header>`;
}

function buildFooterHtml(): string {
  return `
      <footer style="border-top:1.5px solid #141413;background:#FFFDF8;padding:32px 24px;margin-top:48px;font-size:13px;color:#4B4944;">
        <div style="max-width:1040px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;">
          <span>&copy; ${new Date().getFullYear()} AI HireFlow — Free ATS Resume Checker, Job Finder &amp; Interview Prep.</span>
          <nav aria-label="Footer Navigation" style="display:flex;gap:18px;flex-wrap:wrap;">
            <a href="/privacy" style="color:#4B4944;">Privacy Policy</a>
            <a href="/terms" style="color:#4B4944;">Terms &amp; Conditions</a>
            <a href="/refund" style="color:#4B4944;">Refund Policy</a>
            <a href="/contact" style="color:#4B4944;">Contact Support</a>
          </nav>
        </div>
      </footer>`;
}

function buildHomepageSemanticRoot(): string {
  return `
    <div style="min-height:100vh;background:#F7F4ED;color:#141413;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
      ${buildNavHeaderHtml()}
      <main style="max-width:1040px;margin:0 auto;padding:56px 24px;">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#B45309;margin-bottom:12px;">Free to Start &middot; 150 Daily Renewing AI Credits</p>
        <h1 style="font-size:44px;line-height:1.1;font-weight:800;margin:0 0 18px;letter-spacing:-0.03em;">Fix your resume, match live jobs, and prepare for interviews in one calm workspace.</h1>
        <p style="font-size:17px;line-height:1.65;color:#4B4944;max-width:720px;margin:0 0 36px;">AI HireFlow gives job seekers transparent 4-part ATS compatibility scoring, evidence-grounded XYZ and STAR bullet rewrites, a single-column ATS resume builder, live semantic job matching, a visual Kanban application tracker, and adaptive AI mock interviews.</p>

        <section aria-label="Core Career Tools" style="margin-bottom:48px;">
          <h2 style="font-size:26px;font-weight:700;margin:0 0 20px;">Six Connected AI Career Tools</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
            ${featurePages.map(p => `
              <article style="background:#FFFDF8;border:1.5px solid #141413;padding:20px;border-radius:4px;">
                <h3 style="margin:0 0 8px;font-size:18px;"><a href="${p.path}" style="color:#141413;text-decoration:none;">${escapeHtml(p.name)}</a></h3>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#4B4944;">${escapeHtml(p.description)}</p>
              </article>
            `).join('')}
          </div>
        </section>

        <section aria-label="Frequently Asked Questions">
          <h2 style="font-size:26px;font-weight:700;margin:0 0 18px;">Frequently Asked Questions</h2>
          <dl style="display:grid;gap:14px;">
            <div style="background:#FFFDF8;border:1px solid #DDD6C8;padding:16px;border-radius:4px;">
              <dt style="font-weight:700;margin-bottom:6px;">What makes AI HireFlow different from standard job boards?</dt>
              <dd style="margin:0;color:#4B4944;font-size:14px;line-height:1.6;">Most job boards just show lists of open roles. AI HireFlow puts ATS resume checks, bullet rewriting based on your real work, live job matching, mock interviews, and an application tracker in one connected workspace.</dd>
            </div>
            <div style="background:#FFFDF8;border:1px solid #DDD6C8;padding:16px;border-radius:4px;">
              <dt style="font-weight:700;margin-bottom:6px;">Are the ATS resume tools free to try?</dt>
              <dd style="margin:0;color:#4B4944;font-size:14px;line-height:1.6;">Yes. Every account gets 150 free AI credits that refresh daily, so you can scan resumes, review ATS compatibility, practice interviews, and build career roadmaps without adding a card.</dd>
            </div>
            <div style="background:#FFFDF8;border:1px solid #DDD6C8;padding:16px;border-radius:4px;">
              <dt style="font-weight:700;margin-bottom:6px;">How does AI HireFlow calculate my resume score?</dt>
              <dd style="margin:0;color:#4B4944;font-size:14px;line-height:1.6;">Your score is split across four clear areas: Technical skills match (40%), Quantified impact (30%), Role level and seniority (15%), and Formatting and ATS readability (15%).</dd>
            </div>
          </dl>
        </section>
      </main>
      ${buildFooterHtml()}
    </div>
  `.trim();
}

function applyHeadMeta(
  templateHtml: string,
  opts: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImageAlt: string;
    robots?: string;
    jsonLd?: Record<string, any>;
    rootHtml?: string;
  }
): string {
  let html = templateHtml;
  const safeTitle = escapeHtml(opts.title);
  const safeDesc = escapeHtml(opts.description);
  const safeAlt = escapeHtml(opts.ogImageAlt);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
  if (opts.robots) {
    html = html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${opts.robots}" />`);
  }
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${opts.canonicalUrl}" />`);

  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${opts.canonicalUrl}" />`);
  html = html.replace(/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${safeAlt}" />`);

  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:url" content="${opts.canonicalUrl}" />`);
  html = html.replace(/<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${safeAlt}" />`);

  if (opts.jsonLd) {
    const jsonLdScript = `    <script type="application/ld+json">\n${JSON.stringify(opts.jsonLd, null, 2)}\n    </script>`;
    html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);
  }

  if (opts.rootHtml !== undefined) {
    html = html.replace(/<div\s+id="root">[\s\S]*?<\/div>/i, `<div id="root">${opts.rootHtml}</div>`);
  }

  return html;
}

function generateHtmlForFeaturePage(templateHtml: string, config: SEOPageConfig): string {
  const canonicalUrl = `${SITE_URL}${config.path}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'AI HireFlow',
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png`, width: 192, height: 192 }
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'AI HireFlow',
        publisher: { '@id': `${SITE_URL}/#organization` }
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${canonicalUrl}#software`,
        name: `AI HireFlow ${config.name}`,
        url: canonicalUrl,
        applicationCategory: config.category,
        operatingSystem: 'Web',
        screenshot: OG_IMAGE_URL,
        description: config.description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
          description: 'Free to start with 150 daily renewing AI credits.'
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: config.name, item: canonicalUrl }
        ]
      },
      {
        '@type': 'HowTo',
        '@id': `${canonicalUrl}#howto`,
        name: `How ${config.name} Works`,
        step: config.steps.map((s, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: s.title,
          text: s.desc
        }))
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: config.faqs.map(faq => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a }
        }))
      }
    ]
  };

  const semanticRootContent = `
    <div style="min-height:100vh;background:#F7F4ED;color:#141413;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
      ${buildNavHeaderHtml()}
      <main style="max-width:1040px;margin:0 auto;padding:48px 24px;">
        <nav aria-label="Breadcrumb" style="font-size:12px;color:#6B6860;margin-bottom:16px;">
          <a href="/" style="color:#6B6860;">Home</a> &rsaquo; <span style="color:#141413;font-weight:600;">${escapeHtml(config.name)}</span>
        </nav>
        <h1 style="font-size:42px;line-height:1.12;font-weight:800;margin:0 0 16px;">${escapeHtml(config.h1)}</h1>
        <p style="font-size:17px;line-height:1.65;color:#4B4944;max-width:740px;margin:0 0 36px;">${escapeHtml(config.lead)}</p>

        <section aria-label="How It Works" style="margin-bottom:40px;">
          <h2 style="font-size:24px;font-weight:700;margin:0 0 16px;">How ${escapeHtml(config.name)} Works</h2>
          <ol style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:0;list-style:none;">
            ${config.steps.map((s, i) => `
              <li style="background:#FFFDF8;border:1.5px solid #141413;padding:18px;border-radius:4px;">
                <strong style="display:block;margin-bottom:6px;">0${i + 1}. ${escapeHtml(s.title)}</strong>
                <p style="margin:0;font-size:14px;color:#4B4944;line-height:1.55;">${escapeHtml(s.desc)}</p>
              </li>
            `).join('')}
          </ol>
        </section>

        <section aria-label="Key Capabilities" style="margin-bottom:40px;">
          <h2 style="font-size:24px;font-weight:700;margin:0 0 16px;">Key Capabilities</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">
            ${config.features.map(f => `
              <article style="background:#FFFDF8;border:1.5px solid #141413;padding:20px;border-radius:4px;">
                <h3 style="margin:0 0 8px;font-size:17px;">${escapeHtml(f.title)}</h3>
                <p style="margin:0;font-size:14px;color:#4B4944;line-height:1.55;">${escapeHtml(f.desc)}</p>
              </article>
            `).join('')}
          </div>
        </section>

        <section aria-label="Frequently Asked Questions" style="margin-bottom:40px;">
          <h2 style="font-size:24px;font-weight:700;margin:0 0 16px;">Frequently Asked Questions</h2>
          <dl style="display:grid;gap:12px;">
            ${config.faqs.map(faq => `
              <div style="background:#FFFDF8;border:1px solid #DDD6C8;padding:16px;border-radius:4px;">
                <dt style="font-weight:700;margin-bottom:6px;">${escapeHtml(faq.q)}</dt>
                <dd style="margin:0;font-size:14px;color:#4B4944;line-height:1.6;">${escapeHtml(faq.a)}</dd>
              </div>
            `).join('')}
          </dl>
        </section>

        <section aria-label="Explore Other Tools">
          <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Explore Other Tools in AI HireFlow</h2>
          <ul style="display:flex;flex-wrap:wrap;gap:12px;padding:0;list-style:none;">
            ${featurePages.filter(p => p.path !== config.path).map(p => `
              <li><a href="${p.path}" style="color:#B45309;font-weight:600;">${escapeHtml(p.name)}</a></li>
            `).join('')}
          </ul>
        </section>
      </main>
      ${buildFooterHtml()}
    </div>
  `.trim();

  return applyHeadMeta(templateHtml, {
    title: config.title,
    description: config.description,
    canonicalUrl,
    ogImageAlt: `${config.name} — AI HireFlow`,
    jsonLd,
    rootHtml: semanticRootContent
  });
}

function generateHtmlForLegalPage(templateHtml: string, config: LegalPageConfig): string {
  const canonicalUrl = `${SITE_URL}${config.path}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        name: config.title,
        url: canonicalUrl,
        description: config.description,
        isPartOf: { '@id': `${SITE_URL}/#website` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: config.name, item: canonicalUrl }
        ]
      }
    ]
  };

  const semanticRootContent = `
    <div style="min-height:100vh;background:#F7F4ED;color:#141413;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
      ${buildNavHeaderHtml()}
      <main style="max-width:840px;margin:0 auto;padding:48px 24px;">
        <nav aria-label="Breadcrumb" style="font-size:12px;color:#6B6860;margin-bottom:16px;">
          <a href="/" style="color:#6B6860;">Home</a> &rsaquo; <span style="color:#141413;font-weight:600;">${escapeHtml(config.name)}</span>
        </nav>
        <h1 style="font-size:36px;font-weight:800;margin:0 0 14px;">${escapeHtml(config.h1)}</h1>
        <p style="font-size:16px;line-height:1.65;color:#4B4944;">${escapeHtml(config.lead)}</p>
      </main>
      ${buildFooterHtml()}
    </div>
  `.trim();

  return applyHeadMeta(templateHtml, {
    title: config.title,
    description: config.description,
    canonicalUrl,
    ogImageAlt: `${config.name} — AI HireFlow`,
    jsonLd,
    rootHtml: semanticRootContent
  });
}

function buildSitemapXml(today: string): string {
  const entries = [
    {
      loc: `${SITE_URL}/`,
      lastmod: today,
      changefreq: 'daily',
      priority: '1.0',
      imageTitle: 'AI HireFlow — Free ATS Resume Checker, Job Finder & Interview Prep'
    },
    ...featurePages.map(p => ({
      loc: `${SITE_URL}${p.path}`,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority,
      imageTitle: p.title
    })),
    ...legalPages.map(p => ({
      loc: `${SITE_URL}${p.path}`,
      lastmod: today,
      changefreq: p.changefreq,
      priority: p.priority,
      imageTitle: null as string | null
    }))
  ];

  const urlsXml = entries.map(e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>${e.imageTitle ? `
    <image:image>
      <image:loc>${OG_IMAGE_URL}</image:loc>
      <image:title>${escapeHtml(e.imageTitle)}</image:title>
    </image:image>` : ''}
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}
</urlset>
`;
}

function writeRouteFiles(distDir: string, slug: string, html: string) {
  const flatFile = path.join(distDir, `${slug}.html`);
  fs.writeFileSync(flatFile, html, 'utf-8');

  const subDir = path.join(distDir, slug);
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }
  fs.writeFileSync(path.join(subDir, 'index.html'), html, 'utf-8');
}

export function generateAllSeoPages() {
  const distDir = path.join(process.cwd(), 'dist');
  const publicDir = path.join(process.cwd(), 'public');
  const indexHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('Error: dist/index.html not found! Run vite build first.');
    process.exit(1);
  }

  const rawTemplateHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  console.log('[AI HireFlow SEO Generator] Generating pre-rendered SEO pages, legal pages, noindex private routes & fresh sitemap...');

  // 1. Pre-render crawlable semantic HTML inside dist/index.html for Homepage
  const homepageHtml = rawTemplateHtml.replace(
    /<div\s+id="root">\s*<\/div>/i,
    `<div id="root">${buildHomepageSemanticRoot()}</div>`
  );
  fs.writeFileSync(indexHtmlPath, homepageHtml, 'utf-8');
  console.log('✓ Pre-rendered crawlable Homepage HTML in dist/index.html');

  // 2. Generate all 6 Core Public Feature SEO pages (+ backward-compatible alias static files)
  for (const page of featurePages) {
    const slug = page.path.replace(/^\//, '');
    const pageHtml = generateHtmlForFeaturePage(rawTemplateHtml, page);
    writeRouteFiles(distDir, slug, pageHtml);
    console.log(`✓ Generated SEO page /${slug}`);

    if (page.aliases) {
      for (const alias of page.aliases) {
        writeRouteFiles(distDir, alias.replace(/^\//, ''), pageHtml);
      }
    }
  }

  // 3. Generate all 4 Public Legal & Support pages with dedicated canonicals & metadata
  for (const legal of legalPages) {
    const slug = legal.path.replace(/^\//, '');
    const legalHtml = generateHtmlForLegalPage(rawTemplateHtml, legal);
    writeRouteFiles(distDir, slug, legalHtml);
    console.log(`✓ Generated Legal/Support SEO page /${slug}`);
  }

  // 4. Generate private authenticated SPA route fallbacks with explicit noindex, nofollow
  for (const route of privateAppRoutes) {
    const privateHtml = applyHeadMeta(rawTemplateHtml, {
      title: 'AI HireFlow Workspace',
      description: 'Authenticated AI HireFlow career workspace.',
      canonicalUrl: `${SITE_URL}/${route}`,
      ogImageAlt: 'AI HireFlow Workspace',
      robots: 'noindex, nofollow'
    });
    writeRouteFiles(distDir, route, privateHtml);
  }
  console.log(`✓ Generated noindex SPA fallbacks for ${privateAppRoutes.length} private workspace routes.`);

  // 5. Generate fresh sitemap.xml with today's lastmod and image sitemap entries
  const today = new Date().toISOString().slice(0, 10);
  const sitemapXml = buildSitemapXml(today);
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  }
  console.log(`✓ Updated sitemap.xml (lastmod=${today}, ${1 + featurePages.length + legalPages.length} canonical URLs).`);
}

// Cross-platform direct-execution check (works on Windows, macOS, and Linux/Vercel)
const isDirectRun = Boolean(
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
);
if (isDirectRun) {
  generateAllSeoPages();
}
