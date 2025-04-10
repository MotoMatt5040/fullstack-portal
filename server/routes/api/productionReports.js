const express = require('express');
const router = express.Router();
const ROLES_LIST = require('../../config/rolesList');
const verifyRoles = require('../../middleware/verifyRoles');
const ProductionReportController = require('../../controllers/productionReportController');

router.route('/tables/data')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        ProductionReportController.handleGetProductionReportData(req, res);
    });

router.route('/tables/projects')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        ProductionReportController.handleGetProjectsInDateRange(req, res);
    });

module.exports = router;