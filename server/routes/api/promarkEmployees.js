const express = require('express');
const router = express.Router();
const promarkUsersController = require('../../controllers/promarkUsersController');
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');

router.route('/')
    .get(verifyRoles(ROLES_LIST.Admin), promarkUsersController.handleGetAllUsers)

module.exports = router;
