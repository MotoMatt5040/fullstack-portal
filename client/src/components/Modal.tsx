// Modal.tsx - Simplified with Instant Close and Focus Trapping
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import './css/Modal.css';

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Get focusable elements within the modal
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // Handle Escape key and Tab key for focus trapping
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap with Tab key
      if (event.key === 'Tab') {
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
      }
    },
    [isOpen, onClose, getFocusableElements]
  );

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element for restoration
      previouslyFocusedRef.current = document.activeElement as HTMLElement;

      // Ensure modal-root exists
      let modalRoot = document.getElementById('modal-root');
      if (!modalRoot) {
        modalRoot = document.createElement('div');
        modalRoot.id = 'modal-root';
        document.body.appendChild(modalRoot);
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Add keydown listener
      document.addEventListener('keydown', handleKeyDown);

      // Start enter animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });

      // Focus the close button or first focusable element
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 50);
    } else {
      // Immediately hide and restore body scroll
      setIsVisible(false);
      document.body.style.overflow = '';

      // Restore focus to previously focused element
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    }

    return () => {
      // Cleanup: restore body scroll and remove event listener if component unmounts
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Don't render if modal is closed
  if (!isOpen) {
    return null;
  }

  // Ensure we have a modal root
  const modalRoot = document.getElementById('modal-root') || document.body;

  return ReactDOM.createPortal(
    <div
      className={`modal-backdrop ${isVisible ? 'modal-backdrop--visible' : ''}`}
      onMouseDown={onClose}
    >
      <div
        ref={containerRef}
        className={`modal-container ${isVisible ? 'modal-container--visible' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      >
        <button
          ref={closeButtonRef}
          className="modal-close-button"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        <div className="modal-content-wrapper">
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
};