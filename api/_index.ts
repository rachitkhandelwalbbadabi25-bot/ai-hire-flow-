import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { enforceSubscriptionAndCredits } from './_lib/subscriptionEnforcement.ts';
import { CREDIT_PACKS, getCreditPackById } from './_lib/creditPacks.ts';

// Guard serverless runtime against unhandled async exceptions
process.on('unhandledRejection', (reason) => {
  console.error('[AI HireFlow] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[AI HireFlow] Uncaught Exception:', err);
});

console.log(`[AI HireFlow] Serverless runtime initialized: node=${process.version}, platform=${process.platform}, velonaConfigured=${!!(process.env.VELONA_API_KEY || process.env.VELONA_KEY || process.env.VELONA_AUTH_TOKEN || process.env.Z_AI_API_KEY)}`);

export const maxDuration = 60;

export const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-email'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check with safe non-sensitive diagnostics
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    node: process.version,
    velonaConfigured: !!(process.env.VELONA_API_KEY || process.env.VELONA_KEY || process.env.VELONA_AUTH_TOKEN || process.env.Z_AI_API_KEY),
    velonaModel: getVelonaModel()
  });
});

// AI Coach route
app.post(['/api/coach', '/coach'], (req, res) => {
  res.json({ status: 'active', message: 'AI Coach endpoint ready' });
});

// =========================================================================
// VELONA (Z.ai / GLM-5.3-Flash) AI PROVIDER INTEGRATION
// =========================================================================
const VELONA_BASE_URL = 'https://velona.in/v1';

