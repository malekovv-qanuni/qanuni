// ============================================
// GUIDED TOUR COMPONENT
// Version: v46.50 - Interactive app walkthrough
// ============================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, HelpCircle, SkipForward, RotateCcw } from 'lucide-react';

// ============================================
// TOUR DEFINITIONS
// ============================================
const TOURS = {
  // General app overview tour
  general: {
    id: 'general',
    name: 'App Overview',
    description: 'Get familiar with Qanuni\'s main features and navigation',
    steps: [
      {
        target: '[data-tour="sidebar"]',
        title: 'Welcome to Qanuni!',
        content: 'This is your legal practice management system. Let\'s walk through the main sections so you know where everything is.',
        position: 'right',
        highlight: false
      },
      {
        target: '[data-tour="nav-dashboard"]',
        title: 'Dashboard',
        content: 'Your home base. See upcoming hearings, pending tasks, deadlines, and key statistics at a glance. Widgets are customizable — drag to reorder or toggle visibility.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-calendar"]',
        title: 'Calendar',
        content: 'Visual calendar showing all hearings, appointments, tasks, and deadlines. Switch between month, week, and day views.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-clients"]',
        title: 'Clients',
        content: 'Your client database. Add individuals or legal entities (companies). You can also bulk import clients from Excel.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-matters"]',
        title: 'Matters (Cases)',
        content: 'Track all legal matters linked to clients. Each matter has its own hearings, tasks, time entries, and invoices. Supports appeals and related matters.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-hearings"]',
        title: 'Hearings',
        content: 'Manage court hearings with dates, court types, purposes, and outcomes. Hearings auto-appear on your calendar.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-judgments"]',
        title: 'Judgments',
        content: 'Record court judgments, outcomes, and appeal deadlines. The system auto-generates deadline reminders for appeal periods.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-deadlines"]',
        title: 'Deadlines',
        content: 'Critical dates tracker. Auto-generated from judgments (appeal deadlines) or manually added. Color-coded by urgency.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-companies"]',
        title: 'Companies (Corporate Secretary)',
        content: 'Corporate governance hub for legal entity clients. Manage shareholders, directors, board meetings, commercial register filings, and compliance tracking.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-tasks"]',
        title: 'Tasks',
        content: 'Assign and track work items. Tasks can be linked to matters or hearings, with priority levels and due dates.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-timesheets"]',
        title: 'Timesheets',
        content: 'Log billable hours. Use the floating timer (Ctrl+T) for live time tracking, or enter time manually. Time entries flow directly into invoices.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-expenses"]',
        title: 'Expenses',
        content: 'Track client-billable and firm expenses. Expenses can be deducted from advance payments and included in invoices.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-advances"]',
        title: 'Payments Received',
        content: 'Manage retainers, expense advances, and other client payments. Track balances and automatic deductions when expenses are logged.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-invoices"]',
        title: 'Invoices',
        content: 'Generate professional invoices from time entries and expenses. Supports VAT, discounts, retainer deductions, and PDF export in English and Arabic.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-reports"]',
        title: 'Reports',
        content: 'Comprehensive reports including client statements, case status reports, Client 360° views, and corporate reports. Export to PDF or Excel.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-conflict-check"]',
        title: 'Conflict Check',
        content: 'Search across all clients, matters, and parties to check for potential conflicts of interest before taking on new work.',
        position: 'right'
      },
      {
        target: '[data-tour="nav-settings"]',
        title: 'Settings',
        content: 'Configure firm details, default rates, lookup tables (court types, regions, expense categories), and backup settings.',
        position: 'right'
      },
      {
        target: '[data-tour="language-toggle"]',
        title: 'Language Toggle',
        content: 'Switch between English and Arabic. The entire interface supports RTL layout for Arabic mode.',
        position: 'bottom'
      },
      {
        target: '[data-tour="timer-fab"]',
        title: 'Billing Timer',
        content: 'Quick-access timer for tracking billable hours. Click to expand, select client/matter, and start timing. Press Ctrl+T as a shortcut. Time is saved even if you close the app.',
        position: 'left'
      }
    ]
  },

  // Clients section tour
  clients: {
    id: 'clients',
    name: 'Clients Guide',
    description: 'Learn how to manage your client database',
    module: 'clients',
    steps: [
      {
        target: '[data-tour="clients-header"]',
        title: 'Client Management',
        content: 'This is your client database. All individuals and companies you work with are managed here.',
        position: 'bottom'
      },
      {
        target: '[data-tour="add-client-btn"]',
        title: 'Add Client',
        content: 'Click here to add a new client. You\'ll fill in their details including contact info, billing preferences, and type (individual or legal entity).',
        position: 'bottom'
      },
      {
        target: '[data-tour="import-btn"]',
        title: 'Import from Excel',
        content: 'Bulk import clients from an Excel spreadsheet. Download the template first, fill it in, then import. Great for migrating from another system.',
        position: 'bottom'
      },
      {
        target: '[data-tour="client-search"]',
        title: 'Search & Filter',
        content: 'Quickly find clients by name. The search works in both English and Arabic.',
        position: 'bottom'
      },
      {
        target: '[data-tour="client-list"]',
        title: 'Client List',
        content: 'Your clients are listed here with key details. Click Edit to modify, or Delete to soft-delete (recoverable from Trash). Legal Entity clients also appear under Companies section.',
        position: 'top'
      }
    ]
  },

  // Matters section tour
  matters: {
    id: 'matters',
    name: 'Matters Guide',
    description: 'Learn how to manage legal matters and cases',
    module: 'matters',
    steps: [
      {
        target: '[data-tour="matters-header"]',
        title: 'Matter Management',
        content: 'Matters (cases) are the core of your practice. Each matter is linked to a client and tracks the entire lifecycle from opening to resolution.',
        position: 'bottom'
      },
      {
        target: '[data-tour="add-matter-btn"]',
        title: 'Add Matter',
        content: 'Create a new matter. You\'ll select the client, assign lawyers, choose court type, and set up fee arrangements (hourly, flat fee, contingency, etc.).',
        position: 'bottom'
      },
      {
        target: '[data-tour="matter-list"]',
        title: 'Matter List',
        content: 'Each matter shows its client, status, court type, and stage. Matters support appeals — when a judgment is appealed, a linked appeal matter is automatically created.',
        position: 'top'
      }
    ]
  },

  // Hearings section tour
  hearings: {
    id: 'hearings',
    name: 'Hearings Guide',
    description: 'Learn how to track court hearings',
    module: 'hearings',
    steps: [
      {
        target: '[data-tour="hearings-header"]',
        title: 'Hearing Management',
        content: 'Track all your court appearances. Hearings are linked to matters and automatically appear on your calendar.',
        position: 'bottom'
      },
      {
        target: '[data-tour="add-hearing-btn"]',
        title: 'Add Hearing',
        content: 'Schedule a new hearing. Select the matter, set date/time, choose the purpose (argument, evidence, pleading, etc.), and add notes.',
        position: 'bottom'
      },
      {
        target: '[data-tour="hearing-list"]',
        title: 'Hearing List',
        content: 'Hearings are color-coded by status. You can filter by date range, court type, and matter. Past hearings can have outcomes recorded.',
        position: 'top'
      }
    ]
  },

  // Billing workflow tour
  billing: {
    id: 'billing',
    name: 'Billing Workflow',
    description: 'Learn the complete billing cycle: time → expenses → invoices',
    steps: [
      {
        target: '[data-tour="nav-timesheets"]',
        title: 'Step 1: Log Time',
        content: 'Start by recording your billable hours. Use the floating timer for real-time tracking, or enter time manually after the fact. Each entry needs a client, matter, and narrative description.',
        position: 'right',
        navigateTo: 'nav-timesheets'
      },
      {
        target: '[data-tour="nav-expenses"]',
        title: 'Step 2: Record Expenses',
        content: 'Log any billable expenses — court fees, travel, filing costs, etc. Expenses can be auto-deducted from client advance payments.',
        position: 'right',
        navigateTo: 'nav-expenses'
      },
      {
        target: '[data-tour="nav-advances"]',
        title: 'Step 3: Track Payments',
        content: 'Record retainers and advance payments received from clients. These balances are tracked and can be applied when creating invoices.',
        position: 'right',
        navigateTo: 'nav-advances'
      },
      {
        target: '[data-tour="nav-invoices"]',
        title: 'Step 4: Generate Invoices',
        content: 'Create invoices by pulling in unbilled time entries and expenses for a client. The system calculates totals, applies retainer deductions, adds VAT, and generates professional PDF invoices.',
        position: 'right',
        navigateTo: 'nav-invoices'
      }
    ]
  },

  // Companies/Corporate tour
  companies: {
    id: 'companies',
    name: 'Corporate Secretary Guide',
    description: 'Learn corporate governance and compliance features',
    module: 'companies',
    steps: [
      {
        target: '[data-tour="companies-header"]',
        title: 'Corporate Secretary Module',
        content: 'This section manages corporate governance for your legal entity clients. Any client with type "Legal Entity" automatically appears here.',
        position: 'bottom'
      },
      {
        target: '[data-tour="entity-list"]',
        title: 'Company List',
        content: 'All your corporate clients are listed here. Yellow highlight means corporate details haven\'t been set up yet. Click a company to manage its full corporate profile.',
        position: 'top'
      }
    ]
  },

  // Timesheets tour
  timesheets: {
    id: 'timesheets',
    name: 'Time Tracking Guide',
    description: 'Learn how to track and bill your time',
    module: 'timesheets',
    steps: [
      {
        target: '[data-tour="timesheets-header"]',
        title: 'Time Tracking',
        content: 'Record all billable and non-billable time. Each entry is linked to a lawyer, client, and optionally a matter.',
        position: 'bottom'
      },
      {
        target: '[data-tour="add-timesheet-btn"]',
        title: 'Add Time Entry',
        content: 'Manually add a time entry. Enter the date, lawyer, client/matter, minutes worked, narrative description, and hourly rate.',
        position: 'bottom'
      },
      {
        target: '[data-tour="timer-fab"]',
        title: 'Live Timer',
        content: 'For real-time tracking, use this floating timer. Start it when you begin work, stop when you\'re done. The elapsed time is automatically converted to a timesheet entry. Shortcut: Ctrl+T.',
        position: 'left'
      },
      {
        target: '[data-tour="timesheet-list"]',
        title: 'Time Entry List',
        content: 'All entries are listed with status indicators. "Draft" entries can be edited freely. Once included in an invoice, they\'re marked as "Billed". Use filters to find specific entries.',
        position: 'top'
      }
    ]
  }
};

