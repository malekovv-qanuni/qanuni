import React, { useState, useEffect } from 'react';
import {
  Users, Briefcase, ClipboardList, Gavel, AlertCircle, Scale,
  DollarSign, Wallet, Calendar, AlertTriangle, X, Settings, Menu,
  Building, FileText, Users2, Receipt
} from 'lucide-react';
import apiClient from '../../api-client';

/**
 * Dashboard Component - v46.37
 * Extracted from App.js for better code organization
 * 
 * Features:
 * - 8 stats cards (2 rows of 4) - NOW CLICKABLE (#17)
 * - Customizable widget order and visibility
 * - Drag-and-drop widget reordering
 * - Today's schedule, tasks due, upcoming hearings
 * - Pending judgments, upcoming deadlines
 * - Corporate compliance deadlines (filings & meetings) (#16)
 * - Pending invoices widget (#15)
 * - Bilingual support (AR/EN)
 */

const Dashboard = ({
  // Data arrays
  hearings,
  hearingPurposes,
  tasks,
  judgments,
  deadlines,
  matters,
  clients,
  corporateEntities = [], // v46.26 - Corporate entities for compliance widget
  // Stats
  dashboardStats,
  // Widget configuration
  showWidgetSettings,
  setShowWidgetSettings,
  // Localization removed (v48)
  // Utilities
  formatDate,
  onNavigate
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Dashboard widget configuration (moved from App.js - Phase 3c.7a)
  const [dashboardWidgets, setDashboardWidgets] = useState(() => {
    const saved = localStorage.getItem('qanuni_dashboard_widgets');
    return saved ? JSON.parse(saved) : {
      order: ['stats', 'todaySchedule', 'pendingInvoices', 'corporateCompliance', 'upcomingDeadlines', 'tasksDue', 'upcomingHearings', 'pendingJudgments'],
      visible: {
        stats: true,
        todaySchedule: true,
        pendingInvoices: true,
        corporateCompliance: true,
        upcomingDeadlines: true,
        tasksDue: true,
        upcomingHearings: true,
        pendingJudgments: true
      }
    };
  });
  const [draggedWidget, setDraggedWidget] = useState(null);

  // v46.37: State for pending invoices widget (#15)
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [complianceItems, setComplianceItems] = useState([]);
  
  // v46.37: Load pending invoices on mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load pending invoices
        if (apiClient.getPendingInvoices) {
          const invoices = await apiClient.getPendingInvoices();
          setPendingInvoices(invoices || []);
        }
        // Load compliance items (existing API returns { filings, meetings })
        if (apiClient.getUpcomingCompliance) {
          const compliance = await apiClient.getUpcomingCompliance();
          // Combine filings and meetings into single array
          const combined = [
            ...(compliance?.filings || []).map(f => ({ ...f, item_type: 'filing' })),
            ...(compliance?.meetings || []).map(m => ({ ...m, item_type: 'meeting' }))
          ];
          setComplianceItems(combined);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    loadDashboardData();
  }, []);
  
  // Find Judgment Pronouncement purpose to exclude from hearings displays
  const jpPurpose = hearingPurposes.find(p => p.name_en === 'Judgment Pronouncement');
  const isJPHearing = (h) => jpPurpose && h.purpose_id === jpPurpose.purpose_id;
  
  // Filtered data for widgets
  const todayHearings = hearings.filter(h => h.hearing_date === today && !isJPHearing(h));
  const overdueTasks = tasks.filter(task => task.status !== 'done' && task.due_date && task.due_date < today);
  const todayTasks = tasks.filter(task => task.status !== 'done' && task.due_date === today);
  const pendingJudgments = judgments.filter(j => j.status === 'pending');
  const upcomingHearingsFiltered = hearings
    .filter(h => h.hearing_date >= today && !isJPHearing(h))
    .sort((a, b) => a.hearing_date.localeCompare(b.hearing_date));
  const upcomingHearingsCount = upcomingHearingsFiltered.length;
  const upcomingHearingsList = upcomingHearingsFiltered.slice(0, 5);
  
  // Deadline calculations
  const overdueDeadlines = deadlines.filter(d => d.status === 'pending' && d.deadline_date < today);
  const upcomingDeadlinesList = deadlines
    .filter(d => d.status === 'pending' && d.deadline_date >= today)
    .sort((a, b) => a.deadline_date.localeCompare(b.deadline_date))
    .slice(0, 5);

  // v46.26 - Corporate compliance calculations
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];

  // Flatten all filings from all corporate entities
  const allFilings = corporateEntities.flatMap(entity => 
    (entity.filings || []).map(f => ({
      ...f,
      entity_name: entity.entity_name,
      entity_id: entity.entity_id
    }))
  );

  // Flatten all meetings from all corporate entities
  const allMeetings = corporateEntities.flatMap(entity => 
    (entity.meetings || []).map(m => ({
      ...m,
      entity_name: entity.entity_name,
      entity_id: entity.entity_id
    }))
  );

  // Overdue filings (due_date < today AND status pending/not filed)
  const overdueFilings = allFilings
    .filter(f => f.due_date && f.due_date < today && f.status !== 'filed' && f.status !== 'completed')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  // Upcoming filings (next 30 days)
  const upcomingFilings = allFilings
    .filter(f => f.due_date && f.due_date >= today && f.due_date <= thirtyDaysStr && f.status !== 'filed' && f.status !== 'completed')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  // Upcoming meetings (next 30 days)
  const upcomingMeetings = allMeetings
    .filter(m => m.meeting_date && m.meeting_date >= today && m.meeting_date <= thirtyDaysStr)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))
    .slice(0, 5);

  // Widget names mapping
  const widgetNames = {
    stats: 'Statistics Cards',
    todaySchedule: "Today's Schedule",
    tasksDue: 'Tasks Due',
    upcomingHearings: 'Upcoming Hearings',
    pendingJudgments: 'Pending Judgments',
    upcomingDeadlines: 'Upcoming Deadlines',
    corporateCompliance: 'Corporate Compliance',
    pendingInvoices: 'Pending Invoices' // v46.37 #15
  };

  // Save widget preferences to localStorage
  const saveWidgetPrefs = (newConfig) => {
    setDashboardWidgets(newConfig);
    localStorage.setItem('qanuni_dashboard_widgets', JSON.stringify(newConfig));
  };

  // Toggle widget visibility
  const toggleWidget = (widgetId) => {
    const newConfig = {
      ...dashboardWidgets,
      visible: { ...dashboardWidgets.visible, [widgetId]: !dashboardWidgets.visible[widgetId] }
    };
    saveWidgetPrefs(newConfig);
  };

  // Handle drag start
  const handleDragStart = (e, widgetId) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e, widgetId) => {
    e.preventDefault();
    if (draggedWidget === widgetId) return;
  };

  // Handle drop
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;
    
    const newOrder = [...dashboardWidgets.order];
    const draggedIndex = newOrder.indexOf(draggedWidget);
    const targetIndex = newOrder.indexOf(targetId);
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedWidget);
    
    saveWidgetPrefs({ ...dashboardWidgets, order: newOrder });
    setDraggedWidget(null);
  };

  // Reset to default layout
  const resetLayout = () => {
    const defaultConfig = {
      order: ['stats', 'todaySchedule', 'pendingInvoices', 'corporateCompliance', 'upcomingDeadlines', 'tasksDue', 'upcomingHearings', 'pendingJudgments'],
      visible: { stats: true, todaySchedule: true, pendingInvoices: true, corporateCompliance: true, upcomingDeadlines: true, tasksDue: true, upcomingHearings: true, pendingJudgments: true }
    };
    saveWidgetPrefs(defaultConfig);
  };

  // Helper to get days until/since a date
  const getDaysUntil = (dateStr) => {
    const targetDate = new Date(dateStr);
    const todayDate = new Date(today);
    return Math.ceil((targetDate - todayDate) / (1000 * 60 * 60 * 24));
  };

  // Widget components
  const widgets = {
    stats: (
      <>
        {/* Stats Cards - Row 1 - v46.37: Made clickable (#17) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div 
            onClick={() => onNavigate('clients')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'Total Clients'}</p>
                <p className="text-3xl font-bold mt-2">{dashboardStats.totalClients || clients.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div 
            onClick={() => onNavigate('matters')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'Active Matters'}</p>
                <p className="text-3xl font-bold mt-2">{dashboardStats.activeMatters || matters.filter(m => m.status === 'active').length}</p>
              </div>
              <Briefcase className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div 
            onClick={() => onNavigate('tasks')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'Pending Tasks'}</p>
                <p className="text-3xl font-bold mt-2">{dashboardStats.pendingTasks || tasks.filter(task => task.status !== 'done').length}</p>
              </div>
              <ClipboardList className="w-12 h-12 text-orange-500" />
            </div>
          </div>
          <div 
            onClick={() => onNavigate('hearings')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'Upcoming Hearings'}</p>
                <p className="text-3xl font-bold mt-2">{dashboardStats.upcomingHearings ?? upcomingHearingsCount}</p>
              </div>
              <Gavel className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Stats Cards - Row 2 - v46.37: Made clickable (#17) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div 
            onClick={() => onNavigate('tasks')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'Overdue Tasks'}</p>
                <p className="text-3xl font-bold mt-2 text-red-600">{dashboardStats.overdueTasks || overdueTasks.length}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <div 
            onClick={() => onNavigate('judgments')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'Pending Judgments'}</p>
                <p className="text-3xl font-bold mt-2">{dashboardStats.pendingJudgments || pendingJudgments.length}</p>
              </div>
              <Scale className="w-12 h-12 text-indigo-500" />
            </div>
          </div>
          <div 
            onClick={() => onNavigate('invoices')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'Outstanding Balance'}</p>
                <p className="text-2xl font-bold mt-2">${(dashboardStats.outstandingInvoices || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <div 
            onClick={() => onNavigate('reports')}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{'This Month'}</p>
                <p className="text-2xl font-bold mt-2 text-green-600">${(dashboardStats.thisMonthRevenue || 0).toLocaleString()}</p>
              </div>
              <Wallet className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>
      </>
    ),
    todaySchedule: (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{'Today\'s Schedule'}</h3>
        {todayHearings.length === 0 ? (
          <p className="text-gray-500">{'No hearings scheduled for today'}</p>
        ) : (
          <div className="space-y-3">
            {todayHearings.map(h => {
              const matter = matters.find(m => m.matter_id === h.matter_id);
              return (
                <div key={h.hearing_id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Gavel className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{matter?.matter_name}</p>
                    <p className="text-sm text-gray-600">{h.hearing_time} - {h.purpose_custom}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    tasksDue: (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{'Tasks'}</h3>
        {overdueTasks.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-red-600 mb-2">{'Overdue'} ({overdueTasks.length})</h4>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map(task => (
                <div key={task.task_id} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                  <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                  <span className="text-sm">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {todayTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-orange-600 mb-2">{'Due today'} ({todayTasks.length})</h4>
            <div className="space-y-2">
              {todayTasks.slice(0, 3).map(task => (
                <div key={task.task_id} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                  <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                  <span className="text-sm">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {overdueTasks.length === 0 && todayTasks.length === 0 && (
          <p className="text-gray-500">{'No tasks due'}</p>
        )}
      </div>
    ),
    upcomingHearings: (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{'Upcoming Hearings'}</h3>
        {upcomingHearingsList.length === 0 ? (
          <p className="text-gray-500">{'No data'}</p>
        ) : (
          <div className="space-y-3">
            {upcomingHearingsList.map(h => {
              const matter = matters.find(m => m.matter_id === h.matter_id);
              const client = matter ? clients.find(c => c.client_id === matter.client_id) : null;
              return (
                <div key={h.hearing_id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium">{matter?.matter_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{client?.client_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(h.hearing_date)}</p>
                    <p className="text-xs text-gray-500">{h.hearing_time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    pendingJudgments: (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">{'Pending Judgments'}</h3>
        {pendingJudgments.length === 0 ? (
          <p className="text-gray-500">{'No data'}</p>
        ) : (
          <div className="space-y-3">
            {pendingJudgments.slice(0, 5).map(j => {
              const matter = matters.find(m => m.matter_id === j.matter_id);
              return (
                <div key={j.judgment_id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-medium">{matter?.matter_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{j.judgment_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{j.expected_date ? formatDate(j.expected_date) : 'TBD'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    upcomingDeadlines: (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{'Upcoming Deadlines'}</h3>
          {overdueDeadlines.length > 0 && (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
              {overdueDeadlines.length} overdue deadlines
            </span>
          )}
        </div>
        {upcomingDeadlinesList.length === 0 && overdueDeadlines.length === 0 ? (
          <p className="text-gray-500">{'No data'}</p>
        ) : (
          <div className="space-y-3">
            {/* Show overdue first */}
            {overdueDeadlines.slice(0, 3).map(d => {
              const matter = matters.find(m => m.matter_id === d.matter_id);
              const daysOver = Math.ceil((new Date() - new Date(d.deadline_date)) / (1000 * 60 * 60 * 24));
              return (
                <div key={d.deadline_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">{d.title}</p>
                      <p className="text-sm text-red-600">{matter?.matter_name || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">{daysOver} {'days overdue'}</p>
                  </div>
                </div>
              );
            })}
            {/* Show upcoming */}
            {upcomingDeadlinesList.map(d => {
              const matter = matters.find(m => m.matter_id === d.matter_id);
              const daysUntil = Math.ceil((new Date(d.deadline_date) - new Date()) / (1000 * 60 * 60 * 24));
              const bgColor = daysUntil === 0 ? 'bg-orange-50' : daysUntil <= 7 ? 'bg-yellow-50' : 'bg-gray-50';
              const textColor = daysUntil === 0 ? 'text-orange-600' : daysUntil <= 7 ? 'text-yellow-700' : 'text-gray-600';
              return (
                <div key={d.deadline_id} className={`flex items-center justify-between p-3 ${bgColor} rounded-lg`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${textColor}`} />
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-sm text-gray-600">{matter?.matter_name || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(d.deadline_date)}</p>
                    <p className={`text-xs ${textColor}`}>
                      {daysUntil === 0 ? 'Due today' : `${daysUntil} ${'days remaining'}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button 
          onClick={() => onNavigate('deadlines')}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          {'View'} {'All Deadlines'} →
        </button>
      </div>
    ),

    // v46.26 - Corporate Compliance Widget
    corporateCompliance: (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-600" />
            {'Corporate Compliance'}
          </h3>
          {overdueFilings.length > 0 && (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
              {overdueFilings.length} {'Overdue'}
            </span>
          )}
        </div>

        {corporateEntities.length === 0 ? (
          <p className="text-gray-500">{'No entities'}</p>
        ) : overdueFilings.length === 0 && upcomingFilings.length === 0 && upcomingMeetings.length === 0 ? (
          <div className="text-center py-4">
            <Building className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-green-600 font-medium">{'All compliance up to date'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Overdue Filings - Red priority */}
            {overdueFilings.slice(0, 3).map(f => {
              const daysOver = Math.abs(getDaysUntil(f.due_date));
              return (
                <div key={f.filing_id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">{f.filing_type}</p>
                      <p className="text-sm text-red-600">{f.entity_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      {daysOver} {'days overdue'}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Upcoming Filings */}
            {upcomingFilings.map(f => {
              const daysUntil = getDaysUntil(f.due_date);
              const bgColor = daysUntil <= 7 ? 'bg-orange-50' : daysUntil <= 14 ? 'bg-yellow-50' : 'bg-teal-50';
              const textColor = daysUntil <= 7 ? 'text-orange-600' : daysUntil <= 14 ? 'text-yellow-700' : 'text-teal-600';
              const borderColor = daysUntil <= 7 ? 'border-orange-400' : daysUntil <= 14 ? 'border-yellow-400' : 'border-teal-400';
              return (
                <div key={f.filing_id} className={`flex items-center justify-between p-3 ${bgColor} rounded-lg border-l-4 ${borderColor}`}>
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 ${textColor}`} />
                    <div>
                      <p className="font-medium">{f.filing_type}</p>
                      <p className="text-sm text-gray-600">{f.entity_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(f.due_date)}</p>
                    <p className={`text-xs ${textColor}`}>
                      {daysUntil === 0 
                        ? ('today')
                        : `${daysUntil} ${'days'}`}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Upcoming Meetings */}
            {upcomingMeetings.map(m => {
              const daysUntil = getDaysUntil(m.meeting_date);
              return (
                <div key={m.meeting_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="flex items-center gap-3">
                    <Users2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{m.meeting_type}</p>
                      <p className="text-sm text-gray-600">{m.entity_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(m.meeting_date)}</p>
                    <p className="text-xs text-blue-600">
                      {daysUntil === 0 
                        ? ('today')
                        : `${daysUntil} ${'days'}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button 
          onClick={() => onNavigate('companies')}
          className="mt-3 text-sm text-teal-600 hover:text-teal-800"
        >
          View Corporate Secretary →
        </button>
      </div>
    ),

    // v46.37 - Pending Invoices Widget (#15)
    pendingInvoices: (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            {'Pending Invoices'}
          </h3>
          {pendingInvoices.filter(i => i.urgency === 'overdue').length > 0 && (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
              {pendingInvoices.filter(i => i.urgency === 'overdue').length} {'Overdue'}
            </span>
          )}
        </div>

        {pendingInvoices.length === 0 ? (
          <div className="text-center py-4">
            <Receipt className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-green-600 font-medium">{'No pending invoices'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvoices.slice(0, 5).map(invoice => {
              const bgColor = invoice.urgency === 'overdue' ? 'bg-red-50' : 
                             invoice.urgency === 'due_soon' ? 'bg-orange-50' : 'bg-amber-50';
              const borderColor = invoice.urgency === 'overdue' ? 'border-red-500' : 
                                 invoice.urgency === 'due_soon' ? 'border-orange-400' : 'border-amber-400';
              const textColor = invoice.urgency === 'overdue' ? 'text-red-600' : 
                               invoice.urgency === 'due_soon' ? 'text-orange-600' : 'text-amber-700';
              
              return (
                <div 
                  key={invoice.invoice_id} 
                  onClick={() => onNavigate('invoices')}
                  className={`flex items-center justify-between p-3 ${bgColor} rounded-lg border-l-4 ${borderColor} cursor-pointer hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-center gap-3">
                    <Receipt className={`w-5 h-5 ${textColor}`} />
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-600">{invoice.client_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{invoice.currency} {parseFloat(invoice.total).toLocaleString()}</p>
                    <p className={`text-xs ${textColor}`}>
                      {invoice.urgency === 'overdue' 
                        ? `${Math.abs(Math.floor(invoice.days_overdue))} ${'days overdue'}`
                        : invoice.due_date 
                          ? formatDate(invoice.due_date)
                          : ('No due date')
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button 
          onClick={() => onNavigate('invoices')}
          className="mt-3 text-sm text-amber-600 hover:text-amber-800"
        >
          View All Invoices →
        </button>
      </div>
    )
  };

  return (
    <div className="space-y-6">
      {/* Header with Customize button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{'Dashboard'}</h2>
        <button 
          onClick={() => setShowWidgetSettings(!showWidgetSettings)}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
        >
          <Settings className="w-4 h-4" />
          {'Customize'}
        </button>
      </div>

      {/* Widget Settings Panel */}
      {showWidgetSettings && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">{'Customize Dashboard'}</h3>
            <button onClick={() => setShowWidgetSettings(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">{'Drag to reorder widgets'}</p>
          
          <div className="space-y-2">
            {dashboardWidgets.order.map((widgetId) => (
              <div 
                key={widgetId}
                draggable
                onDragStart={(e) => handleDragStart(e, widgetId)}
                onDragOver={(e) => handleDragOver(e, widgetId)}
                onDrop={(e) => handleDrop(e, widgetId)}
                className={`flex items-center justify-between p-3 border rounded-md cursor-move ${
                  draggedWidget === widgetId ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Menu className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">{widgetNames[widgetId]}</span>
                </div>
                <button 
                  onClick={() => toggleWidget(widgetId)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    dashboardWidgets.visible[widgetId] 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {dashboardWidgets.visible[widgetId] ? 'Show' : 'Hide'}
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-end">
            <button 
              onClick={resetLayout}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
            >
              {'Reset Layout'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards (always at top if visible) */}
      {dashboardWidgets.visible.stats && widgets.stats}

      {/* Other Widgets in 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboardWidgets.order
          .filter(id => id !== 'stats' && dashboardWidgets.visible[id])
          .map(id => <div key={id}>{widgets[id]}</div>)
        }
      </div>
    </div>
  );
};

export default Dashboard;
