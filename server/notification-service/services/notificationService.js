// Notification Service - SSE notification service for broadcasting messages to all connected clients

const clients = new Map(); // Map of client ID to response object

/**
 * Add a new SSE client connection
 * @param {string} clientId - Unique client identifier
 * @param {object} res - Express response object
 */
const addClient = (clientId, res) => {
  clients.set(clientId, res);
  console.log(`SSE client connected: ${clientId}. Total clients: ${clients.size}`);
};

/**
 * Remove a client connection
 * @param {string} clientId - Unique client identifier
 */
const removeClient = (clientId) => {
  clients.delete(clientId);
  console.log(`SSE client disconnected: ${clientId}. Total clients: ${clients.size}`);
};

/**
 * Broadcast a message to all connected clients
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const broadcast = (event, data) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((res, clientId) => {
    try {
      res.write(message);
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
  broadcast,
  sendMaintenanceNotification,
  sendNotification,
  getClientCount,
};
