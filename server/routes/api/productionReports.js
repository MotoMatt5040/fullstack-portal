const express = require('express');
const router = express.Router();
const ProductionReportController = require('../../controllers/productionReportController');
const ROLES_LIST = require('../../config/rolesList');
const verifyRoles = require('../../middleware/verifyRoles');

router.route('/tables/data')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        console.log("Request received at /tables with query params:", req.query);
        ProductionReportController.handleGetProductionReportData(req, res);
    });

router.route('/tables/projects')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        console.log("Request received at /tables/projects with query params:", req.query);
        ProductionReportController.handleGetProjectsInDateRange(req, res);
    });

module.exports = router;