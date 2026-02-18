const ExtractionTaskService = require('../services/ExtractionTaskServices');

/**
 * Async handler wrapper
 */
const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }
};

/**
 * Handles the creation of an extraction task in VOXCO.
 */
const handleCreateExtractionTask = handleAsync(async (req, res) => {
  const
});