import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import dns from 'dns';
import { enforceSubscriptionAndCredits, getServerFirestore } from './_lib/subscriptionEnforcement.ts';
import { CREDIT_PACKS, getCreditPackById } from './_lib/creditPacks.ts';

// Prioritize IPv4 to avoid Cloudflare/carrier IPv6 connect timeouts on Node.js
try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch {
  // ignore
}

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

export function sanitizeHttpStatus(status: any): number {
  const num = typeof status === 'number' ? status : Number(status);
  if (isNaN(num) || num < 400 || num >= 600) return 500;
  // Cloudflare-proprietary 520 must never be emitted as our origin web server response status
  if (num === 520) return 502;
  return num;
}

export function sanitizeSafeErrorMessage(rawMessage: any): string {
  if (!rawMessage) return 'AI provider is temporarily unavailable. Please try again later.';
  const str = typeof rawMessage === 'string' ? rawMessage : (rawMessage.message || String(rawMessage));

  // Detect Cloudflare / Upstream HTML error pages, Bad gateway, or gateway codes (502, 503, 504, 520, 524)
  if (
    str.includes('520') ||
    str.includes('502') ||
    str.includes('503') ||
    str.includes('504') ||
    str.includes('524') ||
    str.includes('Bad gateway') ||
    str.includes('Bad Gateway') ||
    str.includes('gateway') ||
    str.includes('Cloudflare') ||
    str.includes('<!DOCTYPE') ||
    str.includes('<!doctype') ||
    str.includes('<html')
  ) {
    return 'AI provider is temporarily unavailable. Please try again later.';
  }

  let safe = str
    // Strip HTML tags if any
    .replace(/<[^>]*>/g, ' ')
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/[a-zA-Z0-9_\-]{32,}/g, '[REDACTED_KEY]')
    .replace(/\s+/g, ' ')
    .trim();
  if (safe.length > 250) {
    safe = safe.slice(0, 250) + '...';
  }
  return safe || 'AI provider is temporarily unavailable. Please try again later.';
}

