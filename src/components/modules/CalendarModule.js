// CalendarModule.js - v48 (language removal)
import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Clock, MapPin, Users, Plus
} from 'lucide-react';
import { useUI } from '../../contexts';

const CalendarModule = ({
  appointments,
  hearings,
  deadlines,
  showToast
}) => {
  const { openForm } = useUI();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month'); // 'month' or 'day'

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const dayAppointments = appointments.filter(a => a.date === dateStr);
    const dayHearings = hearings.filter(h => h.hearing_date === dateStr);
    const dayDeadlines = deadlines.filter(d => d.deadline_date === dateStr);
    
    return {
      appointments: dayAppointments,
      hearings: dayHearings,
      deadlines: dayDeadlines,
      total: dayAppointments.length + dayHearings.length + dayDeadlines.length
    };
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square p-2 border border-gray-100" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const events = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      
      days.push(
        <div
          key={day}
          onClick={() => {
            setSelectedDate(date);
            setView('day');
          }}
          className={`aspect-square p-2 border cursor-pointer transition-colors ${
            isToday ? 'bg-blue-50 border-blue-300' : 'border-gray-100 hover:bg-gray-50'
          } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="font-medium text-sm mb-1">{day}</div>
          {events.total > 0 && (
            <div className="space-y-1">
              {events.appointments.length > 0 && (
                <div className="text-xs bg-green-100 text-green-700 px-1 rounded">
                  {events.appointments.length} appt
                </div>
              )}
              {events.hearings.length > 0 && (
                <div className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                  {events.hearings.length} hearing
                </div>
              )}
              {events.deadlines.length > 0 && (
                <div className="text-xs bg-red-100 text-red-700 px-1 rounded">
                  {events.deadlines.length} deadline
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  const renderDayView = () => {
    if (!selectedDate) return null;
    
    const events = getEventsForDate(selectedDate);
    const allEvents = [
      ...events.appointments.map(a => ({ ...a, type: 'appointment', time: a.start_time })),
      ...events.hearings.map(h => ({ ...h, type: 'hearing', time: h.hearing_time })),
      ...events.deadlines.map(d => ({ ...d, type: 'deadline', time: null }))
    ].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <button
            onClick={() => setView('month')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Back to Month
          </button>
        </div>

        {allEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No events scheduled for this day
          </div>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event, idx) => (
              <div
                key={`${event.type}-${event[event.type === 'appointment' ? 'appointment_id' : event.type === 'hearing' ? 'hearing_id' : 'deadline_id']}-${idx}`}
                onClick={() => {
                  if (event.type === 'appointment') {
                    openForm('appointment', event);
                  } else if (event.type === 'hearing') {
                    openForm('hearing', event);
                  } else if (event.type === 'deadline') {
                    openForm('deadline', event);
                  }
                }}
                className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                  event.type === 'appointment' ? 'bg-green-50 border-green-500' :
                  event.type === 'hearing' ? 'bg-purple-50 border-purple-500' :
                  'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        event.type === 'appointment' ? 'bg-green-200 text-green-800' :
                        event.type === 'hearing' ? 'bg-purple-200 text-purple-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {event.type === 'appointment' ? 'Appointment' :
                         event.type === 'hearing' ? 'Hearing' : 'Deadline'}
                      </span>
                      {event.time && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.time}
                        </span>
                      )}
                    </div>
                    <div className="font-medium">
                      {event.type === 'appointment' ? event.title :
                       event.type === 'hearing' ? event.purpose_name || 'Hearing' :
                       event.title}
                    </div>
                    {event.client_name && (
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.client_name}
                      </div>
                    )}
                    {event.type === 'appointment' && event.location_details && (
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location_details}
                      </div>
                    )}
                    {event.type === 'hearing' && event.court_name && (
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.court_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    setView('day');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-gray-600" />
          <h2 className="text-2xl font-bold">Calendar</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-2 border rounded-md hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => openForm('appointment')}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Appointment
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {view === 'month' ? (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {renderMonthView()}
            </div>
          </div>
        ) : (
          renderDayView()
        )}
      </div>
    </div>
  );
};

export default CalendarModule;
