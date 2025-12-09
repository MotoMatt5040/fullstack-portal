const express = require('express');
const router = express.Router();
const {ROLES_LIST} = require('../../config/rolesConfig');
const verifyRoles = require('../../middleware/verifyRoles');
const requestSequence = require('../../middleware/requestSequence');
const ReportController = require('../../controllers/reportController');

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
      ReportController.handleGetReportData(req, res);
    }
  );

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
      ReportController.handleGetInterviewerProductionReportData(req, res);
    }
  );

router
  .route('/data/update/targetmphandcph')
  .put(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Executive, ROLES_LIST.Manager), (req, res) => {
    ReportController.handleUpdateTargetMphAndCph(req, res);
  });

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
      ReportController.handleGetToplineReport(req, res);
    }
  );

module.exports = router;
