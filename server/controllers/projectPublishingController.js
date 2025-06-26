const handleAsync = require('./asyncController');
const ProjectPublishingServices = require('../services/ProjectPublishingServices');

const handleGetPublishedProjects = handleAsync(async (req, res) => {
  const projects = await ProjectPublishingServices.getPublishedProjects();
  console.log(projects);
  res.status(200).json(projects);
});

const handlePublishProject = handleAsync(async (req, res) => {
  const { email, projectId } = req.body;
  if (!email || !projectId) {
    return res
      .status(400)
      .json({ message: 'Email and projectId are required.' });
  }
  await ProjectPublishingServices.publishProject(email, projectId);
  res.status(201).json({ message: 'Project published successfully.' });
});

module.exports = { handleGetPublishedProjects, handlePublishProject };
