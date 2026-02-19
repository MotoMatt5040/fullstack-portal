// In-memory SSE progress manager for sample processing sessions
const sessions = new Map();

const HEARTBEAT_INTERVAL_MS = 30000;

const sendEvent = (res, event, data) => {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    // Client disconnected
  }
};

const addClient = (sessionId, res) => {
  // Clean up existing session if any
  removeClient(sessionId);

  const heartbeat = setInterval(() => {
    sendEvent(res, 'heartbeat', {});
  }, HEARTBEAT_INTERVAL_MS);

  sessions.set(sessionId, { res, heartbeat });
  sendEvent(res, 'connected', { sessionId });
};

const removeClient = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return;

  clearInterval(session.heartbeat);
  sessions.delete(sessionId);
};

const updateProgress = (sessionId, { step, totalSteps, message }) => {
  const session = sessions.get(sessionId);
  if (!session) return;

  sendEvent(session.res, 'progress', { step, totalSteps, message });
};

const completeSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return;

  sendEvent(session.res, 'complete', { message: 'Processing complete' });
  removeClient(sessionId);
};

const errorSession = (sessionId, error) => {
  const session = sessions.get(sessionId);
  if (!session) return;

  sendEvent(session.res, 'processing-error', { message: error });
  removeClient(sessionId);
};

module.exports = {
  addClient,
  removeClient,
  updateProgress,
  completeSession,
  errorSession,
};
