const express = require('express');
const path = require('path');
const router = express.Router();
const verifyRoles = require('../../middleware/verifyRoles');
const { ROLES_LIST } = require('../../config/rolesConfig');
const sampleAutomationController = require('../../controllers/sampleAutomationController');

const allowedRoles = [
  ROLES_LIST.Admin,
  ROLES_LIST.Executive,
  ROLES_LIST.Programmer
];

router.route('/process').post(
  verifyRoles(...allowedRoles),
  sampleAutomationController.upload,
  sampleAutomationController.processFile,
);

router
  .route('/clients')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    sampleAutomationController.handleGetClients
  );

router
  .route('/vendors')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    sampleAutomationController.handleGetVendors
  );

router
  .route('/clients-and-vendors')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    sampleAutomationController.handleGetClientsAndVendors
  );

// NEW: Header mapping routes
router
  .route('/header-mappings')
  .get(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    sampleAutomationController.getHeaderMappings
  )
  .post(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Programmer),
    sampleAutomationController.saveHeaderMappings
  );

router.route('/detect-headers').post(
  verifyRoles(...allowedRoles),
  sampleAutomationController.uploadSingle,
  sampleAutomationController.detectHeaders
);

router.route('/table-preview/:tableName').get(
  verifyRoles(...allowedRoles),
  sampleAutomationController.getTablePreview
);

router.route('/create-dnc-scrubbed').post(
  verifyRoles(...allowedRoles),
  sampleAutomationController.createDNCScrubbed
);

router.route('/distinct-age-ranges/:tableName').get(
  verifyRoles(...allowedRoles),
  sampleAutomationController.getDistinctAgeRanges
);

router.route('/extract-files').post(
  verifyRoles(...allowedRoles),
  sampleAutomationController.extractFiles
);

// router.use('/temp', express.static(path.join(__dirname, '../../temp')));


module.exports = router;