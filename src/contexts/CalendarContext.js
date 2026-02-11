import React, { createContext, useContext } from 'react';

const CalendarContext = createContext(null);

export const CalendarProvider = ({ children }) => {
  // TODO Phase 3c.7: Extract from App.js (defer to later)
  // - calendarView, setCalendarView
  // - calendarDate, setCalendarDate

  const value = {
    // Placeholder - will be populated in Phase 3c.7
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within CalendarProvider');
  }
  return context;
};
