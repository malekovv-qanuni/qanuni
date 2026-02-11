import React, { createContext, useContext } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  // TODO Phase 3c.6: Extract from App.js
  // Reference data (loaded once at startup):
  // - lawyers, courtTypes, regions, hearingPurposes
  // - taskTypes, expenseCategories, entityTypes
  // - firmInfo
  // - refreshLookups()

  const value = {
    // Placeholder - will be populated in Phase 3c.6
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
