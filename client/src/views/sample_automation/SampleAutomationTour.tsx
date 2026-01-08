import { useEffect, useCallback, useState, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_STORAGE_KEY = 'sample-automation-tour-completed';

// Step indices for special steps (0-indexed)
const STEP_1_HEADER = 3;        // Configuration & Upload header
const PROJECT_SELECT_STEP = 4;
const VENDOR_SELECT_STEP = 5;
const DROP_ZONE_STEP = 9;       // Upload Your Files step
const STEP_2_HEADER = 10;       // Header Review header
const HEADERS_SECTION = 11;     // Header Mapping Section (inside Step 2)
const PROCESS_ACTIONS = 16;     // Process Your Files step
const STEP_3_HEADER = 17;       // Results & Export header
const SAMPLE_CONFIG_HEADER = 21; // Sample Configuration header

interface SampleAutomationTourProps {
  /** If true, the tour will start automatically on first visit */
  autoStart?: boolean;
  /** Callback when tour is completed or skipped */
  onTourEnd?: () => void;
}

// Comprehensive tour step definitions
const tourSteps = [
  // Welcome
  {
    element: '[data-tour="page-header"]',
    popover: {
      title: 'Welcome to Sample Automation',
      description:
        'This tool helps you upload, merge, and process sample files for your projects. Follow this tour to learn how to use all the features.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="tour-button"]',
    popover: {
      title: 'Restart Tour Anytime',
      description:
        'You can click this button anytime to restart this guided tour if you need a refresher.',
      side: 'bottom' as const,
      align: 'end' as const,
    },
  },

  // Workflow Overview
  {
    element: '[data-tour="workflow-container"]',
    popover: {
      title: 'Three-Step Workflow',
      description:
        'The process is divided into 3 simple steps: Configure & Upload, Review Headers, and Results & Export. Let\'s walk through each one.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },

  // Step 1: Configuration
  {
    element: '[data-tour="step-1-header"]',
    popover: {
      title: 'Step 1: Configuration & Upload',
      description:
        'Click this header to expand or collapse the section. A checkmark appears when this step is complete.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    // Project select - menu will auto-open when this step is reached
    element: '[data-tour="project-select"]',
    popover: {
      title: 'Select a Project',
      description:
        'Choose the project you\'re working on from the dropdown list, then click Next.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    // Vendor select - menu will auto-open when this step is reached
    element: '[data-tour="vendor-select"]',
    popover: {
      title: 'Select a Vendor',
      description:
        'Choose the sample vendor from the dropdown list. This helps with header mapping. Click Next when done.',
      side: 'right' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="client-display"]',
    popover: {
      title: 'Client (Auto-populated)',
      description:
        'The client is automatically filled in based on your project selection. This is read-only.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="age-base-date"]',
    popover: {
      title: 'Age Base Date',
      description:
        'Select the reference date for calculating ages from birth years. January 1st or July 1st of the current year.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="file-id"]',
    popover: {
      title: 'File ID (Optional)',
      description:
        'Optionally specify a File ID. If left blank, one will be automatically assigned.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="drop-zone"]',
    popover: {
      title: 'Upload Your Files',
      description:
        'Drag and drop files here, or click to browse. Supports CSV, XLSX, JSON, and TXT formats. You can upload multiple files at once.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },

  // Step 2: Header Review
  {
    element: '[data-tour="step-2-header"]',
    popover: {
      title: 'Step 2: Review Headers',
      description:
        'After uploading files, this step lets you review and map column headers. The system will auto-match headers to known database fields.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="headers-section"]',
    popover: {
      title: 'Header Mapping Section',
      description:
        'This section shows all your uploaded files and their column headers. Headers are color-coded: green = mapped, red = unmapped, yellow = custom.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
  {
    element: '[data-tour="headers-stats"]',
    popover: {
      title: 'Header Statistics',
      description:
        'Quick overview of your files and header mapping status. Shows count of mapped, unmapped, and custom headers.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="headers-controls"]',
    popover: {
      title: 'Header Controls',
      description:
        'Filter headers by status, expand/collapse all files, toggle database saving, and allow extra headers that don\'t match across files.',
      side: 'bottom' as const,
      align: 'end' as const,
    },
  },
  {
    element: '[data-tour="lock-button"]',
    popover: {
      title: 'Database Lock',
      description:
        'When unlocked, your header mapping changes are saved to the database for future use. Keep locked to make temporary edits only.',
      side: 'bottom' as const,
      align: 'center' as const,
    },
  },
  {
    element: '[data-tour="file-list"]',
    popover: {
      title: 'File List',
      description:
        'Each uploaded file is shown here. Click to expand and see individual column mappings. Edit mappings by clicking the pencil icon.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
  {
    element: '[data-tour="process-actions"]',
    popover: {
      title: 'Process Your Files',
      description:
        'Once all headers are reviewed, click "Process Files" to merge and import your data. "Clear All" resets everything.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },

  // Step 3: Results
  {
    element: '[data-tour="step-3-header"]',
    popover: {
      title: 'Step 3: Results & Export',
      description:
        'After processing, this step shows your results including the created table, row counts, data preview, and export options.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="results-grid"]',
    popover: {
      title: 'Processing Results',
      description:
        'Summary cards showing: table name created, number of files processed, total rows, and rows successfully inserted.',
      side: 'bottom' as const,
      align: 'center' as const,
    },
  },
  {
    element: '[data-tour="data-preview"]',
    popover: {
      title: 'Data Preview',
      description:
        'Preview your imported data in a scrollable table. Shows column types and sample rows to verify the import.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
  // Sample Configuration Steps
  {
    element: '[data-tour="computed-variables-section"]',
    popover: {
      title: 'Custom Variables',
      description:
        'Add computed variables to your dataset. Create new columns based on formulas using existing data (e.g., combine fields, calculate values).',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="sample-config-header"]',
    popover: {
      title: 'Sample Configuration',
      description:
        'Click to expand the sample configuration panel. Here you can configure output options, file types, and variable selection.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="output-mode-section"]',
    popover: {
      title: 'Output Mode',
      description:
        'Choose "All Records" for a single output file, or "Landline & Cell Split" to automatically separate records based on phone type and age ranges.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="file-type-section"]',
    popover: {
      title: 'File Type',
      description:
        'Select whether to output as a Landline (LSAM) or Cell (CSAM) file. This determines the $N column value and output filename prefix.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="householding-section"]',
    popover: {
      title: 'Householding',
      description:
        'Enable householding to remove duplicate phone numbers from landline records, keeping only one record per household.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
  {
    element: '[data-tour="variable-selection-section"]',
    popover: {
      title: 'Variable Selection',
      description:
        'Select which columns to include in your output file. Use "Select All" or click individual variables to customize.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
  {
    element: '[data-tour="callid-section"]',
    popover: {
      title: 'CallID Assignment',
      description:
        'Shows the automatically assigned CallIDs for your sample. These phone numbers are used for caller ID display during dialing.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },
  {
    element: '[data-tour="extract-section"]',
    popover: {
      title: 'Extract Files',
      description:
        'Preview the output files and click "Extract Files" to generate your CSV files based on the current configuration.',
      side: 'top' as const,
      align: 'center' as const,
    },
  },

  // Conclusion
  {
    element: '[data-tour="page-header"]',
    popover: {
      title: 'You\'re All Set!',
      description:
        'That\'s the complete workflow! Remember: Configure → Upload → Review Headers → Process → Configure Sample. Click the Tour button anytime to see this guide again.',
      side: 'bottom' as const,
      align: 'start' as const,
    },
  },
];

export const useSampleAutomationTour = ({
  autoStart = true,
  onTourEnd,
}: SampleAutomationTourProps = {}) => {
  // Track if tour is currently active
  const [isTourActive, setIsTourActive] = useState(false);

  // Track which dropdown should be kept open (null, 'project', or 'vendor')
  const [keepMenuOpen, setKeepMenuOpen] = useState<'project' | 'vendor' | null>(null);

  // Store driver instance ref so we can call moveNext() from event listeners
  const driverRef = useRef<Driver | null>(null);

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

  // Shake the next button and show prompt
  const shakeNextButton = useCallback((message: string) => {
    const nextBtn = document.querySelector('.driver-popover-next-btn') as HTMLElement;
    const popover = document.querySelector('.driver-popover') as HTMLElement;

    if (nextBtn) {
      // Add shake animation
      nextBtn.classList.add('shake');
      setTimeout(() => nextBtn.classList.remove('shake'), 500);
    }

    // Show or update the prompt message
    if (popover) {
      let prompt = popover.querySelector('.tour-action-prompt') as HTMLElement;
      if (!prompt) {
        prompt = document.createElement('div');
        prompt.className = 'tour-action-prompt';
        const footer = popover.querySelector('.driver-popover-footer');
        if (footer) {
          footer.insertBefore(prompt, footer.firstChild);
        }
      }
      prompt.textContent = message;
      prompt.classList.add('visible');

      // Hide prompt after 3 seconds
      setTimeout(() => prompt.classList.remove('visible'), 3000);
    }
  }, []);

  // Create and configure the driver instance
  const createDriver = useCallback((): Driver => {
    return driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      // Allow clicking on highlighted elements without closing tour
      allowKeyboardControl: true,
      disableActiveInteraction: false, // Allow interaction with highlighted element
      stagePadding: 10,
      stageRadius: 8,
      popoverClass: 'sample-automation-tour-popover',
      steps: tourSteps,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Finish',
      progressText: '{{current}} of {{total}}',
      onNextClick: () => {
        const stepIndex = driverRef.current?.getActiveIndex() ?? -1;

        // Check if sections need to be expanded first (shake and prompt if not)
        if (stepIndex === STEP_1_HEADER) {
          // Check if Step 1 content is expanded
          const step1Content = document.querySelector('[data-tour="step-1-header"]')?.closest('.workflow-step')?.querySelector('.step-content');
          if (!step1Content) {
            shakeNextButton('Click the section header to expand it');
            return;
          }
        } else if (stepIndex === STEP_2_HEADER) {
          // Check if Step 2 content is expanded
          const step2Content = document.querySelector('[data-tour="step-2-header"]')?.closest('.workflow-step')?.querySelector('.step-content');
          if (!step2Content) {
            shakeNextButton('Click the section header to expand it');
            return;
          }
        } else if (stepIndex === HEADERS_SECTION) {
          // Check if at least one file in the file-list is expanded (has headers-content visible)
          const expandedFileContent = document.querySelector('[data-tour="file-list"] .headers-content');
          if (!expandedFileContent) {
            shakeNextButton('Click a file to expand and view its headers');
            return;
          }
        } else if (stepIndex === STEP_3_HEADER) {
          // Check if Step 3 content is expanded
          const step3Content = document.querySelector('[data-tour="step-3-header"]')?.closest('.workflow-step')?.querySelector('.step-content');
          if (!step3Content) {
            shakeNextButton('Click the section header to expand it');
            return;
          }
        } else if (stepIndex === SAMPLE_CONFIG_HEADER) {
          // Check if Sample Configuration content is expanded
          const sampleConfigContent = document.querySelector('[data-tour="sample-config-header"]')?.closest('.sample-split-container')?.querySelector('.sample-split-content');
          if (!sampleConfigContent) {
            shakeNextButton('Click the section header to expand it');
            return;
          }
        } else if (stepIndex === PROCESS_ACTIONS) {
          // Check if files have been processed (step 3 header gets 'completed' class when processResult.tableName exists)
          const step3Completed = document.querySelector('[data-tour="step-3-header"] .step-number.completed');
          if (!step3Completed) {
            shakeNextButton('Click the Process Files button to continue');
            return;
          }
        } else if (stepIndex === DROP_ZONE_STEP) {
          // Check if files have been uploaded (drop zone has files)
          const dropZoneHasFiles = document.querySelector('.drop-zone.has-files');
          if (!dropZoneHasFiles) {
            shakeNextButton('Please upload at least one file to continue');
            return;
          }
        }

        // Check if on dropdown steps and if a selection was made
        if (stepIndex === PROJECT_SELECT_STEP) {
          // Check if project is selected
          const projectSelect = document.querySelector('[data-tour="project-select"] .tourable-select__single-value');
          if (!projectSelect) {
            shakeNextButton('Please select a project from the dropdown');
            return; // Prevent advancing
          }
        } else if (stepIndex === VENDOR_SELECT_STEP) {
          // Check if vendor is selected
          const vendorSelect = document.querySelector('[data-tour="vendor-select"] .tourable-select__single-value');
          if (!vendorSelect) {
            shakeNextButton('Please select a vendor from the dropdown');
            return; // Prevent advancing
          }
        }

        // Allow advancing to next step
        driverRef.current?.moveNext();
      },
      onHighlightStarted: () => {
        // Pre-open dropdown menus when arriving at those steps
        // Use setTimeout to ensure driverRef is set
        setTimeout(() => {
          const stepIndex = driverRef.current?.getActiveIndex() ?? -1;
          console.log('[Tour Debug] onHighlightStarted, stepIndex:', stepIndex);

          if (stepIndex === PROJECT_SELECT_STEP) {
            console.log('[Tour Debug] Arriving at project select step, pre-opening menu');
            setKeepMenuOpen('project');
          } else if (stepIndex === VENDOR_SELECT_STEP) {
            console.log('[Tour Debug] Arriving at vendor select step, pre-opening menu');
            setKeepMenuOpen('vendor');
          } else {
            // Close any open menus when moving to other steps
            setKeepMenuOpen(null);
          }
        }, 0);
      },
      onDestroyed: () => {
        setIsTourActive(false);
        setKeepMenuOpen(null);
        driverRef.current = null;
        markTourCompleted();
        onTourEnd?.();
      },
    });
  }, [markTourCompleted, onTourEnd, shakeNextButton]);

  // Start the tour
  const startTour = useCallback(() => {
    const driverInstance = createDriver();
    driverRef.current = driverInstance;
    // Small delay to ensure DOM elements are rendered
    setTimeout(() => {
      setIsTourActive(true);
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

  // Auto-advance when required conditions are met
  useEffect(() => {
    if (!isTourActive) return;

    const checkAndAdvance = () => {
      const stepIndex = driverRef.current?.getActiveIndex() ?? -1;

      // Check conditions based on current step and auto-advance if met
      if (stepIndex === STEP_1_HEADER) {
        const step1Content = document.querySelector('[data-tour="step-1-header"]')?.closest('.workflow-step')?.querySelector('.step-content');
        if (step1Content) {
          driverRef.current?.moveNext();
        }
      } else if (stepIndex === STEP_2_HEADER) {
        const step2Content = document.querySelector('[data-tour="step-2-header"]')?.closest('.workflow-step')?.querySelector('.step-content');
        if (step2Content) {
          driverRef.current?.moveNext();
        }
      } else if (stepIndex === HEADERS_SECTION) {
        const expandedFileContent = document.querySelector('[data-tour="file-list"] .headers-content');
        if (expandedFileContent) {
          driverRef.current?.moveNext();
        }
      } else if (stepIndex === STEP_3_HEADER) {
        const step3Content = document.querySelector('[data-tour="step-3-header"]')?.closest('.workflow-step')?.querySelector('.step-content');
        if (step3Content) {
          driverRef.current?.moveNext();
        }
      } else if (stepIndex === SAMPLE_CONFIG_HEADER) {
        const sampleConfigContent = document.querySelector('[data-tour="sample-config-header"]')?.closest('.sample-split-container')?.querySelector('.sample-split-content');
        if (sampleConfigContent) {
          driverRef.current?.moveNext();
        }
      } else if (stepIndex === PROCESS_ACTIONS) {
        const step3Completed = document.querySelector('[data-tour="step-3-header"] .step-number.completed');
        if (step3Completed) {
          driverRef.current?.moveNext();
        }
      } else if (stepIndex === DROP_ZONE_STEP) {
        const dropZoneHasFiles = document.querySelector('.drop-zone.has-files');
        if (dropZoneHasFiles) {
          driverRef.current?.moveNext();
        }
      }
    };

    // Set up MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      // Debounce the check slightly to avoid rapid firing
      setTimeout(checkAndAdvance, 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [isTourActive]);

  // Get current step index
  const getCurrentStep = useCallback(() => {
    return driverRef.current?.getActiveIndex() ?? -1;
  }, []);

  // Close the dropdown menu after selection and advance to next step
  const closeDropdownAndAdvance = useCallback(() => {
    console.log('[Tour Debug] closeDropdownAndAdvance called');
    setKeepMenuOpen(null);
    // Small delay to let the menu close before advancing
    setTimeout(() => {
      driverRef.current?.moveNext();
    }, 100);
  }, []);

  return {
    startTour,
    resetTour,
    hasCompletedTour,
    markTourCompleted,
    isTourActive,
    getCurrentStep,
    keepMenuOpen,
    closeDropdownAndAdvance,
    PROJECT_SELECT_STEP,
    VENDOR_SELECT_STEP,
  };
};

export default useSampleAutomationTour;
