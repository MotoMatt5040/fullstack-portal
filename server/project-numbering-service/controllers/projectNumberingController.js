// Project Numbering Service - projectNumberingController.js

const ProjectNumberingServices = require('../services/ProjectNumberingServices');
const { handleAsync } = require('@internal/auth-middleware');

/**
 * @desc Get all projects with pagination and sorting
 * @route GET /api/projects
 * @access Private
 */
const handleGetAllProjects = handleAsync(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search } = req.query;

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 75,
    sortBy: sortBy || 'number',
    sortOrder: sortOrder || 'DESC',
    searchTerm: search || null,
  };

  const result = await ProjectNumberingServices.getAllProjects(options);

  res.status(200).json(result);
});

/**
 * @desc Get next available project number
 * @route GET /api/projects/next-number
 * @access Private
 */
const handleGetNextProjectNumber = handleAsync(async (req, res) => {
  const nextNumber = await ProjectNumberingServices.getNextProjectNumber();
  res.status(200).json({ nextNumber });
});

/**
 * @desc Create a new project
 * @route POST /api/projects
 * @access Private
 */
const handleCreateProject = handleAsync(async (req, res) => {
  const username = req.user; // From JWT token via auth middleware

  // Validate required fields
  if (!req.body.projectName) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  // Validate date format if provided
  if (req.body.startDate && !isValidDate(req.body.startDate)) {
    return res.status(400).json({ message: 'Invalid start date format. Use YYYY-MM-DD' });
  }

  if (req.body.endDate && !isValidDate(req.body.endDate)) {
    return res.status(400).json({ message: 'Invalid end date format. Use YYYY-MM-DD' });
  }

  const result = await ProjectNumberingServices.createProject(req.body, username);

  res.status(201).json({
    message: 'Project created successfully',
    project: result,
  });
});

/**
 * @desc Get a single project by number
 * @route GET /api/projects/:number
 * @access Private
 */
const handleGetProjectByNumber = handleAsync(async (req, res) => {
  const projectNumber = parseInt(req.params.number);

  if (isNaN(projectNumber)) {
    return res.status(400).json({ message: 'Invalid project number' });
  }

  const project = await ProjectNumberingServices.getProjectByNumber(projectNumber);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  res.status(200).json(project);
});

/**
 * @desc Update a project
 * @route PUT /api/projects/:number
 * @access Private
 */
const handleUpdateProject = handleAsync(async (req, res) => {
  const projectNumber = parseInt(req.params.number);
  const username = req.user;

  if (isNaN(projectNumber)) {
    return res.status(400).json({ message: 'Invalid project number' });
  }

  // Validate required fields
  if (!req.body.projectName) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  // Check if project exists
  const existingProject = await ProjectNumberingServices.getProjectByNumber(projectNumber);
  if (!existingProject) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Validate date format if provided
  if (req.body.startDate && !isValidDate(req.body.startDate)) {
    return res.status(400).json({ message: 'Invalid start date format. Use YYYY-MM-DD' });
  }

  if (req.body.endDate && !isValidDate(req.body.endDate)) {
    return res.status(400).json({ message: 'Invalid end date format. Use YYYY-MM-DD' });
  }

  await ProjectNumberingServices.updateProject(projectNumber, req.body, username);

  res.status(200).json({
    message: 'Project updated successfully',
    projectID: projectNumber,
  });
});

/**
 * @desc Delete a project
 * @route DELETE /api/projects/:number
 * @access Private (Admin only)
 */
const handleDeleteProject = handleAsync(async (req, res) => {
  const projectNumber = parseInt(req.params.number);

  if (isNaN(projectNumber)) {
    return res.status(400).json({ message: 'Invalid project number' });
  }

  // Check if project exists
  const existingProject = await ProjectNumberingServices.getProjectByNumber(projectNumber);
  if (!existingProject) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const deleted = await ProjectNumberingServices.deleteProject(projectNumber);

  if (!deleted) {
    return res.status(500).json({ message: 'Failed to delete project' });
  }

  res.status(200).json({
    message: 'Project deleted successfully',
    projectID: projectNumber,
  });
});

/**
 * @desc Search projects
 * @route POST /api/projects/search
 * @access Private
 */
const handleSearchProjects = handleAsync(async (req, res) => {
  const results = await ProjectNumberingServices.searchProjects(req.body);

  res.status(200).json({
    count: results.length,
    projects: results,
  });
});

/**
 * @desc Get project statistics
 * @route GET /api/projects/stats
 * @access Private
 */
const handleGetProjectStats = handleAsync(async (req, res) => {
  const stats = await ProjectNumberingServices.getProjectStats();
  res.status(200).json(stats);
});

// Helper function to validate date format
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

module.exports = {
  handleGetAllProjects,
  handleGetNextProjectNumber,
  handleCreateProject,
  handleGetProjectByNumber,
  handleUpdateProject,
  handleDeleteProject,
  handleSearchProjects,
  handleGetProjectStats,
};
