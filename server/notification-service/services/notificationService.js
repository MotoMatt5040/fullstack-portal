// Notification Service - SSE notification service for broadcasting messages to all connected clients

// Map of client ID to { res, username, currentPage, connectedAt }
const clients = new Map();

/**
 * Update user's last active timestamp in the database
 * @param {string} username - User's email/username
 */
const updateUserLastActive = async (username) => {
  if (!username || username === 'Anonymous') return;

  try {
    const response = await fetch('http://user-management:3000/last-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-auth': 'internal-service',
      },
      body: JSON.stringify({ email: username }),
    });

    if (!response.ok) {
      console.error(`Failed to update last active for ${username}: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error updating last active for ${username}:`, error.message);
  }
};

/**
 * Add a new SSE client connection
 * @param {string} clientId - Unique client identifier
 * @param {object} res - Express response object
 * @param {string} username - Username from auth headers
 */
const addClient = (clientId, res, username = 'Anonymous') => {
  clients.set(clientId, {
    res,
    username,
    currentPage: '/',
    connectedAt: new Date().toISOString(),
  });
  console.log(`SSE client connected: ${clientId} (${username}). Total clients: ${clients.size}`);

  // Update last active timestamp in database
  updateUserLastActive(username);
};

/**
 * Remove a client connection
 * @param {string} clientId - Unique client identifier
 */
const removeClient = (clientId) => {
  const client = clients.get(clientId);
  const username = client?.username || 'Unknown';
  clients.delete(clientId);
  console.log(`SSE client disconnected: ${clientId} (${username}). Total clients: ${clients.size}`);
};

/**
 * Update client's current page
 * @param {string} clientId - Unique client identifier
 * @param {string} page - Current page/route
 */
const updateClientPage = (clientId, page) => {
  const client = clients.get(clientId);
  if (client) {
    client.currentPage = page;
    clients.set(clientId, client);

    // Update last active timestamp in database
    updateUserLastActive(client.username);
  }
};

/**
 * Get all connected users with their details
 * @returns {Array} Array of { clientId, username, currentPage, connectedAt }
 */
const getConnectedUsers = () => {
  const users = [];
  clients.forEach((client, clientId) => {
    users.push({
      clientId,
      username: client.username,
      currentPage: client.currentPage,
      connectedAt: client.connectedAt,
    });
  });
  return users;
};

/**
 * Broadcast a message to all connected clients
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const broadcast = (event, data) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((client, clientId) => {
    try {
      client.res.write(message);
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
      removeClient(clientId);
    }
  });

  console.log(`Broadcasted "${event}" to ${clients.size} clients`);
};

/**
 * Send a maintenance notification to all clients
 * @param {number} minutes - Minutes until maintenance
 * @param {string} message - Custom message (optional)
 */
const sendMaintenanceNotification = (minutes = 5, message = null) => {
  const defaultMessage = `The system will undergo maintenance in ${minutes} minute${minutes !== 1 ? 's' : ''}. Please save your work.`;

  broadcast('maintenance', {
    type: 'maintenance',
    title: 'Scheduled Maintenance',
    message: message || defaultMessage,
    minutes: minutes,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Send a general notification to all clients
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, warning, error, success)
 */
const sendNotification = (title, message, type = 'info') => {
  broadcast('notification', {
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get the count of connected clients
 * @returns {number} Number of connected clients
 */
const getClientCount = () => clients.size;

module.exports = {
  addClient,
  removeClient,
  updateClientPage,
  broadcast,
  sendMaintenanceNotification,
  sendNotification,
  getClientCount,
  getConnectedUsers,
};
