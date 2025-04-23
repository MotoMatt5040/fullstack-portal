const Reports = require('../models/ReportModel');
const handleAsync = require('./asyncController');
const {
	STATE_ABBREVIATIONS,
	OTHER_ABBREVIATIONS,
} = require('../config/abbreviations');

const cleanQueryParam = (value) => {
	if (value === 'undefined' || value === 'null' || value === '')
		return undefined;
	return value;
};

const calculateInterviewerStats = (interviewerData, project, cph) => {
	// NOTE: cph is the gpcph for live projects and the actual cph for historic projects
	const threshold = cph * 0.8;

	// This is an accumulator object to holds the stats for each interviewer
	const data = interviewerData.reduce(
		(acc, interviewer) => {
			acc.realHours += interviewer.hrs;
			// Skip interviewer if cms is 0 and their hours are less than half of cph
			// if (interviewer.cms === 0 && interviewer.hrs < project.cph * 0.5) {
			// 	return acc; // Skip this interviewer
			// }

			// NOTE: This is a really big if statement, watch your brackets
			// Functionality: If the interviewer is not part of the project, skip them
			// If the interviewer projectId is not the same as the projectId, skip them
			// If the interviewer is part of the project, check if the recDate is the same as the project recDate
			if (
				interviewer.projectId !== project.projectId ||
				(interviewer.recDate &&
					interviewer.recDate.getTime() !== project.recDate.getTime())
			){ 
				return acc;
			}

			acc.totalHrs += interviewer.hrs;

			// Add hours to the accumulator zcms whwere interviewer cms is 0
			if (interviewer.cms === 0) {
				acc.zcms += interviewer.hrs;
			}
			// Add hours to the accumulator onVar where interviewer cph is on variance (within 80%)
			else if (interviewer.cph >= threshold && interviewer.cph < cph) {
				acc.onVar += interviewer.hrs;
			}
			// Add hours to the accumulator offCph where interviewer cph is off variance (less than 80%)
			else if (interviewer.cph < threshold) {
				acc.offCph += interviewer.hrs;
			}
			// Add hours to the accumulator onCph where interviewer cph is on cph (greater than or equal to gpcph)
			else if (interviewer.cph >= cph) {
				acc.onCph += interviewer.hrs;
			}
			else {
				console.warn(
					'Interviewer skipped from categories:', 
					'\ncms > 0:', interviewer.cms > 0,
					'\nonVar:', interviewer.cph >= threshold && interviewer.cph < gpcph,
					'\noffCph:', interviewer.cph < threshold,
					'\nonCph:', interviewer.cph >= gpcph,
					'\nprojectId:', interviewer.projectId,
					interviewer
				);
				acc.unclassified += interviewer.hrs;
			}

			// When finished iterating through the data, the accumulator returns an object. In this case it is our interviewer data with the added stats
			// Added stats: totalHrs, offCph, onCph, onVar, zcms
			return acc;
		},
		{ totalHrs: 0, offCph: 0, onCph: 0, onVar: 0, zcms: 0, realHours: 0 }
	);
	// console.log(data);

	return data;
};

