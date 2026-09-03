export type AIProviderId = 'velona' | 'gemini';

export interface AIProviderInfo {
  id: AIProviderId;
  name: string;
  providerName: string;
  model: string;
  configured: boolean;
  isDefault: boolean;
  capabilities?: string[];
  pricing?: {
    input: string;
    output: string;
    context: string;
  };
}

const STORAGE_KEY = 'ai_hireflow_selected_provider';

export function getActiveProvider(): AIProviderId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'velona') {
      return saved;
    }
  } catch (e) {
    // LocalStorage unavailable
  }
  return 'velona';
}

export function setActiveProvider(provider: AIProviderId): void {
  try {
    localStorage.setItem(STORAGE_KEY, provider);
    window.dispatchEvent(new CustomEvent('ai-provider-changed', { detail: provider }));
  } catch (e) {
    // LocalStorage unavailable
  }
}

/**
 * Safely parse JSON from a fetch Response.
 * If the response contains HTML or non-JSON content, it provides a clear,
 * diagnostic error message rather than throwing an unhandled SyntaxError.
 */
async function parseJsonResponse(res: Response, endpointDescription: string): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    const preview = text.slice(0, 120).replace(/\s+/g, ' ').trim();
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status} (${res.statusText || 'Error'}) from ${endpointDescription}. Preview: ${preview || '(empty)'}`);
    }
    throw new Error(`Expected JSON response from ${endpointDescription} but received HTML/Text (HTTP ${res.status}): ${preview}`);
  }

  try {
    return JSON.parse(text);
  } catch (err: any) {
    const preview = text.slice(0, 100).replace(/\s+/g, ' ').trim();
    throw new Error(`Invalid JSON returned by ${endpointDescription} (HTTP ${res.status}): ${preview}`);
  }
}

export async function fetchAIProviders(): Promise<AIProviderInfo[]> {
  try {
    const res = await fetch('/api/ai/providers');
    if (res.ok) {
      const data = await parseJsonResponse(res, '/api/ai/providers');
      return data.providers || [];
    }
  } catch (err) {
    console.warn('Failed to fetch AI providers from server:', err);
  }

  // Primary Velona provider default
  return [
    {
      id: 'velona',
      name: 'Velona (GLM 5.3 Flash)',
      providerName: 'Z.ai via Velona',
      model: 'z-ai/glm-5.3-flash',
      configured: true,
      isDefault: true,
      capabilities: ['Fast Inference', 'JSON Mode', 'Deep Reasoning', 'ATS Audits', 'Job Match Engine']
    }
  ];
}

export interface VelonaDetailedResponse {
  text: string;
  finishReason: string;
  isTruncated: boolean;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  timing?: {
    velonaDurationMs: number;
    totalDurationMs: number;
  };
}

export async function generateWithVelonaDetailed(options: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  operation?: string;
  meta?: {
    fileType?: string;
    charCount?: number;
    wordCount?: number;
  };
}): Promise<VelonaDetailedResponse> {
  const endpoint = '/api/velona/generate';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature ?? 0.7,
      jsonMode: options.jsonMode ?? false,
      maxTokens: options.maxTokens,
      operation: options.operation || 'general',
      meta: options.meta
    })
  });

  const data = await parseJsonResponse(res, endpoint);

  if (!res.ok) {
    const errMsg = data.error || `Velona request failed with status ${res.status}`;
    const err = new Error(errMsg);
    (err as any).code = data.code;
    (err as any).status = res.status;
    throw err;
  }

  return {
    text: data.text || '',
    finishReason: data.finishReason || 'stop',
    isTruncated: Boolean(data.isTruncated || data.finishReason === 'length'),
    model: data.model || 'z-ai/glm-5.3-flash',
    usage: data.usage,
    timing: data.timing
  };
}

export async function generateWithVelona(options: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  operation?: string;
  meta?: {
    fileType?: string;
    charCount?: number;
    wordCount?: number;
  };
}): Promise<string> {
  const detailed = await generateWithVelonaDetailed(options);
  return detailed.text;
}

export async function testVelonaIntegration(prompt?: string) {
  const endpoint = '/api/velona/test';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await parseJsonResponse(res, endpoint);
}
