const express = require('express');
const router = express.Router();
const githubController = require('../../controllers/githubController');
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');

router.route('/createIssue')
    .post(verifyRoles(ROLES_LIST.Admin), githubController.createIssue);

module.exports = router