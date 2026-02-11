// src/contexts/CalendarContext.js
import React, { createContext, useContext, useState } from 'react';

const CalendarContext = createContext();

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within CalendarProvider');
  }
  return context;
};

export const CalendarProvider = ({ children }) => {
  const [calendarView, setCalendarView] = useState('weekly');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const value = {
    calendarView,
    setCalendarView,
    calendarDate,
    setCalendarDate
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};
