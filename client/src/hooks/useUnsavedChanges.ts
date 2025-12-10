import { useState, useEffect, useCallback, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  enabled?: boolean;
  message?: string;
}

interface UseUnsavedChangesReturn {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  markDirty: () => void;
  markClean: () => void;
  blocker: ReturnType<typeof useBlocker>;
}

/**
 * Hook to track unsaved changes and warn users before navigating away
 * @param options - Configuration options
 * @returns Object with dirty state and controls
 */
export const useUnsavedChanges = (
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesReturn => {
  const { enabled = true, message = 'You have unsaved changes. Are you sure you want to leave?' } = options;
  const [isDirty, setIsDirty] = useState(false);

  // Block navigation when dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled && isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (enabled && isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, isDirty, message]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  return {
    isDirty,
    setIsDirty,
    markDirty,
    markClean,
    blocker,
  };
};

/**
 * Hook for modal forms - provides a guard function for closing
 * Use this when you want to warn users before closing a modal with unsaved changes
 */
interface UseModalUnsavedChangesOptions {
  onClose: () => void;
}

interface UseModalUnsavedChangesReturn {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  markDirty: () => void;
  markClean: () => void;
  showWarning: boolean;
  handleClose: () => void;
  confirmClose: () => void;
  cancelClose: () => void;
}

export const useModalUnsavedChanges = (
  options: UseModalUnsavedChangesOptions
): UseModalUnsavedChangesReturn => {
  const { onClose } = options;
  const [isDirty, setIsDirty] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  // Call this instead of onClose directly
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowWarning(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // User confirms they want to discard changes
  const confirmClose = useCallback(() => {
    setShowWarning(false);
    setIsDirty(false);
    onClose();
  }, [onClose]);

  // User cancels and wants to stay
  const cancelClose = useCallback(() => {
    setShowWarning(false);
  }, []);

  return {
    isDirty,
    setIsDirty,
    markDirty,
    markClean,
    showWarning,
    handleClose,
    confirmClose,
    cancelClose,
  };
};

/**
 * Hook to compare form values with initial values to detect changes
 * @param initialValues - The initial form values
 * @param currentValues - The current form values
 * @param options - Configuration options
 */
export const useFormDirtyState = <T extends Record<string, any>>(
  initialValues: T,
  currentValues: T,
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesReturn => {
  const initialRef = useRef(initialValues);
  const { enabled = true, message } = options;

  // Update initial values ref when they change (e.g., on form reset)
  const resetInitialValues = useCallback((values: T) => {
    initialRef.current = values;
  }, []);

  // Check if values have changed
  const isDirty = JSON.stringify(initialRef.current) !== JSON.stringify(currentValues);

  // Block navigation when dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled && isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (enabled && isDirty) {
        e.preventDefault();
        e.returnValue = message || 'You have unsaved changes. Are you sure you want to leave?';
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, isDirty, message]);

  const markClean = useCallback(() => {
    initialRef.current = currentValues;
  }, [currentValues]);

  return {
    isDirty,
    setIsDirty: () => {}, // Not applicable for auto-detection
    markDirty: () => {}, // Not applicable for auto-detection
    markClean,
    blocker,
  };
};

export default useUnsavedChanges;
