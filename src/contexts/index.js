import React from 'react';
import { AuthProvider } from './AuthContext';
import { NotificationProvider } from './NotificationContext';
import { TimerProvider } from './TimerContext';
import { AppProvider } from './AppContext';
import { DataProvider } from './DataContext';
import { UIProvider } from './UIContext';
import { FilterProvider } from './FilterContext';
import { ReportProvider } from './ReportContext';
import { DialogProvider } from './DialogContext';
import { CalendarProvider } from './CalendarContext';

// Export all hooks for easy importing
export { useAuth } from './AuthContext';
export { useNotification } from './NotificationContext';
export { useTimer } from './TimerContext';
export { useApp } from './AppContext';
export { useData } from './DataContext';
export { useUI } from './UIContext';
export { useFilter } from './FilterContext';
export { useReport } from './ReportContext';
export { useDialog } from './DialogContext';
export { useCalendar } from './CalendarContext';

// Combined provider wrapper - nests all context providers
export const ContextProviders = ({ children }) => {
  return (
    <AuthProvider>
      <AppProvider>
        <DataProvider>
          <NotificationProvider>
            <UIProvider>
              <FilterProvider>
                <ReportProvider>
                  <DialogProvider>
                    <CalendarProvider>
                      <TimerProvider>
                        {children}
                      </TimerProvider>
                    </CalendarProvider>
                  </DialogProvider>
                </ReportProvider>
              </FilterProvider>
            </UIProvider>
          </NotificationProvider>
        </DataProvider>
      </AppProvider>
    </AuthProvider>
  );
};
