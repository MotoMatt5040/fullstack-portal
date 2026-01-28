// Project Numbering Service - projectRoutes.js

const express = require('express');
const router = express.Router();
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const { ROLES_LIST } = require('@internal/roles-config');
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

// Health check (accessible via /api/project-database/health through Caddy)
router.get('/project-database/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'project-numbering-service',
    timestamp: new Date().toISOString()
  });
});

// All routes below require gateway authentication (JWT validated by auth-gateway)
router.use(gatewayAuth);

// ==================== PROJECT NUMBERING ROUTES ====================

/**
 * Get project statistics
 * GET /api/project-database/stats
 */
router.route('/project-database/stats')
  .get(
    verifyRoles(...viewRoles),
    projectNumberingController.handleGetProjectStats
  );

/**
 * Get next available project number
 * GET /api/project-database/next-number
 */
router.route('/project-database/next-number')
  .get(
    verifyRoles(...modifyRoles),
    projectNumberingController.handleGetNextProjectNumber
  );

/**
 * Search projects
 * POST /api/project-database/search
 */
router.route('/project-database/search')
  .post(
    verifyRoles(...viewRoles),
    projectNumberingController.handleSearchProjects
  );

/**
 * Get all projects (with pagination) or create a new project
 * GET /api/project-database
 * POST /api/project-database
 */
router.route('/project-database')
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
 * GET /api/project-database/:number
 * PUT /api/project-database/:number
 * DELETE /api/project-database/:number
 */
router.route('/project-database/:number')
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
