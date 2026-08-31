export type AIProviderId = 'gemini' | 'velona';

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
    if (saved === 'velona' || saved === 'gemini') {
      return saved;
    }
  } catch (e) {
    // LocalStorage unavailable
  }
  return 'gemini';
}

export function setActiveProvider(provider: AIProviderId): void {
  try {
    localStorage.setItem(STORAGE_KEY, provider);
    window.dispatchEvent(new CustomEvent('ai-provider-changed', { detail: provider }));
  } catch (e) {
    // LocalStorage unavailable
  }
}

export async function fetchAIProviders(): Promise<AIProviderInfo[]> {
  try {
    const res = await fetch('/api/ai/providers');
    if (res.ok) {
      const data = await res.json();
      return data.providers || [];
    }
  } catch (err) {
    console.warn('Failed to fetch AI providers from server:', err);
  }

  // Fallback defaults
  return [
    {
      id: 'gemini',
      name: 'Gemini 3.7 Flash',
      providerName: 'Google DeepMind',
      model: 'gemini-3.7-flash',
      configured: true,
      isDefault: true
    },
    {
      id: 'velona',
      name: 'Velona GLM 5.3 Flash',
      providerName: 'Z.ai via Velona',
      model: 'z-ai/glm-5.3-flash',
      configured: false,
      isDefault: false
    }
  ];
}

export async function generateWithVelona(options: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch('/api/velona/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature ?? 0.7,
      jsonMode: options.jsonMode ?? false,
      maxTokens: options.maxTokens
    })
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data.error || `Velona request failed with status ${res.status}`;
    const err = new Error(errMsg);
    (err as any).code = data.code;
    (err as any).status = res.status;
    throw err;
  }

  return data.text || '';
}

export async function testVelonaIntegration(prompt?: string) {
  const res = await fetch('/api/velona/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await res.json();
}
