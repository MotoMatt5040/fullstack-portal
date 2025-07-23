import React, { useState, useEffect } from 'react';
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
    console.log('SessionWarningModal render - isVisible:', isVisible, 'warningDuration:', warningDuration);
    if (!isVisible) {
      setCountdown(0);
      return;
    }

    // Convert warningDuration from milliseconds to seconds
    const warningSeconds = Math.floor(warningDuration / 1000);
    let timeLeft = warningSeconds;
    setCountdown(timeLeft);

    console.log(`Starting modal countdown from ${warningSeconds} seconds`);

    const interval = setInterval(() => {
      timeLeft -= 1;
      console.log('Modal countdown:', timeLeft);
      
      if (timeLeft <= 0) {
        console.log('Modal countdown reached 0 - logging out');
        onLogout();
        return;
      }
      
      setCountdown(timeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, onLogout, warningDuration]);

  if (!isVisible) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="session-warning-header">
          <h3>⚠️ Session Expiring Soon</h3>
        </div>
        
        <div className="session-warning-content">
          <p>Your session will expire in:</p>
          <div className="countdown-timer">
            {formatTime(countdown)}
          </div>
          <p>You will be automatically logged out due to inactivity.</p>
        </div>
        
        <div className="session-warning-actions">
          <button 
            className="btn-primary"
            onClick={onExtend}
          >
            Stay Logged In
          </button>
          <button 
            className="btn-secondary"
            onClick={onLogout}
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;