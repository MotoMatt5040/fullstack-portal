const express = require('express');
const router = express.Router();
const gatewayAuth = require('../middleware/gatewayAuth');
const verifyRoles = require('../middleware/verifyRoles');
const { ROLES_LIST } = require('../config/rolesConfig');
const promarkEmployeesController = require('../controllers/promarkEmployeesController');

// All routes require authentication via gateway
router.use(gatewayAuth);

// GET / - Get all users (Admin only)
router.route('/')
  .get(verifyRoles(ROLES_LIST.Admin), promarkEmployeesController.handleGetAllUsers);

// POST/DELETE /updateUserRoles - Add or remove user roles (Admin only)
router.route('/updateUserRoles')
  .post(verifyRoles(ROLES_LIST.Admin), promarkEmployeesController.handleAddUserRoles)
  .delete(verifyRoles(ROLES_LIST.Admin), promarkEmployeesController.handleRemoveUserRoles);

module.exports = router;
