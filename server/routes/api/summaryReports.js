const express = require('express');
const router = express.Router();
const ROLES_LIST = require('../../config/rolesList');
const verifyRoles = require('../../middleware/verifyRoles');
const SummaryReportController = require('../../controllers/summaryReportController');

router.route('/tables/data/:type')
  .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
    const { type } = req.params;  
    const isLive = type === 'live'; 

    SummaryReportController.handleGetSummaryReportData(req, res, isLive);
  });

module.exports = router;