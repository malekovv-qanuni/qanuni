import { useCallback } from 'react';
import { useFilter } from '../contexts/FilterContext';

const SIMPLE_MODULES = ['clients', 'matters'];

/**
 * Convenience hook for accessing a specific module's filter/pagination state
 * @param {string} module - The module key (timesheets, expenses, invoices, deadlines, tasks, clients, matters)
 * @returns {Object} Filter state and setters scoped to the module
 */
export function useFilters(module) {
  const { filterState, setFilter, resetFilters, setPage, setPageSize, setSearch, setLegacyFilter } = useFilter();

  const moduleState = filterState[module];
  const isSimple = SIMPLE_MODULES.includes(module);

  const boundSetFilter = useCallback((key, value) => {
    setFilter(module, key, value);
  }, [setFilter, module]);

  const boundResetFilters = useCallback(() => {
    resetFilters(module);
  }, [resetFilters, module]);

  const boundSetPage = useCallback((page) => {
    setPage(module, page);
  }, [setPage, module]);

  const boundSetPageSize = useCallback((size) => {
    setPageSize(module, size);
  }, [setPageSize, module]);

  const boundSetSearch = useCallback((value) => {
    if (isSimple) {
      setSearch(module, value);
    } else {
      setFilter(module, 'search', value);
    }
  }, [isSimple, setSearch, setFilter, module]);

  const boundSetStatusFilter = useCallback((value) => {
    setLegacyFilter(module, 'statusFilter', value);
  }, [setLegacyFilter, module]);

  const boundSetPriorityFilter = useCallback((value) => {
    setLegacyFilter(module, 'priorityFilter', value);
  }, [setLegacyFilter, module]);

  if (isSimple) {
    return {
      search: moduleState.search,
      setSearch: boundSetSearch,
      resetFilters: boundResetFilters
    };
  }

  return {
    filters: moduleState.filters,
    search: moduleState.filters.search,
    page: moduleState.page,
    pageSize: moduleState.pageSize,
    statusFilter: moduleState.statusFilter,
    priorityFilter: moduleState.priorityFilter,
    setFilter: boundSetFilter,
    resetFilters: boundResetFilters,
    setPage: boundSetPage,
    setPageSize: boundSetPageSize,
    setSearch: boundSetSearch,
    setStatusFilter: boundSetStatusFilter,
    setPriorityFilter: boundSetPriorityFilter
  };
}
