import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AIProviderId, 
  AIProviderInfo, 
  getActiveProvider, 
  setActiveProvider as setStoredProvider, 
  fetchAIProviders,
  testVelonaIntegration
} from '../lib/aiProvider';

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
  const [provider, setProviderState] = useState<AIProviderId>(getActiveProvider());
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProviders = async () => {
    try {
      const list = await fetchAIProviders();
      setProviders(list);
    } catch (e) {
      console.error('Error loading AI providers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProviders();

    const handleStorageChange = (e: CustomEvent<AIProviderId>) => {
      if (e.detail) {
        setProviderState(e.detail);
      }
    };

    window.addEventListener('ai-provider-changed' as any, handleStorageChange);
    return () => {
      window.removeEventListener('ai-provider-changed' as any, handleStorageChange);
    };
  }, []);

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
