const express = require('express');
const router = express.Router();
const {ROLES_LIST} = require('../../config/rolesConfig');
const verifyRoles = require('../../middleware/verifyRoles');
const usersController = require('../../controllers/usersController');

// GET all users
router
  .route('/')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    usersController.handleGetAllUsers
  );

// POST to create a new user
router
  .route('/adduser')
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    usersController.handleCreateUser
  );

router.route('/:email')
  .delete(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    usersController.handleDeleteUser
  );

// GET all clients
router
  .route('/getclients')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    usersController.handleGetClients
  );

// PUT to synchronize a user's roles
router
  .route('/roles')
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    usersController.handleUpdateUserRoles
  );

// PUT to update a user's profile information (like their client)
router
  .route('/profile')
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive),
    usersController.handleUpdateUserProfile
  );

router
  .route('/client/:clientId')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    usersController.handleGetUsersByClientId
  );

module.exports = router;
