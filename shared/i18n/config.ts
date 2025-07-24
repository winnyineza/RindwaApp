// Internationalization Configuration for Rindwa Emergency Platform
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Language resources
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';
import rwTranslations from './locales/rw.json';

export const supportedLanguages = {
  en: 'English',
  fr: 'Français',
  rw: 'Kinyarwanda'
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

export const defaultLanguage: SupportedLanguage = 'rw'; // Kinyarwanda as default for Rwanda
export const fallbackLanguage: SupportedLanguage = 'en';

// Language resources configuration
const resources = {
  en: {
    translation: enTranslations
  },
  fr: {
    translation: frTranslations
  },
  rw: {
    translation: rwTranslations
  }
};

// Initialize i18next configuration
export const initI18n = () => {
  return i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: defaultLanguage,
      fallbackLng: fallbackLanguage,
      
      // Translation options
      interpolation: {
        escapeValue: false, // React already escapes values
        formatSeparator: ',',
        format: (value, format) => {
          if (format === 'uppercase') return value.toUpperCase();
          if (format === 'lowercase') return value.toLowerCase();
          if (format === 'capitalize') return value.charAt(0).toUpperCase() + value.slice(1);
          return value;
        }
      },
      
      // Debugging options (disable in production)
      debug: process.env.NODE_ENV === 'development',
      
      // Key separator for nested translations
      keySeparator: '.',
      nsSeparator: ':',
      
      // React i18next options
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged',
        bindI18nStore: 'added',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'b', 'u'],
      },
      
      // Detection options
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'rindwa_language',
        checkWhitelist: true
      }
    });
};

// Utility functions for language management
export const getLanguageDirection = (language: SupportedLanguage): 'ltr' | 'rtl' => {
  // All supported languages use left-to-right text direction
  return 'ltr';
};

export const getLanguageDisplayName = (language: SupportedLanguage, currentLanguage: SupportedLanguage): string => {
  const names = {
    en: {
      en: 'English',
      fr: 'French', 
      rw: 'Kinyarwanda'
    },
    fr: {
      en: 'Anglais',
      fr: 'Français',
      rw: 'Kinyarwanda'
    },
    rw: {
      en: 'Icyongereza',
      fr: 'Igifaransa',
      rw: 'Kinyarwanda'
    }
  };
  
  return names[currentLanguage][language] || supportedLanguages[language];
};

export const formatDate = (date: Date | string, language: SupportedLanguage): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const locales = {
    en: 'en-US',
    fr: 'fr-FR',
    rw: 'rw-RW' // Fallback to English formatting for Kinyarwanda
  };
  
  try {
    return new Intl.DateTimeFormat(locales[language] || 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  } catch (error) {
    // Fallback formatting
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  }
};

export const formatNumber = (number: number, language: SupportedLanguage): string => {
  const locales = {
    en: 'en-US',
    fr: 'fr-FR',
    rw: 'en-US' // Use English formatting for Kinyarwanda
  };
  
  try {
    return new Intl.NumberFormat(locales[language]).format(number);
  } catch (error) {
    return new Intl.NumberFormat('en-US').format(number);
  }
};

// Emergency-specific translations that need special handling
export const getEmergencyTypeTranslation = (type: string, t: any): string => {
  const translations = {
    police: t('emergencyTypes.police'),
    fire: t('emergencyTypes.fire'),
    medical: t('emergencyTypes.medical'),
    other: t('emergencyTypes.other')
  };
  
  return translations[type as keyof typeof translations] || type;
};

export const getPriorityTranslation = (priority: string, t: any): string => {
  const translations = {
    low: t('priority.low'),
    medium: t('priority.medium'),
    high: t('priority.high'),
    critical: t('priority.critical')
  };
  
  return translations[priority as keyof typeof translations] || priority;
};

export const getStatusTranslation = (status: string, t: any): string => {
  const translations = {
    reported: t('status.reported'),
    assigned: t('status.assigned'),
    in_progress: t('status.inProgress'),
    resolved: t('status.resolved'),
    escalated: t('status.escalated')
  };
  
  return translations[status as keyof typeof translations] || status;
};

// Initialize i18n on import
initI18n();

export default i18n; 