const express = require('express');
const router = express.Router();
const { ROLES_LIST } = require('@internal/roles-config');
const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const userController = require('../controllers/userController');

// Apply gateway auth to all routes
router.use(gatewayAuth);

// GET all users
router
  .route('/')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    userController.handleGetAllUsers
  );

// POST to create a new user
router
  .route('/adduser')
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    userController.handleCreateUser
  );

// DELETE user by email
router
  .route('/:email')
  .delete(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    userController.handleDeleteUser
  );

// GET all clients
router
  .route('/getclients')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    userController.handleGetClients
  );

// PUT to synchronize a user's roles
router
  .route('/roles')
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    userController.handleUpdateUserRoles
  );

// PUT to update a user's profile information (like their client)
router
  .route('/profile')
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    userController.handleUpdateUserProfile
  );

// GET users by client ID
router
  .route('/client/:clientId')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    userController.handleGetUsersByClientId
  );

// Test email configuration (admin only)
router
  .route('/test-email')
  .post(
    verifyRoles(ROLES_LIST.Admin),
    userController.handleTestEmail
  );

module.exports = router;
