const {
    getHourlyProduction,
	getInterviewerIDList,
	getAllLiveProjects,
	getFilteredLiveProjects,
} = require('../models/LiveProductionModel');
const handleAsync = require('./asyncController');

// A lot of the handlers use projectid and location in their queries, so a handler is used to minimizes the amount of code needed
// to be written for each handler
const createHandler = (fetchFunction) => async (req, res) => {
	const { projectid, location } = req.query;
	const data = await fetchFunction(projectid, location);
	res.status(200).json(data);
};

const handleGetAllLiveProjects = async (req, res) => {
	const data = await getAllLiveProjects();
	res.status(200).json(data);
};

module.exports = {
	handleGetAllLiveProjects,
	handleGetHourlyProduction: createHandler(getHourlyProduction),
	handleGetFilteredLiveProjects: createHandler(getFilteredLiveProjects),
};

// const handleGetHourlyProduction = async (req, res) => {
//     const { projectid, location } = req.query;
//     const data = await getHourlyProduction(projectid, location);
//     res.status(200).json(data);
// };
//
// const handleGetLiveProjects = async (req, res) => {
//     const { projectid, location } = req.query;
//     const data = await getLiveProjects(projectid, location);
//     res.status(200).json(data);
// }
//
// const handleGetFilteredLiveProjects = async (req, res) => {
//     const { projectid, location } = req.query;
//     const data = await getFilteredLiveProjects(projectid, location);
//     res.status(200).json(data);
// }

// module.exports = { handleGetHourlyProduction, handleGetLiveProjects, handleGetAllLiveProjects, handleGetFilteredLiveProjects };
