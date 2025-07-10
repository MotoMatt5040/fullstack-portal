const handleAsync = require('./asyncController');
const ProjectInfo = require('../services/ProjectInfo');
const DispositionServices = require('../services/DispositionServices');
const VoxcoApi = require('../services/VoxcoApi');


const handleGetWebDisposition = handleAsync(async (req, res) => {
  const projectId = req.params?.projectId;

  console.log('handleGetWebDisposition called with projectId:', projectId);
  
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const web = await DispositionServices.getWebDisposition(projectId);
  res.json(web);
});

module.exports = { handleGetWebDisposition };
