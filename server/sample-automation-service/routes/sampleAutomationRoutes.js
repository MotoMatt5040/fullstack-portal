const express = require('express');
const router = express.Router();
const { gatewayAuth } = require('@internal/auth-middleware');
const controller = require('../controllers/sampleAutomationController');
const progressManager = require('../services/processingProgressManager');

// SSE endpoint - before gatewayAuth (EventSource doesn't support custom headers)
router.get('/events/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  progressManager.addClient(sessionId, res);

  req.on('close', () => {
    progressManager.removeClient(sessionId);
  });
});

// All remaining routes require gateway authentication
router.use(gatewayAuth);

// File processing routes
router.post('/process', controller.upload, controller.processFile);
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
router.get('/header-mappings/all', controller.getAllHeaderMappings);
router.post('/header-mappings', controller.saveHeaderMappings);
router.delete('/header-mappings', controller.deleteHeaderMapping);

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

// Extraction defaults routes
router.get('/extraction-variables', controller.getExtractionVariables);
router.get('/extraction-defaults/master', controller.getMasterExtractionDefaults);
router.put('/extraction-defaults/master', controller.saveMasterExtractionDefaults);
router.get('/extraction-defaults/client/:clientId', controller.getClientExtractionDefaults);
router.put('/extraction-defaults/client/:clientId', controller.saveClientExtractionDefaults);
router.get('/extraction-defaults/vendor/:vendorId/client/:clientId', controller.getVendorClientExtractionDefaults);
router.put('/extraction-defaults/vendor/:vendorId/client/:clientId', controller.saveVendorClientExtractionDefaults);
router.get('/extraction-overrides/project/:projectId', controller.getProjectExtractionOverrides);
router.put('/extraction-overrides/project/:projectId', controller.saveProjectExtractionOverrides);
router.delete('/extraction-defaults/:type/:id', controller.deleteExtractionDefault);

// Sample tracking routes
router.get('/sample-tables', controller.getSampleTables);
router.get('/sample-tables/:tableName', controller.getSampleTableDetails);
router.delete('/sample-tables/:tableName', controller.deleteSampleTable);

// Variable exclusions routes
router.get('/variable-exclusions', controller.getVariableExclusions);
router.post('/variable-exclusions', controller.addVariableExclusion);
router.put('/variable-exclusions/:exclusionId', controller.updateVariableExclusion);
router.delete('/variable-exclusions/:exclusionId', controller.deleteVariableExclusion);

// Project variable inclusions routes
router.get('/project-inclusions/:projectId', controller.getProjectVariableInclusions);
router.post('/project-inclusions/:projectId', controller.addProjectVariableInclusion);
router.put('/project-inclusions/:inclusionId', controller.updateProjectVariableInclusion);
router.delete('/project-inclusions/:inclusionId', controller.deleteProjectVariableInclusion);

module.exports = router;
