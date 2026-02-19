const crypto = require('crypto');

// Map<projectId, { clients: Map<clientId, ClientInfo>, pollingInterval, lastData, lastDataHash }>
const projectSubscriptions = new Map();

const POLL_INTERVAL_MS = parseInt(process.env.DISPOSITION_POLL_INTERVAL_MS, 10) || 15000;
const HEARTBEAT_INTERVAL_MS = 30000;

let fetchAllDispositionDataFn = null;

const setFetchFunction = (fn) => {
  fetchAllDispositionDataFn = fn;
};

const hashData = (data) => {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

const sendToClient = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const pollAndBroadcast = async (projectId) => {
  if (!fetchAllDispositionDataFn) {
    console.error('Disposition SSE Manager: fetch function not set');
    return;
  }

  const sub = projectSubscriptions.get(projectId);
  if (!sub || sub.clients.size === 0) return;

  try {
    const result = await fetchAllDispositionDataFn(projectId);

    const payload = { data: result };
    const newHash = hashData(payload);

    if (newHash !== sub.lastDataHash) {
      console.log(`Disposition SSE [${projectId}]: data changed, broadcasting to ${sub.clients.size} client(s).`);
      sub.clients.forEach((client, clientId) => {
        try {
          sendToClient(client.res, 'disposition-data', payload);
        } catch (err) {
          console.error(`Error sending to client ${clientId}:`, err.message);
          removeClient(projectId, clientId);
        }
      });

      sub.lastData = payload;
      sub.lastDataHash = newHash;
    }
  } catch (error) {
    console.error(`Disposition SSE poll error for project ${projectId}:`, error.message);
    sub.clients.forEach((client, clientId) => {
      try {
        sendToClient(client.res, 'disposition-error', { message: 'Failed to fetch disposition data' });
      } catch (err) {
        removeClient(projectId, clientId);
      }
    });
  }
};

const startPolling = (projectId) => {
  const sub = projectSubscriptions.get(projectId);
  if (!sub || sub.pollingInterval) return;

  console.log(`Starting disposition SSE polling for project ${projectId}`);

  pollAndBroadcast(projectId);

  sub.pollingInterval = setInterval(() => {
    pollAndBroadcast(projectId);
  }, POLL_INTERVAL_MS);
};

const stopPolling = (projectId) => {
  const sub = projectSubscriptions.get(projectId);
  if (!sub || !sub.pollingInterval) return;

  console.log(`Stopping disposition SSE polling for project ${projectId}`);
  clearInterval(sub.pollingInterval);
  sub.pollingInterval = null;
};

const addClient = (projectId, clientId, res, username) => {
  if (!projectSubscriptions.has(projectId)) {
    projectSubscriptions.set(projectId, {
      clients: new Map(),
      pollingInterval: null,
      lastData: null,
      lastDataHash: null,
    });
    startPolling(projectId);
  }

  const sub = projectSubscriptions.get(projectId);
  sub.clients.set(clientId, { res, username });

  console.log(`Disposition SSE client ${clientId} (${username}) subscribed to project ${projectId}. Subscribers: ${sub.clients.size}`);

  if (sub.lastData) {
    try {
      sendToClient(res, 'disposition-data', sub.lastData);
    } catch (err) {
      // Client may have disconnected already
    }
  }
};

const removeClient = (projectId, clientId) => {
  const sub = projectSubscriptions.get(projectId);
  if (!sub) return;

  const client = sub.clients.get(clientId);
  const username = client?.username || 'Unknown';
  sub.clients.delete(clientId);

  console.log(`Disposition SSE client ${clientId} (${username}) unsubscribed from project ${projectId}. Subscribers: ${sub.clients.size}`);

  if (sub.clients.size === 0) {
    stopPolling(projectId);
    projectSubscriptions.delete(projectId);
  }
};

const getSubscriptionStats = () => {
  const stats = {};
  projectSubscriptions.forEach((sub, projectId) => {
    stats[projectId] = sub.clients.size;
  });
  return stats;
};

module.exports = {
  setFetchFunction,
  addClient,
  removeClient,
  getSubscriptionStats,
  HEARTBEAT_INTERVAL_MS,
};
