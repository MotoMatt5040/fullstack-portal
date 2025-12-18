const express = require('express');
const router = express.Router();
const { gatewayAuth } = require('@internal/auth-middleware');
const githubController = require('../controllers/githubController');

// All routes require authentication via gateway
router.use(gatewayAuth);

// POST /api/github/createIssue - Create a GitHub issue
router.route('/createIssue').post(githubController.createIssue);

module.exports = router;
