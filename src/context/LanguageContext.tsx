import React, { createContext, useContext, useState } from 'react';
import { translations, AppLanguage, TranslationDictionary } from '../locales/translations';

export type { AppLanguage, TranslationDictionary };
export { translations };

export interface LanguageContextType {
  language: AppLanguage;
  isSwahili: boolean;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
}

const STORAGE_KEY = 'zamzam_app_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'sw' || saved === 'en') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const isSwahili = language === 'sw';

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'sw' : 'en');
  };

  const t = (
    key: string,
    paramsOrFallback?: Record<string, string | number> | string,
    fallback?: string
  ): string => {
    let fallbackText: string | undefined = fallback;
    let params: Record<string, string | number> | undefined;

    if (typeof paramsOrFallback === 'string') {
      fallbackText = paramsOrFallback;
    } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
      params = paramsOrFallback;
    }

    const dict = translations[language] || translations.en;
    let template = dict[key] ?? translations.en[key] ?? fallbackText ?? key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return template;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isSwahili,
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
