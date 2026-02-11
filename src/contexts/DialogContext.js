import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

const DialogContext = createContext(null);

const DIALOG_TYPES = ['appealMatter', 'matterTimeline', 'invoiceViewer'];

const dialogInitialState = {
  appealMatter: { isOpen: false, data: null },
  matterTimeline: { isOpen: false, data: null },
  invoiceViewer: { isOpen: false, data: null },
  selectedMatter: null
};

function dialogReducer(state, action) {
  switch (action.type) {
    case 'OPEN_DIALOG': {
      const { dialogType, data } = action;
      return {
        ...state,
        [dialogType]: {
          isOpen: true,
          data: data || null
        }
      };
    }
    case 'CLOSE_DIALOG': {
      const { dialogType } = action;
      return {
        ...state,
        [dialogType]: {
          isOpen: false,
          data: null
        }
      };
    }
    case 'SET_SELECTED_MATTER': {
      return {
        ...state,
        selectedMatter: action.matter
      };
    }
    default:
      return state;
  }
}

export const DialogProvider = ({ children }) => {
  const [dialogState, dispatch] = useReducer(dialogReducer, dialogInitialState);

  const openDialog = useCallback((dialogType, data) => {
    dispatch({ type: 'OPEN_DIALOG', dialogType, data });
  }, []);

  const closeDialog = useCallback((dialogType) => {
    dispatch({ type: 'CLOSE_DIALOG', dialogType });
  }, []);

  const setSelectedMatter = useCallback((matter) => {
    dispatch({ type: 'SET_SELECTED_MATTER', matter });
  }, []);

  const value = useMemo(() => ({
    dialogState,
    openDialog,
    closeDialog,
    setSelectedMatter
  }), [dialogState, openDialog, closeDialog, setSelectedMatter]);

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
};

export const useDialog = (key) => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }

  const { dialogState, openDialog, closeDialog, setSelectedMatter } = context;

  if (key === 'selectedMatter') {
    return useMemo(() => ({
      selectedMatter: dialogState.selectedMatter,
      setSelectedMatter
    }), [dialogState.selectedMatter, setSelectedMatter]);
  }

  if (!DIALOG_TYPES.includes(key)) {
    throw new Error(`Unknown dialog type: ${key}. Must be one of: ${DIALOG_TYPES.join(', ')}, selectedMatter`);
  }

  const dialog = dialogState[key];

  return useMemo(() => ({
    isOpen: dialog.isOpen,
    data: dialog.data,
    openDialog: (data) => openDialog(key, data),
    closeDialog: () => closeDialog(key)
  }), [dialog, key, openDialog, closeDialog]);
};
