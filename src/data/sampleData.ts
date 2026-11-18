/**
 * Shared Example Data for AI HireFlow Public Feature Previews
 */

export interface SampleScoreCategory {
  name: string;
  weight: number;
  score: number;
  scoreLabel?: string;
  evidence: string;
}

export const SAMPLE_PERSONA = {
  role: "Senior Frontend Engineer",
  currentRole: "Frontend Engineer",
  targetRole: "Senior Frontend Engineer",
  overallScore: 82,
  scoreLabel: "82 / 100",
  recommendation: "Quantify performance metrics in your current role: add measurable outcomes for frontend architecture and latency reduction.",
  categories: [
    {
      name: "Core technical skills",
      weight: 40,
      score: 85,
      scoreLabel: "85 / 100",
      evidence: "Identified React, TypeScript, GraphQL, Next.js, and automated testing across 4 career years."
    },
    {
      name: "Quantifiable impact metrics",
      weight: 30,
      score: 75,
      scoreLabel: "75 / 100",
      evidence: "5 of 8 experience bullets include numerical results. 3 bullets rely on passive phrasing."
    },
    {
      name: "Role seniority relevance",
      weight: 15,
      score: 84,
      scoreLabel: "84 / 100",
      evidence: "Demonstrates cross-functional design collaboration and code review ownership."
    },
    {
      name: "Structural ATS parsability",
      weight: 15,
      score: 86,
      scoreLabel: "86 / 100",
      evidence: "Clear section headers, standard date ranges, zero multi-column parsing traps."
    }
  ] as SampleScoreCategory[],
  matchedKeywords: ["React", "TypeScript", "GraphQL", "Next.js", "State Management"],
  missingKeywords: ["Vite bundle analysis", "Core Web Vitals monitoring", "CI/CD telemetry"],
  bulletExample: {
    before: "Worked on the customer dashboard and improved page loading performance.",
    after: "Architected modular data-fetching in React and optimized bundle size, reducing page load latency by 42% across 120,000 monthly active users."
  }
};

export const SAMPLE_JOB_FINDER = {
  role: "Senior Frontend Engineer",
  company: "Enterprise Cloud Systems",
  location: "Remote",
  salary: "₹24L - ₹32L / yr",
  matchScore: 91,
  matchScoreLabel: "91% Role Match",
  matchedSkills: ["React", "TypeScript", "Next.js", "GraphQL"],
  missingSkills: ["Docker (preferred)"],
  whyThisRole: "Strong overlap in modern React architecture, client-side caching, and distributed frontend systems with 4+ years of relevant experience."
};

export const SAMPLE_JOB_TRACKER = {
  stages: [
    {
      name: "Applied",
      count: 5,
      jobs: [
        { role: "Senior Frontend Engineer", company: "Enterprise Cloud Systems", date: "Applied 3d ago" }
      ]
    },
    {
      name: "Interview",
      count: 2,
      jobs: [
        { role: "Staff UI Engineer", company: "FinTech Global", date: "Round scheduled" }
      ]
    },
    {
      name: "Offer",
      count: 1,
      jobs: [
        { role: "Lead Frontend Engineer", company: "DesignOps SaaS", date: "Offer under review" }
      ]
    },
    {
      name: "Rejected",
      count: 2,
      jobs: [
        { role: "Full Stack Engineer", company: "Legacy Systems", date: "Closed" }
      ]
    }
  ]
};

export const SAMPLE_CAREER_ADVISOR = {
  currentRole: "Frontend Engineer",
  targetRole: "Staff Frontend Engineer",
  currentSkills: ["JavaScript", "React", "CSS Architecture", "State Management"],
  missingSkills: ["Distributed frontend systems design", "Web performance telemetry", "Technical leadership"],
  milestones: [
    {
      number: "01",
      title: "Web Performance & Core Web Vitals Optimization",
      status: "In progress",
      desc: "Measure and optimize Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) in high-traffic single-page applications."
    },
    {
      number: "02",
      title: "Large-Scale Frontend System Architecture",
      status: "Next milestone",
      desc: "Design micro-frontend boundaries, module federation, and resilient client-side caching strategies."
    },
    {
      number: "03",
      title: "Technical Leadership & Cross-Team RFCs",
      status: "Target milestone",
      desc: "Lead architectural reviews, author engineering RFC proposals, and mentor senior developers."
    }
  ]
};

export const SAMPLE_INTERVIEW_LAB = {
  question: "Can you describe a challenging web performance bottleneck you diagnosed and resolved?",
  category: "Technical Architecture",
  userAnswerSnippet: "In my previous role, our main analytics dashboard had high render latency. I profiled React component re-renders, isolated heavy chart recomputations, and implemented list virtualization with React Window, reducing TTI by 42%.",
  score: 86,
  scoreLabel: "86 / 100",
  starBreakdown: {
    situation: { score: 22, max: 25, label: "Situation: 22/25" },
    task: { score: 21, max: 25, label: "Task: 21/25" },
    action: { score: 23, max: 25, label: "Action: 23/25" },
    result: { score: 20, max: 25, label: "Result: 20/25" }
  },
  strengths: [
    "Clear methodology using React Profiler",
    "Applied concrete technical solution (virtualization)"
  ],
  improvementTips: [
    "Quantify the baseline latency before the fix was introduced",
    "Explain how you validated against regressions in continuous integration"
  ]
};
