// Modal.tsx - Simplified with Instant Close
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './css/Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Ensure modal-root exists
      let modalRoot = document.getElementById('modal-root');
      if (!modalRoot) {
        modalRoot = document.createElement('div');
        modalRoot.id = 'modal-root';
        document.body.appendChild(modalRoot);
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Start enter animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      // Immediately hide and restore body scroll
      setIsVisible(false);
      document.body.style.overflow = '';
    }

    return () => {
      // Cleanup: restore body scroll if component unmounts
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render if modal is closed
  if (!isOpen) {
    return null;
  }

  // Ensure we have a modal root
  const modalRoot = document.getElementById('modal-root') || document.body;

  return ReactDOM.createPortal(
    <div 
      className={`modal-backdrop ${isVisible ? 'modal-backdrop--visible' : ''}`}
      onClick={onClose} // Click anywhere to close
    >
      <div 
        className={`modal-container ${isVisible ? 'modal-container--visible' : ''}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <button 
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