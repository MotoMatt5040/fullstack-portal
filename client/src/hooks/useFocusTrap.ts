import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface UseFocusTrapOptions {
  enabled?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export interface UseFocusTrapReturn {
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook to trap focus within a container element (for modals, dialogs, etc.)
 *
 * @param options - Configuration options
 * @returns containerRef - Ref to attach to the container element
 */
export function useFocusTrap({
  enabled = true,
  autoFocus = true,
  restoreFocus = true,
  initialFocusRef,
}: UseFocusTrapOptions = {}): UseFocusTrapReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => {
      // Check if element is visible
      return el.offsetParent !== null;
    });
  }, []);

  // Focus the first element or initial focus ref
  const focusFirst = useCallback(() => {
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements, initialFocusRef]);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        // Shift + Tab: Move focus backward
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: Move focus forward
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, getFocusableElements]
  );

  // Store previously focused element and set up focus trap
  useEffect(() => {
    if (!enabled) return;

    // Store the currently focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Auto-focus first element
    if (autoFocus) {
      // Use setTimeout to ensure the modal is rendered
      const timeoutId = setTimeout(focusFirst, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [enabled, autoFocus, focusFirst]);

  // Add keydown listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreFocus && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [restoreFocus]);

  return { containerRef };
}

export default useFocusTrap;
