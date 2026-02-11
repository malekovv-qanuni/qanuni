import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  const showConfirm = useCallback((title, message, onConfirm, options = {}) => {
    // options: { confirmText, danger }
    setConfirmDialog({ isOpen: true, title, message, onConfirm, ...options });
  }, []);

  const hideConfirm = useCallback(() => setConfirmDialog({ isOpen: false }), []);

  const value = {
    // Toast
    toast,
    showToast,
    hideToast,

    // Confirm Dialog
    confirmDialog,
    showConfirm,
    hideConfirm
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
