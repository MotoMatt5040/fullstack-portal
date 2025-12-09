import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Icon from '@mdi/react';
import {
  mdiCheckCircleOutline,
  mdiAlertCircleOutline,
  mdiAlertOutline,
  mdiInformationOutline,
  mdiClose,
} from '@mdi/js';
import { useToast, Toast as ToastType } from '../context/ToastContext';
import './css/Toast.css';

const getIcon = (type: ToastType['type']) => {
  switch (type) {
    case 'success':
      return mdiCheckCircleOutline;
    case 'error':
      return mdiAlertCircleOutline;
    case 'warning':
      return mdiAlertOutline;
    case 'info':
      return mdiInformationOutline;
    default:
      return mdiInformationOutline;
  }
};

interface ToastItemProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 200); // Match animation duration
  };

  // Handle auto-dismiss with exit animation
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration - 200); // Start exit animation before removal

      return () => clearTimeout(exitTimer);
    }
  }, [toast.duration]);

  return (
    <div
      className={`toast toast-${toast.type} ${isExiting ? 'toast-exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon">
        <Icon path={getIcon(toast.type)} size={1} />
      </span>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Dismiss notification"
      >
        <Icon path={mdiClose} size={0.8} />
      </button>
      {toast.duration && toast.duration > 0 && (
        <div className="toast-progress">
          <div
            className="toast-progress-bar"
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    portalRoot
  );
};

export default ToastContainer;
