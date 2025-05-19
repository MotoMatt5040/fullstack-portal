const express = require('express');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/rolesList');
const githubController = require('../../controllers/githubController');

router.route('/createIssue')
    .post(githubController.createIssue);

module.exports = router