export interface RubricCriteria {
  basic: string;        // 0-4 points
  proficient: string;   // 5-7 points
  exemplary: string;    // 8-10 points
  keyPoints: string[];  // Checkable key technical concepts
  starGuidance?: string;
  proTip: string;
}

export interface BankQuestion {
  id: string;
  role: string;
  category: 'System Design' | 'Technical Architecture' | 'Algorithms & Data Structures' | 'Behavioral & Leadership' | 'Concurrency & Performance' | 'Security & Reliability';
  weakSkills: string[];
  question: string;
  rationale: string;
  rubric: RubricCriteria;
}

export const INTERVIEW_QUESTION_BANK: BankQuestion[] = [
  // Full Stack / Software Engineer / Frontend
  {
    id: 'bank-fe-perf-1',
    role: 'Frontend / Full Stack Engineer',
    category: 'Concurrency & Performance',
    weakSkills: ['React Performance', 'Web Vitals', 'DOM Optimization', 'State Management'],
    question: 'How would you diagnose and optimize a complex React dashboard that suffers from noticeable input latency, high memory usage, and frequent re-renders during high-frequency real-time WebSocket data updates?',
    rationale: 'Evaluates practical knowledge of the React render cycle, memory profiling, virtual DOM reconciliation, and throttling/batching real-time streams.',
    rubric: {
      basic: 'Mentions using React.memo, useMemo, or useCallback without explaining profiling tools or batching WebSocket updates.',
      proficient: 'Identifies React DevTools Profiler & Chrome Performance tab, explains immutable state updates, debounce/throttle techniques, and isolating high-frequency state into decoupled subscriber stores.',
      exemplary: 'Provides a complete multi-layered architecture: Web Worker for parsing WebSocket frames, Zustand/Jotai or selective Context selectors to prevent broad sub-tree renders, Canvas/Virtual scrolling (tanstack-virtual) for huge datasets, and requestAnimationFrame batching.',
      keyPoints: [
        'Chrome DevTools Profiling & Flamegraph analysis',
        'Decoupling WebSocket ingress parsing from UI main thread (Web Workers)',
        'Fine-grained state subscription (Zustand / selective selectors)',
        'Virtualization / Windowing for dense tabular/chart data',
        'Debouncing or RAF (requestAnimationFrame) batching'
      ],
      starGuidance: 'Explain a specific instance where you isolated rendering bottlenecks and quantified the improvement (e.g., INP dropped from 250ms to 28ms).',
      proTip: 'Avoid generic advice like "just add useMemo everywhere" — explain that memoization has memory overhead and referential integrity implications.'
    }
  },
  {
    id: 'bank-sys-scale-1',
    role: 'Backend / Systems Engineer',
    category: 'System Design',
    weakSkills: ['System Design', 'Distributed Systems', 'Database Indexing', 'Rate Limiting'],
    question: 'Design a distributed rate-limiting service capable of handling 500,000 requests per second across multi-region edge gateways with strict 5ms latency SLA.',
    rationale: 'Tests distributed algorithms, caching tiers, data consistency tradeoffs, and failure modes under extreme scale.',
    rubric: {
      basic: 'Suggests a single Redis instance with standard INCR and EXPIRE without considering latency, clock drift, or cross-region replication.',
      proficient: 'Compares Token Bucket vs Leaky Bucket vs Sliding Window Counter. Utilizes Redis Cluster with Lua scripts to guarantee atomicity and discusses HTTP 429 Retry-After headers.',
      exemplary: 'Implements a two-tier hybrid architecture: Local in-memory leaky bucket on edge proxies (Envoy/Nginx) synchronized asynchronously via distributed Redis or CRDTs with batching, graceful degradation in split-brain events, and custom key hashing (IP + UserID + Tier).',
      keyPoints: [
        'Sliding Window Counter / Token Bucket algorithm selection',
        'Redis Cluster with Atomic Lua Scripts for race condition prevention',
        'Edge Proxy tier caching to reduce central Redis query volume',
        'Multi-region replication & split-brain failure handling (fail-open vs fail-closed)',
        'HTTP 429 response formatting with X-RateLimit headers'
      ],
      proTip: 'Senior interviewers look for what happens when the rate limiter itself goes down (fail-open strategy for user experience vs fail-closed for security).'
    }
  },
  {
    id: 'bank-db-opt-1',
    role: 'Backend / Database Architect',
    category: 'Technical Architecture',
    weakSkills: ['SQL Optimization', 'Database Indexing', 'Concurrency', 'Transaction Isolation'],
    question: 'A critical relational database query processing order checkout transactions has begun timing out under peak flash-sale loads. How do you investigate, troubleshoot, and resolve both lock contention and query execution latency?',
    rationale: 'Validates deep database internals: execution plans, row-level vs table-level locks, deadlocks, and indexing strategies.',
    rubric: {
      basic: 'Suggests adding an index or restarting the database without inspecting EXPLAIN ANALYZE or lock tables.',
      proficient: 'Walks through EXPLAIN (ANALYZE, BUFFERS), identifies missing composite indexes or sequential table scans, checks pg_stat_activity/sys.dm_tran_locks for row locking, and adjusts query structure.',
      exemplary: 'Details deep analysis: optimistic concurrency control, table partitioning by date/tenant, connection pool starvation (PgBouncer tuning), reducing transaction scope to avoid holding row locks, and read-replica offloading for non-transactional lookups.',
      keyPoints: [
        'EXPLAIN ANALYZE interpretation (Index Scan vs Seq Scan, buffer hits)',
        'Row lock contention identification (SELECT FOR UPDATE vs Optimistic Locking)',
        'Composite B-Tree index column ordering (Equality before Range)',
        'Connection pooling configuration (PgBouncer, HikariCP sizing)',
        'Minimizing transaction lifecycle length'
      ],
      proTip: 'Highlight how changing transaction isolation levels (e.g., Read Committed vs Repeatable Read) impacts both concurrency throughput and phantom read anomalies.'
    }
  },
  {
    id: 'bank-cloud-devops-1',
    role: 'DevOps / Cloud Platform Engineer',
    category: 'Security & Reliability',
    weakSkills: ['Kubernetes', 'CI/CD Pipelines', 'Zero-Downtime Deployment', 'Incident Response'],
    question: 'How do you architect a zero-downtime Blue/Green and Canary deployment pipeline on Kubernetes for a microservices cluster experiencing continuous traffic, including automated rollback triggers?',
    rationale: 'Assesses cloud-native resilience, service mesh routing, health checks, and automated observability-driven rollbacks.',
    rubric: {
      basic: 'Mentions basic kubectl rollout restart without health probes, traffic splitting, or automated metrics analysis.',
      proficient: 'Explains ArgoCD / Flagger / Istio traffic routing, configuring liveness/readiness/startup probes, and step-wise canary traffic progression (10% -> 25% -> 50% -> 100%).',
      exemplary: 'Comprehensive strategy: Service Mesh (Istio) header-based routing, Prometheus/Datadog metric analysis (P99 latency & 5xx error rate thresholds triggering automatic Rollback in Flagger), pre-stop lifecycle hooks with graceful termination, and database backward-compatible schema migrations.',
      keyPoints: [
        'Canary vs Blue-Green rollout mechanisms (Argo Rollouts / Flagger)',
        'Readiness and Liveness probe precision to prevent traffic to booting pods',
        'Automated metric analysis gates (SLO violations triggering immediate abort)',
        'Graceful connection termination (SIGTERM handling and preStop sleeps)',
        'Expand and Contract pattern for database migrations'
      ],
      proTip: 'Always mention database schema compatibility — a rollback is useless if the new code introduced a breaking database schema migration.'
    }
  },
  {
    id: 'bank-lead-star-1',
    role: 'Engineering Lead / Senior Developer',
    category: 'Behavioral & Leadership',
    weakSkills: ['Conflict Resolution', 'Cross-Functional Communication', 'Technical Tradeoffs', 'STAR Method'],
    question: 'Describe a high-stakes scenario where you strongly disagreed with a Product Manager or Technical Director regarding architectural tradeoffs vs delivery timelines. How did you navigate the impasse and what was the outcome?',
    rationale: 'Evaluates communication maturity, data-driven negotiation, business acumen, and executive presence.',
    rubric: {
      basic: 'Vague story about disagreement without clear structured resolution, or portrays the other party negatively.',
      proficient: 'Uses STAR framework clearly: outlines the technical debt risk, presents objective trade-off data to the PM, proposes a phased MVP delivery with scheduled debt remediation, and delivers on time.',
      exemplary: 'Articulates business risk quantification (cost of downtime vs revenue generated by launch date), builds a shared decision matrix with engineering and executive stakeholders, implements Phase 1 with strict observability guardrails, and schedules Phase 2 debt paydown with agreed SLAs.',
      keyPoints: [
        'Clear Situation, Task, Action, Result (STAR) structure',
        'Quantifying technical risks in terms of business metrics (revenue, churn, uptime)',
        'Proposing concrete middle-ground solutions (phased rollout, feature flags)',
        'Maintaining high psychological safety and cross-functional empathy',
        'Post-mortem validation of the decision'
      ],
      starGuidance: 'Structure your narrative: S (Context & constraints) -> T (Your leadership obligation) -> A (Data-backed actions & dialogue) -> R (Quantified business & engineering impact).',
      proTip: 'Focus 70% of your time on the Actions YOU specifically took to build consensus, rather than recounting the disagreement.'
    }
  },
  {
    id: 'bank-ai-eng-1',
    role: 'AI / ML Engineer',
    category: 'Technical Architecture',
    weakSkills: ['RAG Architectures', 'Vector Embeddings', 'LLM Latency & Cost Optimization', 'Evaluation Frameworks'],
    question: 'How do you design a high-throughput enterprise RAG (Retrieval-Augmented Generation) system that minimizes hallucinations, maintains sub-second latency, and supports continuous re-indexing over millions of documents?',
    rationale: 'Evaluates modern generative AI architecture, chunking strategies, hybrid search (dense + sparse), reranking, and guardrail evaluation.',
    rubric: {
      basic: 'Simply suggests feeding PDFs into LangChain and querying OpenAI without discussing chunking, retrieval quality, or hallucination metrics.',
      proficient: 'Discusses semantic chunking with overlap, hybrid search combining BM25 keyword + dense vector embeddings (Pinecone/Milvus), cross-encoder re-ranking (Cohere), and prompt engineering for citation grounding.',
      exemplary: 'Architects an end-to-end pipeline: asynchronous ingestion via Kafka/Spark, hierarchical parent-child document chunking, HNSW vector indexing with metadata filtering, Reciprocal Rank Fusion (RRF), Ragas/TruLens automated evaluation harness for faithfulness/answer relevancy, and LLM streaming with semantic caching.',
      keyPoints: [
        'Document parsing & dynamic semantic chunking strategy',
        'Hybrid Search (Dense Vector + Sparse BM25) + Cross-Encoder Re-ranking',
        'Automated Hallucination Detection & Faithfulness Scoring (Ragas)',
        'Semantic Caching (GPTCache) to cut redundant API costs & latency',
        'Asynchronous event-driven re-indexing architecture'
      ],
      proTip: 'Mentioning how you test and evaluate retrieval precision (Recall@k, MRR) demonstrates true production-grade ML engineering experience.'
    }
  }
];

