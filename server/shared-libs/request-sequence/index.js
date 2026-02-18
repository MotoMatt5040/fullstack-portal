/**
 * Request Sequencing Middleware
 *
 * Tracks request sequences per user per endpoint to handle race conditions gracefully.
 * When multiple requests are made rapidly, this ensures the client can identify and
 * ignore stale responses.
 *
 * Usage:
 * 1. Add middleware to route: router.get('/endpoint', requestSequence(), handler)
 * 2. Client sends: X-Request-Sequence header (optional, for tracking)
 * 3. Response includes: X-Response-Sequence header
 * 4. Client compares sequences to ignore outdated responses
 */

// Store request sequences per user per endpoint
// Structure: { `${userId}-${endpoint}`: { sequence: number, timestamp: number } }
const requestSequences = new Map();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_AGE = 10 * 60 * 1000; // Remove entries older than 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestSequences.entries()) {
    if (now - value.timestamp > MAX_AGE) {
      requestSequences.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Creates a request sequence middleware
 * @param {Object} options
 * @param {boolean} options.abortPrevious - If true, marks previous requests as stale (default: false)
 */
const requestSequence = (options = {}) => {
  const { abortPrevious = false } = options;

  return (req, res, next) => {
    // Create a unique key for this user + endpoint combination
    const userId = req.user || req.ip || 'anonymous';
    const endpoint = `${req.method}:${req.baseUrl}${req.path}`;
    const key = `${userId}-${endpoint}`;

    // Get or create sequence tracker for this key
    let tracker = requestSequences.get(key);
    if (!tracker) {
      tracker = { sequence: 0, timestamp: Date.now(), activeRequests: new Set() };
      requestSequences.set(key, tracker);
    }

    // Increment sequence for this request
    const requestSequenceNum = ++tracker.sequence;
    tracker.timestamp = Date.now();

    // Store client's sequence if provided (for correlation)
    const clientSequence = req.headers['x-request-sequence'];

    // Track this request
    tracker.activeRequests.add(requestSequenceNum);

    // Attach sequence info to request for use in handlers
    req.requestSequence = {
      sequence: requestSequenceNum,
      clientSequence,
      key,
      isLatest: () => tracker.sequence === requestSequenceNum,
      // Check if this request is still valid (not superseded)
      isStale: () => !tracker.activeRequests.has(requestSequenceNum),
    };

    // If abortPrevious is enabled, mark all previous requests as stale
    if (abortPrevious) {
      for (const seq of tracker.activeRequests) {
        if (seq < requestSequenceNum) {
          tracker.activeRequests.delete(seq);
        }
      }
    }

    // Override res.json to add sequence header and check staleness
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Add sequence headers
      res.setHeader('X-Response-Sequence', requestSequenceNum.toString());
      if (clientSequence) {
        res.setHeader('X-Request-Sequence-Echo', clientSequence);
      }

      // Check if request became stale during processing BEFORE removing from active set
      const wasStale = abortPrevious && !tracker.activeRequests.has(requestSequenceNum);

      // Clean up this request from active set
      tracker.activeRequests.delete(requestSequenceNum);

      // If request was stale, return 204 instead of data
      if (wasStale) {
        return res.status(204).send();
      }

      return originalJson(data);
    };

    next();
  };
};

module.exports = requestSequence;
