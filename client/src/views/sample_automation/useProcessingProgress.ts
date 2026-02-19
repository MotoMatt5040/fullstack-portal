import { useRef, useState, useCallback } from 'react';

interface ProgressState {
  step: number;
  totalSteps: number;
  message: string;
}

interface UseProcessingProgressReturn {
  progress: ProgressState | null;
  isComplete: boolean;
  error: string | null;
  reset: () => void;
  connect: (sessionId: string) => Promise<void>;
  disconnect: () => void;
}

export const useProcessingProgress = (): UseProcessingProgressReturn => {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    disconnect();
    setProgress(null);
    setIsComplete(false);
    setError(null);
  }, [disconnect]);

  const connect = useCallback((sessionId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      disconnect();
      setProgress(null);
      setIsComplete(false);
      setError(null);

      const url = `/api/sample-automation/events/${encodeURIComponent(sessionId)}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', () => {
        resolve();
      });

      eventSource.addEventListener('progress', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as ProgressState;
          setProgress(data);
        } catch (err) {
          console.error('Error parsing progress event:', err);
        }
      });

      eventSource.addEventListener('complete', () => {
        setIsComplete(true);
        eventSource.close();
        eventSourceRef.current = null;
      });

      eventSource.addEventListener('processing-error', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setError(data.message);
        } catch {
          setError('Processing failed');
        }
        eventSource.close();
        eventSourceRef.current = null;
      });

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        reject(new Error('SSE connection failed'));
      };
    });
  }, [disconnect]);

  return { progress, isComplete, error, reset, connect, disconnect };
};

export default useProcessingProgress;
