const express = require('express');
const router = express.Router();
const { gatewayAuth } = require('@internal/auth-middleware');
const controller = require('../controllers/sampleAutomationController');

// All routes require gateway authentication
router.use(gatewayAuth);

// File processing routes
router.post('/process-file', controller.upload, controller.processFile);
router.post('/detect-headers', controller.uploadSingle, controller.detectHeaders);
router.get('/supported-file-types', controller.getSupportedFileTypes);

// Session management routes
router.delete('/session/:sessionId', controller.deleteProcessedFile);
router.get('/status/:sessionId', controller.getProcessingStatus);
router.post('/reprocess/:sessionId', controller.reprocessFile);

// Client and vendor routes
router.get('/clients', controller.handleGetClients);
router.get('/vendors', controller.handleGetVendors);
router.get('/clients-and-vendors', controller.handleGetClientsAndVendors);

// Header mapping routes
router.get('/header-mappings', controller.getHeaderMappings);
router.post('/header-mappings', controller.saveHeaderMappings);

// Table operations routes
router.get('/table-preview/:tableName', controller.getTablePreview);
router.post('/create-dnc-scrubbed', controller.createDNCScrubbed);
router.get('/distinct-age-ranges/:tableName', controller.getDistinctAgeRanges);

// File extraction routes
router.post('/extract-files', controller.extractFiles);
router.post('/calculate-age-from-birthyear', controller.calculateAgeFromBirthYear);

// Download and cleanup routes
router.get('/download/*', controller.downloadTempFile);
router.delete('/cleanup/:filename', controller.cleanupTempFile);

// Computed variables routes
router.post('/computed-variable/preview', controller.previewComputedVariable);
router.post('/computed-variable/add', controller.addComputedVariable);
router.delete('/computed-variable/remove', controller.removeComputedVariable);

module.exports = router;
