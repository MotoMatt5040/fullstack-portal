const ProductionReportModel = require('../models/ProductionReportModel');
const handleAsync = require('./asyncController');

const handleGetProductionReportData = handleAsync(async (req, res) => {
    // .trim() removes leading and trailing white space if needed
    const projectid = req?.query?.projectid || undefined;
    const recdate = req?.query?.recdate || undefined;
    const data = await ProductionReportModel.getProductionReportData(projectid, recdate);
    if (data.length === 0) {
        return res.status(404).json({ msg: 'No data found' });
    }
    res.status(200).json(data);
});

module.exports = { handleGetProductionReportData };