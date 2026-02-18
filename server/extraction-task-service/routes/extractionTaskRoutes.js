const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { gatewayAuth, verifyRoles } = require('@internal/auth-middleware');
const { ROLES_LIST } = require('@internal/roles-config');
const extractionTaskController = require('../controllers/extractionTaskController');

// All routes require authentication via gateway
router.use(gatewayAuth);

// POST /api/extraction-task/ - Create a new extraction in VOXCO
router
  .route('/')
  .post(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Programmer,
      ROLES_LIST.Executive,
      ROLES_LIST.DataProcessor,
    ),
    upload.single('file'),
    extractionTaskController.handleCreateExtractionTask,
  );
