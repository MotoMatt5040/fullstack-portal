// client/src/components/MaintenanceNotification.tsx
// Full-screen maintenance warning notification that doesn't auto-dismiss

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@mdi/react';
import { mdiAlertCircle, mdiClose } from '@mdi/js';
import './css/MaintenanceNotification.css';

interface MaintenanceNotificationProps {
  isVisible: boolean;
  title: string;
  message: string;
  initialMinutes: number;
  timestamp: string;
  onDismiss: () => void;
}

const MaintenanceNotification: React.FC<MaintenanceNotificationProps> = ({
  isVisible,
  title,
  message,
  initialMinutes,
  timestamp,
  onDismiss,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);

  // Calculate remaining time based on when notification was sent
  useEffect(() => {
    if (!isVisible) return;

    const notificationTime = new Date(timestamp).getTime();
    const endTime = notificationTime + initialMinutes * 60 * 1000;

    const updateRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingSeconds(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [isVisible, initialMinutes, timestamp]);

  const formatTime = useCallback((totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  if (!isVisible) return null;

  const isUrgent = remainingSeconds <= 60;
  const isExpired = remainingSeconds <= 0;

  return (
    <div className="maintenance-overlay">
      <div className={`maintenance-notification ${isUrgent ? 'urgent' : ''}`}>
        <button className="maintenance-close" onClick={onDismiss} title="Dismiss">
          <Icon path={mdiClose} size={1} />
        </button>

        <div className="maintenance-icon">
          <Icon path={mdiAlertCircle} size={2.5} />
        </div>

        <h2 className="maintenance-title">{title}</h2>

        <p className="maintenance-message">{message}</p>

        <div className={`maintenance-timer ${isUrgent ? 'urgent' : ''}`}>
          {isExpired ? (
            <span className="timer-expired">Maintenance may begin any moment</span>
          ) : (
            <>
              <span className="timer-label">Time remaining:</span>
              <span className="timer-value">{formatTime(remainingSeconds)}</span>
            </>
          )}
        </div>

        <p className="maintenance-instruction">
          Please save your work and prepare to be logged out.
        </p>

        <button className="maintenance-dismiss-btn" onClick={onDismiss}>
          I understand, dismiss this message
        </button>
      </div>
    </div>
  );
};

export default MaintenanceNotification;
