import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import './css/SessionWarningModal.css';

interface SessionWarningModalProps {
  isVisible: boolean;
  onExtend: () => void;
  onLogout: () => void;
  getRemainingTime: () => number;
  warningDuration: number;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isVisible,
  onExtend,
  onLogout,
  getRemainingTime,
  warningDuration
}) => {
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (!isVisible) {
      setCountdown(0);
      return;
    }

    const warningSeconds = Math.floor(warningDuration / 1000);
    let timeLeft = warningSeconds;
    setCountdown(timeLeft);

    const interval = setInterval(() => {
      timeLeft -= 1;
      console.log('Modal countdown:', timeLeft);

      if (timeLeft <= 0) {
        onLogout();
        return;
      }

      setCountdown(timeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, onLogout, warningDuration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate urgency level for styling
  const isUrgent = countdown <= 30;
  const isCritical = countdown <= 10;

  return (
    <Modal
      isOpen={isVisible}
      onClose={onExtend}
      ariaLabel="Session expiring warning"
    >
      <div className="session-warning">
        <div className="session-warning__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2 className="session-warning__title">Session Expiring</h2>

        <p className="session-warning__message">
          Your session will expire due to inactivity.
        </p>

        <div className={`session-warning__timer ${isUrgent ? 'session-warning__timer--urgent' : ''} ${isCritical ? 'session-warning__timer--critical' : ''}`}>
          <span className="session-warning__timer-value">{formatTime(countdown)}</span>
          <span className="session-warning__timer-label">remaining</span>
        </div>

        <div className="session-warning__actions">
          <button
            className="modal-btn modal-btn-primary session-warning__btn-extend"
            onClick={onExtend}
            autoFocus
          >
            Stay Logged In
          </button>
          <button
            className="modal-btn modal-btn-ghost"
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionWarningModal;
