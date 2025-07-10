const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const {ROLES_LIST} = require('../../config/rolesConfig');
const promarkUsersController = require('../../controllers/promarkUsersController');

router.route('/')
    .get(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleGetAllUsers)

router.route('/updateUserRoles')
    .post(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleAddUserRoles)
    .delete(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleRemoveUserRoles)

module.exports = router;
