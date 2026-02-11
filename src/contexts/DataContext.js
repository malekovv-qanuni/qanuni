// src/contexts/DataContext.js
import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // Core entity data
  const [clients, setClients] = useState([]);
  const [matters, setMatters] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [judgments, setJudgments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [corporateEntities, setCorporateEntities] = useState([]);

  // Lookup tables (match App.js exactly)
  const [courtTypes, setCourtTypes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [hearingPurposes, setHearingPurposes] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);

  // Dashboard & settings
  const [dashboardStats, setDashboardStats] = useState({});
  const [firmInfo, setFirmInfo] = useState({
    firm_name: '', firm_name_arabic: '', firm_address: '', firm_phone: '', firm_email: '',
    firm_website: '', firm_vat_number: '', default_currency: 'USD', default_vat_rate: '11',
    lawyer_advance_min_balance: '500'
  });

  const value = {
    // Core entities
    clients,
    setClients,
    matters,
    setMatters,
    lawyers,
    setLawyers,
    hearings,
    setHearings,
    judgments,
    setJudgments,
    tasks,
    setTasks,
    timesheets,
    setTimesheets,
    appointments,
    setAppointments,
    expenses,
    setExpenses,
    advances,
    setAdvances,
    invoices,
    setInvoices,
    deadlines,
    setDeadlines,
    corporateEntities,
    setCorporateEntities,

    // Lookups
    courtTypes,
    setCourtTypes,
    regions,
    setRegions,
    hearingPurposes,
    setHearingPurposes,
    taskTypes,
    setTaskTypes,
    expenseCategories,
    setExpenseCategories,
    entityTypes,
    setEntityTypes,

    // Dashboard & settings
    dashboardStats,
    setDashboardStats,
    firmInfo,
    setFirmInfo
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
