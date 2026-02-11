import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

const ReportContext = createContext(null);

const reportInitialState = {
  clientStatement: {
    isOpen: false,
    data: null,
    loading: false,
    filters: { dateFrom: '', dateTo: '', includeExpenses: true, includeTimesheets: true }
  },
  caseStatus: {
    isOpen: false,
    data: null,
    loading: false,
    clientId: ''
  },
  client360: {
    isOpen: false,
    data: null,
    loading: false,
    clientId: ''
  }
};

function reportReducer(state, action) {
  switch (action.type) {
    case 'OPEN_REPORT': {
      const { reportType } = action;
      return {
        ...state,
        [reportType]: {
          ...state[reportType],
          isOpen: true
        }
      };
    }
    case 'CLOSE_REPORT': {
      const { reportType } = action;
      return {
        ...state,
        [reportType]: {
          ...reportInitialState[reportType]
        }
      };
    }
    case 'SET_LOADING': {
      const { reportType, loading } = action;
      return {
        ...state,
        [reportType]: {
          ...state[reportType],
          loading
        }
      };
    }
    case 'SET_DATA': {
      const { reportType, data } = action;
      return {
        ...state,
        [reportType]: {
          ...state[reportType],
          data,
          loading: false
        }
      };
    }
    case 'SET_FILTERS': {
      const { reportType, filters } = action;
      return {
        ...state,
        [reportType]: {
          ...state[reportType],
          filters: {
            ...state[reportType].filters,
            ...filters
          }
        }
      };
    }
    case 'SET_CLIENT_ID': {
      const { reportType, clientId } = action;
      return {
        ...state,
        [reportType]: {
          ...state[reportType],
          clientId
        }
      };
    }
    default:
      return state;
  }
}

export const ReportProvider = ({ children }) => {
  const [reportState, dispatch] = useReducer(reportReducer, reportInitialState);

  const openReport = useCallback((reportType) => {
    dispatch({ type: 'OPEN_REPORT', reportType });
  }, []);

  const closeReport = useCallback((reportType) => {
    dispatch({ type: 'CLOSE_REPORT', reportType });
  }, []);

  const setLoading = useCallback((reportType, loading) => {
    dispatch({ type: 'SET_LOADING', reportType, loading });
  }, []);

  const setData = useCallback((reportType, data) => {
    dispatch({ type: 'SET_DATA', reportType, data });
  }, []);

  const setFilters = useCallback((reportType, filters) => {
    dispatch({ type: 'SET_FILTERS', reportType, filters });
  }, []);

  const setClientId = useCallback((reportType, clientId) => {
    dispatch({ type: 'SET_CLIENT_ID', reportType, clientId });
  }, []);

  const value = useMemo(() => ({
    reportState,
    openReport,
    closeReport,
    setLoading,
    setData,
    setFilters,
    setClientId
  }), [reportState, openReport, closeReport, setLoading, setData, setFilters, setClientId]);

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReport = (reportType) => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within ReportProvider');
  }

  const { reportState, openReport, closeReport, setLoading, setData, setFilters, setClientId } = context;
  const report = reportState[reportType];

  if (!report) {
    throw new Error(`Unknown report type: ${reportType}. Must be one of: clientStatement, caseStatus, client360`);
  }

  return useMemo(() => ({
    isOpen: report.isOpen,
    data: report.data,
    loading: report.loading,
    ...(reportType === 'clientStatement' ? { filters: report.filters } : {}),
    ...(reportType === 'caseStatus' || reportType === 'client360' ? { clientId: report.clientId } : {}),
    openReport: () => openReport(reportType),
    closeReport: () => closeReport(reportType),
    setLoading: (loading) => setLoading(reportType, loading),
    setData: (data) => setData(reportType, data),
    ...(reportType === 'clientStatement' ? { setFilters: (filters) => setFilters(reportType, filters) } : {}),
    ...(reportType === 'caseStatus' || reportType === 'client360' ? { setClientId: (clientId) => setClientId(reportType, clientId) } : {})
  }), [report, reportType, openReport, closeReport, setLoading, setData, setFilters, setClientId]);
};