const handleGetReportData = handleAsync(async (req, res) => {
	const projectId = cleanQueryParam(req.query?.projectId);
	const startDate = cleanQueryParam(req.query?.startdate);
	const endDate = cleanQueryParam(req.query?.enddate);
	const isLive = req.params?.type === 'live';

	const data = isLive
		? await Reports.getLiveReportData(projectId)
		: await Reports.getHistoricProjectReportData(projectId, startDate, endDate);

	const interviewerData = isLive
		? await Reports.getLiveInterviewerData(projectId)
		: await Reports.getHistoricInterviewerData(projectId, startDate, endDate);

	// Check if the data is 499, which means the server canceled the request in the withDbConnection function (most likely)
	// NOTE: This does need to be changed, returning a 499 is not generally a good idea as that signifies an error, and in this case
	// this is the intended functionality. This is just a placeholder for now.
	if (data === 499 || interviewerData === 499 || !data || !interviewerData)
		return res.status(499).json({ msg: 'Server canceled request' });

	// Check if the data is empty, if so return a 204 No Content response
	if (data.length === 0 || interviewerData.length === 0) {
		return res.status(204).json({ msg: 'No data found' });
	}

	// This called the function above that creates and accumulator to iterate through the data
	const result = data.map((project) => {
		let cph;
		if (isLive) 
			cph = project.gpcph ?? 0;
		else
			cph = project.cph ?? 0;
		const { totalHrs, offCph, onCph, onVar, zcms } = calculateInterviewerStats(
			interviewerData,
			project,
			cph
		);
		let abbreviatedProjName = project.projName ?? '';

		// First replace the state names with their abbreviations
		Object.keys(STATE_ABBREVIATIONS).forEach((state) => {
			const regex = new RegExp(`\\b${state}\\b`, 'gi');
			if (regex.test(abbreviatedProjName)) {
				abbreviatedProjName = abbreviatedProjName.replace(
					regex,
					STATE_ABBREVIATIONS[state]
				);
			}
		});

		// Then replace the other abbreviations with their abbreviations
		Object.keys(OTHER_ABBREVIATIONS).forEach((other) => {
			const regex = new RegExp(`\\b${other}\\b`, 'gi');
			if (regex.test(abbreviatedProjName)) {
				abbreviatedProjName = abbreviatedProjName.replace(
					regex,
					OTHER_ABBREVIATIONS[other]
				);
			}
		});

		// Finally, if the project name is still too long, extract the state name from it
		const stateNameMatches = abbreviatedProjName.match(/[A-Za-z\s]+/);
		if (stateNameMatches && stateNameMatches.length > 0) {
			const stateName = stateNameMatches[0].trim();
			if (STATE_ABBREVIATIONS[stateName]) {
				abbreviatedProjName = STATE_ABBREVIATIONS[stateName];
			}
		}

		// If the project name is still too long, truncate it to 15 characters (this should only happen if there isnt a state name or if the project name is too long after abbreviating)
		if (abbreviatedProjName.length > 15) {
			abbreviatedProjName = abbreviatedProjName.slice(0, 15);
		}

		const mphThreshold = project.projectId.endsWith('C') ? 18 : 22;
		const offCphThreshold = project.hrs * 0.2;
		const zcmsThreshold = project.hrs * 0.05;

		// This is to make sure the date is in the correct format for the frontend
		// recDate will be YYYY-MM-DD format while abbreviatedDate will be MM/DD format
		const recDate = new Date(project.recDate);
		const month = String(recDate.getMonth() + 1).padStart(2, '0');
		const day = String(recDate.getDate()).padStart(2, '0');

		// This is the final updated object that gets returned to result, which is then returned to the front end.
		const update = {
			...project, // ...project just means all previous data in project + everything specified after
			recDate: recDate.toISOString().split('T')[0], // This is just to keep the date in ISO format... looks a little cleaner
			abbreviatedDate: `${month}/${day}`, // this is the actual displayed date
			projName: abbreviatedProjName,
			totalHrs: totalHrs.toFixed(2),
			offCph: offCph.toFixed(2),
			onCph: onCph.toFixed(2),
			onVar: onVar.toFixed(2),
			zcms: zcms.toFixed(2),
			mphThreshold: mphThreshold.toFixed(2),
			offCphThreshold: offCphThreshold.toFixed(2),
			zcmsThreshold: zcmsThreshold.toFixed(2),
		};

		return update;
	});

	res.status(200).json(result);
});

const handleGetLiveInterviewerData = handleAsync(async (req, res) => {
	const data = await projectReports.getLiveInterviewerData();
	if (data.length === 0) {
		return res.status(204).json({ msg: 'No data found' });
	}
	res.status(200).json(data);
});

module.exports = {
	handleGetReportData,
	handleGetLiveInterviewerData,
};
