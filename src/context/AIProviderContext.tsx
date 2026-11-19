import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  AIProviderId, 
  AIProviderInfo, 
  getActiveProvider, 
  setActiveProvider as setStoredProvider, 
  fetchAIProviders,
  testVelonaIntegration
} from '../lib/aiProvider';
import { useAuth } from './AuthContext';

const DEFAULT_PROVIDERS: AIProviderInfo[] = [
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

interface AIProviderContextType {
  provider: AIProviderId;
  setProvider: (p: AIProviderId) => void;
  providers: AIProviderInfo[];
  isVelonaConfigured: boolean;
  isLoading: boolean;
  testVelona: (prompt?: string) => Promise<any>;
  refreshProviders: () => Promise<void>;
}

const AIProviderContext = createContext<AIProviderContextType | undefined>(undefined);

export function AIProviderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [provider, setProviderState] = useState<AIProviderId>(getActiveProvider());
  const [providers, setProviders] = useState<AIProviderInfo[]>(DEFAULT_PROVIDERS);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchAIProviders();
      if (list.length > 0) {
        setProviders(list);
      }
    } catch (e) {
      console.error('Error loading AI providers:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only probe /api/ai/providers once signed in to avoid cold-starting serverless on public landing visits
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    if (user) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = (window as any).requestIdleCallback(() => {
          refreshProviders();
        }, { timeout: 2500 });
      } else {
        timeoutId = setTimeout(() => {
          refreshProviders();
        }, 500);
      }
    }

    const handleStorageChange = (e: CustomEvent<AIProviderId>) => {
      if (e.detail) {
        setProviderState(e.detail);
      }
    };

    window.addEventListener('ai-provider-changed' as any, handleStorageChange);
    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('ai-provider-changed' as any, handleStorageChange);
    };
  }, [user, refreshProviders]);

  const setProvider = (newProvider: AIProviderId) => {
    setProviderState(newProvider);
    setStoredProvider(newProvider);
  };

  const isVelonaConfigured = Boolean(
    providers.find(p => p.id === 'velona')?.configured
  );

  const testVelona = async (prompt?: string) => {
    return await testVelonaIntegration(prompt);
  };

  return (
    <AIProviderContext.Provider
      value={{
        provider,
        setProvider,
        providers,
        isVelonaConfigured,
        isLoading,
        testVelona,
        refreshProviders
      }}
    >
      {children}
    </AIProviderContext.Provider>
  );
}

export function useAIProvider() {
  const context = useContext(AIProviderContext);
  if (!context) {
    throw new Error('useAIProvider must be used within an AIProviderProvider');
  }
  return context;
}
