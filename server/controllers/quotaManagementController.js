const handleAsync = require('./asyncController');
const ProjectInfo = require('../services/ProjectInfo');
const QuotaServices = require('../services/QuotaServices');
const VoxcoApi = require('../services/VoxcoApi');

const handleGetQuotas = handleAsync(async (req, res) => {
	const apiUser = await VoxcoApi.refreshAccessToken();
	const token = apiUser.Token;
	if (!token) {
		return res
			.status(401)
			.json({ message: 'Unauthorized credentials for Voxco' });
	}

	const { projectId } = req.query;

	if (!projectId) {
		return res.status(400).json({ message: 'Project ID required' });
	}

	const phoneProjects = await ProjectInfo.getPhoneProjects(projectId);
	const webProject = await ProjectInfo.getWebProjects(projectId);
	const webId = webProject[0]?.id;

	let projectIds = {};
	let landlineStructure = [];
	let cellStructure = [];
	let comStructure = [];
	let webComStructure = [];
	let panelStructure = [];
	let t2wStructure = [];
	let stypeData = {
		landline: { Objective: 0, Frequency: 0 },
		cell: { Objective: 0, Frequency: 0 },
		panel: { Objective: 0, Frequency: 0 },
		t2w: { Objective: 0, Frequency: 0 },
	};
	let stypeObjectives = {
		landline: 0,
		cell: 0,
		panel: 0,
		t2w: 0,
		total: 0,
	};

	// You cant use a foreach loop for async/await operations
	// phoneProjects.forEach(async (project) => { will not work in this instance
	// for (const project of phoneProjects) { works but we can have multiple operations at once with the Promise.all instead
	// This allows all the async operations to run in parallel
	// const phone = await QuotaServices.getPhoneQuotas(phoneProjects[0].k_Id, token);
	await Promise.all(
		phoneProjects.map(async (project) => {
			const phone = await QuotaServices.getPhoneQuotas(project.k_Id, token);
			const selectedPhones = phone.map(
				({ Position, Criterion, Label, Quota, Frequence, ToDo }) => {
					if (/^STYPE=\d$/.test(Criterion.trim())) {
						if (project.name.endsWith('COM')) {
							stypeObjectives.total += Quota;
						} else {
							const parenMatch = Label.match(/\(([^)]+)\)/); // pulles the ### between parentheses
							if (parenMatch) {
								const obj = parseInt(parenMatch[1], 10);
								if (obj > 0) {
									switch (Criterion) {
										case 'STYPE=1':
											// landline
											stypeData.landline.Objective = obj;
											stypeData.landline.Frequency = Frequence;
											break;
										case 'STYPE=2':
											// cell
											stypeData.cell.Objective = obj;
											stypeData.cell.Frequency = Frequence;
											break;
									}
								}
							}
						}
						// just checking for STYPE=#
					}
					let modifiedCriterion = Criterion;
					if (project.name.endsWith('C')) {
						modifiedCriterion = Criterion.replace(' AND STYPE=2', '');
					}
					// if (project.name.endsWith('COM')) {
					// 	null;
					// }

					if (modifiedCriterion.includes('REGN'))
						modifiedCriterion = modifiedCriterion.replace(' AND VTYPE=1', '');
					return {
						StratumId: Position,
						Criterion: modifiedCriterion,
						Label,
						Objective: Quota,
						Frequency: Frequence,
						// ToDo,
						// Percent: Quota > 0 ? ((Frequence / Quota) * 100).toFixed(2) : 0,
					};
				}
			);

			// use ... to spread the array. Push only accepts single objects, this will push all the objects in the array
			if (project.name.length === 5) {
				projectIds['landline'] = project.k_Id;
				landlineStructure.push({
					StratumId: 0,
					Criterion: 'Total',
					Label: 'Total',
					Objective: stypeData.landline.Objective,
					Frequency: stypeData.landline.Frequency,
				});
				landlineStructure.push(...selectedPhones);
			} else if (project.name.endsWith('C')) {
				projectIds['cell'] = project.k_Id;
				cellStructure.push({
					StratumId: 0,
					Criterion: 'Total',
					Label: 'Total',
					Objective: stypeData.cell.Objective,
					Frequency: stypeData.cell.Frequency,
				});
				cellStructure.push(...selectedPhones);
			} else if (project.name.endsWith('COM')) {
				projectIds['com'] = project.k_Id;
				comStructure.push({
					StratumId: 0,
					Criterion: 'Total',
					Label: 'Total',
					Objective: stypeObjectives.total,
					Frequency: stypeData.cell.Frequency,
				});
				comStructure.push(...selectedPhones);
			}
		})
	);

	projectIds['web'] = webId;


	if (webId) {
		const web = await QuotaServices.getWebQuotas(projectIds['web']);
		const selectedWeb = web.map(
			({ StratumId, Criterion, Label, Objective, Frequency }) => {
				if (!comStructure.length > 0 && Criterion === '$Q>0') {
					stypeData.panel.Frequency = Frequency;
				}
				if (Objective === 0) {
					const parenMatch = Label.match(/\(([^)]+)\)/); // pulles the ### between parentheses
					if (parenMatch) {
						const obj = parseInt(parenMatch[1], 10);
						if (obj > 0) {
							Objective = obj;
						}
					}
				}
				if (/^STYPE=\d$/.test(Criterion.trim())) {
					// just checking for STYPE=#
					const parenMatch = Label.match(/\(([^)]+)\)/); // pulles the ### between parentheses
					if (parenMatch) {
						const obj = parseInt(parenMatch[1], 10);
						if (obj > 0) {
							switch (Criterion) {
								case 'STYPE=3':
									// panel
									stypeData.panel.Objective = obj;
									if (comStructure.length > 0) {
										stypeData.panel.Frequency = Frequency;
									} else {
										webComStructure.push({
											StratumId: 0,
											Criterion: 'Total',
											Label: 'Total',
											Objective: obj,
											Frequency: Frequency,
										});
									}
									
									panelStructure.push({
										StratumId: 0,
										Criterion: 'Total',
										Label: 'Total',
										Objective: obj,
										Frequency: stypeData.panel.Frequency,
									});
									break;
								case 'STYPE=4':
									// t2w
									stypeData.t2w.Objective = obj;
									stypeData.t2w.Frequency = Frequency;
									t2wStructure.push({
										StratumId: 0,
										Criterion: 'Total',
										Label: 'Total',
										Objective: obj,
										Frequency: Frequency,
									});
									break;
								case 'STYPE=5':
									// email
									// handle stype=5
									break;
								case 'STYPE=6':
									// mailer
									// handle stype=6
									break;
							}
						}
					}
				}

				return {
					StratumId,
					Criterion,
					Label,
					Objective,
					Frequency,
				};
			}
		);

		selectedWeb.forEach((variable) => {
			if (!comStructure.length > 0) {
				webComStructure.push(variable);
			}
			const stypeMatch = variable.Criterion.match(/STYPE=(\d+)/i);
			if (stypeMatch) {
				const stype = stypeMatch[1];
				variable.Criterion = variable.Criterion.replace(/ AND STYPE=\d+/i, '');

				switch (stype) {
					case '3': //panel
						panelStructure.push(variable);
						break;
					case '4': //t2w
						t2wStructure.push(variable);
						break;
					case '5': //email
						// handle stype=5
						break;
					case '6': //mailer
						// handle stype=6
						break;
				}
			} else if (
				!variable.Criterion.includes('TFLAG') &&
				!variable.Criterion.includes('STYPE=WR') &&
				!variable.Criterion.includes('$Q')
			) {
				panelStructure.push(variable);
			}
		});
	}

	const allStructures = {
		// com: comStructure,
		landline: landlineStructure,
		cell: cellStructure,
		panel: panelStructure,
		t2w: t2wStructure,
	};


	const totalMap = new Map();
	Object.values(allStructures).forEach((structure) => {
		structure.forEach(
			({ StratumId, Criterion, Label, Objective, Frequency }) => {
				if (!Criterion) return; // skip if Criterion is undefined/null

				if (Objective >= 1000 && comStructure.length > 0) {
					Objective -= 1000;
				}

				if (!totalMap.has(Criterion)) {
					totalMap.set(Criterion, {
						StratumId, // just take the first one seen
						Criterion,
						Label,
						Objective: 0,
						Frequency: 0,
					});
				}

				const entry = totalMap.get(Criterion);
				// entry.Objective += Objective;
				entry.Frequency += Frequency;
			}
		);
	});


	if (comStructure.length > 0) {
		comStructure.forEach(({ Criterion, Objective }) => {
			if (!Criterion) return;

			if (totalMap.has(Criterion)) {
				const entry = totalMap.get(Criterion);
				entry.Objective += Objective;
			}
		});
	} else if (webComStructure.length > 0) {
		webComStructure.forEach(({ Criterion, Objective }) => {
			if (!Criterion) return;
			if (totalMap.has(Criterion)) {
				const entry = totalMap.get(Criterion);
				entry.Objective += Objective;
			}
		});
	}

	const totalStructure = Array.from(totalMap.values());
	allStructures.total = totalStructure;
	const mergedRows = {};

	Object.entries(allStructures).forEach(([category, rows]) => {
		const stypeObjective =
			category !== 'total'
				? stypeData[category]?.Objective
				: totalMap.get('Total').Objective;
		const stypeFrequency =
			category !== 'total'
				? stypeData[category]?.Frequency
				: totalMap.get('Total').Frequency;

		rows.forEach((row) => {
			const key = row.Criterion;
			if (!mergedRows[key]) {
				mergedRows[key] = {
					total: { Objective: 0, Frequency: 0, '%': 0, 'To Do': 0 },
				};
			}
			if (!mergedRows[key][category]) {
				mergedRows[key][category] = {};
			}

			const label = row.Label.split(' (')[0];
			if (row?.Objective >= 1000 && comStructure.length > 0) {
				row.Objective -= 1000;
			}

			const objPercent =
				row?.Objective > 0
					? ((row.Objective / stypeObjective) * 100).toFixed(1)
					: 0;

			const totalPercent =
				row?.Objective > 0
					? ((row.Frequency / row.Objective) * 100).toFixed(1)
					: 0;

			const globalPercent =
				row?.Objective > 0
					? ((row.Frequency / totalMap.get(key).Objective) * 100).toFixed(1)
					: 0;

			const stypePercent =
				row.Objective > 0
					? ((row.Frequency / stypeObjective) * 100).toFixed(1)
					: 0;

			const currentGlobalPercent =
				row?.Objective > 0
					? ((row.Frequency / totalMap.get(key).Frequency) * 100).toFixed(1)
					: 0;
			const currentStypePercent =
				row.Objective > 0
					? ((row.Frequency / stypeFrequency) * 100).toFixed(1)
					: 0;

			const toDo = row.Objective - row.Frequency;
			if (row.Label !== 'Total') {
				mergedRows[key][category]['Freq%'] = currentStypePercent;
			} else {
				mergedRows[key][category]['Freq%'] = currentGlobalPercent;
			}

			mergedRows[key][category].Label = label;
			mergedRows[key][category].Objective = row?.Objective || 0;
			mergedRows[key][category]['Obj%'] = objPercent;
			mergedRows[key][category].Frequency = row.Frequency;
			mergedRows[key][category]['G%'] = globalPercent;
			mergedRows[key][category]['%'] = totalPercent;
			mergedRows[key][category]['S%'] = stypePercent;
			mergedRows[key][category]['CG%'] = currentGlobalPercent;

			mergedRows[key][category]['To Do'] = toDo;
		});
	});

	const emptyStructures = {};
	Object.entries(allStructures).forEach(([key, arr]) => {
		emptyStructures[key] = arr.length === 0; // true if empty, false otherwise
	});
	return res.status(200).json({ mergedRows, emptyStructures });
});

const handleGetProjectList = handleAsync(async (req, res) => {
	const projects = await QuotaServices.getProjectsList('');
	if (!projects) {
		return res.status(404).json({ message: 'Problem getting projects' });
	}
	res.status(200).json(projects);
});

module.exports = { handleGetQuotas, handleGetProjectList };
