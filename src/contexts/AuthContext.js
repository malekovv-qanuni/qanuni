import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, { setAuthToken, logout as logoutClearTokens } from '../api-client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // On mount: check for existing token, validate with /me
  useEffect(() => {
    const checkAuth = async () => {
      // In Electron mode, skip auth (license-based)
      if (apiClient.isElectron) {
        setUser({ role: 'admin', full_name: 'Desktop User' });
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('saas_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.getMe();
        if (response.success && response.user) {
          setUser(response.user);
          setIsAuthenticated(true);
        } else {
          logoutClearTokens();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logoutClearTokens();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await apiClient.login(email, password);
    if (response.success && response.user) {
      setUser(response.user);
      setIsAuthenticated(true);
    }
    return response;
  }, []);

  const register = useCallback(async (email, password, firm_name, full_name) => {
    const response = await apiClient.register(email, password, firm_name, full_name);
    if (response.success && response.user) {
      setUser(response.user);
      setIsAuthenticated(true);
    }
    return response;
  }, []);

  const logout = useCallback(() => {
    logoutClearTokens();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
