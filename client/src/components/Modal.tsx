import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './css/Modal.css'; // Your original CSS path

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  // State to control whether the modal is in the DOM
  const [isRendered, setIsRendered] = useState(isOpen);
  // State to control the animation CSS class (e.g., 'enter-active')
  const [animationClass, setAnimationClass] = useState('');
  
  // A ref to hold the timer ID to prevent memory leaks
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Always clear any pending close timers when isOpen changes
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }

    if (isOpen) {
      // 1. If opening, add the modal to the DOM immediately
      setIsRendered(true);
      // 2. Then, in the very next browser paint, add the 'enter-active' class to trigger the fade-in animation
      requestAnimationFrame(() => {
        setAnimationClass('enter-active');
      });
    } else {
      // 1. If closing, trigger the 'exit-active' class to start the fade-out animation
      setAnimationClass('exit-active');
      // 2. Wait for the animation to finish (300ms) before removing the modal from the DOM
      closeTimer.current = setTimeout(() => {
        setIsRendered(false);
      }, 300); // This duration MUST match your CSS transition time
    }

    // Cleanup function: If the component unmounts for any reason, clear the timer
    return () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    };
  }, [isOpen]); // This effect re-runs whenever the 'isOpen' prop changes

  // Don't render anything if the modal is closed and the exit animation has finished
  if (!isRendered) {
    return null;
  }

  // Use a Portal to render the modal at the root, now with dynamic animation classes
  return ReactDOM.createPortal(
    <>
      <div 
        className={`modal-overlay modal-overlay-${animationClass}`} 
        onClick={onClose} 
      />
      <div className={`modal-content modal-content-${animationClass}`}>
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </>,
    document.getElementById('portal-root') as HTMLElement
  );
};