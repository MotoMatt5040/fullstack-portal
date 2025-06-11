const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');
const quotaManagementController = require('../../controllers/quotaManagementController');
// const promarkUsersController = require('../../controllers/promarkUsersController');

// router.route('/')
//     .get(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleGetAllUsers)

// router.route('/updateUserRoles')
//     .post(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleAddUserRoles)
//     .delete(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleRemoveUserRoles)

router.route('/data')
  .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer, ROLES_LIST.Manager, ROLES_LIST.External), quotaManagementController.handleGetQuotas);

router.route('/projects')
  .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer, ROLES_LIST.Manager,  ROLES_LIST.External), quotaManagementController.handleGetProjectList);

module.exports = router;
