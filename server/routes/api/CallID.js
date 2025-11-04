const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const { ROLES_LIST } = require('../../config/rolesConfig');
const callIDController = require('../../controllers/callIDController');

// Define allowed roles for call ID management
// Programmers have full access, Managers do not have access
const allowedRoles = [
  ROLES_LIST.Admin,
  ROLES_LIST.Executive,
  ROLES_LIST.Programmer
];

// ==================== DASHBOARD ROUTES ====================

/**
 * Get dashboard metrics (overview)
 * GET /api/callid/dashboard
 */
router.route('/dashboard')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetDashboardMetrics
  );

/**
 * Get currently active assignments
 * GET /api/callid/dashboard/active-assignments
 */
router.route('/dashboard/active-assignments')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetCurrentActiveAssignments
  );

/**
 * Get recent activity
 * GET /api/callid/dashboard/recent-activity
 */
router.route('/dashboard/recent-activity')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetRecentActivity
  );

// ==================== INVENTORY ROUTES ====================

/**
 * Get all call IDs with optional filters
 * GET /api/callid/inventory
 * Query params: status, stateFIPS, callerName, phoneNumber, inUse
 * 
 * Create a new call ID
 * POST /api/callid/inventory
 * Body: { phoneNumber, status, callerName, stateFIPS }
 */
router.route('/inventory')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetAllCallIDs
  )
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    callIDController.handleCreateCallID
  );

/**
 * Get a specific call ID
 * GET /api/callid/inventory/:id
 * 
 * Update a specific call ID
 * PUT /api/callid/inventory/:id
 * Body: { status, callerName, stateFIPS }
 * 
 * Delete a specific call ID
 * DELETE /api/callid/inventory/:id
 */
router.route('/inventory/:id')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetCallIDById
  )
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    callIDController.handleUpdateCallID
  )
  .delete(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    callIDController.handleDeleteCallID
  );

// ==================== USAGE/ASSIGNMENT ROUTES ====================

/**
 * Get usage history for a specific call ID
 * GET /api/callid/usage/history/:phoneNumberId
 */
router.route('/usage/history/:phoneNumberId')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetCallIDUsageHistory
  );

/**
 * Get all call IDs used by a specific project
 * GET /api/callid/usage/project/:projectId
 */
router.route('/usage/project/:projectId')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetProjectCallIDs
  );

/**
 * Assign a call ID to a project
 * POST /api/callid/usage/assign
 * Body: { projectId, phoneNumberId, startDate, endDate }
 */
router.route('/usage/assign')
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    callIDController.handleAssignCallIDToProject
  );

/**
 * Update or end an assignment
 * PUT /api/callid/usage/assign/:projectId/:phoneNumberId
 * Body: { startDate, endDate }
 * 
 * DELETE /api/callid/usage/assign/:projectId/:phoneNumberId
 * (Sets end date to now)
 */
router.route('/usage/assign/:projectId/:phoneNumberId')
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    callIDController.handleUpdateAssignment
  )
  .delete(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    callIDController.handleEndAssignment
  );

// ==================== ANALYTICS ROUTES ====================

/**
 * Get utilization metrics
 * GET /api/callid/analytics/utilization
 */
router.route('/analytics/utilization')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetUtilizationMetrics
  );

/**
 * Get most used call IDs
 * GET /api/callid/analytics/most-used
 * Query params: limit (default 10)
 */
router.route('/analytics/most-used')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetMostUsedCallIDs
  );

/**
 * Get idle call IDs
 * GET /api/callid/analytics/idle
 * Query params: days (default 30)
 */
router.route('/analytics/idle')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetIdleCallIDs
  );

/**
 * Get state coverage analysis
 * GET /api/callid/analytics/state-coverage
 */
router.route('/analytics/state-coverage')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetStateCoverage
  );

/**
 * Get usage timeline
 * GET /api/callid/analytics/timeline
 * Query params: months (default 6)
 */
router.route('/analytics/timeline')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetUsageTimeline
  );

// ==================== LOOKUP/UTILITY ROUTES ====================

/**
 * Get all status codes
 * GET /api/callid/lookups/status-codes
 */
router.route('/lookups/status-codes')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetAllStatusCodes
  );

/**
 * Get all states
 * GET /api/callid/lookups/states
 */
router.route('/lookups/states')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetAllStates
  );

/**
 * Get available call IDs for a specific state and date range
 * GET /api/callid/lookups/available
 * Query params: stateFIPS, startDate, endDate
 */
router.route('/lookups/available')
  .get(
    verifyRoles(...allowedRoles),
    callIDController.handleGetAvailableCallIDsForState
  );

module.exports = router;