// ============================================
// PRINT STYLES COMPONENT - Qanuni Legal ERP
// ============================================
// Global print styles for invoices and reports
// 
// Usage:
//   import PrintStyles from './components/common/PrintStyles';
//   <PrintStyles />
// ============================================

import React from 'react';

const PrintStyles = () => (
  <style>{`
    @media print {
      /* Hide non-printable elements */
      .no-print, 
      button, 
      nav, 
      .sidebar,
      [class*="fixed inset-0 bg-black"] {
        display: none !important;
      }
      
      /* Reset modal for print */
      .print-invoice {
        position: static !important;
        background: white !important;
        box-shadow: none !important;
        max-height: none !important;
        overflow: visible !important;
        padding: 0 !important;
      }
      
      .print-invoice > div {
        max-width: 100% !important;
        max-height: none !important;
        overflow: visible !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      
      /* Invoice styling for print */
      .invoice-header {
        border-bottom: 2px solid #333 !important;
        padding-bottom: 1rem !important;
        margin-bottom: 1rem !important;
      }
      
      .invoice-table {
        border-collapse: collapse !important;
        width: 100% !important;
      }
      
      .invoice-table th,
      .invoice-table td {
        border: 1px solid #ddd !important;
        padding: 8px !important;
      }
      
      .invoice-table th {
        background-color: #f5f5f5 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Page settings */
      @page {
        margin: 1cm;
        size: A4;
      }
      
      body {
        font-size: 12pt !important;
        line-height: 1.4 !important;
      }
      
      /* Ensure proper page breaks */
      .page-break-before {
        page-break-before: always;
      }
      
      .avoid-break {
        page-break-inside: avoid;
      }
    }
  `}</style>
);

export default PrintStyles;
