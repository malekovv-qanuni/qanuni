import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const TimerContext = createContext(null);

export const TimerProvider = ({ children }) => {
  // Timer widget state
  const [timerExpanded, setTimerExpanded] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerClientId, setTimerClientId] = useState('');
  const [timerMatterId, setTimerMatterId] = useState('');
  const [timerNarrative, setTimerNarrative] = useState('');
  const [timerLawyerId, setTimerLawyerId] = useState('');
  const timerIntervalRef = useRef(null);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem('qanuni_timer');
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        setTimerClientId(parsed.clientId || '');
        setTimerMatterId(parsed.matterId || '');
        setTimerNarrative(parsed.narrative || '');
        setTimerLawyerId(parsed.lawyerId || '');

        // If timer was running, calculate elapsed time since startTime
        if (parsed.running && parsed.startTime) {
          const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000) + (parsed.pausedSeconds || 0);
          setTimerSeconds(elapsed);
          setTimerRunning(true);
          setTimerExpanded(true);
        } else {
          setTimerSeconds(parsed.pausedSeconds || 0);
        }
      } catch (e) {
        console.error('Error loading timer state:', e);
      }
    }
  }, []);

  // Save timer state to localStorage
  const saveTimerState = useCallback((running, seconds, startTime = null) => {
    const timerState = {
      clientId: timerClientId,
      matterId: timerMatterId,
      narrative: timerNarrative,
      lawyerId: timerLawyerId,
      running,
      startTime: running ? (startTime || Date.now()) : null,
      pausedSeconds: running ? 0 : seconds
    };
    localStorage.setItem('qanuni_timer', JSON.stringify(timerState));
  }, [timerClientId, timerMatterId, timerNarrative, timerLawyerId]);

  // Timer interval effect
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning]);

  const value = {
    // State
    timerExpanded,
    setTimerExpanded,
    timerRunning,
    setTimerRunning,
    timerSeconds,
    setTimerSeconds,
    timerClientId,
    setTimerClientId,
    timerMatterId,
    setTimerMatterId,
    timerNarrative,
    setTimerNarrative,
    timerLawyerId,
    setTimerLawyerId,

    // Functions
    saveTimerState
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
};
