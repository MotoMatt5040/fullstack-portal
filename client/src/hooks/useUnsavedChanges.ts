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
