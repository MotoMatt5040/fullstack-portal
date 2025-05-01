const express = require('express');
const router = express.Router();
const ROLES_LIST = require('../../config/rolesList');
const verifyRoles = require('../../middleware/verifyRoles');
const ReportController = require('../../controllers/reportController');

router.route('/tables/data/:type')
  .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
    ReportController.handleGetReportData(req, res);
  });

router.route('/data/productionreport')
  .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
    console.log('hit production report');
    ReportController.handleGetInterviewerProductionReportData(req, res);
  });

module.exports = router;