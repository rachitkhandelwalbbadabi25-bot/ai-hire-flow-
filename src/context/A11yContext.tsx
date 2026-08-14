import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface A11yContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const A11yContext = createContext<A11yContextType>({
  announce: () => {},
});

export const useA11y = () => useContext(A11yContext);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  return (
    <A11yContext.Provider value={{ announce }}>
      {children}
      {/* Screen Reader Live Regions */}
      <div
        id="a11y-polite-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        id="a11y-assertive-announcer"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </A11yContext.Provider>
  );
}

export default A11yProvider;