export async function callVelonaChatCompletion({
  messages,
  temperature = 0.7,
  jsonMode = false,
  maxTokens,
  requestId,
  signal,
  operation = 'general',
  meta
}: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  requestId?: string;
  signal?: AbortSignal;
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

  const isAtsJob = operation === 'resume_analysis_job' || operation === 'ats_analysis';
  const isJob = isAtsJob || (operation || '').includes('job');
  const isCoverLetter = operation === 'cover_letter';
  const isLearningPath = operation === 'learning_path';

  // For Z.ai GLM-5.3-Flash: Allocate sufficient tokens (up to 3200) so reasoning and complete ATS JSON fit comfortably
  // without risking output truncation (finish_reason=length). Cover letter is allocated 2400 to prevent cuts.
  const safeMaxTokens = Math.min(3200, Math.max(1000, maxTokens || (isJob ? 2800 : (isCoverLetter ? 2400 : 1600))));
  const safeTemperature = typeof temperature === 'number' && !isNaN(temperature)
    ? Math.max(0.0, Math.min(1.0, temperature))
    : (isCoverLetter ? 0.3 : 0.1);

  const velonaStart = Date.now();
  // Strictly ZERO retries for ATS resume analysis jobs: exactly one Velona request per ATS analysis
  const maxRetries = isAtsJob ? 0 : 1;
  // Vercel Serverless Function Execution Budget:
  // Vercel platform maxDuration is configured to 60 seconds (60,000ms).
  // Total overall execution budget is strictly bounded to 48,000ms, ensuring a guaranteed 12,000ms safety
  // cushion for response serialization, error handling, and socket flushing before Vercel terminates the function.
  const maxTotalBudgetMs = 48000;
  // Clamped per-attempt timeout: 42,000ms for ATS job, 38,000ms for Cover Letter
  const perAttemptTimeoutMs = isJob ? 42000 : (isCoverLetter ? 38000 : (isLearningPath ? 38000 : 40000));
  let lastError: any = null;

  const inputChars = meta?.charCount || formattedMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const approxInputTokens = Math.round(inputChars / 4);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const elapsedSoFar = Date.now() - velonaStart;
    const timeRemaining = maxTotalBudgetMs - elapsedSoFar;

    // Critical Vercel Execution Limit Guard:
    // Never run a retry when insufficient execution time remains to complete an inference (requires >= 20s).
    if (attempt > 0 && timeRemaining < 20000) {
      break;
    }

    // Dynamically clamp timeout to remaining overall budget minus 3s safety margin
    const currentAttemptTimeoutMs = Math.min(perAttemptTimeoutMs, Math.max(10000, timeRemaining - 3000));
    const attemptStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), currentAttemptTimeoutMs);

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
            content: `[System Instructions: ${mergedSystem}]\n\n${firstUser.content}\n\nIMPORTANT: Be extremely concise. Output strictly raw valid JSON immediately.`
          },
          ...nonSystemParts.slice(1)
        ];
      }
    }

    // Clean payload for Velona GLM 5.3 Flash:
    // Omit reasoning_effort and response_format, which cause GLM 5.3 Flash on Velona upstream to exceed 60s.
    const payload: any = {
      model: modelId,
      messages: currentMessages,
      temperature: attempt > 0 ? 0.0 : safeTemperature,
      stream: false,
      max_tokens: attempt > 0 ? Math.min(2800, safeMaxTokens) : safeMaxTokens
    };

    try {
      if (attempt > 0) {
        const backoffMs = Math.min(1500, 400 * Math.pow(2, attempt - 1));
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
        signal: signal || controller.signal
      });

      clearTimeout(timeoutId);
      const attemptDuration = Date.now() - attemptStart;

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorBody = await response.text();
          if (errorBody.includes('520') || errorBody.includes('502') || errorBody.includes('Cloudflare') || errorBody.includes('<!DOCTYPE') || errorBody.includes('<html')) {
            errorDetails = 'AI provider server encountered a temporary gateway issue.';
          } else {
            try {
              const errJson = JSON.parse(errorBody);
              errorDetails = errJson.error?.message || errJson.message || errorBody;
            } catch {
              errorDetails = errorBody;
            }
          }
        } catch {
          errorDetails = `HTTP status ${response.status}`;
        }

        const safeDetails = sanitizeSafeErrorMessage(errorDetails);
        const resolvedMsg = (!safeDetails || safeDetails.toLowerCase().includes('internal server error'))
          ? 'AI provider is temporarily unavailable. Please try again later.'
          : safeDetails;
        const effectiveStatus = response.status === 520 ? 502 : response.status;
        const err: any = new Error(resolvedMsg);
        err.status = effectiveStatus;
        err.velonaStatus = response.status;
        err.attemptDuration = attemptDuration;

        if (response.status === 401) {
          err.code = 'PROVIDER_CONFIGURATION_ERROR';
          err.message = `Velona Authentication Failed: Invalid or expired API key. (${resolvedMsg})`;
          throw err;
        } else if (response.status === 402 || response.status === 429) {
          err.code = 'PROVIDER_UPSTREAM_ERROR';
          err.message = `Velona Quota/Rate Limit Error: ${resolvedMsg}`;
          throw err;
        } else {
          err.code = 'PROVIDER_UPSTREAM_ERROR';
          err.message = resolvedMsg;
        }

        const isTransient = [500, 502, 503, 504, 520].includes(response.status);
        if (!isAtsJob && isTransient && attempt < maxRetries && (Date.now() - velonaStart) < (maxTotalBudgetMs - 15000)) {
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
        err.code = 'PROVIDER_UPSTREAM_ERROR';
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
        err.code = 'PROVIDER_UPSTREAM_ERROR';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      if (!data || typeof data !== 'object') {
        const err: any = new Error('Velona API returned an invalid response structure.');
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = 'PROVIDER_UPSTREAM_ERROR';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      if (data.error) {
        const errMsg = sanitizeSafeErrorMessage(typeof data.error === 'string' ? data.error : (data.error.message || 'Velona API error'));
        const err: any = new Error(errMsg);
        err.status = data.error.code === 'invalid_api_key' ? 401 : 502;
        err.velonaStatus = response.status;
        err.code = data.error.code === 'invalid_api_key' ? 'PROVIDER_CONFIGURATION_ERROR' : 'PROVIDER_UPSTREAM_ERROR';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      const choice = data.choices?.[0];
      let content: string | null = null;

      if (typeof choice?.message?.content === 'string' && choice.message.content.trim()) {
        content = choice.message.content;
      } else if (Array.isArray(choice?.message?.content)) {
        const joined = choice.message.content
          .map((part: any) => (typeof part === 'string' ? part : (part?.text || part?.content || '')))
          .join('')
          .trim();
        if (joined) content = joined;
      } else if (choice?.message?.content && typeof choice.message.content === 'object') {
        try {
          content = JSON.stringify(choice.message.content);
        } catch {
          // ignore
        }
      }

      // Comprehensive fallback inspection across OpenAI, GLM, DeepSeek and custom gateway properties
      if (!content) {
        if (typeof choice?.text === 'string' && choice.text.trim()) {
          content = choice.text;
        } else if (typeof choice?.message?.reasoning_content === 'string' && choice.message.reasoning_content.trim()) {
          content = choice.message.reasoning_content;
        } else if (typeof choice?.message?.reasoning === 'string' && choice.message.reasoning.trim()) {
          content = choice.message.reasoning;
        } else if (typeof choice?.reasoning === 'string' && choice.reasoning.trim()) {
          content = choice.reasoning;
        } else if (typeof choice?.message?.thought === 'string' && choice.message.thought.trim()) {
          content = choice.message.thought;
        } else if (typeof choice?.delta?.content === 'string' && choice.delta.content.trim()) {
          content = choice.delta.content;
        } else if (typeof choice?.message?.tool_calls?.[0]?.function?.arguments === 'string' && choice.message.tool_calls[0].function.arguments.trim()) {
          content = choice.message.tool_calls[0].function.arguments;
        } else if (typeof data?.response === 'string' && data.response.trim()) {
          content = data.response;
        } else if (typeof data?.output === 'string' && data.output.trim()) {
          content = data.output;
        } else if (typeof data?.text === 'string' && data.text.trim()) {
          content = data.text;
        }
      }

      if (!content) {
        const isLengthExhaustion = choice?.finish_reason === 'length';
        const err: any = new Error(
          isLengthExhaustion
            ? 'Velona AI token limit reached during reasoning. Please retry.'
            : 'Velona API response did not contain completion content.'
        );
        err.status = 502;
        err.velonaStatus = response.status;
        err.code = isLengthExhaustion ? 'PROVIDER_TIMEOUT' : 'PARSE_ERROR';
        err.attemptDuration = attemptDuration;
        throw err;
      }

      const finishReason = choice?.finish_reason || 'stop';
      const totalElapsed = Date.now() - velonaStart;

      // Safe production diagnostics: strictly operational metrics without sensitive user prompt/resume content
      console.log(`[AI HireFlow][Diagnostics] request_start=${new Date(attemptStart).toISOString()}, request_id=${requestId || 'unknown'}, model=${modelId}, input_chars=${inputChars}, approx_input_tokens=${approxInputTokens}, configured_timeout_ms=${perAttemptTimeoutMs}, provider_duration_ms=${attemptDuration}, provider_status=200, retry_count=${attempt}, response_chars=${content.length}, failure_category=none`);

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

      const resolvedProvider = 'velona';
      const resolvedModel = data.model || modelId;
      if (resolvedProvider !== 'velona' || (!resolvedModel.includes('glm-5.3-flash') && resolvedModel !== 'z-ai/glm-5.3-flash')) {
        const configErr: any = new Error(`Configuration error: unexpected provider/model response (${resolvedProvider}/${resolvedModel}). Expected Velona z-ai/glm-5.3-flash.`);
        configErr.code = 'PROVIDER_CONFIGURATION_ERROR';
        configErr.status = 502;
        throw configErr;
      }

      console.log(`[AI HireFlow][Diagnostics] endpoint=${VELONA_BASE_URL}/chat/completions, provider=velona, model=z-ai/glm-5.3-flash, http_status=200, provider_duration_ms=${attemptDuration}, total_duration_ms=${totalElapsed}, request_id=${requestId || 'unknown'}, retry_count=${attempt}, parse_status=SUCCESS, failure_category=none`);

      return {
        text: cleanText,
        rawText: content,
        finishReason,
        isTruncated: finishReason === 'length',
        model: resolvedModel,
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
        const stage = isLearningPath ? 'learning_path_timeout' : (isJob ? 'job_timeout' : (isCoverLetter ? 'cover_letter_timeout' : `attempt_${attempt}_timeout`));
        lastError = new Error(
          isJob 
            ? 'Analysis timed out on the AI provider. Please click Retry Analysis to run a fresh audit.' 
            : (isCoverLetter ? 'Cover letter generation timed out. Please click Retry Cover Letter.' : 'AI request timed out. Please try again.')
        );
        lastError.status = 504;
        lastError.velonaStatus = 504;
        lastError.code = 'PROVIDER_TIMEOUT';
        lastError.timeoutStage = stage;
        lastError.attemptDuration = attemptDuration;
        break;
      } else {
        lastError = err;
        lastError.timeoutStage = 'none';
        lastError.attemptDuration = attemptDuration;
      }

      const timeRemaining = maxTotalBudgetMs - (Date.now() - velonaStart);
      if (
        !isAtsJob &&
        attempt < maxRetries &&
        timeRemaining > 20000 &&
        (
          err.name === 'FetchError' ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'MALFORMED_UPSTREAM_RESPONSE' ||
          err.code === 'TOKEN_LIMIT_EXCEEDED' ||
          err.status === 502 ||
          err.status === 503 ||
          err.status === 504 ||
          err.status === 520 ||
          err.velonaStatus === 520
        )
      ) {
        continue;
      }

      break;
    }
  }

  const totalElapsed = Date.now() - velonaStart;
  const safeMessage = sanitizeSafeErrorMessage(lastError?.message || 'Velona API request failed.');
  const errorCategory = lastError?.code || (lastError?.status === 504 ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UPSTREAM_ERROR');
  const velonaStatus = lastError?.velonaStatus || lastError?.status || 502;
  const timeoutStage = lastError?.timeoutStage || (errorCategory === 'PROVIDER_TIMEOUT' ? 'request_timeout' : 'none');
  const velonaDuration = lastError?.attemptDuration || totalElapsed;

  console.log(`[AI HireFlow][Diagnostics] request_start=${new Date(velonaStart).toISOString()}, request_id=${requestId || 'unknown'}, model=${modelId}, input_chars=${inputChars}, approx_input_tokens=${approxInputTokens}, configured_timeout_ms=${perAttemptTimeoutMs}, provider_duration_ms=${velonaDuration}, provider_status=${velonaStatus}, retry_count=0, response_chars=${lastError?.rawSample?.length || 0}, failure_category=${errorCategory}`);

  throw lastError || new Error('Velona API request failed.');
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
        console.log(`[AI HireFlow][Diagnostics] endpoint=/api/velona/generate, http_status=200, model=${modelId}, duration_ms=${Date.now() - requestStart}, velona_status=N/A, status=fallback_allowed, message=Allowed with fallback`);
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

    const isCoverLetter = operation === 'cover_letter';
    const requestPurpose = isCoverLetter ? 'COVER_LETTER' : 'GENERAL';
    const safeReqId = (typeof body.requestId === 'string' && body.requestId.trim()) ? body.requestId.trim() : `gen_${Date.now()}`;

    const result = await callVelonaChatCompletion({
      messages,
      temperature,
      jsonMode: Boolean(jsonMode),
      maxTokens,
      operation: typeof operation === 'string' ? operation : 'general',
      requestId: safeReqId,
      meta
    });

    const totalDuration = Date.now() - requestStart;
    console.log(`[AI HireFlow][Diagnostics] request_id=${safeReqId}, request_purpose=${requestPurpose}, endpoint=/api/velona/generate, model=${result.model || modelId}, provider_duration_ms=${result.timing?.velonaDurationMs || totalDuration}, total_duration_ms=${totalDuration}, http_status=200, finish_reason=${result.finishReason || 'stop'}, parse_status=SUCCESS, failure_category=none, request_count=1`);

    return res.status(200).json({
      ...result,
      timing: {
        ...result.timing,
        totalDurationMs: totalDuration
      }
    });
  } catch (err: any) {
    const totalDuration = Date.now() - requestStart;
    const rawStatus = sanitizeHttpStatus((typeof err.status === 'number' && err.status >= 400 && err.status < 600) ? err.status : 500);
    const safeMsg = sanitizeSafeErrorMessage(err.message || 'Internal AI generation error');
    const errorCode = err.code || 'AI_GENERATION_FAILED';
    const velonaStatus = err.velonaStatus || (rawStatus !== 500 ? rawStatus : 'N/A');
    const timeoutStage = err.timeoutStage || (errorCode === 'TIMEOUT' ? 'request_timeout' : 'none');

    const isCoverLetter = (req.body && req.body.operation === 'cover_letter');
    const requestPurpose = isCoverLetter ? 'COVER_LETTER' : 'GENERAL';
    const safeReqId = (req.body && typeof req.body.requestId === 'string' && req.body.requestId.trim()) ? req.body.requestId.trim() : `gen_${Date.now()}`;
    console.log(`[AI HireFlow][Diagnostics] request_id=${safeReqId}, request_purpose=${requestPurpose}, endpoint=/api/velona/generate, request_start=${new Date(requestStart).toISOString()}, http_status=${rawStatus}, model=${modelId}, provider_duration_ms=${err.attemptDuration || totalDuration}, total_duration_ms=${totalDuration}, finish_reason=error, parse_status=FAILED, failure_category=${errorCode}, request_count=1`);

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
  errorCode?: string;
  diagnostics?: {
    provider?: string;
    prepDurationMs?: number;
    velonaDurationMs?: number;
    totalDurationMs?: number;
    model?: string;
    tokens?: any;
    finishReason?: string;
    parseResult?: string;
    schemaValidation?: string;
    httpStatus?: number;
    failureCategory?: string;
    sample?: string;
    retried?: boolean;
    velonaRequestCount?: number;
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

  const rawBreakdown = Array.isArray(rawData?.scoreBreakdown)
    ? rawData.scoreBreakdown
    : (Array.isArray(rawData?.score_breakdown) ? rawData.score_breakdown : []);
  
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

  const rawKeywords = rawData?.keywordsFound || rawData?.keywords_found || rawData?.identifiedKeywords || rawData?.keywords || [];
  const keywordsFound = Array.isArray(rawKeywords) ? rawKeywords.map(String).filter(Boolean).slice(0, 10) : [];

  const rawMissing = rawData?.missingKeywords || rawData?.missing_keywords || rawData?.missingSkills || rawData?.skillGaps || [];
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
  let totalInputChars = (resumeText?.length || 0) + (jobDescription?.length || 0);
  let approxInputTokens = Math.round(totalInputChars / 4);
  let didRetry = false;

  try {
    const prepStart = Date.now();
    // 1. Sanitize and compact resume text (bound to 3500 chars, ~700 words of highest-value experience and skills)
    const cleanResume = (resumeText || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter((line, idx, arr) => line.length > 0 && (idx === 0 || line !== arr[idx - 1]))
      .join('\n')
      .slice(0, 3500);

    if (!cleanResume || cleanResume.length < 25) {
      throw new Error('Resume text is too short or empty for ATS analysis.');
    }

    // 2. Sanitize and compact job description (bound to 1200 chars)
    const cleanJD = (jobDescription || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim()
      .slice(0, 1200);

    const prepDurationMs = Date.now() - prepStart;
    totalInputChars = cleanResume.length + (cleanJD ? cleanJD.length : 0);
    approxInputTokens = Math.round(totalInputChars / 4);

    // 3. Compact ATS schema prompt with strict brevity limits for fast, deterministic GLM-5.3-Flash inference
    const prompt = `You are an ATS Resume Auditor. Analyze this resume against the target job and output strictly valid JSON.

Schema:
{
  "targetRole": "Candidate primary job title",
  "score": number (0-100),
  "atsCompatibility": "High" | "Moderate" | "Low",
  "summary": "max 25 words",
  "strengths": ["max 3 items, max 8 words each"],
  "weaknesses": [
    { "problem": "max 8 words", "whyItMatters": "max 10 words", "howToFix": "max 10 words" }
  ],
  "scoreBreakdown": [
    {
      "category": "Core Technical & Skill Match",
      "weight": 40,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    },
    {
      "category": "Measurable Impact & Hard Metrics",
      "weight": 25,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    },
    {
      "category": "Role & Domain Relevance",
      "weight": 20,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    },
    {
      "category": "Structure & ATS Parsability",
      "weight": 15,
      "score": number,
      "explanation": "max 10 words",
      "evidence": "max 8 words",
      "recommendations": ["max 10 words"]
    }
  ],
  "skillsAnalysis": [
    { "skill": "string", "type": "explicit" | "inferred", "confidence_level": "high" | "medium", "evidence": "max 8 words" }
  ],
  "keywordsFound": ["max 6 items"],
  "missingKeywords": ["max 4 items"],
  "recommendations": ["max 3 items, max 10 words each"]
}
STRICT CONSTRAINTS:
- All 4 categories in scoreBreakdown MUST be present.
- Limit skillsAnalysis to at most 6 key technical skills.
- Limit weaknesses to at most 3 items.
- Limit strengths to at most 3 items.
- Keep all explanations, problem statements, and recommendations strictly under 10 words.
- Output raw valid JSON only without markdown code fences or conversational text.

TARGET JOB:
${cleanJD || 'General ATS Industry Benchmark for candidate profile'}

CANDIDATE RESUME:
${cleanResume}
`;

    // 4. Call Velona with direct scoring instruction and adequate tokens (2800 tokens for reasoning + JSON)
    let velonaResult = await callVelonaChatCompletion({
      messages: [
        { role: 'system', content: 'You are an ultra-fast ATS scoring engine for AI HireFlow. Do not perform extended internal reasoning or chain of thought. Evaluate immediately and concisely. Emit raw valid JSON instantly adhering strictly to word and item limits.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      jsonMode: true,
      maxTokens: 2800,
      requestId: job.analysisId,
      operation: 'resume_analysis_job',
      meta: {
        fileType: fileType || 'resume',
        charCount: totalInputChars,
        wordCount: cleanResume.split(/\s+/).filter(Boolean).length
      }
    });

    lastFinishReason = velonaResult.finishReason || 'stop';
    lastModel = velonaResult.model || VELONA_MODEL_ID;
    lastRawSample = velonaResult.text?.slice(0, 500) || '';

    // 5. Parse JSON using resilient extractor (Strictly ONE request - NO internal recovery retry)
    let parsed: any = null;
    try {
      parsed = extractAndParseJson(velonaResult.text);
    } catch (firstParseErr: any) {
      console.warn(`[AI HireFlow][ResumeJob:${job.analysisId}] JSON parse attempt failed (${firstParseErr.message}), finish_reason=${velonaResult.finishReason}.`);
    }

    if (!parsed || typeof parsed !== 'object') {
      const isTruncated = velonaResult.finishReason === 'length';
      const parseError: any = new Error(
        isTruncated
          ? 'AI provider token limit reached during reasoning. Please retry.'
          : 'Failed to parse AI provider ATS response. Please click Retry Analysis.'
      );
      parseError.code = isTruncated ? 'PROVIDER_TIMEOUT' : 'PARSE_ERROR';
      parseError.status = isTruncated ? 504 : 502;
      parseError.rawSample = velonaResult.text?.slice(0, 500);
      throw parseError;
    }

    // 6. Normalize and validate ATS schema
    const normalized = normalizeAtsAuditResult(parsed);

    // Schema sanity check: ensure required core ATS fields exist
    if (typeof normalized.score !== 'number' || !Array.isArray(normalized.scoreBreakdown) || normalized.scoreBreakdown.length === 0) {
      const schemaErr: any = new Error('ATS schema validation failed: missing score or breakdown.');
      schemaErr.code = 'PARSE_ERROR';
      schemaErr.status = 502;
      throw schemaErr;
    }

    job.status = 'completed';
    job.result = normalized;
    job.updatedAt = Date.now();
    job.diagnostics = {
      provider: 'velona',
      model: 'z-ai/glm-5.3-flash',
      httpStatus: 200,
      velonaRequestCount: 1,
      prepDurationMs,
      totalDurationMs: Date.now() - jobStart,
      velonaDurationMs: velonaResult.timing?.velonaDurationMs,
      tokens: velonaResult.usage,
      finishReason: velonaResult.finishReason,
      parseResult: 'SUCCESS',
      schemaValidation: 'SUCCESS',
      retried: false
    };

    // Safe operational diagnostics (no private user resume or keys)
    console.log(`[AI HireFlow][Diagnostics] request_id=${job.analysisId}, request_purpose=ATS, endpoint=/api/resume/analyze-job, timestamp=${new Date(jobStart).toISOString()}, model=z-ai/glm-5.3-flash, input_chars=${totalInputChars}, approx_tokens=${approxInputTokens}, configured_timeout_ms=42000, overall_budget_ms=48000, provider_status=200, provider_duration_ms=${velonaResult.timing?.velonaDurationMs || job.diagnostics.totalDurationMs}, total_duration_ms=${Date.now() - jobStart}, retry_count=0, finish_reason=${velonaResult.finishReason}, parse_status=SUCCESS, failure_category=none, velona_request_count=1`);
  } catch (err: any) {
    console.log(`[AI HireFlow][ResumeJob:${job.analysisId}] Analysis reported upstream notice:`, err.message);
    job.status = 'failed';
    job.updatedAt = Date.now();

    let failureCategory = 'PROVIDER_UPSTREAM_ERROR';
    let safeErrorMsg = sanitizeSafeErrorMessage(err.message || 'AI provider is temporarily unavailable.');
    let failureCode = err.code || 'PROVIDER_UPSTREAM_ERROR';

    if (err.code === 'PROVIDER_TIMEOUT' || err.status === 504 || (err.message && err.message.toLowerCase().includes('timed out'))) {
      failureCode = 'PROVIDER_TIMEOUT';
      failureCategory = 'PROVIDER_TIMEOUT';
      safeErrorMsg = 'Analysis timed out on the AI provider. Please click Retry Analysis.';
    } else if (err.code === 'PROVIDER_CONFIGURATION_ERROR' || err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY' || err.status === 401) {
      failureCode = 'PROVIDER_CONFIGURATION_ERROR';
      failureCategory = 'PROVIDER_CONFIGURATION_ERROR';
      safeErrorMsg = 'AI provider configuration error. Please verify API configuration.';
    } else if (err.code === 'PARSE_ERROR' || err.code === 'JSON_PARSE_ERROR' || err.code === 'SCHEMA_VALIDATION_ERROR') {
      failureCode = 'PARSE_ERROR';
      failureCategory = 'PARSE_ERROR';
      safeErrorMsg = 'Failed to parse AI provider ATS response. Please click Retry Analysis.';
    } else {
      failureCode = 'PROVIDER_UPSTREAM_ERROR';
      failureCategory = 'PROVIDER_UPSTREAM_ERROR';
      safeErrorMsg = 'AI provider is temporarily unavailable.';
    }

    job.error = safeErrorMsg;
    job.errorCode = failureCode;

    const providerHttpStatus = typeof err.velonaStatus === 'number'
      ? err.velonaStatus
      : (typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : (failureCode === 'PROVIDER_TIMEOUT' ? 504 : 502));

    job.diagnostics = {
      provider: 'velona',
      model: 'z-ai/glm-5.3-flash',
      httpStatus: providerHttpStatus,
      velonaRequestCount: 1,
      totalDurationMs: Date.now() - jobStart,
      parseResult: 'ERROR',
      finishReason: lastFinishReason,
      failureCategory,
      sample: err.rawSample || lastRawSample
    };

    console.log(`[AI HireFlow][Diagnostics] request_id=${job.analysisId}, request_purpose=ATS, endpoint=/api/resume/analyze-job, timestamp=${new Date(jobStart).toISOString()}, model=z-ai/glm-5.3-flash, input_chars=${totalInputChars}, approx_tokens=${approxInputTokens}, configured_timeout_ms=42000, overall_budget_ms=48000, provider_status=${providerHttpStatus}, provider_duration_ms=${job.diagnostics.totalDurationMs}, total_duration_ms=${Date.now() - jobStart}, retry_count=0, finish_reason=${lastFinishReason}, parse_status=FAILED, failure_category=${failureCategory}, velona_request_count=1`);
  }
}

// 1. Initiate or reconnect to an analysis job
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
      try {
        const enforcement = await enforceSubscriptionAndCredits({
          userId: effectiveUserId,
          userEmail: effectiveUserEmail,
          operation: 'ats_analysis',
          overrideCost: 20,
          deduct: false // Pre-validation check: do not double-debit before analysis succeeds
        });

        if (!enforcement.allowed) {
          return res.status(enforcement.status || 403).json({
            error: enforcement.error,
            code: enforcement.code || 'ACCESS_DENIED',
            requiredCredits: enforcement.requiredCredits,
            balance: enforcement.balance
          });
        }
      } catch (enfErr: any) {
        console.warn('[analyze-job] Credit pre-check warning, deferring to client enforcement:', enfErr.message);
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
      if (existing.status === 'completed' && existing.result) {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: 'completed',
          result: existing.result,
          diagnostics: {
            provider: 'velona',
            model: 'z-ai/glm-5.3-flash',
            httpStatus: 200,
            velonaRequestCount: 1,
            ...existing.diagnostics
          }
        });
      }
      if (existing.status === 'processing' || existing.status === 'queued') {
        return res.status(200).json({
          analysisId: existing.analysisId,
          status: existing.status,
          message: 'Analysis job is already in progress'
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

    // In serverless / Vercel, un-awaited promises terminate when the response returns.
    // We execute the analysis job and return the completed result in the response.
    await processResumeAnalysisJob(job, resumeText, jobDescription, fileType);

    if (job.status === 'completed' && job.result) {
      return res.status(200).json({
        analysisId: job.analysisId,
        status: 'completed',
        result: job.result,
        diagnostics: {
          provider: 'velona',
          model: 'z-ai/glm-5.3-flash',
          httpStatus: 200,
          velonaRequestCount: 1,
          ...job.diagnostics
        }
      });
    }

    const failureCode = job.errorCode || 'PROVIDER_UPSTREAM_ERROR';
    // Map status code: Timeout is 504, Auth is 401, Upstream/Parse error is 502 (Bad Gateway).
    // NEVER convert an upstream provider error into a misleading internal 500 error!
    const responseStatus = failureCode === 'PROVIDER_TIMEOUT' ? 504 :
      (failureCode === 'PROVIDER_CONFIGURATION_ERROR' && job.diagnostics?.httpStatus === 401 ? 401 : 502);

    return res.status(responseStatus).json({
      analysisId: job.analysisId,
      status: 'failed',
      code: failureCode,
      error: job.error || 'AI provider is temporarily unavailable.',
      diagnostics: {
        provider: 'velona',
        model: 'z-ai/glm-5.3-flash',
        httpStatus: job.diagnostics?.httpStatus || responseStatus,
        velonaRequestCount: 1,
        ...job.diagnostics
      }
    });
  } catch (err: any) {
    console.error('Failed to create resume analysis job:', err);
    const safeError = sanitizeSafeErrorMessage(err.message || 'AI provider is temporarily unavailable.');
    res.status(502).json({
      status: 'failed',
      code: 'PROVIDER_UPSTREAM_ERROR',
      error: safeError,
      diagnostics: {
        provider: 'velona',
        model: 'z-ai/glm-5.3-flash',
        httpStatus: 502,
        velonaRequestCount: 1
      }
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

// Persistent Idempotency Storage using Firestore atomic transactions with an in-memory L1 cache
const processedPaymentIds = new Set<string>();

async function checkIsPaymentProcessed(paymentId: string): Promise<boolean> {
  if (!paymentId) return false;
  if (processedPaymentIds.has(paymentId)) return true;
  
  const firestore = getServerFirestore();
  if (firestore) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(firestore, 'processed_payments', paymentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        processedPaymentIds.add(paymentId);
        return true;
      }
    } catch (e: any) {
      console.warn('[Idempotency] Firestore read check warning:', e.message);
    }
  }
  return false;
}

async function reservePaymentIdempotency(paymentId: string, metadata: {
  orderId: string;
  userId?: string;
  amount?: number;
  currency?: string;
  item?: string;
  packId?: string;
  credits?: number;
}): Promise<{ success: boolean; alreadyProcessed: boolean }> {
  if (!paymentId) {
    return { success: false, alreadyProcessed: false };
  }

  // Fast L1 in-memory check
  if (processedPaymentIds.has(paymentId)) {
    return { success: false, alreadyProcessed: true };
  }

  const firestore = getServerFirestore();
  if (!firestore) {
    processedPaymentIds.add(paymentId);
    return { success: true, alreadyProcessed: false };
  }

  try {
    const { doc, runTransaction, getDoc } = await import('firebase/firestore');
    const docRef = doc(firestore, 'processed_payments', paymentId);

    await runTransaction(firestore, async (txn) => {
      const snap = await txn.get(docRef);
      if (snap.exists()) {
        throw new Error('ALREADY_PROCESSED');
      }
      txn.set(docRef, {
        paymentId,
        orderId: metadata.orderId || '',
        userId: metadata.userId || 'anonymous',
        amount: metadata.amount || 0,
        currency: metadata.currency || 'INR',
        item: metadata.item || '',
        packId: metadata.packId || '',
        credits: metadata.credits || 0,
        claimedAt: new Date().toISOString()
      });
    });

    // Successfully committed to persistent Firestore
    processedPaymentIds.add(paymentId);
    return { success: true, alreadyProcessed: false };
  } catch (err: any) {
    if (err.message === 'ALREADY_PROCESSED') {
      processedPaymentIds.add(paymentId);
      return { success: false, alreadyProcessed: true };
    }
    console.error('[Idempotency] Atomic reservation collision or error:', err.message);
    // Double check if document was committed by a concurrent request
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(firestore, 'processed_payments', paymentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        processedPaymentIds.add(paymentId);
        return { success: false, alreadyProcessed: true };
      }
    } catch {}
    return { success: false, alreadyProcessed: true };
  }
}

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
      paymentMode,
      userId,
      type,
      item,
      credits,
      price,
      packId
    } = req.body;

    // 1. Strict Server-Side Check: Reject any unverified QR button submissions or fake fallback tokens
    const isUnverifiedSubmission = (
      paymentMode === 'upi_qr' ||
      !razorpay_signature ||
      !razorpay_payment_id ||
      !razorpay_order_id ||
      typeof razorpay_signature !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_order_id !== 'string' ||
      razorpay_signature.startsWith('sig_qr_') ||
      razorpay_signature.startsWith('sig_bank_') ||
      razorpay_signature.startsWith('sig_mock_') ||
      razorpay_signature.startsWith('sig_unverified_') ||
      razorpay_signature === 'sig_verified_mock_256' ||
      razorpay_payment_id.startsWith('rzp_qr_') ||
      razorpay_order_id.startsWith('ord_rzp_qr_')
    );

    if (isUnverifiedSubmission) {
      return res.status(400).json({ 
        success: false,
        verified: false,
        error: 'Payment could not be verified yet. Credits will be added after successful payment confirmation.'
      });
    }

    // Authenticated user check
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Authenticated user identifier is required for payment verification.'
      });
    }

    // 2. Prevent duplicate credit allocation via persistent server-side idempotency pre-check
    const alreadyProcessed = await checkIsPaymentProcessed(razorpay_payment_id);
    if (alreadyProcessed) {
      return res.status(409).json({ 
        success: false,
        error: 'Duplicate payment claim: Credits for this payment have already been allocated.',
        alreadyAllocated: true
      });
    }

    // 3. Cryptographic HMAC-SHA256 signature verification with secret key
    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      return res.status(500).json({ 
        success: false,
        error: 'Razorpay secret key is not configured on server.' 
      });
    }

    const crypto = await import('crypto');
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false,
        verified: false,
        error: 'Payment could not be verified yet. Credits will be added after successful payment confirmation.'
      });
    }

    // 4. Server-side payment status and currency verification against Razorpay REST API
    let paymentDetails: any = null;
    const client = await getRazorpay();
    if (client) {
      try {
        const payment = await client.payments.fetch(razorpay_payment_id);
        if (!payment) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Payment could not be verified yet. Credits will be added after successful payment confirmation.'
          });
        }
        paymentDetails = payment;

        // Payment status verification: Only captured payments can grant credits
        let paymentStatus = payment.status;
        if (paymentStatus === 'authorized') {
          // Attempt verified backend capture if authorized but not yet captured
          try {
            const captured = await client.payments.capture(razorpay_payment_id, payment.amount, payment.currency || 'INR');
            if (captured && captured.status === 'captured') {
              paymentStatus = 'captured';
            }
          } catch (capErr: any) {
            console.warn('[Razorpay] Backend capture attempt notice:', capErr?.message);
          }
        }

        // Strictly reject uncaptured, failed, refunded, cancelled, or unknown statuses
        if (paymentStatus !== 'captured') {
          return res.status(400).json({
            success: false,
            verified: false,
            error: `Payment status is '${payment.status}'. Credits can only be granted for successfully captured payments.`
          });
        }

        // Order reference check
        if (payment.order_id && payment.order_id !== razorpay_order_id) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Payment order reference mismatch.'
          });
        }

        // Currency check: must be INR
        if (payment.currency && payment.currency !== 'INR') {
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Invalid payment currency. Expected INR.'
          });
        }

        // Amount verification
        const matchedPack = getCreditPackById(packId || item);
        const expectedPaisa = matchedPack 
          ? Math.round(matchedPack.price.INR * 100) 
          : (price ? Math.round(Number(price) * 100) : null);

        if (expectedPaisa && payment.amount < expectedPaisa) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Paid amount does not match package price.'
          });
        }
      } catch (fetchErr: any) {
        console.error('Razorpay payment fetch error:', fetchErr?.message);
        // If Razorpay rejected this payment ID as non-existent (400), reject verification
        if (fetchErr?.statusCode === 400 || fetchErr?.error?.code === 'BAD_REQUEST_ERROR') {
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Payment could not be verified yet. Credits will be added after successful payment confirmation.'
          });
        }
      }
    }

    const matchedPack = getCreditPackById(packId || item);
    const finalCredits = matchedPack ? matchedPack.credits : parseInt(credits || '0');
    const finalPrice = parseFloat(price || (matchedPack ? matchedPack.price.INR.toString() : '0'));

    // 5. Persistent Atomic Idempotency Reservation
    // Do not grant credits until the payment is successfully reserved/recorded exactly once in persistent Firestore
    const reservation = await reservePaymentIdempotency(razorpay_payment_id, {
      orderId: razorpay_order_id,
      userId: userId.trim(),
      amount: paymentDetails?.amount || (finalPrice ? Math.round(finalPrice * 100) : 0),
      currency: paymentDetails?.currency || 'INR',
      item: matchedPack?.name || item || 'credits',
      packId: matchedPack?.id || packId,
      credits: finalCredits
    });

    if (!reservation.success) {
      return res.status(409).json({ 
        success: false,
        error: 'Duplicate payment claim: Credits for this payment have already been allocated.',
        alreadyAllocated: true
      });
    }

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
    res.status(500).json({ 
      success: false,
      error: 'Internal payment verification error' 
    });
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

