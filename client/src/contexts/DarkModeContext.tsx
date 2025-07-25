import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  systemPreference: boolean;
  autoDetect: boolean;
  setAutoDetect: (enabled: boolean) => void;
  isTransitioning: boolean;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

interface DarkModeProviderProps {
  children: ReactNode;
}

export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [systemPreference, setSystemPreference] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load saved preference and apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('dark-mode');
    const savedAutoDetect = localStorage.getItem('dark-mode-auto-detect');
    
    if (savedAutoDetect !== null) {
      setAutoDetect(JSON.parse(savedAutoDetect));
    }

    if (savedTheme === null) {
      // First time - use system preference
      setIsDarkMode(systemPreference);
    } else if (JSON.parse(savedAutoDetect || 'true')) {
      // Auto-detect enabled - use system preference
      setIsDarkMode(systemPreference);
    } else {
      // Manual override - use saved preference
      setIsDarkMode(JSON.parse(savedTheme));
    }
  }, [systemPreference]);

  // Apply theme to document with smooth transitions
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Start transition
    setIsTransitioning(true);
    
    // Add transition class for smooth animations
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    if (isDarkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      body.style.backgroundColor = 'hsl(240, 10%, 3.9%)';
      body.style.color = 'hsl(0, 0%, 98%)';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      body.style.backgroundColor = 'hsl(0, 0%, 100%)';
      body.style.color = 'hsl(240, 10%, 3.9%)';
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? 'hsl(240, 10%, 3.9%)' : 'hsl(0, 0%, 100%)');
    }

    // Update status bar color for mobile
    const statusBarColor = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (statusBarColor) {
      statusBarColor.setAttribute('content', isDarkMode ? 'black-translucent' : 'default');
    }

    // Add theme-specific body classes for additional styling
    if (isDarkMode) {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }

    // End transition after animation completes
    const transitionTimer = setTimeout(() => {
      setIsTransitioning(false);
      // Remove transition styles to avoid interfering with other animations
      root.style.transition = '';
      body.style.transition = '';
    }, 300);

    return () => clearTimeout(transitionTimer);
  }, [isDarkMode]);

  const performThemeChange = (newMode: boolean) => {
    // Add a subtle animation class to indicate theme change
    document.body.classList.add('theme-changing');
    
    setIsDarkMode(newMode);
    
    // Remove the animation class after a short delay
    setTimeout(() => {
      document.body.classList.remove('theme-changing');
    }, 350);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    performThemeChange(newMode);
    setAutoDetect(false); // Disable auto-detect when manually toggling
    localStorage.setItem('dark-mode', JSON.stringify(newMode));
    localStorage.setItem('dark-mode-auto-detect', 'false');
  };

  const setDarkMode = (enabled: boolean) => {
    performThemeChange(enabled);
    setAutoDetect(false); // Disable auto-detect when manually setting
    localStorage.setItem('dark-mode', JSON.stringify(enabled));
    localStorage.setItem('dark-mode-auto-detect', 'false');
  };

  const handleAutoDetectChange = (enabled: boolean) => {
    setAutoDetect(enabled);
    localStorage.setItem('dark-mode-auto-detect', JSON.stringify(enabled));
    
    if (enabled) {
      // When enabling auto-detect, use system preference
      performThemeChange(systemPreference);
      localStorage.removeItem('dark-mode'); // Remove manual override
    }
  };

  const value: DarkModeContextType = {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    systemPreference,
    autoDetect,
    setAutoDetect: handleAutoDetectChange,
    isTransitioning,
  };

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}; 