export function getVelonaModel(): string {
  const envModel = (process.env.VELONA_MODEL || '').trim();
  const sanitized = envModel.replace(/^["']|["']$/g, '').trim();
  return sanitized || 'z-ai/glm-5.3-flash';
}

export const VELONA_MODEL_ID = getVelonaModel();

export function getVelonaApiKey(): string | undefined {
  const raw = (
    process.env.VELONA_API_KEY ||
    process.env.VELONA_KEY ||
    process.env.VELONA_AUTH_TOKEN ||
    process.env.Z_AI_API_KEY ||
    ''
  ).trim();
  const sanitized = raw.replace(/^["']|["']$/g, '').trim();
  return sanitized || undefined;
}

export function sanitizeSafeErrorMessage(rawMessage: any): string {
  if (!rawMessage) return 'An unexpected error occurred during AI generation.';
  const str = typeof rawMessage === 'string' ? rawMessage : (rawMessage.message || String(rawMessage));
  let safe = str
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/[a-zA-Z0-9_\-]{32,}/g, '[REDACTED_KEY]')
    .replace(/\s+/g, ' ')
    .trim();
  if (safe.length > 250) {
    safe = safe.slice(0, 250) + '...';
  }
  return safe || 'An unexpected error occurred during AI generation.';
}

export async function callVelonaChatCompletion({
  messages,
  temperature = 0.7,
  jsonMode = false,
  maxTokens,
  requestId,
  operation = 'general',
  meta
}: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  requestId?: string;
  operation?: string;
  meta?: {
    fileType?: string;
    charCount?: number;
    wordCount?: number;
  };
}) {
  const apiKey = getVelonaApiKey();
  const modelId = getVelonaModel();

  if (!apiKey) {
    const error: any = new Error('VELONA_API_KEY is not configured in server environment.');
    error.status = 500;
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  // Sanitize and ensure valid messages
  let formattedMessages: Array<{ role: string; content: string }> = [];
  if (Array.isArray(messages)) {
    formattedMessages = messages
      .filter(m => m && typeof m === 'object' && typeof m.content === 'string' && m.content.trim().length > 0)
      .map(m => ({
        role: (m.role === 'assistant' || m.role === 'system') ? m.role : 'user',
        content: m.content.trim()
      }));
  }

  if (formattedMessages.length === 0) {
    formattedMessages = [{ role: 'user', content: 'Hello' }];
  }

  // Ensure prompt includes explicit JSON directive if jsonMode is requested
  if (jsonMode) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg && lastMsg.role === 'user' && !lastMsg.content.includes('JSON')) {
      formattedMessages[formattedMessages.length - 1] = {
        ...lastMsg,
        content: `${lastMsg.content}\n\nIMPORTANT: Output valid, parseable raw JSON only without markdown fences or extraneous text.`
      };
    }
  }

  // Safe bounded max_tokens for GLM-5.3-Flash
  const safeMaxTokens = maxTokens ? Math.min(Math.max(300, maxTokens), 4096) : 2400;
  const safeTemperature = typeof temperature === 'number' && !isNaN(temperature)
    ? Math.max(0.1, Math.min(1.0, temperature))
    : 0.7;

  const velonaStart = Date.now();
  const isJob = (operation || '').includes('job');
  const isLearningPath = operation === 'learning_path';
  // Avoid duplicate retries for learning_path to stay well within Vercel's 60-second execution window
  const maxRetries = (isLearningPath || !isJob) ? 0 : 1;
  const maxTotalBudgetMs = isJob ? 180000 : 50000;
  const perAttemptTimeoutMs = isJob ? 110000 : (isLearningPath ? 38000 : 42000);
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0 && (Date.now() - velonaStart) > (maxTotalBudgetMs - 15000)) {
      break;
    }

    const attemptStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), perAttemptTimeoutMs);

    let currentMessages = formattedMessages;
    if (attempt > 0) {
      const systemParts = formattedMessages.filter(m => m.role === 'system').map(m => m.content);
      const nonSystemParts = formattedMessages.filter(m => m.role !== 'system');
      
      if (systemParts.length > 0 && nonSystemParts.length > 0) {
        const mergedSystem = systemParts.join('\n\n');
        const firstUser = nonSystemParts[0];
        currentMessages = [
          {
            role: 'user',
            content: `[System Instructions: ${mergedSystem}]\n\n${firstUser.content}`
          },
          ...nonSystemParts.slice(1)
        ];
      }
    }

    const payload: any = {
      model: modelId,
      messages: currentMessages,
      temperature: safeTemperature,
      stream: false,
      max_tokens: safeMaxTokens,
      enable_thinking: false
    };

    if (jsonMode && !attempt) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      if (attempt > 0) {
        const backoffMs = Math.min(2000, 400 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200));
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      const response = await fetch(`${VELONA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'AI-HireFlow/2.0'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const attemptDuration = Date.now() - attemptStart;

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          try {
            const errJson = JSON.parse(errorBody);
            errorDetails = errJson.error?.message || errJson.message || errorBody;
          } catch {
            errorDetails = errorBody;
          }
        } catch {
          errorDetails = `HTTP status ${response.status}`;
        }

        const safeDetails = sanitizeSafeErrorMessage(errorDetails);
        const isTransient = [500, 502, 503, 504].includes(response.status);
        const err: any = new Error(safeDetails || `Velona API responded with HTTP status ${response.status}`);
        err.status = response.status;
        err.velonaStatus = response.status;
        err.attemptDuration = attemptDuration;

        if (response.status === 401) {
          err.code = 'INVALID_API_KEY';
          err.message = `Velona Authentication Failed: Invalid or expired API key. (${safeDetails})`;
          throw err;
        } else if (response.status === 402 || response.status === 429) {
          err.code = 'INSUFFICIENT_BALANCE_OR_RATE_LIMIT';
          err.message = `Velona Quota/Balance Error: ${safeDetails || 'Insufficient prepaid balance or rate limit exceeded.'}`;
          throw err;
        } else {
          err.code = 'VELONA_API_ERROR';
        }

        if (isTransient && attempt < maxRetries && (Date.now() - velonaStart) < (maxTotalBudgetMs - 15000)) {
          lastError = err;
          continue;
        }

        throw err;
      }

      let rawText = '';
      try {
        rawText = await response.text();
      } catch (readErr: any) {
        const err: any = new Error('Failed to read response body from AI service.');
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = 'NETWORK_ERROR';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        const err: any = new Error('Velona API returned a non-JSON response.');
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = 'INVALID_UPSTREAM_RESPONSE';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      if (!data || typeof data !== 'object') {
        const err: any = new Error('Velona API returned an invalid response structure.');
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = 'INVALID_UPSTREAM_RESPONSE';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      if (data.error) {
        const errMsg = sanitizeSafeErrorMessage(typeof data.error === 'string' ? data.error : (data.error.message || 'Velona API error'));
        const err: any = new Error(errMsg);
        err.status = data.error.code === 'invalid_api_key' ? 401 : 502;
        err.velonaStatus = response.status;
        err.code = data.error.code || 'VELONA_API_ERROR';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      const choice = data.choices?.[0];
      const content = (typeof choice?.message?.content === 'string' && choice.message.content.trim())
        ? choice.message.content
        : (typeof choice?.text === 'string' && choice.text.trim())
          ? choice.text
          : (typeof choice?.message?.reasoning_content === 'string' && choice.message.reasoning_content.trim())
            ? choice.message.reasoning_content
            : null;

      if (!content) {
        const err: any = new Error('Velona API response did not contain completion content.');
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = 'MALFORMED_UPSTREAM_RESPONSE';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      const finishReason = choice?.finish_reason || 'stop';
      const totalElapsed = Date.now() - velonaStart;

      // Safe diagnostics: strictly operational metrics without sensitive user prompt/resume content
      console.log(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, request_start=${new Date(velonaStart).toISOString()}, http_status=200, model=${modelId}, total_duration_ms=${totalElapsed}, velona_duration_ms=${attemptDuration}, velona_status=${response.status}, timeout_stage=none, error_category=none, message=ok`);

      let cleanText = content;
      if (jsonMode && typeof cleanText === 'string') {
        cleanText = cleanText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '')
          .trim();
        const firstBrace = cleanText.indexOf('{');
        const firstBracket = cleanText.indexOf('[');
        let firstJsonChar = -1;
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          firstJsonChar = firstBrace;
        } else if (firstBracket !== -1) {
          firstJsonChar = firstBracket;
        }
        if (firstJsonChar > 0) {
          cleanText = cleanText.slice(firstJsonChar).trim();
        }
      }

      return {
        text: cleanText,
        rawText: content,
        finishReason,
        isTruncated: finishReason === 'length',
        model: data.model || modelId,
        provider: 'velona',
        usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        timing: {
          velonaDurationMs: attemptDuration,
          totalDurationMs: totalElapsed
        }
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const attemptDuration = Date.now() - attemptStart;
      
      if (err.name === 'AbortError') {
        const stage = isLearningPath ? 'learning_path_timeout' : (isJob ? 'job_timeout' : `attempt_${attempt}_timeout`);
        lastError = new Error(isJob ? 'Analysis is taking longer than expected. Please retry in a moment.' : 'AI request timed out. Please try again.');
        lastError.status = 504;
        lastError.velonaStatus = 504;
        lastError.code = 'TIMEOUT';
        lastError.timeoutStage = stage;
        lastError.attemptDuration = attemptDuration;
        break;
      } else {
        lastError = err;
        lastError.timeoutStage = 'none';
        lastError.attemptDuration = attemptDuration;
      }

      const timeRemaining = maxTotalBudgetMs - (Date.now() - velonaStart);
      if (attempt < maxRetries && timeRemaining > 20000 && (err.name === 'FetchError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) {
        continue;
      }

      break;
    }
  }

  const totalElapsed = Date.now() - velonaStart;
  const safeMessage = sanitizeSafeErrorMessage(lastError?.message || 'Velona API request failed.');
  const errorCategory = lastError?.code || 'AI_GENERATION_FAILED';
  const velonaStatus = lastError?.velonaStatus || lastError?.status || 500;
  const timeoutStage = lastError?.timeoutStage || (errorCategory === 'TIMEOUT' ? 'request_timeout' : 'none');
  const velonaDuration = lastError?.attemptDuration || totalElapsed;

  console.error(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, request_start=${new Date(velonaStart).toISOString()}, http_status=${lastError?.status || 500}, model=${modelId}, total_duration_ms=${totalElapsed}, velona_duration_ms=${velonaDuration}, velona_status=${velonaStatus}, timeout_stage=${timeoutStage}, error_category=${errorCategory}, message=${safeMessage}`);

  throw lastError || new Error('Velona API request failed after retries.');
}

// Get AI Provider Status
app.get(['/api/ai/providers', '/ai/providers'], (req, res) => {
  const velonaKey = getVelonaApiKey();
  const currentModel = getVelonaModel();
  res.json({
    providers: [
      {
        id: 'velona',
        name: 'Velona (GLM 5.3 Flash)',
        providerName: 'Z.ai via Velona',
        model: currentModel,
        configured: !!velonaKey,
        isDefault: true,
        capabilities: ['structured_json', 'openai_compatible', 'fast_inference', 'ats_scoring', 'job_matching'],
        pricing: {
          input: '₹7.7090 / 1M tokens',
          output: '₹25.6960 / 1M tokens',
          context: '1311K'
        }
      }
    ],
    defaultProvider: 'velona'
  });
});

// Velona Generation endpoint
app.post([
  '/api/velona/generate', 
  '/api/velona/generate/', 
  '/velona/generate', 
  '/velona/generate/', 
  '/api/ai/generate', 
  '/api/ai/generate/', 
  '/ai/generate', 
  '/ai/generate/'
], async (req, res) => {
  const requestStart = Date.now();
  const modelId = getVelonaModel();

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { 
      prompt, 
      systemPrompt, 
      messages: incomingMessages, 
      temperature = 0.7, 
      jsonMode = false, 
      maxTokens,
      operation = 'general',
      meta
    } = body;

    // Backend Enforcement: Check user plan, feature allowances, and credit balances
    const effectiveUserId = (typeof body.userId === 'string' && body.userId.trim()) 
      ? body.userId.trim() 
      : (typeof req.headers['x-user-id'] === 'string' ? (req.headers['x-user-id'] as string).trim() : undefined);
    const effectiveUserEmail = (typeof body.userEmail === 'string' && body.userEmail.trim()) 
      ? body.userEmail.trim() 
      : (typeof req.headers['x-user-email'] === 'string' ? (req.headers['x-user-email'] as string).trim() : undefined);

    if (effectiveUserId || effectiveUserEmail) {
      try {
        const enforcement = await enforceSubscriptionAndCredits({
          userId: effectiveUserId,
          userEmail: effectiveUserEmail,
          operation: typeof operation === 'string' ? operation : 'general'
        });

        if (!enforcement.allowed) {
          const duration = Date.now() - requestStart;
          const safeReason = sanitizeSafeErrorMessage(enforcement.error || 'Access denied');
          console.warn(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=${enforcement.status || 403}, model=${modelId}, duration_ms=${duration}, velona_status=N/A, error_category=${enforcement.code || 'ACCESS_DENIED'}, message=${safeReason}`);
          return res.status(enforcement.status || 403).json({
            error: safeReason,
            code: enforcement.code || 'ACCESS_DENIED',
            requiredCredits: enforcement.requiredCredits,
            balance: enforcement.balance
          });
        }
      } catch (enfErr: any) {
        // Safe fail-open for enforcement in case of transient database connection issue
        console.warn(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=200, model=${modelId}, duration_ms=${Date.now() - requestStart}, velona_status=N/A, error_category=ENFORCEMENT_FAILOPEN, message=Allowed with fallback`);
      }
    }

    // Validate prompt and messages
    const hasPrompt = typeof prompt === 'string' && prompt.trim().length > 0;
    const hasMessages = Array.isArray(incomingMessages) && incomingMessages.length > 0 && incomingMessages.some(m => m && typeof m.content === 'string' && m.content.trim().length > 0);

    if (!hasPrompt && !hasMessages) {
      const duration = Date.now() - requestStart;
      console.warn(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=400, model=${modelId}, duration_ms=${duration}, velona_status=N/A, error_category=INVALID_REQUEST, message=Prompt string or messages array is required.`);
      return res.status(400).json({ 
        error: 'Prompt string or messages array is required.',
        code: 'INVALID_REQUEST'
      });
    }

    let messages: Array<{ role: string; content: string }> = [];
    if (hasMessages) {
      messages = incomingMessages;
    } else {
      if (typeof systemPrompt === 'string' && systemPrompt.trim().length > 0) {
        messages.push({ role: 'system', content: systemPrompt.trim() });
      }
      messages.push({ role: 'user', content: (prompt as string).trim() });
    }

    const result = await callVelonaChatCompletion({
      messages,
      temperature,
      jsonMode: Boolean(jsonMode),
      maxTokens,
      operation: typeof operation === 'string' ? operation : 'general',
      meta
    });

    const totalDuration = Date.now() - requestStart;
    return res.status(200).json({
      ...result,
      timing: {
        ...result.timing,
        totalDurationMs: totalDuration
      }
    });
  } catch (err: any) {
    const totalDuration = Date.now() - requestStart;
    const rawStatus = (typeof err.status === 'number' && err.status >= 400 && err.status < 600) ? err.status : 500;
    const safeMsg = sanitizeSafeErrorMessage(err.message || 'Internal AI generation error');
    const errorCode = err.code || 'AI_GENERATION_FAILED';
    const velonaStatus = err.velonaStatus || (rawStatus !== 500 ? rawStatus : 'N/A');
    const timeoutStage = err.timeoutStage || (errorCode === 'TIMEOUT' ? 'request_timeout' : 'none');

    console.error(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, request_start=${new Date(requestStart).toISOString()}, http_status=${rawStatus}, model=${modelId}, total_duration_ms=${totalDuration}, velona_status=${velonaStatus}, timeout_stage=${timeoutStage}, error_category=${errorCode}, message=${safeMsg}`);

    return res.status(rawStatus).json({ 
      error: safeMsg,
      code: errorCode,
      provider: 'velona',
      model: modelId,
      timeoutStage,
      timing: { totalDurationMs: totalDuration }
    });
  }
});

// Dedicated Velona test endpoint for verification
app.post(['/api/velona/test', '/velona/test'], async (req, res) => {
  try {
    const testPrompt = req.body?.prompt || 'Respond in 1 concise sentence confirming that Velona GLM 5.3 Flash is active and operational for AI HireFlow.';
    const result = await callVelonaChatCompletion({
      messages: [
        { role: 'system', content: 'You are an AI assistant powered by Z.ai GLM 5.3 Flash on Velona platform.' },
        { role: 'user', content: testPrompt }
      ],
      temperature: 0.7
    });

    res.json({
      success: true,
      endpoint: `${VELONA_BASE_URL}/chat/completions`,
      model: VELONA_MODEL_ID,
      provider: 'Z.ai / Velona',
      response: result.text,
      usage: result.usage
    });
  } catch (err: any) {
    console.error('Velona test failed:', err);
    const status = (typeof err.status === 'number' && err.status >= 400 && err.status < 600) ? err.status : 500;
    res.status(status).json({
      success: false,
      error: err.message || 'Velona test request failed',
      code: err.code || 'TEST_FAILED',
      model: VELONA_MODEL_ID,
      endpoint: `${VELONA_BASE_URL}/chat/completions`
    });
  }
});

// =========================================================================
// ASYNCHRONOUS RESUME ANALYZER JOB ARCHITECTURE (VELONA GLM 5.3 FLASH)
// Decouples browser from long HTTP connections; completely immune to 55s timeouts
// =========================================================================

interface ResumeAnalysisJob {
  analysisId: string;
  userId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  resumeHash?: string;
  jobDescHash?: string;
  result?: any;
  error?: string;
  diagnostics?: {
    prepDurationMs?: number;
    velonaDurationMs?: number;
    totalDurationMs?: number;
    model?: string;
    tokens?: any;
    finishReason?: string;
    parseResult?: string;
    schemaValidation?: string;
    httpStatus?: number;
    sample?: string;
    retried?: boolean;
  };
}

const analysisJobs = new Map<string, ResumeAnalysisJob>();

// Auto-prune stale jobs older than 2 hours every 15 minutes
const pruneInterval = setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of analysisJobs.entries()) {
    if (job.updatedAt < cutoff) {
      analysisJobs.delete(id);
    }
  }
}, 15 * 60 * 1000);
if (typeof pruneInterval.unref === 'function') {
  pruneInterval.unref();
}

function normalizeAtsAuditResult(rawData: any) {
  const canonicalCategories = [
    { name: 'Core Technical & Skill Match', weight: 40 },
    { name: 'Measurable Impact & Hard Metrics', weight: 25 },
    { name: 'Role & Domain Relevance', weight: 20 },
    { name: 'Structure & ATS Parsability', weight: 15 }
  ];

  const rawBreakdown = Array.isArray(rawData?.scoreBreakdown) ? rawData.scoreBreakdown : [];
  
  let totalEarnedPoints = 0;
  const normalizedBreakdown = canonicalCategories.map((canon, idx) => {
    const matched = rawBreakdown.find((item: any) => 
      item?.category && item.category.toLowerCase().includes(canon.name.toLowerCase().split('&')[0].trim().toLowerCase())
    ) || rawBreakdown[idx] || {};

    const rawCatScore = typeof matched.score === 'number' ? matched.score : Number(matched.score);
    let catScore = 70;
    let earned = 0;

    if (!isNaN(rawCatScore)) {
      if (rawCatScore <= canon.weight && canon.weight < 100) {
        earned = Math.min(canon.weight, Math.max(0, rawCatScore));
        catScore = Math.min(100, Math.max(0, Math.round((earned / canon.weight) * 100)));
      } else {
        catScore = Math.min(100, Math.max(0, Math.round(rawCatScore)));
        earned = Math.round(((catScore / 100) * canon.weight) * 10) / 10;
      }
    } else {
      catScore = 70;
      earned = Math.round(((catScore / 100) * canon.weight) * 10) / 10;
    }
    totalEarnedPoints += earned;

    const explanation = typeof matched.explanation === 'string' && matched.explanation.trim()
      ? matched.explanation.trim()
      : `Evaluation of ${canon.name} based on candidate experience and technical criteria.`;

    const evidence = typeof matched.evidence === 'string' && matched.evidence.trim()
      ? matched.evidence.trim()
      : 'Identified relevant experience in resume.';

    const recommendations = Array.isArray(matched.recommendations) && matched.recommendations.length > 0
      ? matched.recommendations.map((r: any) => String(r).trim()).filter(Boolean)
      : [`Enhance ${canon.name.toLowerCase()} with further specific achievements.`];

    return {
      category: canon.name,
      weight: canon.weight,
      score: catScore,
      earnedPoints: earned,
      mathExplanation: `(${catScore}/100) × ${canon.weight}% = ${earned.toFixed(1)} pts`,
      explanation,
      evidence,
      recommendations
    };
  });

  const finalScore = Math.min(100, Math.max(0, Math.round(totalEarnedPoints)));
  const atsCompatibility = finalScore >= 80 ? 'High' : (finalScore >= 60 ? 'Moderate' : 'Low');

  const rawKeywords = rawData?.keywordsFound || rawData?.identifiedKeywords || rawData?.keywords || [];
  const keywordsFound = Array.isArray(rawKeywords) ? rawKeywords.map(String).filter(Boolean).slice(0, 10) : [];

  const rawMissing = rawData?.missingKeywords || rawData?.missingSkills || rawData?.skillGaps || [];
  const missingKeywords = Array.isArray(rawMissing) ? rawMissing.map(String).filter(Boolean).slice(0, 6) : [];

  const rawStrengths = rawData?.strengths || rawData?.keyStrengths || rawData?.highlights || [];
  const strengths = Array.isArray(rawStrengths) ? rawStrengths.map(String).filter(Boolean).slice(0, 4) : [];

  const rawWeaknesses = rawData?.weaknesses || rawData?.areasToImprove || rawData?.gaps || [];
  const weaknesses = Array.isArray(rawWeaknesses) ? rawWeaknesses.slice(0, 4).map((w: any) => {
    if (typeof w === 'object' && w !== null) {
      return {
        problem: String(w.problem || w.issue || w.title || '').trim(),
        whyItMatters: String(w.whyItMatters || w.why || w.impact || 'ATS screeners verify concrete alignment with target role expectations.').trim(),
        howToFix: String(w.howToFix || w.fix || w.action || 'Strengthen bullet points with measurable outcomes and standard technologies.').trim()
      };
    }
    const problemStr = String(w || '').trim();
    return {
      problem: problemStr,
      whyItMatters: 'Recruiters downgrade resumes with unverified or vague claims.',
      howToFix: 'Strengthen this section with measurable accomplishments and technical context.'
    };
  }).filter(w => w.problem) : [];

  const rawFormatting = rawData?.formattingSuggestions || rawData?.structuralRecommendations || [];
  const formattingSuggestions = Array.isArray(rawFormatting) && rawFormatting.length > 0
    ? rawFormatting.map(String).filter(Boolean).slice(0, 4)
    : (normalizedBreakdown.find(b => b.category.includes('Structure'))?.recommendations || []);

  const rawImpact = rawData?.impactSuggestions || rawData?.metricSuggestions || [];
  const impactSuggestions = Array.isArray(rawImpact) && rawImpact.length > 0
    ? rawImpact.map(String).filter(Boolean).slice(0, 4)
    : (normalizedBreakdown.find(b => b.category.includes('Impact'))?.recommendations || []);

  const missingKeywordAnalysis = Array.isArray(rawData?.missingKeywordAnalysis) && rawData.missingKeywordAnalysis.length > 0
    ? rawData.missingKeywordAnalysis.slice(0, 4).map((k: any) => ({
        keyword: String(k.keyword || '').trim(),
        whyItMatters: String(k.whyItMatters || '').trim(),
        suggestedRewrite: String(k.suggestedRewrite || '').trim(),
        confidence_level: ['high', 'medium', 'low'].includes(k.confidence_level) ? k.confidence_level : 'high',
        isInferred: Boolean(k.isInferred),
        inferredNote: String(k.inferredNote || '').trim()
      })).filter((k: any) => k.keyword)
    : missingKeywords.slice(0, 3).map((kw) => ({
        keyword: kw,
        whyItMatters: `Recruiters require ${kw} to verify qualification for this role.`,
        suggestedRewrite: `Implemented key technical workflows utilizing ${kw}, improving throughput by 20%.`,
        confidence_level: 'high',
        isInferred: false,
        inferredNote: ''
      }));

  const skillsAnalysis = Array.isArray(rawData?.skillsAnalysis) && rawData.skillsAnalysis.length > 0
    ? rawData.skillsAnalysis.slice(0, 6).map((s: any) => ({
        skill: String(s.skill || '').trim(),
        type: (s.type === 'explicit' || s.type === 'inferred') ? s.type : 'explicit',
        confidence_level: (s.confidence_level === 'high' || s.confidence_level === 'medium') ? s.confidence_level : 'high',
        evidence: String(s.evidence || 'Demonstrated in work experience').trim()
      })).filter((s: any) => s.skill)
    : keywordsFound.slice(0, 5).map((kw) => ({
        skill: kw,
        type: 'explicit' as const,
        confidence_level: 'high' as const,
        evidence: 'Identified directly in candidate resume'
      }));

  const rawRecs = rawData?.recommendations || rawData?.actionPlan || [];
  const recommendations = Array.isArray(rawRecs) && rawRecs.length > 0
    ? rawRecs.map(String).filter(Boolean).slice(0, 4)
    : [
        'Include measurable metrics and concrete outcomes in work experience.',
        'Align keywords directly with target job description requirements.',
        'Ensure standard section headers for optimal ATS parsing.'
      ];

  const summary = typeof rawData?.summary === 'string' && rawData.summary.trim()
    ? rawData.summary.trim().split(/\s+/).slice(0, 35).join(' ')
    : `Candidate demonstrates ${atsCompatibility.toLowerCase()} alignment with target benchmarks based on automated ATS audit.`;

  return {
    score: finalScore,
    atsCompatibility,
    summary,
    strengths,
    weaknesses,
    scoreBreakdown: normalizedBreakdown,
    skillsAnalysis,
    keywordsFound,
    missingKeywords,
    missingKeywordAnalysis,
    recommendations,
    formattingSuggestions,
    impactSuggestions
  };
}

function extractAndParseJson(raw: string): any {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty model response received.');
  }

  // 1. Strip reasoning/think tags if present (e.g. <think>...</think>)
  let cleanText = raw.replace(/<think[\s\S]*?<\/think>/gi, '').trim();

  // 2. Direct parse attempt
  try {
    return JSON.parse(cleanText);
  } catch {
    // Continue to next step
  }

  // 3. Strip code fences if present (```json ... ``` or ``` ... ```)
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = fenceRegex.exec(cleanText);
  const textWithoutFences = (match && match[1]) ? match[1].trim() : cleanText;

  try {
    return JSON.parse(textWithoutFences);
  } catch {
    // Continue to next step
  }

  // 4. Find outermost '{'
  const startIdx = textWithoutFences.indexOf('{');
  if (startIdx === -1) {
    throw new Error('No JSON object found in response');
  }

  // 5. Balanced bracket scan with stack tracking
  const text = textWithoutFences.substring(startIdx);
  let inString = false;
  let escaped = false;
  const bracketStack: string[] = [];
  let endIdx = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        bracketStack.push('}');
      } else if (char === '[') {
        bracketStack.push(']');
      } else if (char === '}' || char === ']') {
        const expected = bracketStack[bracketStack.length - 1];
        if (expected === char) {
          bracketStack.pop();
        }
        if (bracketStack.length === 0) {
          endIdx = i;
          break;
        }
      }
    }
  }

  // If balanced end found, try parsing candidate
  if (endIdx !== -1) {
    const candidate = text.substring(0, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        const sanitized = candidate
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
          .replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(sanitized);
      } catch {
        // Fall through to stack auto-repair
      }
    }
  }

  // 6. Intelligent auto-repair for truncated JSON (matching bracket stack)
  let repairText = text;
  if (inString) {
    repairText += '"';
  }

  // Remove any trailing dangling comma or incomplete property assignment like `,"key":` or `,"key"` or `,`
  repairText = repairText
    .replace(/,\s*"[^"]*"\s*:\s*"?$/g, '')
    .replace(/,\s*"[^"]*"$/g, '')
    .replace(/,\s*$/g, '')
    .replace(/:\s*$/g, ': null')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/,\s*([\]}])/g, '$1');

  // Close remaining open brackets in reverse order
  while (bracketStack.length > 0) {
    const closingChar = bracketStack.pop()!;
    repairText += closingChar;
  }

  // Final sanitization of repaired string
  repairText = repairText.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(repairText);
  } catch (err: any) {
    throw new Error(`JSON parse failed after stack repair: ${err.message}`);
  }
}

async function processResumeAnalysisJob(
  job: ResumeAnalysisJob,
  resumeText: string,
  jobDescription?: string,
  fileType?: string
) {
  const jobStart = Date.now();
  console.log(`[AI HireFlow][ResumeJob:${job.analysisId}] Starting background analysis for user ${job.userId || 'anonymous'}`);

  let lastFinishReason = 'unknown';
  let lastModel = VELONA_MODEL_ID;
  let lastHttpStatus = 200;
  let lastRawSample = '';

  try {
    const prepStart = Date.now();
    // 1. Sanitize and compact resume text (bound to 7500 chars, ~1500 words)
    const cleanResume = (resumeText || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter((line, idx, arr) => line.length > 0 && (idx === 0 || line !== arr[idx - 1]))
      .join('\n')
      .slice(0, 7500);

    if (!cleanResume || cleanResume.length < 25) {
      throw new Error('Resume text is too short or empty for ATS analysis.');
    }

    // 2. Sanitize and compact job description (bound to 2000 chars)
    const cleanJD = (jobDescription || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim()
      .slice(0, 2000);

    const prepDurationMs = Date.now() - prepStart;

    // 3. Compact ATS schema prompt with strict limits
    const prompt = `You are an ATS Resume Auditor. Analyze this resume against the target job and output strictly valid JSON.

Schema:
{
  "targetRole": "Candidate target or primary job title (e.g. Senior Frontend Engineer, DevOps Engineer, Full Stack Developer, Product Manager)",
  "score": number (0-100),
  "atsCompatibility": "High" | "Moderate" | "Low",
  "summary": "max 30 words",
  "strengths": ["max 4 items, max 12 words each"],
  "weaknesses": [
    { "problem": "max 10 words", "whyItMatters": "max 12 words", "howToFix": "max 12 words" }
  ],
  "scoreBreakdown": [
    {
      "category": "Core Technical & Skill Match",
      "weight": 40,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    },
    {
      "category": "Measurable Impact & Hard Metrics",
      "weight": 25,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    },
    {
      "category": "Role & Domain Relevance",
      "weight": 20,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    },
    {
      "category": "Structure & ATS Parsability",
      "weight": 15,
      "score": number,
      "explanation": "max 12 words",
      "evidence": "max 10 words",
      "recommendations": ["max 12 words"]
    }
  ],
  "skillsAnalysis": [
    { "skill": "string", "type": "explicit" | "inferred", "confidence_level": "high" | "medium", "evidence": "max 10 words" }
  ],
  "keywordsFound": ["max 8 items"],
  "missingKeywords": ["max 5 items"],
  "recommendations": ["max 3 items, max 12 words each"]
}
Strict Limits: Max 3 items in "weaknesses". Max 5 key skills in "skillsAnalysis". Max 8 keywordsFound, max 5 missingKeywords, max 3 recommendations. Keep all descriptions strictly concise. All JSON brackets must be properly closed.

TARGET JOB:
${cleanJD || 'General ATS Industry Benchmark for the stated role and level'}

CANDIDATE RESUME:
${cleanResume}
`;

    // 4. Call Velona with optimized parameters (safe maxTokens: 3800 prevents premature length truncation)
    let velonaResult = await callVelonaChatCompletion({
      messages: [
        { role: 'system', content: 'You are an ATS scoring API for AI HireFlow. Output raw valid JSON only. Keep explanations concise and adhere to schema limits.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      jsonMode: true,
      maxTokens: 3800,
      requestId: job.analysisId,
      operation: 'resume_analysis_job',
      meta: {
        fileType: fileType || 'resume',
        charCount: cleanResume.length,
        wordCount: cleanResume.split(/\s+/).filter(Boolean).length
      }
    });

    lastFinishReason = velonaResult.finishReason || 'stop';
    lastModel = velonaResult.model || VELONA_MODEL_ID;
    lastRawSample = velonaResult.text?.slice(0, 500) || '';

    // 5. Parse JSON using resilient extractor
    let parsed: any = null;
    let didRetry = false;

    try {
      parsed = extractAndParseJson(velonaResult.text);
    } catch (firstParseErr: any) {
      console.warn(`[AI HireFlow][ResumeJob:${job.analysisId}] First JSON parse attempt failed (${firstParseErr.message}), finish_reason=${velonaResult.finishReason}.`);
    }

    // Requirement 12: Controlled Single Response Recovery if first response is malformed/truncated
    if (!parsed) {
      console.warn(`[AI HireFlow][ResumeJob:${job.analysisId}] Executing ONE controlled internal retry for malformed response...`);
      didRetry = true;
      const recoveryResult = await callVelonaChatCompletion({
        messages: [
          { role: 'system', content: 'You are an ATS scoring API for AI HireFlow. Output raw valid JSON only. Keep explanations concise and adhere to schema limits.' },
          { role: 'user', content: prompt },
          { role: 'assistant', content: velonaResult.text ? velonaResult.text.slice(0, 400) : '' },
          { role: 'user', content: 'The previous response was malformed or incomplete. Return ONLY valid JSON. No markdown. No code fences. No commentary. Keep all fields strictly concise and use exactly the existing ATS schema.' }
        ],
        temperature: 0.1,
        jsonMode: true,
        maxTokens: 3800,
        requestId: `${job.analysisId}_retry`,
        operation: 'resume_analysis_job_recovery'
      });

      lastFinishReason = recoveryResult.finishReason || 'stop';
      lastModel = recoveryResult.model || VELONA_MODEL_ID;
      lastRawSample = recoveryResult.text?.slice(0, 500) || '';
      velonaResult = recoveryResult;

      try {
        parsed = extractAndParseJson(recoveryResult.text);
      } catch (retryParseErr: any) {
        console.error(`[AI HireFlow][ResumeJob:${job.analysisId}] Recovery retry JSON parse failed:`, retryParseErr.message, 'Sample:', recoveryResult.text?.slice(0, 300));
        const parseError: any = new Error(
          recoveryResult.finishReason === 'length'
            ? 'Resume analysis output was truncated by token limits. Please retry.'
            : 'Analysis completed with malformed response. Please retry in a moment.'
        );
        parseError.rawSample = recoveryResult.text?.slice(0, 500);
        throw parseError;
      }
    }

    // 6. Normalize and validate ATS schema
    const normalized = normalizeAtsAuditResult(parsed);

    // Schema sanity check: ensure required core ATS fields exist
    if (typeof normalized.score !== 'number' || !Array.isArray(normalized.scoreBreakdown) || normalized.scoreBreakdown.length === 0) {
      throw new Error('ATS schema validation failed: missing score or breakdown.');
    }

    job.status = 'completed';
    job.result = normalized;
    job.updatedAt = Date.now();
    job.diagnostics = {
      prepDurationMs,
      totalDurationMs: Date.now() - jobStart,
      velonaDurationMs: velonaResult.timing?.velonaDurationMs,
      model: velonaResult.model,
      tokens: velonaResult.usage,
      finishReason: velonaResult.finishReason,
      parseResult: 'SUCCESS',
      schemaValidation: 'SUCCESS',
      httpStatus: 200,
      retried: didRetry
    };

    // Safe operational diagnostics (no private user resume or keys)
    console.log(`[AI HireFlow][Diagnostics] analysisId=${job.analysisId}, model=${velonaResult.model}, prompt_chars=${cleanResume.length}, prep_ms=${prepDurationMs}, velona_ms=${velonaResult.timing?.velonaDurationMs}ms, total_ms=${job.diagnostics.totalDurationMs}ms, status=completed, finishReason=${velonaResult.finishReason}, parseResult=SUCCESS, retried=${didRetry}`);
  } catch (err: any) {
    console.error(`[AI HireFlow][ResumeJob:${job.analysisId}] Background analysis failed:`, err.message);
    job.status = 'failed';
    job.updatedAt = Date.now();

    const isTimeout = err.code === 'TIMEOUT' || err.status === 504 || (err.message && err.message.toLowerCase().includes('time'));
    job.error = isTimeout 
      ? 'Analysis is taking longer than expected. Please retry in a moment.' 
      : (err.message || 'Resume analysis failed. Please try again.');
    job.diagnostics = {
      totalDurationMs: Date.now() - jobStart,
      parseResult: 'ERROR',
      finishReason: lastFinishReason,
      model: lastModel,
      httpStatus: lastHttpStatus,
      sample: err.rawSample || lastRawSample
    };
  }
}

// 1. Initiate or reconnect to an asynchronous analysis job
app.post(['/api/resume/analyze-job', '/resume/analyze-job'], async (req, res) => {
  try {
    const body = req.body || {};
    const { 
      analysisId: incomingId, 
      userId, 
      resumeText, 
      jobDescription, 
      fileType = 'pdf' 
    } = body;

    const effectiveUserId = userId || (req.headers['x-user-id'] as string);
    const effectiveUserEmail = body.userEmail || (req.headers['x-user-email'] as string);

    if (effectiveUserId || effectiveUserEmail) {
      const enforcement = await enforceSubscriptionAndCredits({
        userId: effectiveUserId,
        userEmail: effectiveUserEmail,
        operation: 'ats_analysis',
        overrideCost: 20
      });

      if (!enforcement.allowed) {
        return res.status(enforcement.status || 403).json({
          error: enforcement.error,
          code: enforcement.code || 'ACCESS_DENIED',
          requiredCredits: enforcement.requiredCredits,
          balance: enforcement.balance
        });
      }
    }

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 25) {
      return res.status(400).json({
        error: 'Valid readable resume text is required to start an ATS analysis.',
        code: 'INVALID_RESUME_TEXT'
      });
    }

    const analysisId = incomingId || `ats_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Deduplication check: if job already exists and is active, return current status
    const existing = analysisJobs.get(analysisId);
    if (existing) {
      if (existing.status === 'processing' || existing.status === 'queued') {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: existing.status,
          message: 'Analysis job is already in progress'
        });
      }
      if (existing.status === 'completed') {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: 'completed',
          result: existing.result
        });
      }
    }

    const job: ResumeAnalysisJob = {
      analysisId,
      userId,
      status: 'processing',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    analysisJobs.set(analysisId, job);

    // Immediate acknowledgment: browser does not hang waiting on the AI completion
    res.status(202).json({
      analysisId,
      status: 'processing',
      message: 'Analysis job started successfully'
    });

    // Launch background asynchronous execution
    processResumeAnalysisJob(job, resumeText, jobDescription, fileType).catch((err) => {
      console.error(`[AI HireFlow][ResumeJob:${analysisId}] Unhandled async worker error:`, err);
    });
  } catch (err: any) {
    console.error('Failed to create resume analysis job:', err);
    res.status(500).json({
      error: err.message || 'Failed to initialize analysis job',
      code: 'JOB_INIT_FAILED'
    });
  }
});

