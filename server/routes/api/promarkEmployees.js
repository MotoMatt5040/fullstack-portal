const express = require('express');
const router = express.Router();
const promarkUsersController = require('../../controllers/promarkUsersController');
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');

router.route('/')
    .get(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleGetAllUsers)

router.route('/updateUserRoles')
    .post(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleAddUserRoles)
    .delete(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleRemoveUserRoles)

module.exports = router;
