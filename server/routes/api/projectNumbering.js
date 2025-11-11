const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const { ROLES_LIST } = require('../../config/rolesConfig');
const projectNumberingController = require('../../controllers/projectNumberingController');

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

// ==================== PROJECTS ROUTES ====================

/**
 * Get project statistics
 * GET /api/projects/stats
 */
router.route('/stats')
  .get(
    verifyRoles(...viewRoles),
    projectNumberingController.handleGetProjectStats
  );

/**
 * Get next available project number
 * GET /api/projects/next-number
 */
router.route('/next-number')
  .get(
    verifyRoles(...modifyRoles),
    projectNumberingController.handleGetNextProjectNumber
  );

/**
 * Search projects
 * POST /api/projects/search
 */
router.route('/search')
  .post(
    verifyRoles(...viewRoles),
    projectNumberingController.handleSearchProjects
  );

/**
 * Get all projects (with pagination) or create a new project
 * GET /api/projects
 * POST /api/projects
 */
router.route('/')
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
 * GET /api/projects/:projectID
 * PUT /api/projects/:projectID
 * DELETE /api/projects/:projectID
 */
router.route('/:number')
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