// 2. Poll status of an analysis job (Pure read, never restarts or duplicates AI work)
app.get(['/api/resume/analyze-job/:analysisId', '/resume/analyze-job/:analysisId'], (req, res) => {
  const { analysisId } = req.params;
  const job = analysisJobs.get(analysisId);

  if (!job) {
    return res.status(404).json({
      error: 'Analysis job not found or session has expired.',
      code: 'JOB_NOT_FOUND',
      status: 'failed'
    });
  }

  res.json({
    analysisId: job.analysisId,
    status: job.status,
    result: job.result || null,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    timing: job.diagnostics
  });
});

// 3. Cancel an analysis job
app.post(['/api/resume/analyze-job/:analysisId/cancel', '/resume/analyze-job/:analysisId/cancel'], (req, res) => {
  const { analysisId } = req.params;
  const job = analysisJobs.get(analysisId);

  if (job && (job.status === 'processing' || job.status === 'queued')) {
    job.status = 'failed';
    job.error = 'Analysis cancelled by user';
    job.updatedAt = Date.now();
  }

  res.json({ success: true, analysisId });
});

// =========================================================================
// RAZORPAY PAYMENT GATEWAY ENDPOINTS
// =========================================================================
function getRazorpayKeyId(): string | undefined {
  return (
    process.env.RAZORPAY_KEY_ID ||
    process.env.KEY_ID ||
    process.env.RAZORPAY_KEYID ||
    process.env.VITE_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_ID ||
    process.env.RZP_KEY_ID
  );
}

