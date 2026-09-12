import { isDemoRole, isDemoSkills } from './demoDataSanitizer';

export interface ActiveJobContext {
  id?: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  skills: string[];
  datePosted?: string;
  matchScore?: number;
  roleTier?: string;
  link?: string;
  source?: 'search' | 'tracker' | 'analyzer' | 'manual';
  selectedAt: number;
}

const ACTIVE_JOB_STORAGE_KEY = 'ai_hireflow_current_active_job';

/**
 * Common skill dictionary mapping technologies to canonical names
 */
const KNOWN_TECH_KEYWORDS: { pattern: RegExp; skill: string }[] = [
  // AI / ML
  { pattern: /\b(rag|retrieval[- ]augmented)\b/i, skill: 'RAG' },
  { pattern: /\b(llm|llms|large language model)\b/i, skill: 'LLMs' },
  { pattern: /\b(vector (db|dbs|database|databases)|pinecone|weaviate|qdrant|chroma)\b/i, skill: 'Vector Databases' },
  { pattern: /\b(prompt engineering|prompts)\b/i, skill: 'Prompt Engineering' },
  { pattern: /\b(langchain|llamaindex)\b/i, skill: 'LangChain' },
  { pattern: /\b(pytorch)\b/i, skill: 'PyTorch' },
  { pattern: /\b(tensorflow|keras)\b/i, skill: 'TensorFlow' },
  { pattern: /\b(nlp|natural language processing)\b/i, skill: 'NLP' },
  { pattern: /\b(computer vision|opencv)\b/i, skill: 'Computer Vision' },
  { pattern: /\b(fine[- ]tuning|lora|peft)\b/i, skill: 'Fine-Tuning' },
  { pattern: /\b(huggingface|transformers)\b/i, skill: 'HuggingFace' },
  { pattern: /\b(genai|generative ai)\b/i, skill: 'Generative AI' },

  // Frontend
  { pattern: /\b(react|reactjs|react\.js)\b/i, skill: 'React' },
  { pattern: /\b(typescript|ts)\b/i, skill: 'TypeScript' },
  { pattern: /\b(javascript|js|es6)\b/i, skill: 'JavaScript' },
  { pattern: /\b(nextjs|next\.js)\b/i, skill: 'Next.js' },
  { pattern: /\b(vue|vuejs|vue\.js)\b/i, skill: 'Vue.js' },
  { pattern: /\b(angular)\b/i, skill: 'Angular' },
  { pattern: /\b(tailwind|tailwindcss)\b/i, skill: 'Tailwind CSS' },
  { pattern: /\b(redux|zustand|mobx)\b/i, skill: 'State Management' },
  { pattern: /\b(graphql)\b/i, skill: 'GraphQL' },
  { pattern: /\b(html5?|css3?)\b/i, skill: 'HTML/CSS' },

  // Backend
  { pattern: /\b(python)\b/i, skill: 'Python' },
  { pattern: /\b(django)\b/i, skill: 'Django' },
  { pattern: /\b(fastapi)\b/i, skill: 'FastAPI' },
  { pattern: /\b(node|nodejs|node\.js)\b/i, skill: 'Node.js' },
  { pattern: /\b(express|expressjs)\b/i, skill: 'Express' },
  { pattern: /\b(golang|go)\b/i, skill: 'Go' },
  { pattern: /\b(java)\b/i, skill: 'Java' },
  { pattern: /\b(spring|spring boot)\b/i, skill: 'Spring Boot' },
  { pattern: /\b(postgresql|postgres)\b/i, skill: 'PostgreSQL' },
  { pattern: /\b(mysql)\b/i, skill: 'MySQL' },
  { pattern: /\b(mongodb|mongo)\b/i, skill: 'MongoDB' },
  { pattern: /\b(redis)\b/i, skill: 'Redis' },
  { pattern: /\b(rest|restful|rest api|rest apis)\b/i, skill: 'REST APIs' },
  { pattern: /\b(microservices)\b/i, skill: 'Microservices' },
  { pattern: /\b(system design|distributed systems)\b/i, skill: 'System Design' },
  { pattern: /\b(kafka|rabbitmq)\b/i, skill: 'Kafka' },

  // DevOps / Cloud
  { pattern: /\b(docker)\b/i, skill: 'Docker' },
  { pattern: /\b(kubernetes|k8s)\b/i, skill: 'Kubernetes' },
  { pattern: /\b(aws|amazon web services)\b/i, skill: 'AWS' },
  { pattern: /\b(gcp|google cloud)\b/i, skill: 'GCP' },
  { pattern: /\b(azure)\b/i, skill: 'Azure' },
  { pattern: /\b(ci\/cd|github actions|jenkins)\b/i, skill: 'CI/CD' },
  { pattern: /\b(terraform)\b/i, skill: 'Terraform' },
  { pattern: /\b(linux)\b/i, skill: 'Linux' },

  // Data
  { pattern: /\b(sql)\b/i, skill: 'SQL' },
  { pattern: /\b(spark|apache spark)\b/i, skill: 'Apache Spark' },
  { pattern: /\b(airflow)\b/i, skill: 'Airflow' },
  { pattern: /\b(snowflake|bigquery)\b/i, skill: 'Data Warehousing' },
  { pattern: /\b(etl|data pipelines?)\b/i, skill: 'ETL Pipelines' },
  { pattern: /\b(pandas|numpy)\b/i, skill: 'Pandas' },

  // Mobile
  { pattern: /\b(react native)\b/i, skill: 'React Native' },
  { pattern: /\b(flutter)\b/i, skill: 'Flutter' },
  { pattern: /\b(swift|ios)\b/i, skill: 'Swift' },
  { pattern: /\b(kotlin|android)\b/i, skill: 'Kotlin' },
];

