const crypto = require('crypto');

// Map<subscriptionKey, { clients: Map<clientId, ClientInfo>, pollingInterval, lastData, lastDataHash }>
// subscriptionKey format: "${projectId || 'all'}:${useGpcph}"
const subscriptions = new Map();

const POLL_INTERVAL_MS = parseInt(process.env.REPORT_POLL_INTERVAL_MS, 10) || 15000;
const HEARTBEAT_INTERVAL_MS = 30000;

let fetchLiveReportDataFn = null;

const setFetchFunction = (fn) => {
  fetchLiveReportDataFn = fn;
};

const hashData = (data) => {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

const sendToClient = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const pollAndBroadcast = async (subscriptionKey) => {
  if (!fetchLiveReportDataFn) {
    console.error('Report SSE Manager: fetch function not set');
    return;
  }

  const sub = subscriptions.get(subscriptionKey);
  if (!sub || sub.clients.size === 0) return;

  try {
    const { projectId, useGpcph } = sub.params;
    const result = await fetchLiveReportDataFn(projectId || undefined, useGpcph);

    const payload = { data: result };
    const newHash = hashData(payload);

    if (newHash !== sub.lastDataHash) {
      console.log(`Report SSE [${subscriptionKey}]: data changed, broadcasting to ${sub.clients.size} client(s). Rows: ${result.length}`);
      sub.clients.forEach((client, clientId) => {
        try {
          sendToClient(client.res, 'report-data', payload);
        } catch (err) {
          console.error(`Error sending to client ${clientId}:`, err.message);
          removeClient(subscriptionKey, clientId);
        }
      });

      sub.lastData = payload;
      sub.lastDataHash = newHash;
    }
  } catch (error) {
    console.error(`Report SSE poll error for ${subscriptionKey}:`, error.message);
    sub.clients.forEach((client, clientId) => {
      try {
        sendToClient(client.res, 'report-error', { message: 'Failed to fetch report data' });
      } catch (err) {
        removeClient(subscriptionKey, clientId);
      }
    });
  }
};

const startPolling = (subscriptionKey) => {
  const sub = subscriptions.get(subscriptionKey);
  if (!sub || sub.pollingInterval) return;

  console.log(`Starting report SSE polling for ${subscriptionKey}`);

  pollAndBroadcast(subscriptionKey);

  sub.pollingInterval = setInterval(() => {
    pollAndBroadcast(subscriptionKey);
  }, POLL_INTERVAL_MS);
};

const stopPolling = (subscriptionKey) => {
  const sub = subscriptions.get(subscriptionKey);
  if (!sub || !sub.pollingInterval) return;

  console.log(`Stopping report SSE polling for ${subscriptionKey}`);
  clearInterval(sub.pollingInterval);
  sub.pollingInterval = null;
};

const buildKey = (projectId, useGpcph) => {
  return `${projectId || 'all'}:${useGpcph}`;
};

const addClient = (subscriptionKey, clientId, res, username, params) => {
  let isNewSubscription = false;

  if (!subscriptions.has(subscriptionKey)) {
    subscriptions.set(subscriptionKey, {
      clients: new Map(),
      pollingInterval: null,
      lastData: null,
      lastDataHash: null,
      params,
    });
    isNewSubscription = true;
  }

  const sub = subscriptions.get(subscriptionKey);
  // Add client BEFORE starting polling so the first poll sees the subscriber
  sub.clients.set(clientId, { res, username });

  if (isNewSubscription) {
    startPolling(subscriptionKey);
  }

  console.log(`Report SSE client ${clientId} (${username}) subscribed to ${subscriptionKey}. Subscribers: ${sub.clients.size}`);

  if (sub.lastData) {
    try {
      sendToClient(res, 'report-data', sub.lastData);
    } catch (err) {
      // Client may have disconnected already
    }
  }
};

const removeClient = (subscriptionKey, clientId) => {
  const sub = subscriptions.get(subscriptionKey);
  if (!sub) return;

  const client = sub.clients.get(clientId);
  const username = client?.username || 'Unknown';
  sub.clients.delete(clientId);

  console.log(`Report SSE client ${clientId} (${username}) unsubscribed from ${subscriptionKey}. Subscribers: ${sub.clients.size}`);

  if (sub.clients.size === 0) {
    stopPolling(subscriptionKey);
    subscriptions.delete(subscriptionKey);
  }
};

const getSubscriptionStats = () => {
  const stats = {};
  subscriptions.forEach((sub, key) => {
    stats[key] = sub.clients.size;
  });
  return stats;
};

module.exports = {
  setFetchFunction,
  buildKey,
  addClient,
  removeClient,
  getSubscriptionStats,
  HEARTBEAT_INTERVAL_MS,
};
