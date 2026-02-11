import React, { useState, useEffect } from 'react';
import {
  Timer, Play, Pause, Square, Save, Minimize2, Loader2
} from 'lucide-react';
import { useTimer } from '../../contexts';
import { useNotification } from '../../contexts';

// ============================================
// TIME TRACKING TIMER WIDGET
// Extracted from App.js v46.12 → v46.13
// v48: Removed language/t/isRTL props
// v48.1: Migrated to useTimer + useNotification contexts
// ============================================
const TimerWidget = ({
  // Data (from parent)
  clients,
  matters,
  lawyers,
  // Actions (from parent)
  refreshTimesheets
}) => {
  const {
    timerExpanded, setTimerExpanded,
    timerRunning, setTimerRunning,
    timerSeconds, setTimerSeconds,
    timerClientId, setTimerClientId,
    timerMatterId, setTimerMatterId,
    timerNarrative, setTimerNarrative,
    timerLawyerId, setTimerLawyerId,
    saveTimerState
  } = useTimer();

  const { showConfirm, hideConfirm, showToast } = useNotification();
  // Local state for narrative to prevent focus loss while typing
  const [localNarrative, setLocalNarrative] = useState(timerNarrative);
  
  // Sync local narrative when parent changes (e.g., on load from localStorage)
  useEffect(() => {
    setLocalNarrative(timerNarrative);
  }, [timerNarrative]);
  
  // Format seconds as HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get filtered matters for selected client
  const filteredMatters = timerClientId 
    ? matters.filter(m => m.client_id === timerClientId)
    : [];

  // Track if currently saving to prevent double-clicks
  const [isSaving, setIsSaving] = useState(false);

  // Start timer
  const handleStart = (e) => {
    e.stopPropagation();
    setTimerRunning(true);
    saveTimerState(true, timerSeconds, Date.now() - (timerSeconds * 1000));
  };

  // Pause timer
  const handlePause = (e) => {
    e.stopPropagation();
    setTimerRunning(false);
    saveTimerState(false, timerSeconds);
  };

  // Discard timer
  const handleDiscard = (e) => {
    e.stopPropagation();
    if (timerSeconds > 0) {
      showConfirm(
        'Discard Time',
        'Are you sure you want to discard this timer?',
        () => {
          setTimerRunning(false);
          setTimerSeconds(0);
          setTimerClientId('');
          setTimerMatterId('');
          setTimerNarrative('');
          setLocalNarrative('');
          localStorage.removeItem('qanuni_timer');
          hideConfirm();
        }
      );
    } else {
      setTimerExpanded(false);
    }
  };

  // Actually save the timesheet
  const doSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const lawyer = lawyers.find(l => l.lawyer_id == timerLawyerId);
      const minutes = Math.ceil(timerSeconds / 60);
      
      const timesheetData = {
        lawyer_id: timerLawyerId || lawyers[0]?.lawyer_id || '',
        client_id: timerClientId,
        matter_id: timerMatterId,
        date: new Date().toISOString().split('T')[0],
        minutes: minutes,
        narrative: localNarrative || '',
        billable: true,
        rate_per_hour: lawyer?.hourly_rate || 0
      };

      await window.electronAPI.addTimesheet(timesheetData);
      await refreshTimesheets();
      
      // Reset timer
      setTimerRunning(false);
      setTimerSeconds(0);
      setTimerClientId('');
      setTimerMatterId('');
      setTimerNarrative('');
      setLocalNarrative('');
      setTimerExpanded(false);
      localStorage.removeItem('qanuni_timer');
      
      showToast('Time entry saved successfully');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      showToast('Error saving time entry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save to timesheet with narrative check
  const handleSave = (e) => {
    e.stopPropagation();
    
    if (!timerMatterId) {
      showToast('Please select a matter for this timer', 'error');
      return;
    }
    if (timerSeconds < 1) {
      showToast('No time recorded', 'error');
      return;
    }
    
    // Check if narrative is empty and prompt user
    if (!localNarrative || !localNarrative.trim()) {
      showConfirm(
        'No Description',
        'You haven\'t written a work description. Save without description?',
        () => {
          hideConfirm();
          doSave();
        }
      );
      return;
    }
    
    doSave();
  };

  // Update localStorage when dropdown fields change (not narrative - that would lag)
  useEffect(() => {
    if (timerClientId || timerMatterId || timerLawyerId) {
      const timerState = {
        clientId: timerClientId,
        matterId: timerMatterId,
        narrative: localNarrative,
        lawyerId: timerLawyerId,
        running: timerRunning,
        startTime: timerRunning ? Date.now() - (timerSeconds * 1000) : null,
        pausedSeconds: timerRunning ? 0 : timerSeconds
      };
      localStorage.setItem('qanuni_timer', JSON.stringify(timerState));
    }
  }, [timerClientId, timerMatterId, timerLawyerId, timerRunning]);

  // Save narrative to localStorage and parent state on blur (not on every keystroke)
  const handleNarrativeBlur = () => {
    // Sync to parent state
    setTimerNarrative(localNarrative);
    // Save to localStorage
    const saved = localStorage.getItem('qanuni_timer');
    if (saved) {
      const timerState = JSON.parse(saved);
      timerState.narrative = localNarrative;
      localStorage.setItem('qanuni_timer', JSON.stringify(timerState));
    }
  };

  // Minimized view (floating button)
  if (!timerExpanded) {
    return (
      <button
        onClick={() => setTimerExpanded(true)}
        className={`fixed bottom-20 right-4 z-40 p-4 rounded-full shadow-lg transition-all hover:scale-105 ${
          timerRunning 
            ? 'bg-green-500 text-white animate-pulse' 
            : timerSeconds > 0 
              ? 'bg-yellow-500 text-white' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={timerRunning ? `Timer Running: ${formatTime(timerSeconds)}` : 'Timer'}
      >
        <Timer className="w-6 h-6" />
        {(timerRunning || timerSeconds > 0) && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
            {formatTime(timerSeconds)}
          </span>
        )}
      </button>
    );
  }

  // Expanded view
  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 bg-white rounded-lg shadow-2xl border">
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${timerRunning ? 'bg-green-50' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <Timer className={`w-5 h-5 ${timerRunning ? 'text-green-600' : 'text-gray-600'}`} />
          <span className="font-semibold">Quick Timer</span>
          {timerRunning && (
            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              Running
            </span>
          )}
          {!timerRunning && timerSeconds > 0 && (
            <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
              Paused
            </span>
          )}
        </div>
        <button onClick={() => setTimerExpanded(false)} className="p-1 hover:bg-gray-200 rounded">
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Timer Display */}
      <div className="p-4 text-center bg-gradient-to-b from-gray-50 to-white">
        <div className={`text-4xl font-mono font-bold ${timerRunning ? 'text-green-600' : 'text-gray-800'}`}>
          {formatTime(timerSeconds)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 p-3 border-t border-b bg-gray-50">
        {!timerRunning ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            <Play className="w-4 h-4" />
            {timerSeconds > 0 ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}
        {timerSeconds > 0 && (
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
          >
            <Square className="w-4 h-4" />
            Discard
          </button>
        )}
      </div>

      {/* Form Fields */}
      <div className="p-3 space-y-3">
        {/* Lawyer */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lawyer</label>
          <select
            value={timerLawyerId}
            onChange={(e) => setTimerLawyerId(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border rounded-md"
          >
            <option value="">-- Select --</option>
            {lawyers.map(lawyer => (
              <option key={lawyer.lawyer_id} value={lawyer.lawyer_id}>
                {lawyer.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Client */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
          <select
            value={timerClientId}
            onChange={(e) => { setTimerClientId(e.target.value); setTimerMatterId(''); }}
            className="w-full px-2 py-1.5 text-sm border rounded-md"
          >
            <option value="">-- Select Client --</option>
            {clients.map(client => (
              <option key={client.client_id} value={client.client_id}>
                {client.client_name}
              </option>
            ))}
          </select>
        </div>

        {/* Matter */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Matter *</label>
          <select
            value={timerMatterId}
            onChange={(e) => setTimerMatterId(e.target.value)}
            disabled={!timerClientId}
            className={`w-full px-2 py-1.5 text-sm border rounded-md ${!timerClientId ? 'bg-gray-100' : ''}`}
          >
            <option value="">{timerClientId ? '-- Select Matter --' : 'Select client first'}</option>
            {filteredMatters.map(matter => (
              <option key={matter.matter_id} value={matter.matter_id}>
                {`${matter.matter_name}${matter.case_number ? ' – ' + matter.case_number : ''}${matter.court_name ? ' – ' + matter.court_name : ''}`}
              </option>
            ))}
          </select>
        </div>

        {/* Narrative */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Narrative</label>
          {timerRunning ? (
            <div className="w-full px-2 py-3 text-sm border rounded-md bg-gray-50 text-gray-400 italic">
              Pause timer to write description
            </div>
          ) : (
            <textarea
              value={localNarrative}
              onChange={(e) => setLocalNarrative(e.target.value)}
              onBlur={handleNarrativeBlur}
              placeholder="Work description"
              rows="2"
              className="w-full px-2 py-1.5 text-sm border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="p-3 border-t bg-gray-50">
        <button
          onClick={handleSave}
          disabled={!timerMatterId || timerSeconds < 1 || timerRunning || isSaving}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
            timerMatterId && timerSeconds >= 1 && !timerRunning && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : timerRunning ? (
            <>
              <Save className="w-4 h-4" />
              Pause timer first
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Time ({timerSeconds < 60 
                ? `${timerSeconds}s` 
                : `${Math.ceil(timerSeconds / 60)} min`})
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TimerWidget;
