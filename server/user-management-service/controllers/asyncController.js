/**
 * Async controller wrapper
 * Wraps async route handlers to catch errors
 */
const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = handleAsync;
