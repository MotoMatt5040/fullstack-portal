const express = require('express');
const router = express.Router();
const { ROLES_LIST } = require('../config/rolesConfig');
const gatewayAuth = require('../middleware/gatewayAuth');
const verifyRoles = require('../middleware/verifyRoles');
const requestSequence = require('../middleware/requestSequence');
const reportController = require('../controllers/reportController');

// Apply gateway auth to all routes
router.use(gatewayAuth);

// GET report data (live or historic) - /api/reports/tables/data/:type
router
  .route('/tables/data/:type')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Manager,
      ROLES_LIST.Programmer
    ),
    // Use request sequencing for live data to handle rapid requests gracefully
    requestSequence({ abortPrevious: true }),
    (req, res) => {
      reportController.handleGetReportData(req, res);
    }
  );

// GET interviewer production report data - /api/reports/data/productionreport
router
  .route('/data/productionreport')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Manager,
      ROLES_LIST.Programmer
    ),
    (req, res) => {
      reportController.handleGetInterviewerProductionReportData(req, res);
    }
  );

// PUT update target mph and cph - /api/reports/data/update/targetmphandcph
router
  .route('/data/update/targetmphandcph')
  .put(
    verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Manager),
    (req, res) => {
      reportController.handleUpdateTargetMphAndCph(req, res);
    }
  );

// GET topline report - /api/reports/topline-report
router
  .route('/topline-report')
  .get(
    verifyRoles(
      ROLES_LIST.Admin,
      ROLES_LIST.Executive,
      ROLES_LIST.Manager,
      ROLES_LIST.Programmer
    ),
    (req, res) => {
      reportController.handleGetToplineReport(req, res);
    }
  );

module.exports = router;
