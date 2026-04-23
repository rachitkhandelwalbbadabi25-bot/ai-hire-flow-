import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    jobFinder: 'Job Finder',
    analyzer: 'Analyzer',
    interviewLab: 'Interview Lab',
    learningPath: 'Learning Path',
    resumeEditor: 'Resume Editor',
    jobTracker: 'Job Tracker',
    profile: 'Profile',
    getStarted: 'Get Started',
    campusPlacement: 'Campus Prep',
    outreach: 'Outreach & Alerts',
    languageName: 'English',
    welcomeBack: 'Welcome Back',
    neuralStatus: 'Neural Linked',
    systemVerified: 'System Verified'
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    jobFinder: 'नौकरी खोजें',
    analyzer: 'रेज़्यूमे जांचें',
    interviewLab: 'इंटरव्यू लैब',
    learningPath: 'सीखने का मार्ग',
    resumeEditor: 'रेज़्यूमे संपादक',
    jobTracker: 'नौकरी ट्रैकर',
    profile: 'प्रोफ़ाइल',
    getStarted: 'शुरू करें',
    campusPlacement: 'कैंपस प्लेसमेंट',
    outreach: 'आउटरीच और अलर्ट',
    languageName: 'हिंदी',
    welcomeBack: 'स्वागत है',
    neuralStatus: 'न्यूरल लिंक सक्रिय',
    systemVerified: 'सिस्टम सत्यापित'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
