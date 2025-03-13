const { getHourlyProduction, getInterviewerIDList, getLiveProjects } = require('../models/LiveProductionModel');
const handleAsync = require('./asyncController');

const handleGetHourlyProduction = async (req, res) => {
    const { projectid, location } = req.query;
    const data = await getHourlyProduction(projectid, location);
    res.status(200).json(data);
};

const handleGetLiveProjects = async (req, res) => {
    const { projectid, location } = req.query;
    const data = await getLiveProjects(projectid, location);
    res.status(200).json(data);
}

module.exports = { handleGetHourlyProduction, handleGetLiveProjects };