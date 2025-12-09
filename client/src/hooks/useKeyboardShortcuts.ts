import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcuts to register
 * @param options - Configuration options
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields (unless it's Escape)
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        // For Cmd/Ctrl + Key shortcuts, check either ctrl or meta
        const modifierMatches =
          (shortcut.ctrl || shortcut.meta)
            ? (event.ctrlKey || event.metaKey) && shiftMatches && altMatches
            : ctrlMatches && metaMatches && shiftMatches && altMatches;

        if (keyMatches && modifierMatches) {
          // Allow Escape in input fields
          if (isInputField && shortcut.key.toLowerCase() !== 'escape') {
            continue;
          }

          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
};

/**
 * Helper to format shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shift) {
    parts.push('⇧');
  }

  // Format special keys
  let key = shortcut.key;
  switch (key.toLowerCase()) {
    case 'escape':
      key = 'Esc';
      break;
    case 'enter':
      key = '↵';
      break;
    case 'arrowup':
      key = '↑';
      break;
    case 'arrowdown':
      key = '↓';
      break;
    case 'arrowleft':
      key = '←';
      break;
    case 'arrowright':
      key = '→';
      break;
    default:
      key = key.toUpperCase();
  }

  parts.push(key);
  return parts.join(isMac ? '' : '+');
};

export default useKeyboardShortcuts;
