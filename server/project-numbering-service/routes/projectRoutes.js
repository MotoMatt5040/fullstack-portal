// Project Numbering Service - projectRoutes.js

const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const verifyRoles = require('../middleware/verifyRoles');
const { ROLES_LIST } = require('../config/rolesConfig');
const projectNumberingController = require('../controllers/projectNumberingController');

// Define allowed roles - all internal users can view, admin/executive can modify
const viewRoles = [
  ROLES_LIST.Admin,
  ROLES_LIST.Executive,
  ROLES_LIST.Programmer,
  ROLES_LIST.Manager,
];

const modifyRoles = [
  ROLES_LIST.Admin,
  ROLES_LIST.Executive,
  ROLES_LIST.Programmer,
];

const deleteRoles = [
  ROLES_LIST.Admin,
  ROLES_LIST.Executive,
];

// Health check (accessible via /api/projects/health through Caddy)
router.get('/projects/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'project-numbering-service',
    timestamp: new Date().toISOString()
  });
});

// All routes below require JWT authentication
router.use(verifyJWT);

// ==================== PROJECTS ROUTES ====================

/**
 * Get project statistics
 * GET /api/projects/stats
 */
router.route('/projects/stats')
  .get(
    verifyRoles(...viewRoles),
    projectNumberingController.handleGetProjectStats
  );

/**
 * Get next available project number
 * GET /api/projects/next-number
 */
router.route('/projects/next-number')
  .get(
    verifyRoles(...modifyRoles),
    projectNumberingController.handleGetNextProjectNumber
  );

/**
 * Search projects
 * POST /api/projects/search
 */
router.route('/projects/search')
  .post(
    verifyRoles(...viewRoles),
    projectNumberingController.handleSearchProjects
  );

/**
 * Get all projects (with pagination) or create a new project
 * GET /api/projects
 * POST /api/projects
 */
router.route('/projects')
  .get(
    verifyRoles(...viewRoles),
    projectNumberingController.handleGetAllProjects
  )
  .post(
    verifyRoles(...modifyRoles),
    projectNumberingController.handleCreateProject
  );

/**
 * Get, update, or delete a specific project
 * GET /api/projects/:number
 * PUT /api/projects/:number
 * DELETE /api/projects/:number
 */
router.route('/projects/:number')
  .get(
    verifyRoles(...viewRoles),
    projectNumberingController.handleGetProjectByNumber
  )
  .put(
    verifyRoles(...modifyRoles),
    projectNumberingController.handleUpdateProject
  )
  .delete(
    verifyRoles(...deleteRoles),
    projectNumberingController.handleDeleteProject
  );

module.exports = router;
