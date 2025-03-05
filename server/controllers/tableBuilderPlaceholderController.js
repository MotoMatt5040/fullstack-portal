console.log('controllers/tableBuilderPlaceholderController.js');
const tableBuilderPlaceholder = require('../models/tableBuilderPlaceholder');
const bcrypt = require('bcrypt');
const handleAsync = require('./asyncController');

const handleGetProductionReportData = handleAsync(async (req, res) => {
    const { projectid, recdate } = req.query;
    const data = await tableBuilderPlaceholder.getProductionReportData(projectid, recdate);
    res.status(200).json(data);
});

module.exports = { handleGetProductionReportData };