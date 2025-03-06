const ProductionReportModel = require('../models/ProductionReportModel');
const bcrypt = require('bcrypt');
const handleAsync = require('./asyncController');

const handleGetProductionReportData = handleAsync(async (req, res) => {
    const { projectid, recdate } = req.query;
    const data = await ProductionReportModel.getProductionReportData(projectid, recdate);
    res.status(200).json(data);
});

module.exports = { handleGetProductionReportData };