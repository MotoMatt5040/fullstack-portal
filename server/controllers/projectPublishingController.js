const handleAsync = require('./asyncController');
const ProjectPublishingServices = require('../services/ProjectPublishingServices');

const handleGetPublishedProjects = handleAsync(async (req, res) => {
  const projects = await ProjectPublishingServices.getPublishedProjects();
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

const handleGetProjects = handleAsync(async (req, res) => {
    const projects = await ProjectPublishingServices.getProjects();
    res.status(200).json(projects);
});

const handleGetClients = handleAsync(async (req, res) => {
    const clients = await ProjectPublishingServices.getClients();
    res.status(200).json(clients);
});

module.exports = { handleGetPublishedProjects, handlePublishProject, handleGetProjects, handleGetClients };