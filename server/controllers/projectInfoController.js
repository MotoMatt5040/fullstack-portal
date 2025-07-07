
const handleAsync = require('./asyncController');
const ProjectInfoServices = require('../services/ProjectInfo');
const { cleanQueryParam } = require('../utils/CleanQueryParam');

const handleGetProjectList = handleAsync(async (req, res) => {
  const userId = cleanQueryParam(req?.query?.userId);

  try {
    const projects = await ProjectInfoServices.getProjectsList(userId);

    if (!projects) {
      return res.status(404).json({ message: 'Problem getting projects' });
    }

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error in handleGetProjectList:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching projects',
    });
  }
});

const handleUnrestrictedGetProjectList = handleAsync(async (req, res) => {
  try {
    const projects = await ProjectInfoServices.unrestrictedGetProjectsList();

    if (!projects) {
      return res.status(404).json({ message: 'Problem getting projects' });
    }

    res.status(200).json(projects);
  }
  catch (error) {
    console.error('Error in handleUnrestrictedGetProjectList:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching projects',
    });
  }
});

module.exports = { handleGetProjectList, handleUnrestrictedGetProjectList };