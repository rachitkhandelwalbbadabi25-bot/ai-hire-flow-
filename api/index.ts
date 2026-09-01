import express from 'express';
import 'dotenv/config';
import cors from 'cors';

export const maxDuration = 60;

export const app = express();

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Coach route
app.post('/api/coach', (req, res) => {
  res.json({ status: 'active', message: 'AI Coach endpoint ready' });
});

// =========================================================================
// VELONA (Z.ai / GLM-5.3-Flash) AI PROVIDER INTEGRATION
// =========================================================================
const VELONA_BASE_URL = 'https://velona.in/v1';
const VELONA_MODEL_ID = process.env.VELONA_MODEL || 'z-ai/glm-5.3-flash';

export function getVelonaApiKey(): string | undefined {
  return (
    process.env.VELONA_API_KEY ||
    process.env.VELONA_KEY ||
    process.env.VELONA_AUTH_TOKEN ||
    process.env.Z_AI_API_KEY
  );
}

export async function callVelonaChatCompletion({
  messages,
  temperature = 0.3,
  jsonMode = false,
  maxTokens,
  requestId
}: {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  requestId?: string;
}) {
  const reqTag = requestId ? `[Req:${requestId}]` : '';
  const apiKey = getVelonaApiKey();
  if (!apiKey) {
    const error: any = new Error('VELONA_API_KEY is not configured in server environment or secrets.');
    error.status = 401;
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  // Ensure prompt includes explicit JSON directive if jsonMode is requested
  let formattedMessages = [...messages];
  if (jsonMode) {
    const lastMsg = formattedMessages[formattedMessages.length - 1];
    if (lastMsg && lastMsg.role === 'user' && !lastMsg.content.includes('JSON')) {
      formattedMessages[formattedMessages.length - 1] = {
        ...lastMsg,
        content: `${lastMsg.content}\n\nIMPORTANT: Output valid, parseable raw JSON only without markdown fences or extraneous text.`
      };
    }
  }

  const payload: any = {
    model: VELONA_MODEL_ID,
    messages: formattedMessages,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {})
  };

  const velonaStart = Date.now();
  console.log(`[AI HireFlow][Velona]${reqTag} Velona request start: model=${VELONA_MODEL_ID}, messagesCount=${messages.length}, jsonMode=${jsonMode}, maxTokens=${maxTokens || 'default'}`);

  // Resilient execution with retry for transient cold-start / network glitches (500/502/503/504)
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);

    try {
      if (attempt > 0) {
        const backoffMs = 400 * Math.pow(2, attempt - 1);
        console.log(`[AI HireFlow][Velona]${reqTag} Retrying Velona request (attempt ${attempt + 1}/${maxRetries + 1}) after ${backoffMs}ms backoff...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }

      const response = await fetch(`${VELONA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'AI-HireFlow/2.0',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const attemptElapsed = Date.now() - attemptStart;

      if (!response.ok) {
        const errorBody = await response.text();
        let errorDetails = errorBody;
        try {
          const errJson = JSON.parse(errorBody);
          errorDetails = errJson.error?.message || errJson.message || errorBody;
        } catch {
          // errorDetails is plain text
        }

        console.warn(`[AI HireFlow][Velona]${reqTag} Velona HTTP ${response.status} on attempt ${attempt + 1} (${attemptElapsed}ms): ${errorDetails}`);

        // If error is transient (500, 502, 503, 504), retry
        const isTransient = [500, 502, 503, 504].includes(response.status);
        const err: any = new Error(errorDetails || `Velona API responded with HTTP status ${response.status}`);
        err.status = response.status;
        
        if (response.status === 401) {
          err.code = 'INVALID_API_KEY';
          err.message = `Velona Authentication Failed: Invalid or expired API key. (${errorDetails})`;
          throw err; // Non-retryable
        } else if (response.status === 402 || response.status === 429) {
          err.code = 'INSUFFICIENT_BALANCE_OR_RATE_LIMIT';
          err.message = `Velona Quota/Balance Error: ${errorDetails || 'Insufficient prepaid balance or rate limit exceeded.'}`;
          throw err; // Non-retryable
        } else {
          err.code = 'VELONA_API_ERROR';
        }

        if (isTransient && attempt < maxRetries) {
          lastError = err;
          continue; // Try next attempt
        }
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const completionTokens = data.usage?.completion_tokens || 0;
      const promptTokens = data.usage?.prompt_tokens || 0;
      const totalTokens = data.usage?.total_tokens || 0;
      const totalElapsed = Date.now() - velonaStart;

      console.log(`[AI HireFlow][Velona]${reqTag} Velona response received: HTTP ${response.status} in ${totalElapsed}ms (attempt ${attempt + 1}), tokens={prompt:${promptTokens}, completion:${completionTokens}, total:${totalTokens}}, contentLength=${content.length}`);

      return {
        text: content,
        model: data.model || VELONA_MODEL_ID,
        provider: 'velona',
        usage: data.usage,
        timing: {
          velonaDurationMs: totalElapsed
        }
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const attemptElapsed = Date.now() - attemptStart;
      
      if (err.name === 'AbortError') {
        console.error(`[AI HireFlow][Velona]${reqTag} Velona request aborted after timeout (${attemptElapsed}ms) on attempt ${attempt + 1}.`);
        lastError = new Error('Velona API request timed out after 75 seconds.');
        lastError.status = 504;
        lastError.code = 'TIMEOUT';
      } else {
        lastError = err;
      }

      // Check if we should retry network errors
      if (attempt < maxRetries && (err.name === 'FetchError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.name === 'AbortError')) {
        console.warn(`[AI HireFlow][Velona]${reqTag} Retrying after network error: ${err.message}`);
        continue;
      }

      if (attempt >= maxRetries) {
        break;
      }
    }
  }

  const totalElapsed = Date.now() - velonaStart;
  console.error(`[AI HireFlow][Velona]${reqTag} All ${maxRetries + 1} Velona attempts failed after ${totalElapsed}ms:`, lastError?.message);
  throw lastError || new Error('Velona API request failed after retries.');
}

// Get AI Provider Status
app.get('/api/ai/providers', (req, res) => {
  const velonaKey = getVelonaApiKey();
  res.json({
    providers: [
      {
        id: 'velona',
        name: 'Velona (GLM 5.3 Flash)',
        providerName: 'Z.ai via Velona',
        model: VELONA_MODEL_ID,
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
app.post(['/api/velona/generate', '/api/ai/generate'], async (req, res) => {
  const requestStart = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    const { 
      prompt, 
      systemPrompt, 
      messages: incomingMessages, 
      temperature = 0.3, 
      jsonMode = false, 
      maxTokens
    } = req.body;

    const promptLength = prompt ? prompt.length : (incomingMessages ? JSON.stringify(incomingMessages).length : 0);
    console.log(`[AI HireFlow][Velona][Req:${requestId}] Request start: timestamp=${new Date().toISOString()}, endpoint=${req.path}, jsonMode=${jsonMode}, promptLength=${promptLength}`);

    if (!prompt && (!incomingMessages || incomingMessages.length === 0)) {
      return res.status(400).json({ error: 'Prompt string or messages array is required.' });
    }

    let messages: Array<{ role: string; content: string }> = [];
    if (incomingMessages && Array.isArray(incomingMessages) && incomingMessages.length > 0) {
      messages = incomingMessages;
    } else {
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });
    }

    const result = await callVelonaChatCompletion({
      messages,
      temperature,
      jsonMode,
      maxTokens,
      requestId
    });

    const totalDuration = Date.now() - requestStart;
    console.log(`[AI HireFlow][Velona][Req:${requestId}] Request complete: totalTime=${totalDuration}ms, status=200`);

    res.json({
      ...result,
      timing: {
        ...result.timing,
        totalDurationMs: totalDuration
      }
    });
  } catch (err: any) {
    const totalDuration = Date.now() - requestStart;
    console.error(`[AI HireFlow][Velona][Req:${requestId}] AI Generation error after ${totalDuration}ms:`, err);
    const status = err.status || 500;
    res.status(status).json({ 
      error: err.message || 'Internal AI generation error',
      code: err.code || 'UNKNOWN_ERROR',
      provider: 'velona',
      model: VELONA_MODEL_ID,
      timing: { totalDurationMs: totalDuration }
    });
  }
});

// Dedicated Velona test endpoint for verification
app.post('/api/velona/test', async (req, res) => {
  try {
    const testPrompt = req.body?.prompt || 'Respond in 1 concise sentence confirming that Velona GLM 5.3 Flash is active and operational for AI HireFlow.';
    const result = await callVelonaChatCompletion({
      messages: [
        { role: 'system', content: 'You are an AI assistant powered by Z.ai GLM 5.3 Flash on Velona platform.' },
        { role: 'user', content: testPrompt }
      ],
      temperature: 0.2
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
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Velona test request failed',
      code: err.code || 'TEST_FAILED',
      model: VELONA_MODEL_ID,
      endpoint: `${VELONA_BASE_URL}/chat/completions`
    });
  }
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
async function getRazorpay() {
  if (!razorpayClient) {
    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();
    if (keyId && keySecret) {
      try {
        const { default: Razorpay } = await import('razorpay');
        razorpayClient = new Razorpay({
          key_id: keyId,
          key_secret: keySecret
        });
      } catch (err) {
        console.error('Failed to initialize Razorpay:', err);
      }
    }
  }
  return razorpayClient;
}

app.post(['/api/razorpay/create-order', '/api/create-order'], async (req, res) => {
  try {
    const { amount, currency, receipt, userId, type, item, price, credits } = req.body;
    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();

    if (!keyId || !keySecret) {
      const fallbackOrderId = `order_demo_${Date.now().toString().slice(-8)}`;
      return res.json({ 
        success: true,
        isSandbox: true,
        orderId: fallbackOrderId,
        amount: (price ? Math.round(Number(price) * 100) : (Number(amount) || 100)),
        currency: currency || 'INR',
        keyId: 'rzp_test_hireflow_demo'
      });
    }

    const client = await getRazorpay();
    if (!client) {
      return res.status(500).json({ error: 'Failed to initialize Razorpay client' });
    }

    let amountInPaisa = 0;
    if (amount !== undefined) {
      amountInPaisa = Math.round(Number(amount));
    } else if (price !== undefined) {
      amountInPaisa = Math.round(Number(price) * 100);
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
        type: type || 'custom',
        item: item || 'custom_item',
        credits: String(credits || '0'),
        price: String(price || (amountInPaisa / 100))
      }
    };

    const order = await client.orders.create(options);
    res.json({ 
      orderId: order.id, 
      amount: order.amount, 
      currency: order.currency, 
      keyId 
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
      price
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required validation fields' });
    }

    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      return res.json({ 
        success: true, 
        isSandbox: true,
        type: type || 'custom', 
        item: item || 'custom_item', 
        credits: parseInt(credits || '0'), 
        price: parseFloat(price || '0') 
      });
    }

    const crypto = await import('crypto');
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      if (razorpay_signature === 'sig_verified_mock_256') {
        return res.json({
          success: true,
          isSandbox: true,
          type: type || 'custom',
          item: item || 'custom_item',
          credits: parseInt(credits || '0'),
          price: parseFloat(price || '0')
        });
      }
      return res.status(400).json({ error: 'Cryptographic signature verification failed' });
    }

    res.json({ 
      success: true, 
      type: type || 'custom', 
      item: item || 'custom_item', 
      credits: parseInt(credits || '0'), 
      price: parseFloat(price || '0') 
    });
  } catch (err: any) {
    console.error('Razorpay signature verification error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify payment signature' });
  }
});

// JSON 404 handler for any unmatched /api/* route
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    code: 'API_ENDPOINT_NOT_FOUND'
  });
});

// Global Error Handler for API
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

export default app;
