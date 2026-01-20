// CallID Service Routes
const express = require('express');
const router = express.Router();
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const { ROLES_LIST } = require('@internal/roles-config');
const callIDController = require('../controllers/callIDController');

// Use gateway auth - JWT already validated by auth-gateway via Caddy
router.use(gatewayAuth);

// Define allowed roles for call ID management
const allowedRoles = [ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer];

// ==================== DASHBOARD ROUTES ====================

router.route('/dashboard').get(verifyRoles(...allowedRoles), callIDController.handleGetDashboardMetrics);

router.route('/dashboard/active-assignments').get(verifyRoles(...allowedRoles), callIDController.handleGetCurrentActiveAssignments);

router.route('/dashboard/recent-activity').get(verifyRoles(...allowedRoles), callIDController.handleGetRecentActivity);

// ==================== INVENTORY ROUTES ====================

router
  .route('/inventory')
  .get(verifyRoles(...allowedRoles), callIDController.handleGetAllCallIDs)
  .post(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleCreateCallID);

router
  .route('/inventory/:id')
  .get(verifyRoles(...allowedRoles), callIDController.handleGetCallIDById)
  .put(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleUpdateCallID)
  .delete(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleDeleteCallID);

// ==================== USAGE/ASSIGNMENT ROUTES ====================

router.route('/usage/history/:phoneNumberId').get(verifyRoles(...allowedRoles), callIDController.handleGetCallIDUsageHistory);

router.route('/usage/project/:projectId').get(verifyRoles(...allowedRoles), callIDController.handleGetProjectCallIDs);

router.route('/usage/assign').post(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleAssignCallIDToProject);

router
  .route('/usage/assign/:projectId/:phoneNumberId')
  .put(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleUpdateAssignment)
  .delete(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleEndAssignment);

// ==================== ANALYTICS ROUTES ====================

router.route('/analytics/utilization').get(verifyRoles(...allowedRoles), callIDController.handleGetUtilizationMetrics);

router.route('/analytics/most-used').get(verifyRoles(...allowedRoles), callIDController.handleGetMostUsedCallIDs);

router.route('/analytics/idle').get(verifyRoles(...allowedRoles), callIDController.handleGetIdleCallIDs);

router.route('/analytics/state-coverage').get(verifyRoles(...allowedRoles), callIDController.handleGetStateCoverage);

router.route('/analytics/timeline').get(verifyRoles(...allowedRoles), callIDController.handleGetUsageTimeline);

// ==================== LOOKUP/UTILITY ROUTES ====================

router.route('/lookups/status-codes').get(verifyRoles(...allowedRoles), callIDController.handleGetAllStatusCodes);

router.route('/lookups/states').get(verifyRoles(...allowedRoles), callIDController.handleGetAllStates);

router.route('/lookups/available').get(verifyRoles(...allowedRoles), callIDController.handleGetAvailableCallIDsForState);

router.route('/assignments/projects').get(verifyRoles(...allowedRoles), callIDController.handleGetAllProjectsWithAssignments);

router.route('/assignments/check-conflict').post(verifyRoles(...allowedRoles), callIDController.handleCheckAssignmentConflict);

router.route('/assignments/:projectId/:phoneNumberId').put(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleUpdateAssignment);

router.route('/assignments/swap').post(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleSwapCallIDAssignment);

router.route('/assignments/reassign').post(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleReassignCallID);

router
  .route('/projects/slots')
  .put(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleUpdateProjectSlot)
  .delete(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleRemoveProjectSlot);

// ==================== AUTO-ASSIGNMENT ROUTES ====================

router.route('/auto-assign/area-codes').get(verifyRoles(...allowedRoles), callIDController.handleGetTopAreaCodes);

router.route('/auto-assign').post(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer), callIDController.handleAutoAssignCallIDs);

module.exports = router;