export function getQuestionsForRoleAndSkills(targetRole?: string, weakSkills: string[] = []): BankQuestion[] {
  if (!targetRole && weakSkills.length === 0) {
    return INTERVIEW_QUESTION_BANK;
  }

  const roleNormalized = (targetRole || '').toLowerCase();
  
  // Score and sort questions based on role relevance and skill overlap
  const scored = INTERVIEW_QUESTION_BANK.map(q => {
    let score = 0;
    
    // Role match
    if (roleNormalized && (
      q.role.toLowerCase().includes(roleNormalized) || 
      roleNormalized.includes(q.role.toLowerCase()) ||
      (roleNormalized.includes('engineer') && q.role.includes('Engineer')) ||
      (roleNormalized.includes('frontend') && q.role.includes('Frontend')) ||
      (roleNormalized.includes('backend') && q.role.includes('Backend')) ||
      (roleNormalized.includes('full') && q.role.includes('Full Stack')) ||
      (roleNormalized.includes('lead') && q.role.includes('Lead')) ||
      (roleNormalized.includes('ai') && q.role.includes('AI'))
    )) {
      score += 5;
    }

    // Weak skill match
    const matchingSkills = q.weakSkills.filter(skill => 
      weakSkills.some(ws => ws.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(ws.toLowerCase()))
    );
    score += matchingSkills.length * 3;

    return { question: q, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.question);
}
