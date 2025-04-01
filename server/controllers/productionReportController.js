const ProductionReportModel = require('../models/ProductionReportModel');
const handleAsync = require('./asyncController');

const handleGetProductionReportData = handleAsync(async (req, res) => {
    // .trim() removes leading and trailing white space if needed
    const projectIds = req?.query?.projectIds 
        ? req.query.projectIds.split(',').map(id => id.trim()) 
        : undefined;
    const startDate = req?.query?.startdate || undefined;
    const endDate = req?.query?.enddate || undefined;
    const data = await ProductionReportModel.getProductionReportData(projectIds, startDate, endDate);
    if (data.length === 0) {
        return res.status(404).json({ msg: 'No data found' });
    }
    res.status(200).json(data);
});

const handleGetProjectsInDateRange = handleAsync(async (req, res) => {
    const startDate = req?.query?.startdate || undefined;
    const endDate = req?.query?.enddate || undefined;
    const data = await ProductionReportModel.getProjectsInDateRange(startDate, endDate);
    if (data.length === 0) {
        return res.status(404).json({ msg: 'No data found' });
    }
    res.status(200).json(data);
});

module.exports = { handleGetProductionReportData, handleGetProjectsInDateRange };