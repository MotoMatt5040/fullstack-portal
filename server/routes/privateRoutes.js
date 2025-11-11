const express = require('express');
const router = express.Router();

// Note: Your original server.js had a duplicate "/users" route.
// I've given "/promark-employees" its own path here. Please adjust if needed.
router.use('/users', require('./api/users'));
router.use('/promark-employees', require('./api/promarkEmployees'));
router.use('/github', require('./api/github'));
router.use('/reports', require('./api/reports'));
router.use('/quota-management', require('./api/quotaManagement'));
router.use('/project-publishing', require('./api/projectPublishing'));
router.use('/project-info', require('./api/projectInfo'));
router.use('/disposition-report', require('./api/dispositions'));
router.use('/ai-prompting', require('./api/openAIPrompting'));
router.use('/support', require('./api/support'));
router.use('/sample-automation', require('./api/sampleAutomation'));
router.use('/callid', require('./api/CallID')); 
router.use('/project-numbering', require('./api/projectNumbering'));

module.exports = router;