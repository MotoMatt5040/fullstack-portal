const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');
const githubController = require('../../controllers/githubController');

router.route('/createIssue')
    .post(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), githubController.createIssue);

module.exports = router