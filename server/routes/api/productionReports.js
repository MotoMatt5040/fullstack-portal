const express = require('express');
const router = express.Router();
const ProductionReportController = require('../../controllers/productionReportController');
const ROLES_LIST = require('../../config/rolesList');
const verifyRoles = require('../../middleware/verifyRoles');

// Get all tableBuilderPlaceholders
router.route('/')
    .get(verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Manager), (req, res) => {
        ProductionReportController.handleGetProductionReportData(req, res);
    });

module.exports = router;