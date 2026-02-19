const crypto = require('crypto');

// Map<projectId, { clients: Map<clientId, ClientInfo>, pollingInterval, lastData, lastDataHash }>
const projectSubscriptions = new Map();

const POLL_INTERVAL_MS = parseInt(process.env.QUOTA_POLL_INTERVAL_MS, 10) || 15000;
const HEARTBEAT_INTERVAL_MS = 30000;

let fetchQuotaDataFn = null;
let filterForExternalUsersFn = null;

const setFetchFunction = (fn) => {
  fetchQuotaDataFn = fn;
};

const setFilterFunction = (fn) => {
  filterForExternalUsersFn = fn;
};

const hashData = (data) => {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

const sendToClient = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const broadcastToProject = (projectId, event, data) => {
  const sub = projectSubscriptions.get(projectId);
  if (!sub) return;

  sub.clients.forEach((client, clientId) => {
    try {
      sendToClient(client.res, event, data);
    } catch (err) {
      console.error(`Error sending to client ${clientId}:`, err.message);
      removeClient(projectId, clientId);
    }
  });
};

const pollAndBroadcast = async (projectId) => {
  if (!fetchQuotaDataFn || !filterForExternalUsersFn) {
    console.error('SSE Manager: fetch/filter functions not set');
    return;
  }

  const sub = projectSubscriptions.get(projectId);
  if (!sub || sub.clients.size === 0) return;

  try {
    const result = await fetchQuotaDataFn(projectId);

    // Build internal payload
    const internalPayload = { visibleStypes: result.visibleStypes, data: result.data };
    const internalHash = hashData(internalPayload);

    // Build external payload (deep clone + filter)
    const externalData = JSON.parse(JSON.stringify(result.data));
    filterForExternalUsersFn(externalData);
    const externalPayload = { visibleStypes: result.visibleStypes, data: externalData };
    const externalHash = hashData(externalPayload);

    // Only broadcast if data changed
    const internalChanged = internalHash !== sub.lastDataHash.internal;
    const externalChanged = externalHash !== sub.lastDataHash.external;

    sub.clients.forEach((client, clientId) => {
      const isInternal = client.isInternalUser;
      const changed = isInternal ? internalChanged : externalChanged;
      const payload = isInternal ? internalPayload : externalPayload;

      if (changed) {
        try {
          sendToClient(client.res, 'quota-data', payload);
        } catch (err) {
          console.error(`Error sending to client ${clientId}:`, err.message);
          removeClient(projectId, clientId);
        }
      }
    });

    // Cache for new subscribers
    sub.lastData.internal = internalPayload;
    sub.lastData.external = externalPayload;
    sub.lastDataHash.internal = internalHash;
    sub.lastDataHash.external = externalHash;
  } catch (error) {
    console.error(`SSE poll error for project ${projectId}:`, error.message);
    broadcastToProject(projectId, 'quota-error', {
      message: 'Failed to fetch quota data',
    });
  }
};

const startPolling = (projectId) => {
  const sub = projectSubscriptions.get(projectId);
  if (!sub || sub.pollingInterval) return;

  console.log(`Starting SSE polling for project ${projectId}`);

  // Immediate first fetch
  pollAndBroadcast(projectId);

  sub.pollingInterval = setInterval(() => {
    pollAndBroadcast(projectId);
  }, POLL_INTERVAL_MS);
};

const stopPolling = (projectId) => {
  const sub = projectSubscriptions.get(projectId);
  if (!sub || !sub.pollingInterval) return;

  console.log(`Stopping SSE polling for project ${projectId}`);
  clearInterval(sub.pollingInterval);
  sub.pollingInterval = null;
};

const addClient = (projectId, clientId, res, username, isInternalUser) => {
  let isNewSubscription = false;

  if (!projectSubscriptions.has(projectId)) {
    projectSubscriptions.set(projectId, {
      clients: new Map(),
      pollingInterval: null,
      lastData: { internal: null, external: null },
      lastDataHash: { internal: null, external: null },
    });
    isNewSubscription = true;
  }

  const sub = projectSubscriptions.get(projectId);
  // Add client BEFORE starting polling so the first poll sees the subscriber
  sub.clients.set(clientId, { res, username, isInternalUser });

  console.log(`SSE client ${clientId} (${username}) subscribed to project ${projectId}. Subscribers: ${sub.clients.size}`);

  if (isNewSubscription) {
    startPolling(projectId);
  }

  // Send cached data immediately if available
  const dataKey = isInternalUser ? 'internal' : 'external';
  if (sub.lastData[dataKey]) {
    try {
      sendToClient(res, 'quota-data', sub.lastData[dataKey]);
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

  console.log(`SSE client ${clientId} (${username}) unsubscribed from project ${projectId}. Subscribers: ${sub.clients.size}`);

  // Stop polling if no more subscribers
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
  setFilterFunction,
  addClient,
  removeClient,
  getSubscriptionStats,
  HEARTBEAT_INTERVAL_MS,
};
