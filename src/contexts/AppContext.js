import React, { createContext, useContext } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // TODO Phase 3c.4: Extract from App.js
  // - currentModule, setCurrentModule
  // - sidebarOpen, setSidebarOpen
  // - loading, setLoading
  // - licenseStatus, licenseChecked, machineId
  // - hasUnsavedChanges, pendingNavigation
  // - handleModuleChange, markFormDirty, clearFormDirty

  const value = {
    // Placeholder - will be populated in Phase 3c.4
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
