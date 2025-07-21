import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Common
    'common.welcome': 'Welcome',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.submit': 'Submit',
    'common.search': 'Search',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.loginSuccess': 'Login successful',
    'auth.loginError': 'Login failed',
    
    // Navigation
    'nav.home': 'Home',
    'nav.report': 'Report',
    'nav.contacts': 'Contacts',
    'nav.profile': 'Profile',
    
    // Incident Reporting
    'report.title': 'Report Incident',
    'report.description': 'Description',
    'report.priority': 'Priority',
    'report.location': 'Location',
    'report.photo': 'Add Photo',
    'report.submit': 'Submit Report',
    'report.success': 'Incident reported successfully',
    
    // Emergency
    'emergency.police': 'Police',
    'emergency.fire': 'Fire Department',
    'emergency.medical': 'Medical Emergency',
    'emergency.call': 'Call Emergency',
    
    // Onboarding
    'onboarding.title1': 'Stay Safe',
    'onboarding.desc1': 'Report emergencies quickly and efficiently',
    'onboarding.title2': 'Get Help Fast',
    'onboarding.desc2': 'Connect with emergency services instantly',
    'onboarding.title3': 'Community Support',
    'onboarding.desc3': 'Help your community stay safe together',
    'onboarding.getStarted': 'Get Started',
    
    // Map
    'noIncidentsOnMap': 'No incidents on map',
    'incidentsWillAppearHere': 'Incidents will appear here when reported',
  },
  
  fr: {
    // Common
    'common.welcome': 'Bienvenue',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.save': 'Sauvegarder',
    'common.submit': 'Soumettre',
    'common.search': 'Rechercher',
    
    // Auth
    'auth.login': 'Se connecter',
    'auth.register': 'S\'inscrire',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.forgotPassword': 'Mot de passe oublié?',
    'auth.loginSuccess': 'Connexion réussie',
    'auth.loginError': 'Échec de la connexion',
    
    // Navigation
    'nav.home': 'Accueil',
    'nav.report': 'Signaler',
    'nav.contacts': 'Contacts',
    'nav.profile': 'Profil',
    
    // Incident Reporting
    'report.title': 'Signaler un incident',
    'report.description': 'Description',
    'report.priority': 'Priorité',
    'report.location': 'Localisation',
    'report.photo': 'Ajouter une photo',
    'report.submit': 'Envoyer le rapport',
    'report.success': 'Incident signalé avec succès',
    
    // Emergency
    'emergency.police': 'Police',
    'emergency.fire': 'Pompiers',
    'emergency.medical': 'Urgence médicale',
    'emergency.call': 'Appeler les secours',
    
    // Onboarding
    'onboarding.title1': 'Restez en sécurité',
    'onboarding.desc1': 'Signalez les urgences rapidement et efficacement',
    'onboarding.title2': 'Obtenez de l\'aide rapidement',
    'onboarding.desc2': 'Connectez-vous instantanément aux services d\'urgence',
    'onboarding.title3': 'Soutien communautaire',
    'onboarding.desc3': 'Aidez votre communauté à rester en sécurité ensemble',
    'onboarding.getStarted': 'Commencer',
    
    // Map
    'noIncidentsOnMap': 'Aucun incident sur la carte',
    'incidentsWillAppearHere': 'Les incidents apparaîtront ici lorsqu\'ils seront signalés',
  },
  
  rw: {
    // Common
    'common.welcome': 'Murakaze neza',
    'common.loading': 'Birashakisha...',
    'common.error': 'Ikosa',
    'common.success': 'Byakunze',
    'common.cancel': 'Kuraguza',
    'common.save': 'Kubika',
    'common.submit': 'Kohereza',
    'common.search': 'Gushaka',
    
    // Auth
    'auth.login': 'Kwinjira',
    'auth.register': 'Kwiyandikisha',
    'auth.email': 'Email',
    'auth.password': 'Ijambo banga',
    'auth.confirmPassword': 'Emeza ijambo banga',
    'auth.forgotPassword': 'Wibagiwe ijambo banga?',
    'auth.loginSuccess': 'Kwinjira byakunze',
    'auth.loginError': 'Kwinjira byanze',
    
    // Navigation
    'nav.home': 'Ahabanza',
    'nav.report': 'Kumenyesha',
    'nav.contacts': 'Aderesi',
    'nav.profile': 'Umwirondoro',
    
    // Incident Reporting
    'report.title': 'Kumenyesha ibintu byihutirwa',
    'report.description': 'Ibisobanuro',
    'report.priority': 'Ibanze',
    'report.location': 'Aho biri',
    'report.photo': 'Ongeraho ifoto',
    'report.submit': 'Kohereza raporo',
    'report.success': 'Ibintu byihutirwa byamenyeshejwe neza',
    
    // Emergency
    'emergency.police': 'Polisi',
    'emergency.fire': 'Abazima inkongi',
    'emergency.medical': 'Ubuvuzi bwihutirwa',
    'emergency.call': 'Hamagara ubufasha',
    
    // Onboarding
    'onboarding.title1': 'Wicuze',
    'onboarding.desc1': 'Menyesha ibintu byihutirwa vuba kandi neza',
    'onboarding.title2': 'Bonera ubufasha vuba',
    'onboarding.desc2': 'Huza serivisi z\'ubufasha ako kanya',
    'onboarding.title3': 'Ubufasha bw\'abaturage',
    'onboarding.desc3': 'Fasha abaturage bawe kuguma baciye hamwe',
    'onboarding.getStarted': 'Tangira',
    
    // Map
    'noIncidentsOnMap': 'Nta bintu by\'ibihutirwa kuri ikarita',
    'incidentsWillAppearHere': 'Ibintu by\'ibihutirwa bizagaragara hano iyo bimenyeshejwe',
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      if (savedLanguage && translations[savedLanguage as keyof typeof translations]) {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  };

  const setLanguage = async (lang: string) => {
    try {
      await AsyncStorage.setItem('language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: string): string => {
    const langTranslations = translations[language as keyof typeof translations];
    return langTranslations?.[key as keyof typeof langTranslations] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};