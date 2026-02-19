const DispositionServices = require('../services/DispositionServices');

/**
 * Async handler wrapper
 */
const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Get web disposition data for a project
 */
const handleGetWebDisposition = handleAsync(async (req, res) => {
  const projectId = req.params?.projectId;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const web = await DispositionServices.getWebDisposition(projectId);
  res.json(web);
});

/**
 * Get web dropout counts for a project
 */
const handleGetWebDispositionCounts = handleAsync(async (req, res) => {
  const projectId = req.params?.projectId;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }
  const dropoutCounts = await DispositionServices.getWebDropoutCounts(projectId);
  res.json(dropoutCounts);
});

/**
 * Fetch all disposition data for SSE broadcasting.
 * Bundles web disposition + web dropout counts into a single result.
 */
const fetchAllDispositionData = async (projectId) => {
  const [web, webCounts] = await Promise.all([
    DispositionServices.getWebDisposition(projectId),
    DispositionServices.getWebDropoutCounts(projectId),
  ]);

  return { web, webCounts };
};

module.exports = { handleGetWebDisposition, handleGetWebDispositionCounts, fetchAllDispositionData };
