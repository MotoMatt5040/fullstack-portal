const express = require('express');
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

module.exports = router;
