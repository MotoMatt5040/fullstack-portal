const SummaryReports = require('../models/SummaryReportModel');
const handleAsync = require('./asyncController');
const { STATE_ABBREVIATIONS, OTHER_ABBREVIATIONS } = require('../config/abbreviations');

// TODO - Abbrv proj names
// TODO - If proj name too long, just extract state name

const calculateInterviewerStats = (interviewerData, project) => {
	const gpcph = project.gpcph || 0;
	const cph = project.cph || 0;
	const threshold = gpcph * 0.8;

	const data = interviewerData.reduce(
		(acc, interviewer) => {
			// Skip interviewer if cms is 0 and their hours are less than half of cph
			// if (interviewer.cms === 0 && interviewer.hrs < project.cph * 0.5) {
			// 	return acc; // Skip this interviewer
			// }
			if (
				interviewer.projectId === project.projectId &&
				(!interviewer.recDate ||
					interviewer.recDate.getTime() === project.recDate.getTime())
			) {
				acc.totalHrs += interviewer.hrs;

				if (interviewer.cms === 0) {
					acc.zcms += interviewer.hrs;
				} else if (interviewer.cph >= threshold && interviewer.cph < cph) {
					acc.onVar += interviewer.hrs;
				} else if (interviewer.cph < threshold) {
					acc.offCph += interviewer.hrs;
				} else if (interviewer.cph >= gpcph) {
					acc.onCph += interviewer.hrs;
				}
			}
			return acc;
		},
		{ totalHrs: 0, offCph: 0, onCph: 0, onVar: 0, zcms: 0 }
	);

	return data;
};

const handleGetSummaryReportData = handleAsync(async (req, res, isLive) => {
	const startDate = req?.query?.startdate || undefined;
	const endDate = req?.query?.enddate || undefined;
	
	const data = isLive
		? await SummaryReports.getLiveSummaryReportData()
		: await SummaryReports.getHistoricSummaryReportProjectData(startDate, endDate);
	
	const interviewerData = isLive
		? await SummaryReports.getLiveInterviewerData()
		: await SummaryReports.getHistoricSummaryReportInterviewerData(startDate, endDate);

	if (data.length === 0 || interviewerData.length === 0) {
		return res.status(204).json({ msg: 'No data found' });
	}

	const result = data.map((project) => {
		const { totalHrs, offCph, onCph, onVar, zcms } = calculateInterviewerStats(interviewerData, project);
		let abbreviatedProjName = project.projName || '';

    
    Object.keys(STATE_ABBREVIATIONS).forEach((state) => {
      const regex = new RegExp(`\\b${state}\\b`, 'gi'); 
      if (regex.test(abbreviatedProjName)) {
        abbreviatedProjName = abbreviatedProjName.replace(regex, STATE_ABBREVIATIONS[state]);
      }
    });

    Object.keys(OTHER_ABBREVIATIONS).forEach((other) => {
      const regex = new RegExp(`\\b${other}\\b`, 'gi'); 
      if (regex.test(abbreviatedProjName)) {
        abbreviatedProjName = abbreviatedProjName.replace(regex, OTHER_ABBREVIATIONS[other]);
      }
    });

    const stateNameMatches = abbreviatedProjName.match(/[A-Za-z\s]+/); 
    if (stateNameMatches && stateNameMatches.length > 0) {
      const stateName = stateNameMatches[0].trim();
      if (STATE_ABBREVIATIONS[stateName]) {
        abbreviatedProjName = STATE_ABBREVIATIONS[stateName];
      }
    }

		const mphThreshold = project.projectId.endsWith('C') ? 18 : 22;
		const offCphThreshold = project.hrs * 0.2;
		const zcmsThreshold = project.hrs * 0.05;

		const update = {
			...project,
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
	handleGetSummaryReportData,
	handleGetLiveInterviewerData,
};
