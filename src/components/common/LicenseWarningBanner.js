/**
 * LicenseWarningBanner.js
 * Shows warning banner when license is about to expire or in grace period
 * 
 * Place in: src/components/LicenseWarningBanner.js
 */

import React, { useState } from 'react';

const LicenseWarningBanner = ({ 
  warning, 
  warningLevel, 
  daysUntilExpiry, 
  isGracePeriod,
  expiresAt,
  isArabic = false,
  onDismiss 
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !warning) return null;

  // Translations
  const t = {
    renewNow: isArabic ? 'تجديد الآن' : 'Renew Now',
    dismiss: isArabic ? 'إغلاق' : 'Dismiss',
    gracePeriodTitle: isArabic ? 'فترة السماح' : 'Grace Period',
    expiringTitle: isArabic ? 'انتهاء الترخيص قريباً' : 'License Expiring Soon',
    contact: isArabic ? 'تواصل مع الدعم للتجديد' : 'Contact support to renew'
  };

  // Determine colors based on warning level
  const styles = {
    critical: {
      bg: 'bg-red-900/90',
      border: 'border-red-700',
      text: 'text-red-100',
      icon: '⚠️',
      pulse: true
    },
    warning: {
      bg: 'bg-amber-900/90',
      border: 'border-amber-700',
      text: 'text-amber-100',
      icon: '⏰',
      pulse: false
    },
    info: {
      bg: 'bg-blue-900/90',
      border: 'border-blue-700',
      text: 'text-blue-100',
      icon: 'ℹ️',
      pulse: false
    }
  };

  const style = styles[warningLevel] || styles.info;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div 
      className={`
        ${style.bg} ${style.border} ${style.text}
        border-b px-4 py-2 flex items-center justify-between
        ${style.pulse ? 'animate-pulse' : ''}
      `}
      style={{ direction: isArabic ? 'rtl' : 'ltr' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{style.icon}</span>
        <div>
          <span className="font-medium">
            {isGracePeriod ? t.gracePeriodTitle : t.expiringTitle}:
          </span>
          <span className="mx-2">{warning}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm opacity-75">{t.contact}</span>
        <button
          onClick={handleDismiss}
          className="px-3 py-1 text-sm rounded hover:bg-white/10 transition-colors"
        >
          {t.dismiss}
        </button>
      </div>
    </div>
  );
};

export default LicenseWarningBanner;
