const express = require('express');
const router = express.Router();

// Note: Project numbering routes (/projects/*) are now handled by the project-numbering-service microservice
// Note: Notification routes (/notifications/*) are now handled by the notification-service microservice
// Note: Support routes (/support/*) are now handled by the notification-service microservice

router.use('/users', require('./api/users'));
router.use('/promark-employees', require('./api/promarkEmployees'));
router.use('/github', require('./api/github'));
router.use('/reports', require('./api/reports'));
router.use('/quota-management', require('./api/quotaManagement'));
router.use('/project-publishing', require('./api/projectPublishing'));
router.use('/project-info', require('./api/projectInfo'));
router.use('/disposition-report', require('./api/dispositions'));
router.use('/ai-prompting', require('./api/openAIPrompting'));
router.use('/sample-automation', require('./api/sampleAutomation'));
router.use('/callid', require('./api/CallID'));

module.exports = router;