import React, { createContext, useContext } from 'react';

const EntityDataContext = createContext(null);

export const EntityDataProvider = ({ children }) => {
  // TODO Phase 3c.6: Extract from App.js
  // Operational data (loaded on-demand per module):
  // - clients, matters, hearings, judgments, tasks
  // - timesheets, appointments, expenses, advances
  // - invoices, deadlines, corporateEntities
  // - dashboardStats
  // - 13 refresh functions (refreshClients, refreshMatters, etc.)
  // - loadModule(moduleName) - on-demand loading strategy

  const value = {
    // Placeholder - will be populated in Phase 3c.6
  };

  return (
    <EntityDataContext.Provider value={value}>
      {children}
    </EntityDataContext.Provider>
  );
};

export const useEntityData = () => {
  const context = useContext(EntityDataContext);
  if (!context) {
    throw new Error('useEntityData must be used within EntityDataProvider');
  }
  return context;
};