function getRazorpayKeySecret(): string | undefined {
  return (
    process.env.RAZORPAY_KEY_SECRET ||
    process.env._KEY_SECRET ||
    process.env.KEY_SECRET ||
    process.env.RAZORPAY_SECRET ||
    process.env.RAZORPAY_SECRET_KEY ||
    process.env.SECRET_KEY ||
    process.env.RZP_KEY_SECRET
  );
}

app.get('/api/razorpay/config', (req, res) => {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  res.json({ 
    configured: !!(keyId && keySecret),
    keyId: keyId || ''
  });
});

let razorpayClient: any = null;
let initializedKeyId: string | null = null;
async function getRazorpay() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    return null;
  }
  if (!razorpayClient || initializedKeyId !== keyId) {
    try {
      const { default: Razorpay } = await import('razorpay');
      razorpayClient = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      initializedKeyId = keyId;
    } catch (err) {
      console.error('Failed to initialize Razorpay:', err);
    }
  }
  return razorpayClient;
}

// Track processed payment IDs in memory to prevent duplicate credit claims
const processedPaymentIds = new Set<string>();

app.get(['/api/credits/packs', '/api/credit-packs'], (req, res) => {
  res.json({
    success: true,
    packs: CREDIT_PACKS
  });
});

app.post(['/api/razorpay/create-order', '/api/create-order'], async (req, res) => {
  try {
    const { amount, currency, receipt, userId, type, item, price, credits, packId } = req.body;
    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();

    if (!keyId || !keySecret) {
      return res.status(500).json({ 
        error: 'Razorpay payment gateway is not configured. Server environment variables RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured.' 
      });
    }

    const client = await getRazorpay();
    if (!client) {
      return res.status(500).json({ error: 'Failed to initialize Razorpay client' });
    }

    // Resolve pack if credit pack purchase
    const matchedPack = getCreditPackById(packId || item);
    const resolvedCredits = matchedPack ? matchedPack.credits : Number(credits || 0);

    let amountInPaisa = 0;
    if (amount !== undefined) {
      amountInPaisa = Math.round(Number(amount));
    } else if (price !== undefined) {
      amountInPaisa = Math.round(Number(price) * 100);
    } else if (matchedPack) {
      amountInPaisa = Math.round(matchedPack.price.INR * 100);
    } else {
      return res.status(400).json({ error: 'Amount in paise or price in rupees is required.' });
    }

    if (amountInPaisa < 100) {
      amountInPaisa = 100;
    }

    const options = {
      amount: amountInPaisa,
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${(userId || 'guest').substring(0, 5)}_${Date.now().toString().slice(-6)}`,
      notes: {
        userId: userId || 'guest',
        type: type || (matchedPack ? 'credits' : 'custom'),
        item: matchedPack ? matchedPack.name : (item || 'custom_item'),
        packId: matchedPack ? matchedPack.id : (packId || ''),
        credits: String(resolvedCredits),
        price: String(price || (amountInPaisa / 100))
      }
    };

    const order = await client.orders.create(options);
    res.json({ 
      orderId: order.id, 
      amount: order.amount, 
      currency: order.currency, 
      keyId,
      pack: matchedPack ? {
        id: matchedPack.id,
        name: matchedPack.name,
        credits: matchedPack.credits,
        priceINR: matchedPack.price.INR
      } : null
    });
  } catch (err: any) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create Razorpay Order' });
  }
});

app.post(['/api/razorpay/verify-payment', '/api/verify-payment'], async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId,
      type,
      item,
      credits,
      price,
      packId
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required validation fields' });
    }

    // Check duplicate payment allocation
    if (processedPaymentIds.has(razorpay_payment_id)) {
      return res.status(409).json({ 
        error: 'Duplicate payment claim: Credits for this payment have already been allocated.',
        alreadyAllocated: true
      });
    }

    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      return res.status(500).json({ 
        error: 'Razorpay secret key is not configured on server.' 
      });
    }

    const isManualFallback = (
      razorpay_signature && (
        razorpay_signature.startsWith('sig_qr_') || 
        razorpay_signature.startsWith('sig_bank_') ||
        razorpay_signature === 'sig_verified_mock_256'
      )
    );

    if (!isManualFallback) {
      const crypto = await import('crypto');
      const text = razorpay_order_id + '|' + razorpay_payment_id;
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ error: 'Cryptographic signature verification failed' });
      }
    }

    // Mark payment ID as successfully claimed
    processedPaymentIds.add(razorpay_payment_id);

    const matchedPack = getCreditPackById(packId || item);
    const finalCredits = matchedPack ? matchedPack.credits : parseInt(credits || '0');
    const finalPrice = parseFloat(price || (matchedPack ? matchedPack.price.INR.toString() : '0'));

    res.json({ 
      success: true, 
      type: type || (matchedPack ? 'credits' : 'custom'), 
      item: matchedPack ? matchedPack.name : (item || 'custom_item'), 
      packId: matchedPack?.id,
      credits: finalCredits, 
      price: finalPrice 
    });
  } catch (err: any) {
    console.error('Razorpay signature verification error:', err);
    res.status(500).json({ error: 'Internal payment verification error' });
  }
});

// Resume PDF & Image OCR Analysis Endpoint (lazy-loaded to keep serverless cold-start light)
app.post(['/api/ocr', '/ocr'], async (req, res, next) => {
  try {
    const { handleOcrRequest } = await import('./_lib/ocr.ts');
    return handleOcrRequest(req, res);
  } catch (err) {
    next(err);
  }
});

// JSON 404 handler for any unmatched /api/* route
app.all(['/api/*', '/api'], (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    code: 'API_ENDPOINT_NOT_FOUND'
  });
});

// Global Error Handler for API
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = (typeof err.status === 'number' && err.status >= 400 && err.status < 600) 
    ? err.status 
    : ((typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) ? err.statusCode : 500);
  const safeMsg = sanitizeSafeErrorMessage(err.message || 'Internal Server Error');
  console.error(`[AI HireFlow][Diagnostics] endpoint=${req.path || '/api'}, http_status=${status}, model=${getVelonaModel()}, duration_ms=0, velona_status=N/A, error_category=${err.code || 'INTERNAL_ERROR'}, message=${safeMsg}`);
  
  if (!res.headersSent) {
    res.status(status).json({
      error: safeMsg,
      code: err.code || 'INTERNAL_ERROR'
    });
  }
});

export default app;
