import { useEffect, useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_STORAGE_KEY = 'sample-automation-tour-completed';

interface SampleAutomationTourProps {
  /** If true, the tour will start automatically on first visit */
  autoStart?: boolean;
  /** Callback when tour is completed or skipped */
  onTourEnd?: () => void;
}

// Tour step definitions
const tourSteps = [
  {
    element: '.page-header',
    popover: {
      title: 'Welcome to Sample Automation',
      description:
        'This tool helps you upload, merge, and process sample files in just 3 easy steps. Let\'s walk through how it works!',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '.workflow-step:nth-child(1) .step-header',
    popover: {
      title: 'Step 1: Configuration & Upload',
      description:
        'Start by selecting your project and vendor, then upload your sample files. Click the step header to expand or collapse it.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '.config-grid',
    popover: {
      title: 'Configure Your Settings',
      description:
        'Select the project, vendor, and optionally set an age base date and file ID. The client is automatically populated based on your project selection.',
      side: 'bottom' as const,
      align: 'center' as const,
    },
  },
  {
    element: '.drop-zone',
    popover: {
      title: 'Upload Your Files',
      description:
        'Drag and drop your files here, or click to browse. Supports CSV, XLSX, JSON, and TXT formats. You can upload multiple files at once.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
  {
    element: '.workflow-step:nth-child(2) .step-header',
    popover: {
      title: 'Step 2: Review Headers',
      description:
        'After uploading files, review and map your column headers. The system will attempt to auto-match headers to known fields.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '.workflow-step:nth-child(3) .step-header',
    popover: {
      title: 'Step 3: Results & Export',
      description:
        'Once processed, view your results here. You can see the created table, preview data, configure sample splits, and set up computed variables.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
];

export const useSampleAutomationTour = ({
  autoStart = true,
  onTourEnd,
}: SampleAutomationTourProps = {}) => {
  // Check if tour has been completed before
  const hasCompletedTour = useCallback(() => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
  }, []);

  // Mark tour as completed
  const markTourCompleted = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  }, []);

  // Reset tour (for "show again" functionality)
  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }, []);

  // Create and configure the driver instance
  const createDriver = useCallback((): Driver => {
    return driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'sample-automation-tour-popover',
      steps: tourSteps,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done',
      progressText: '{{current}} of {{total}}',
      onDestroyed: () => {
        markTourCompleted();
        onTourEnd?.();
      },
    });
  }, [markTourCompleted, onTourEnd]);

  // Start the tour
  const startTour = useCallback(() => {
    const driverInstance = createDriver();
    // Small delay to ensure DOM elements are rendered
    setTimeout(() => {
      driverInstance.drive();
    }, 100);
  }, [createDriver]);

  // Auto-start tour on first visit
  useEffect(() => {
    if (autoStart && !hasCompletedTour()) {
      // Delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        startTour();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompletedTour, startTour]);

  return {
    startTour,
    resetTour,
    hasCompletedTour,
    markTourCompleted,
  };
};

export default useSampleAutomationTour;