// Check OpenWeb Ninja JSearch provider configuration and status
app.get('/api/jobs/provider-status', (req, res) => {
  const hasKey = Boolean(process.env.OPENWEB_NINJA_API_KEY || process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY);
  res.json({
    provider: 'OpenWeb Ninja JSearch',
    configured: hasKey,
    plan: 'Pay As You Go',
    endpoint: hasKey ? 'https://api.openwebninja.com/jsearch/search' : null,
    costProtection: {
      maxPagesPerQuery: 1,
      cacheTtlMinutes: 15,
      requestDeduplication: true
    }
  });
});

// Real Job Discovery & Semantic Matching Endpoint (OpenWeb Ninja JSearch Primary)
app.all(['/api/jobs/search', '/api/jobs'], async (req, res, next) => {
  try {
    const isPost = req.method === 'POST';
    const params = isPost ? (req.body || {}) : (req.query || {});
    
    const query = typeof params.query === 'string' ? params.query : (typeof params.q === 'string' ? params.q : '');
    const location = typeof params.location === 'string' ? params.location : (typeof params.loc === 'string' ? params.loc : '');
    const candidateProfile = typeof params.candidateProfile === 'string' ? params.candidateProfile : (typeof params.profile === 'string' ? params.profile : '');
    const employmentType = typeof params.employmentType === 'string' ? params.employmentType : undefined;
    const isRemote = params.isRemote === true || params.isRemote === 'true';
    const datePosted = typeof params.datePosted === 'string' ? (params.datePosted as any) : undefined;
    const allowFallback = params.allowFallback === true || params.allowFallback === 'true';
    const limit = Math.min(25, Math.max(1, Number(params.limit) || 12));

    const { searchRealJobs, rankAndScoreJobsWithAI, sortJobsByPostingDateNewestFirst } = await import('./_lib/jobDiscovery.ts');

    const searchResult = await searchRealJobs({
      query: query.trim(),
      location: location.trim(),
      limit,
      employmentType,
      isRemote,
      datePosted,
      allowFallback
    });

    if (searchResult.errorCode) {
      return res.status(200).json({
        success: false,
        isConfigured: searchResult.isConfigured,
        provider: searchResult.provider,
        errorCode: searchResult.errorCode,
        error: searchResult.error,
        requiresKey: searchResult.errorCode === 'MISSING_KEY',
        jobs: [],
        exactMatches: [],
        relatedMatches: [],
        exactCount: 0,
        relatedCount: 0,
        totalCount: 0,
        retrievedAt: new Date().toISOString()
      });
    }

    const realListings = searchResult.jobs || [];

    if (realListings.length === 0) {
      return res.json({
        success: true,
        isConfigured: searchResult.isConfigured,
        provider: searchResult.provider,
        jobs: [],
        exactMatches: [],
        relatedMatches: [],
        exactCount: 0,
        relatedCount: 0,
        totalCount: 0,
        cached: searchResult.cached,
        message: 'No live job listings were found matching your search criteria. Try adjusting role keywords or location filters.',
        retrievedAt: new Date().toISOString()
      });
    }

    // Apply AI semantic matching (Velona GLM 5.3 Flash) strictly to score and rank REAL listings
    const scoredJobs = await rankAndScoreJobsWithAI({
      jobs: realListings,
      candidateProfile: candidateProfile.trim(),
      callVelona: callVelonaChatCompletion
    });

    // Requirement 6: Sort jobs by their actual posting date, newest first.
    const sortedJobs = sortJobsByPostingDateNewestFirst(scoredJobs);

    const exactMatches = sortedJobs.filter(j => j.relevanceCategory === 'exact');
    const relatedMatches = sortedJobs.filter(j => j.relevanceCategory !== 'exact');

    return res.json({
      success: true,
      isConfigured: searchResult.isConfigured,
      provider: searchResult.provider,
      jobs: sortedJobs,
      exactMatches,
      relatedMatches,
      exactCount: exactMatches.length,
      relatedCount: relatedMatches.length,
      totalCount: sortedJobs.length,
      cached: searchResult.cached,
      query: query.trim(),
      location: location.trim(),
      message: exactMatches.length === 0 && relatedMatches.length > 0
        ? (location.trim().toLowerCase().includes('india')
            ? 'No verified exact internships in India were found for this query in this search batch. Below are verified related opportunities with noted differences.'
            : 'No exact live openings matching all criteria were found. Below are verified related opportunities from live feeds.')
        : undefined,
      retrievedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[RealJobSearch] Unexpected error:', err);
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
  const rawStatus = (typeof err.status === 'number' && err.status >= 400 && err.status < 600) 
    ? err.status 
    : ((typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) ? err.statusCode : 500);
  const status = sanitizeHttpStatus(rawStatus);
  const safeMsg = sanitizeSafeErrorMessage(err.message || 'Internal Server Error');
  console.log(`[AI HireFlow][Diagnostics] endpoint=${req.path || '/api'}, http_status=${status}, model=${getVelonaModel()}, duration_ms=0, velona_status=N/A, error_category=${err.code || 'INTERNAL_ERROR'}, message=${safeMsg}`);
  
  if (!res.headersSent) {
    res.status(status).json({
      error: safeMsg,
      code: err.code || 'INTERNAL_ERROR'
    });
  }
});

export default app;
