import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import { ContextProviders } from './contexts';
import { LoginPage, RegisterPage, ForgotPasswordPage, ProtectedRoute } from './components/auth';

const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

const root = ReactDOM.createRoot(document.getElementById('root'));

if (isElectron) {
  // Electron mode: no router, no auth pages
  root.render(
    <React.StrictMode>
      <ContextProviders>
        <App />
      </ContextProviders>
    </React.StrictMode>
  );
} else {
  // SaaS mode: BrowserRouter with auth pages + protected app
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <ContextProviders>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<App />} />
            </Route>
          </Routes>
        </ContextProviders>
      </BrowserRouter>
    </React.StrictMode>
  );
}
