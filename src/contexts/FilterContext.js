import React, { createContext, useContext, useReducer, useCallback } from 'react';

const FilterContext = createContext(null);

const filterInitialState = {
  timesheets: {
    filters: { clientId: '', matterId: '', lawyerId: '', billable: '', dateFrom: '', dateTo: '', search: '' },
    page: 1,
    pageSize: 25
  },
  expenses: {
    filters: { clientId: '', matterId: '', paidBy: '', status: '', billable: '', dateFrom: '', dateTo: '', search: '' },
    page: 1,
    pageSize: 25
  },
  invoices: {
    filters: { clientId: '', matterId: '', status: '', dateType: 'issue', dateFrom: '', dateTo: '', datePreset: 'all', search: '' },
    page: 1,
    pageSize: 25
  },
  deadlines: {
    filters: { clientId: '', matterId: '', priority: '', dateFrom: '', dateTo: '', search: '' },
    page: 1,
    pageSize: 25
  },
  tasks: {
    filters: { clientId: '', matterId: '', lawyerId: '', taskTypeId: '', regionId: '', dateFrom: '', dateTo: '', search: '' },
    statusFilter: 'all',
    priorityFilter: 'all',
    page: 1,
    pageSize: 25
  },
  clients: {
    search: ''
  },
  matters: {
    search: ''
  }
};

function filterReducer(state, action) {
  switch (action.type) {
    case 'SET_FILTER': {
      const { module, key, value } = action;
      return {
        ...state,
        [module]: {
          ...state[module],
          filters: {
            ...state[module].filters,
            [key]: value
          },
          page: 1
        }
      };
    }
    case 'RESET_FILTERS': {
      const { module } = action;
      return {
        ...state,
        [module]: { ...filterInitialState[module] }
      };
    }
    case 'SET_PAGE': {
      const { module, page } = action;
      return {
        ...state,
        [module]: {
          ...state[module],
          page
        }
      };
    }
    case 'SET_PAGE_SIZE': {
      const { module, pageSize } = action;
      return {
        ...state,
        [module]: {
          ...state[module],
          pageSize,
          page: 1
        }
      };
    }
    case 'SET_SEARCH': {
      const { module, search } = action;
      return {
        ...state,
        [module]: {
          ...state[module],
          search
        }
      };
    }
    case 'SET_LEGACY_FILTER': {
      const { module, key, value } = action;
      return {
        ...state,
        [module]: {
          ...state[module],
          [key]: value
        }
      };
    }
    default:
      return state;
  }
}

export const FilterProvider = ({ children }) => {
  const [filterState, dispatch] = useReducer(filterReducer, filterInitialState);

  const setFilter = useCallback((module, key, value) => {
    dispatch({ type: 'SET_FILTER', module, key, value });
  }, []);

  const resetFilters = useCallback((module) => {
    dispatch({ type: 'RESET_FILTERS', module });
  }, []);

  const setPage = useCallback((module, page) => {
    dispatch({ type: 'SET_PAGE', module, page });
  }, []);

  const setPageSize = useCallback((module, pageSize) => {
    dispatch({ type: 'SET_PAGE_SIZE', module, pageSize });
  }, []);

  const setSearch = useCallback((module, search) => {
    dispatch({ type: 'SET_SEARCH', module, search });
  }, []);

  const setLegacyFilter = useCallback((module, key, value) => {
    dispatch({ type: 'SET_LEGACY_FILTER', module, key, value });
  }, []);

  const value = {
    filterState,
    setFilter,
    resetFilters,
    setPage,
    setPageSize,
    setSearch,
    setLegacyFilter
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within FilterProvider');
  }
  return context;
};
