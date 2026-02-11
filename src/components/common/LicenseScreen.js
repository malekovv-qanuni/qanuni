/**
 * LicenseScreen.js
 * Full-screen license activation UI shown when no valid license is found
 * 
 * Place in: src/components/LicenseScreen.js
 */

import React, { useState } from 'react';

const LicenseScreen = ({ 
  machineId, 
  onActivate, 
  error: initialError,
  isArabic = false 
}) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState(initialError || '');
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Translations
  const t = {
    title: isArabic ? 'تفعيل قانوني' : 'Activate Qanuni',
    subtitle: isArabic 
      ? 'أدخل مفتاح الترخيص الخاص بك للمتابعة'
      : 'Enter your license key to continue',
    machineIdLabel: isArabic ? 'معرف الجهاز' : 'Your Machine ID',
    machineIdHelp: isArabic 
      ? 'أرسل هذا المعرف إلى المزود للحصول على مفتاح الترخيص'
      : 'Send this ID to your provider to receive your license key',
    licenseKeyLabel: isArabic ? 'مفتاح الترخيص' : 'License Key',
    licenseKeyPlaceholder: isArabic 
      ? 'الصق مفتاح الترخيص هنا...'
      : 'Paste your license key here...',
    activateButton: isArabic ? 'تفعيل' : 'Activate',
    validating: isArabic ? 'جاري التحقق...' : 'Validating...',
    copyButton: isArabic ? 'نسخ' : 'Copy',
    copiedButton: isArabic ? 'تم النسخ!' : 'Copied!',
    contactSupport: isArabic 
      ? 'تواصل مع الدعم للحصول على المساعدة'
      : 'Contact support for assistance',
    version: 'v1.0.0'
  };

  const handleCopyMachineId = async () => {
    try {
      await navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError(isArabic ? 'الرجاء إدخال مفتاح الترخيص' : 'Please enter a license key');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      // Call the electron API to validate and save license
      const result = await window.electronAPI.validateLicense(licenseKey.trim());
      
      if (result.valid) {
        onActivate(result);
      } else {
        setError(result.error || (isArabic ? 'مفتاح ترخيص غير صالح' : 'Invalid license key'));
      }
    } catch (err) {
      setError(err.message || (isArabic ? 'خطأ في التحقق' : 'Validation error'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isValidating) {
      handleActivate();
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 50%, #1b263b 100%)',
        direction: isArabic ? 'rtl' : 'ltr'
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #2d4a6f 0%, #1e3a5f 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <span className="text-4xl font-bold text-amber-400">Q</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-gray-400">{t.subtitle}</p>
        </div>

        {/* Main Card */}
        <div 
          className="rounded-2xl p-6 space-y-6"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Machine ID Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t.machineIdLabel}
            </label>
            <div className="flex items-center gap-2">
              <div 
                className="flex-1 px-4 py-3 rounded-lg font-mono text-sm text-amber-400"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                {machineId}
              </div>
              <button
                onClick={handleCopyMachineId}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copied ? t.copiedButton : t.copyButton}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">{t.machineIdHelp}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* License Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t.licenseKeyLabel}
            </label>
            <textarea
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t.licenseKeyPlaceholder}
              rows={4}
              className="w-full px-4 py-3 rounded-lg font-mono text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              disabled={isValidating}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5'
              }}
            >
              {error}
            </div>
          )}

          {/* Activate Button */}
          <button
            onClick={handleActivate}
            disabled={isValidating || !licenseKey.trim()}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
              isValidating || !licenseKey.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700'
            }`}
            style={{
              boxShadow: isValidating || !licenseKey.trim() 
                ? 'none' 
                : '0 4px 14px rgba(217, 119, 6, 0.4)'
            }}
          >
            {isValidating ? t.validating : t.activateButton}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">{t.contactSupport}</p>
          <p className="text-gray-600 text-xs mt-2">Qanuni {t.version}</p>
        </div>
      </div>
    </div>
  );
};

export default LicenseScreen;
