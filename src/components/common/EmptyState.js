import React from 'react';
import { Plus } from 'lucide-react';

const EmptyState = ({ type, title, description, actionLabel, onAction }) => {
  // SVG illustrations for different types
  const illustrations = {
    clients: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="35" r="20" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M20 85 C20 65 35 55 50 55 C65 55 80 65 80 85" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="75" cy="30" r="12" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" fill="none"/>
        <path d="M69 30 L81 30 M75 24 L75 36" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    matters: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="20" width="50" height="65" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="35" y="15" width="50" height="65" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="45" y1="30" x2="75" y2="30" stroke="currentColor" strokeWidth="2"/>
        <line x1="45" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="2"/>
        <line x1="45" y1="50" x2="65" y2="50" stroke="currentColor" strokeWidth="2"/>
        <circle cx="78" cy="70" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" fill="none"/>
        <path d="M72 70 L84 70 M78 64 L78 76" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    hearings: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="55" width="60" height="8" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="35" r="18" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="45" y="65" width="10" height="20" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M30 35 L40 45 L60 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    ),
    tasks: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="15" width="60" height="70" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="30" y="30" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="50" y1="36" x2="70" y2="36" stroke="currentColor" strokeWidth="2"/>
        <rect x="30" y="50" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="50" y1="56" x2="65" y2="56" stroke="currentColor" strokeWidth="2"/>
        <rect x="30" y="70" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" fill="none"/>
        <path d="M33 76 L39 82 M39 76 L33 82" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      </svg>
    ),
    timesheets: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="50" r="3" fill="currentColor"/>
        <line x1="50" y1="50" x2="50" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="68" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="18" x2="50" y2="22" stroke="currentColor" strokeWidth="2"/>
        <line x1="50" y1="78" x2="50" y2="82" stroke="currentColor" strokeWidth="2"/>
        <line x1="18" y1="50" x2="22" y2="50" stroke="currentColor" strokeWidth="2"/>
        <line x1="78" y1="50" x2="82" y2="50" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    invoices: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="10" width="60" height="80" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="30" y1="25" x2="70" y2="25" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="40" x2="55" y2="40" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="50" x2="60" y2="50" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="60" x2="50" y2="60" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="75" x2="70" y2="75" stroke="currentColor" strokeWidth="2"/>
        <text x="60" y="78" fontSize="12" fill="currentColor" fontWeight="bold">$</text>
      </svg>
    ),
    expenses: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="30" width="70" height="45" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="15" y="30" width="70" height="15" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="58" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <text x="46" y="63" fontSize="14" fill="currentColor" fontWeight="bold">$</text>
      </svg>
    ),
    appointments: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="20" width="70" height="65" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="15" y1="35" x2="85" y2="35" stroke="currentColor" strokeWidth="2"/>
        <line x1="30" y1="15" x2="30" y2="25" stroke="currentColor" strokeWidth="2"/>
        <line x1="70" y1="15" x2="70" y2="25" stroke="currentColor" strokeWidth="2"/>
        <rect x="25" y="45" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <rect x="45" y="45" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none"/>
        <rect x="25" y="65" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    judgments: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 15 L50 40" stroke="currentColor" strokeWidth="2"/>
        <path d="M30 40 L70 40" stroke="currentColor" strokeWidth="3"/>
        <path d="M20 45 L40 45 L35 65 L25 65 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M60 45 L80 45 L75 65 L65 65 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="42" y="70" width="16" height="20" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="35" y="88" width="30" height="5" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    ),
    advances: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="25" width="60" height="50" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="2" fill="none"/>
        <text x="44" y="56" fontSize="18" fill="currentColor" fontWeight="bold">$</text>
        <path d="M50 20 L50 10 L60 17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    default: (
      <svg className="w-32 h-32 text-gray-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="60" height="60" rx="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="50" y1="35" x2="50" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="50" cy="65" r="3" fill="currentColor"/>
      </svg>
    )
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {illustrations[type] || illustrations.default}
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
