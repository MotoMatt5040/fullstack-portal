const handleAsync = require('./asyncController');
const ProjectPublishingServices = require('../services/ProjectPublishingServices');

const handleGetPublishedProjects = handleAsync(async (req, res) => {
  const projects = await ProjectPublishingServices.getPublishedProjects();
  res.status(200).json(projects);
});

const handlePublishProject = handleAsync(async (req, res) => {
  const { emails, projectId } = req.body;
  if (!emails || !Array.isArray(emails) || emails.length === 0 || !projectId) {
    return res
      .status(400)
      .json({ message: 'An array of emails and a projectId are required.' });
  }
  await ProjectPublishingServices.publishProject(emails, projectId);
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

const handleUnpublishProject = handleAsync(async (req, res) => {
  const { emails, projectId } = req.body;
  if (!emails || !Array.isArray(emails) || emails.length === 0 || !projectId) {
    return res
      .status(400)
      .json({ message: 'An array of emails and a projectId are required for removal.' });
  }
  await ProjectPublishingServices.unpublishProject(emails, projectId);
  res.status(200).json({ message: 'Project access removed successfully.' });
});

module.exports = {
  handleGetPublishedProjects,
  handlePublishProject,
  handleGetProjects,
  handleGetClients,
  handleUnpublishProject
};
