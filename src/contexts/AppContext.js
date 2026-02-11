// src/contexts/AppContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Language & Theme
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Current module
  const [currentModule, setCurrentModule] = useState('dashboard');

  // Persist language changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Persist theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const value = {
    language,
    setLanguage,
    theme,
    setTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    currentModule,
    setCurrentModule
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
