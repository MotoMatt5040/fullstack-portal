/**
 * Async handler wrapper to catch errors in async route handlers
 */
const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = handleAsync;
