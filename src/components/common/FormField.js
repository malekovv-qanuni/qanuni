import React from 'react';
import { AlertCircle } from 'lucide-react';

const FormField = ({ 
  label, 
  required, 
  error, 
  children, 
  hint,
  className = '' 
}) => (
  <div className={className}>
    <label className="block text-sm font-medium mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
    {hint && !error && (
      <p className="mt-1 text-sm text-gray-500">{hint}</p>
    )}
  </div>
);

export default FormField;