// ============================================
// TOUR MENU COMPONENT (accessible from Help or ? button)
// ============================================
const TourMenu = ({ isOpen, onClose, onStartTour, completedTours }) => {
  if (!isOpen) return null;

  const tourList = Object.values(TOURS);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Guided Tours</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Choose a tour to learn about different parts of Qanuni. You can retake any tour at any time.
          </p>
          <div className="space-y-2">
            {tourList.map(tour => {
              const isCompleted = completedTours.includes(tour.id);
              return (
                <button
                  key={tour.id}
                  onClick={() => onStartTour(tour.id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {tour.name}
                        {isCompleted && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Completed</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{tour.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => {
                localStorage.removeItem('qanuni_completed_tours');
                onClose();
              }}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset all tour progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SPOTLIGHT OVERLAY COMPONENT
// ============================================
const GuidedTour = ({ tourId, onEnd, onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);

  const tour = TOURS[tourId];
  if (!tour) return null;

  const steps = tour.steps;
  const step = steps[currentStep];

  // Find and measure the target element
  const updateTarget = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      });

      // Scroll element into view if needed
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!isVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Recalculate after scroll
        setTimeout(() => {
          const newRect = el.getBoundingClientRect();
          setTargetRect({
            top: newRect.top - padding,
            left: newRect.left - padding,
            width: newRect.width + padding * 2,
            height: newRect.height + padding * 2
          });
        }, 400);
      }
    } else {
      // If element not found, show tooltip in center
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    setIsTransitioning(true);
    // If step has navigateTo, click that nav button first
    if (step?.navigateTo) {
      const navBtn = document.querySelector(`[data-tour="${step.navigateTo}"]`);
      if (navBtn) navBtn.click();
    }
    const timer = setTimeout(() => {
      updateTarget();
      setIsTransitioning(false);
    }, step?.navigateTo ? 300 : 150);

    // Also recalculate on resize
    window.addEventListener('resize', updateTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTarget);
    };
  }, [currentStep, updateTarget]);

  // Calculate tooltip position
  useEffect(() => {
    if (!step) return;

    const calculatePosition = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const pos = step.position || 'bottom';
      const gap = 16;
      let style = {};

      if (!targetRect) {
        // Center on screen if no target
        style = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
      } else {
        switch (pos) {
          case 'right':
            style = {
              top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
              left: targetRect.left + targetRect.width + gap
            };
            // If goes off right edge, put on left
            if (style.left + tooltipRect.width > window.innerWidth - 20) {
              style.left = targetRect.left - tooltipRect.width - gap;
            }
            break;
          case 'left':
            style = {
              top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
              left: targetRect.left - tooltipRect.width - gap
            };
            if (style.left < 20) {
              style.left = targetRect.left + targetRect.width + gap;
            }
            break;
          case 'bottom':
            style = {
              top: targetRect.top + targetRect.height + gap,
              left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
            };
            if (style.top + tooltipRect.height > window.innerHeight - 20) {
              style.top = targetRect.top - tooltipRect.height - gap;
            }
            break;
          case 'top':
            style = {
              top: targetRect.top - tooltipRect.height - gap,
              left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
            };
            if (style.top < 20) {
              style.top = targetRect.top + targetRect.height + gap;
            }
            break;
        }

        // Clamp to viewport
        if (style.left < 20) style.left = 20;
        if (style.left + tooltipRect.width > window.innerWidth - 20) {
          style.left = window.innerWidth - tooltipRect.width - 20;
        }
        if (style.top < 20) style.top = 20;
        if (style.top + tooltipRect.height > window.innerHeight - 20) {
          style.top = window.innerHeight - tooltipRect.height - 20;
        }
      }

      setTooltipStyle(style);
    };

    // Small delay to let tooltip render first
    const timer = setTimeout(calculatePosition, 50);
    return () => clearTimeout(timer);
  }, [targetRect, step, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleEnd();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleEnd = () => {
    // Save completion
    const completed = JSON.parse(localStorage.getItem('qanuni_completed_tours') || '[]');
    if (!completed.includes(tourId)) {
      completed.push(tourId);
      localStorage.setItem('qanuni_completed_tours', JSON.stringify(completed));
    }
    onEnd();
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleEnd();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  // Build clip-path for spotlight hole
  const getClipPath = () => {
    if (!targetRect || step?.highlight === false) {
      return 'none'; // Full overlay, no hole
    }
    const { top, left, width, height } = targetRect;
    const r = 8; // border radius
    return `polygon(
      0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
      ${left + r}px ${top}px,
      ${left}px ${top + r}px,
      ${left}px ${top + height - r}px,
      ${left + r}px ${top + height}px,
      ${left + width - r}px ${top + height}px,
      ${left + width}px ${top + height - r}px,
      ${left + width}px ${top + r}px,
      ${left + width - r}px ${top}px,
      ${left + r}px ${top}px
    )`;
  };

  return (
    <div className="fixed inset-0 z-[9998]" ref={overlayRef}>
      {/* Dark overlay with spotlight hole */}
      <div
        className="absolute inset-0 bg-black transition-all duration-300"
        style={{
          opacity: isTransitioning ? 0.3 : 0.5,
          clipPath: getClipPath()
        }}
      />

      {/* Spotlight ring highlight */}
      {targetRect && step?.highlight !== false && (
        <div
          className="absolute border-2 border-blue-400 rounded-lg pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)'
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-lg shadow-2xl p-5 max-w-sm transition-all duration-300"
        style={{
          ...tooltipStyle,
          opacity: isTransitioning ? 0 : 1,
          zIndex: 9999
        }}
      >
        {/* Step counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">
            {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={handleEnd}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
            title="End tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{step?.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{step?.content}</p>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1 mb-4">
          <div
            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEnd}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TOUR HELP BUTTON (floating ? button)
// ============================================
const TourHelpButton = ({ onClick }) => (
  <button
    onClick={onClick}
    data-tour="help-btn"
    className="fixed bottom-40 right-6 w-10 h-10 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 flex items-center justify-center z-40 transition-transform hover:scale-110"
    title="Guided Tours"
  >
    <HelpCircle className="w-5 h-5" />
  </button>
);

// ============================================
// MAIN EXPORT: Tour Provider
// ============================================
const GuidedTourSystem = ({ currentModule }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [activeTourId, setActiveTourId] = useState(null);
  const [completedTours, setCompletedTours] = useState([]);
  const [hasCheckedFirstRun, setHasCheckedFirstRun] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Load completed tours
  useEffect(() => {
    const completed = JSON.parse(localStorage.getItem('qanuni_completed_tours') || '[]');
    setCompletedTours(completed);
  }, [showMenu]);

  // First-run check — show general tour on first launch
  useEffect(() => {
    if (hasCheckedFirstRun) return;
    setHasCheckedFirstRun(true);

    const completed = JSON.parse(localStorage.getItem('qanuni_completed_tours') || '[]');
    const hasSeenGeneral = completed.includes('general');
    const firstRunKey = 'qanuni_first_run_tour_offered';
    const offered = localStorage.getItem(firstRunKey);

    if (!hasSeenGeneral && !offered) {
      localStorage.setItem(firstRunKey, 'true');
      // Small delay to let the app render first
      setTimeout(() => {
        setShowWelcomeModal(true);
      }, 1000);
    }
  }, [hasCheckedFirstRun]);

  const handleStartTour = (tourId) => {
    setShowMenu(false);
    const tour = TOURS[tourId];
    // Navigate to the relevant module if tour has one
    if (tour?.module) {
      const navBtn = document.querySelector(`[data-tour="nav-${tour.module}"]`);
      if (navBtn) navBtn.click();
    }
    // Delay to let page render before starting tour
    setTimeout(() => {
      setActiveTourId(tourId);
    }, 300);
  };

  const handleEndTour = () => {
    setActiveTourId(null);
    const completed = JSON.parse(localStorage.getItem('qanuni_completed_tours') || '[]');
    setCompletedTours(completed);
  };

  return (
    <>
      {/* Welcome modal for first-run (replaces window.confirm to avoid focus issues) */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h2 className="text-xl font-bold mb-2">Welcome to Qanuni!</h2>
            <p className="text-gray-600 mb-6">Would you like a quick tour of the app?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowWelcomeModal(false);
                  setActiveTourId('general');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Take the Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating help button */}
      <TourHelpButton onClick={() => setShowMenu(true)} />

      {/* Tour selection menu */}
      <TourMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        onStartTour={handleStartTour}
        completedTours={completedTours}
      />

      {/* Active tour overlay */}
      {activeTourId && (
        <GuidedTour
          tourId={activeTourId}
          onEnd={handleEndTour}
        />
      )}
    </>
  );
};

export { GuidedTourSystem, TOURS };
export default GuidedTourSystem;