/**
 * Canonical fallback skills by role category when description does not mention specific tools
 */
const ROLE_FALLBACK_SKILLS: { match: RegExp; skills: string[] }[] = [
  {
    match: /\b(ai|artificial intelligence|machine learning|ml|llm|deep learning|genai)\b/i,
    skills: ['LLMs', 'RAG', 'Vector Databases', 'Prompt Engineering', 'Python']
  },
  {
    match: /\b(backend|back-end|server|api)\b/i,
    skills: ['Python', 'PostgreSQL', 'REST APIs', 'System Design', 'Docker']
  },
  {
    match: /\b(frontend|front-end|ui|web developer)\b/i,
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'State Management']
  },
  {
    match: /\b(full[- ]?stack|fullstack)\b/i,
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs']
  },
  {
    match: /\b(devops|cloud|sre|infrastructure|platform)\b/i,
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform']
  },
  {
    match: /\b(data engineer|data scientist|data analyst)\b/i,
    skills: ['Python', 'SQL', 'PostgreSQL', 'ETL Pipelines', 'Pandas']
  },
  {
    match: /\b(mobile|ios|android)\b/i,
    skills: ['React Native', 'TypeScript', 'Mobile Architecture', 'REST APIs']
  },
  {
    match: /\b(product manager|pm)\b/i,
    skills: ['Product Strategy', 'User Research', 'Data Analysis', 'Agile Roadmaps', 'System Architecture']
  }
];

/**
 * Extracts relevant, role-specific skills from a job object.
 * Guarantee: Returns skills belonging ONLY to this specific job.
 */
export function extractJobSkills(job: { title: string; description?: string; skills?: string[] }): string[] {
  if (Array.isArray(job.skills) && job.skills.length > 0) {
    const valid = job.skills.filter(s => typeof s === 'string' && s.trim().length > 0 && !isDemoSkills(s));
    if (valid.length > 0) return valid;
  }

  const textToScan = `${job.title || ''} ${job.description || ''}`;
  const detectedSkills: string[] = [];
  const seen = new Set<string>();

  for (const item of KNOWN_TECH_KEYWORDS) {
    if (item.pattern.test(textToScan)) {
      if (!seen.has(item.skill.toLowerCase())) {
        seen.add(item.skill.toLowerCase());
        detectedSkills.push(item.skill);
      }
    }
  }

  // If matched 3 or more skills from the job text, return them
  if (detectedSkills.length >= 3) {
    return detectedSkills.slice(0, 6);
  }

  // Otherwise, augment with canonical skills for this specific role title
  const roleTitle = job.title || '';
  for (const fallback of ROLE_FALLBACK_SKILLS) {
    if (fallback.match.test(roleTitle)) {
      for (const sk of fallback.skills) {
        if (!seen.has(sk.toLowerCase())) {
          seen.add(sk.toLowerCase());
          detectedSkills.push(sk);
        }
      }
      break;
    }
  }

  if (detectedSkills.length === 0) {
    detectedSkills.push('System Architecture', 'Modern Frameworks', 'API Design', 'Performance Optimization');
  }

  return detectedSkills.slice(0, 5);
}

/**
 * Retrieve the current active job context from browser session storage.
 */
export function getStoredActiveJob(): ActiveJobContext | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.title && !isDemoRole(parsed.title)) {
      if (isDemoSkills(parsed.skills)) {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
        return null;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Could not read active job from storage:', e);
  }
  return null;
}

/**
 * Persist the active job context into session storage.
 */
export function setStoredActiveJob(job: ActiveJobContext | null): void {
  try {
    if (!job) {
      sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    } else {
      if (isDemoRole(job.title) || isDemoSkills(job.skills)) {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
        return;
      }
      sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(job));
    }
  } catch (e) {
    console.warn('Could not persist active job to storage:', e);
  }
}

/**
 * Completely remove active job context from storage.
 */
export function clearStoredActiveJob(): void {
  try {
    sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear active job storage:', e);
  }
}
