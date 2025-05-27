const handleAsync = require('./asyncController');
const ProjectInfo = require('../services/ProjectInfo');
const QuotaServices = require('../services/QuotaServices');
const VoxcoApi = require('../services/VoxcoApi');

const buildPhoneStructure = async (project, token, dataStructure) => {
	const phone = await QuotaServices.getPhoneQuotas(project.k_Id, token);
	// const structure = phone.reduce(
	// 	(
	// 		acc,
	// 		{
	// 			Position: StratumId,
	// 			Criterion,
	// 			Label,
	// 			Quota: Objective,
	// 			Frequence: Frequency,
	// 		}
	// 	) => {
	// 		// Check if Criterion is STYPE
	// 		// if (/^STYPE=\d$/.test(Criterion.trim())) {
	// 		// Check for the Objective in parentheses on STYPE
	// 		const matches = [...Label.matchAll(/\((\d+)\)/g)];
	// 		const TotalObjective =
	// 			matches.length > 0 ? parseInt(matches[matches.length - 1][1], 10) : 0;
	// 		// if (obj > 0) Objective = obj;
	// 		// }

	// 		let modifiedCriterion = Criterion.replace(/ AND STYPE=\d+/, '');
	// 		modifiedCriterion = modifiedCriterion.replace(' AND VTYPE=1', '');

	// 		if (!total[modifiedCriterion]) {
	// 			total[modifiedCriterion] = 0;
	// 		}

	// 		total[modifiedCriterion] += Frequency;

	// 		acc[modifiedCriterion] = {
	// 			StratumId,
	// 			Label,
	// 			Objective,
	// 			Frequency,
	// 			TotalObjective,
	// 		};

	// 		return acc;
	// 	},
	// 	{}
	// );

	const structure = {};

	for (const item of phone) {
		const {
			Position: StratumId,
			Criterion,
			Label,
			Quota: Objective,
			Frequence: Frequency,
		} = item;

		// Extract TotalObjective from Label
		const matches = [...Label.matchAll(/\((?:MIN|MAX)?\s*(\d+)\)/gi)];
		const TotalObjective =
			matches.length > 0 ? parseInt(matches[matches.length - 1][1], 10) : 0;
			// console.log(TotalObjective, Label, matches);

		let modifiedCriterion = Criterion.replace(/ AND STYPE=\d+/, '');
		modifiedCriterion = modifiedCriterion.replace(' AND VTYPE=1', '');

		// Update structure
		structure[modifiedCriterion] = {
			StratumId,
			Label,
			Objective,
			Frequency,
			TotalObjective,
		};

		// Update total
		if (!dataStructure.total[modifiedCriterion]) {
			dataStructure.total[modifiedCriterion] = {
				Label,
				StratumId,
				Objective: 0,
				Frequency: 0,
				TotalObjective,
			};
		}
		if (!modifiedCriterion.includes('STYPE') && !project.name.endsWith('COM')) {
			dataStructure.total[modifiedCriterion].Frequency += Frequency;
		}
	}

	let type;
	if (project.name.endsWith('C')) {
		type = 'cell';
		dataStructure.total.total.TotalObjective +=
			structure['STYPE=2'].TotalObjective;
		dataStructure.total['STYPE=2'] = structure['STYPE=2'];
		dataStructure.total.total.Frequency += structure['STYPE=2'].Frequency;
		structure['total'] = structure['STYPE=2'];
	} else if (project.name.endsWith('COM')) {
		type = 'com';
	} else {
		dataStructure.total.total.TotalObjective +=
			structure['STYPE=1'].TotalObjective;
		structure['total'] = structure['STYPE=1'];
		dataStructure.total['STYPE=1'] = structure['STYPE=1'];
		dataStructure.total.total.Frequency += structure['STYPE=1'].Frequency;
		type = 'landline';
	}

	dataStructure[type] = structure;
	// return { type, structure };
};

// const buildWebStructure = async (projectId) => {
// 	const web = await QuotaServices.getWebQuotas(projectId);
// 	const structure = {};
// 	// The data for web needs the structure built inline as the data is all in one set.
// 	web.forEach(({ StratumId, Criterion, Label, Objective, Frequency }) => {
// 		// if (type === 'unknown') return;

// 		const matches = [...Label.matchAll(/\((\d+)\)/g)];
// 		const TotalObjective =
// 			matches.length > 0 ? parseInt(matches[matches.length - 1][1], 10) : 0;

// 		let modifiedCriterion = Criterion.replace(/ AND STYPE=\d+/, '');
// modifiedCriterion = modifiedCriterion.replace(' AND VTYPE=1', '');

// 		const stypeMatch = Criterion.match(/STYPE=(\d+)/i);
// 		const stype = stypeMatch ? stypeMatch[1] : null;

// 		let type;
// 		switch (stype) {
// 			case '3':
// 				type = 'panel';
// 				break;
// 			case '4':
// 				type = 't2w';
// 				break;
// 			case '5':
// 				type = 'email';
// 				break;
// 			case '6':
// 				type = 'mailer';
// 				break;
// 			default:
// 				type = 'unknown';
// 		}

// 		if (!structure[type]) structure[type] = {};

// 		structure[type][modifiedCriterion] = {
// 			StratumId,
// 			Label,
// 			Objective,
// 			Frequency,
// 			TotalObjective,
// 		};
// 	});

// 	const keys = Object.keys(structure);

// 	// If unknown is a key and theres only less than 3 keys, merge it with the other key
// 	// This is to handle the case where we have a single unknown key and one other key
// 	// We can merge them into a single structure because we have a single known STYPE.
// 	// This means that the projects is just one STYPE. We don't care what the STYPE is at the moment.
// 	if (keys.includes('unknown') && keys.length < 3) {
// 		const knownKey = keys.find((k) => k !== 'unknown');
// 		if (structure[knownKey].length < 3) {
// 			for (const subKey in structure[knownKey]) {
// 				if (subKey.startsWith('STYPE=')) {
// 					console.log('Deleting STYPE from structure');
// 					delete structure[knownKey][subKey];
// 				}
// 			}
// 		}

// 		if (knownKey && structure[knownKey].length < 1) {
// 			// structure.total = {
// 			// 	...structure[knownKey],
// 			// 	...structure.unknown,
// 			// };
// 			structure[knownKey] = {
// 				...structure[knownKey],
// 				...structure.unknown,
// 			};
// 		}
// 		// Delete the old structures from the object
// 		// This is to prevent the unknown structure from being returned in the final result
// 		// console.log(structure.unknown)
// 		delete structure.unknown;
// 	}

// 	// console.log(structure);
// 	return structure;
// };

const buildWebStructure = async (projectId, dataStructure) => {
	const web = await QuotaServices.getWebQuotas(projectId);

	web.forEach(({ StratumId, Criterion, Label, Objective, Frequency }) => {
		const matches = [...Label.matchAll(/\((\d+)\)/g)];
		const TotalObjective =
			matches.length > 0 ? parseInt(matches[matches.length - 1][1], 10) : 0;

		let modifiedCriterion = Criterion.replace(/ AND STYPE=\d+/, '');
		modifiedCriterion = modifiedCriterion.replace(' AND VTYPE=1', '');
		if (modifiedCriterion === 'STYPE=2') {
			return;
		}

		const stypeMatch = Criterion.match(/STYPE=(\d+)/i);
		const stype = stypeMatch ? stypeMatch[1] : null;

		let type;
		switch (stype) {
			case '3':
				type = 'panel';
				break;
			case '4':
				type = 't2w';
				break;
			case '5':
				type = 'email';
				break;
			case '6':
				type = 'mailer';
				break;
			default:
				type = 'unknown';
		}

		if (modifiedCriterion.includes('STYPE') && type !== 'unknown') {
			dataStructure.total.total.TotalObjective += TotalObjective;
			dataStructure.total.total.Frequency += Frequency;
			dataStructure[type].total = {
				Label: 'Total',
				StratumId: 0,
				Objective: TotalObjective,
				Frequency,
				TotalObjective,
			};
			// console.log('included', stype)
			// dataStructure[`STYPE=${stype}`] = {}
			// console.log(modifiedCriterion,
			// 	Criterion,
			// 	Label,
			// 	Objective,
			// 	Frequency
			// )
		}

		if (!dataStructure[type]) dataStructure[type] = {};
		// if (!dataStructure.total) dataStructure.total = {};

		dataStructure[type][modifiedCriterion] = {
			StratumId,
			Label,
			Objective,
			Frequency,
			TotalObjective,
		};

		if (!dataStructure.total[modifiedCriterion]) {
			dataStructure.total[modifiedCriterion] = {
				Label,
				StratumId,
				Objective: 0,
				Frequency: 0,
				TotalObjective,
			};
		}
		dataStructure.total[modifiedCriterion].Frequency += Frequency;
	});

	// Optional: Handle merging `unknown` into a known key
	const keys = Object.keys(dataStructure);
	if (keys.includes('unknown') && keys.length < 3) {
		const knownKey = keys.find((k) => k !== 'unknown');
		if (Object.keys(dataStructure[knownKey]).length < 3) {
			for (const subKey in dataStructure[knownKey]) {
				if (subKey.startsWith('STYPE=')) {
					delete dataStructure[knownKey][subKey];
				}
			}
		}

		if (knownKey && Object.keys(dataStructure[knownKey]).length < 1) {
			dataStructure[knownKey] = {
				...dataStructure[knownKey],
				...dataStructure.unknown,
			};
		}

		delete dataStructure.unknown;
	}
};

const calculateData = (dataStructure) => {
	Object.entries(dataStructure).forEach(([key, structure]) => {
		// if (key !== 'total') return;
		// console.log(key);
		let stype;
		switch (key) {
			case 'landline':
				stype = 'STYPE=1';
				break;
			case 'cell':
				stype = 'STYPE=2';
				break;
			case 'panel':
				stype = 'STYPE=3';
				break;
			case 't2w':
				stype = 'STYPE=4';
				break;
			case 'email':
				stype = 'STYPE=5';
				break;
			case 'mailer':
				stype = 'STYPE=6';
				break;
			case 'total':
				// return;
				break;
			default:
				return;
		}
		if (!structure) return;
		// console.log(structure);
		// console.log(key)
		// if (!dataStructure[key].total) {
		// 	dataStructure[key].total = {};
		// }
		// dataStructure[key].total['Freq%'] = 0;
		Object.keys(structure).forEach((subKey) => {
			// console.log(subKey)
			// console.log(`  └─ Subkey: ${subKey}`);
			const { StratumId, Label, Objective, Frequency, TotalObjective } =
				structure[subKey];
			// if (key ==='total') {
			// 	console.log(structure[subKey]);
			// }

			const toDo = TotalObjective - Frequency;
			let objPercent = 0;
			let totalPercent = 0;
			let globalPercent = 0;
			let stypePercent = 0;
			let currentGlobalPercent = 0;
			let currentStypePercent = 0;

			// const objPercent =
			// 	Objective > 0
			// 		? ((Frequency / structure[stype].TotalObjective) * 100).toFixed(1)
			// 		: 0;

			if (subKey === 'total') {
				if (structure.total.TotalObjective > 0) {
					objPercent = (Frequency * 100) / structure.total.TotalObjective;
					
				} else {
					console.log('No Objective found for total');
				}

				if (dataStructure.total.total.Frequency > 0) {
					currentStypePercent = (Frequency * 100) / dataStructure.total.total.Frequency;
				}

				dataStructure[key].total['Obj%'] = objPercent.toFixed(1);
				dataStructure[key].total['Freq%'] = currentStypePercent.toFixed(1);
				dataStructure[key].total['To Do'] = toDo;
				
				return;
			}

			// const totalPercent =
			// 	Objective > 0 ? ((Frequency / Objective) * 100).toFixed(1) : 0;
			// const globalPercent =
			// 	dataStructure.total[subKey]?.TotalObjective > 0
			// 		? (
			// 				(Frequency / dataStructure.total[subKey].TotalObjective) *
			// 				100
			// 		  ).toFixed(1)
			// 		: 0;
			// if (!dataStructure.total[subKey]) {
			// 	console.log('No dataStructure.total[subKey] found');
			// }

			if (dataStructure.total[subKey].TotalObjective > 0) {
				globalPercent = (
					(Frequency * 100) /
					dataStructure.total[subKey].TotalObjective
				).toFixed(1);
			}

			// if (!structure[stype]) {
			// 	console.log(`No structure[${stype}] found for key: ${key}`);
			// }

			// const stypePercent =
			// 	structure[stype]?.TotalObjective > 0
			// 		? ((Frequency / structure[stype].TotalObjective) * 100).toFixed(1)
			// 		: 0;

			if (dataStructure.total[subKey].Frequency > 0) {
				currentGlobalPercent = (
					(Frequency * 100) /
					dataStructure.total[subKey].Frequency
				).toFixed(1);
			}

			if (subKey !== stype && key !== 'total') {
				if (Objective > 0) {
					totalPercent = ((Frequency * 100) / Objective).toFixed(1);
				}

				if (structure[stype].TotalObjective > 0) {
					objPercent = (
						(Frequency * 100) /
						structure[stype].TotalObjective
					).toFixed(1);

					stypePercent = (
						(Frequency * 100) /
						structure[stype].TotalObjective
					).toFixed(1);
				}

				if (structure[stype].Frequency > 0) {
					currentStypePercent = (
						(Frequency * 100) /
						structure[stype].Frequency
					).toFixed(1);
				}
			} else if (subKey !== stype) {
				// console.log(subKey, structure[subKey]);
				// if (structure.total.TotalObjective > 0) {
					
				// }

				if (structure.total.TotalObjective > 0) {
					objPercent = (
						(Frequency * 100) /
						structure.total.TotalObjective
					).toFixed(1);
					totalPercent = (
						(Frequency * 100) /
						structure[subKey].TotalObjective
					).toFixed(1);
					stypePercent = (
						(Frequency * 100) /
						structure.total.TotalObjective
					).toFixed(1);
				}

				if (structure.total.Frequency > 0) {
					currentStypePercent = (
						(Frequency * 100) /
						structure.total.Frequency
					).toFixed(1);
				}
				// console.log(subKey, structure[subKey]);
				// console.log()
			}

			// const currentGlobalPercent =
			// 	dataStructure.total[subKey]?.Frequency > 0
			// 		? ((Frequency / dataStructure.total[subKey].Frequency) * 100).toFixed(
			// 				1
			// 		  )
			// 		: 0;

			// const currentStypePercent =
			// 	structure[stype]?.Frequency > 0
			// 		? ((Frequency / structure[stype].Frequency) * 100).toFixed(1)
			// 		: 0;

			structure[subKey]['To Do'] = toDo;
			structure[subKey]['Obj%'] = objPercent;
			structure[subKey]['%'] = totalPercent;
			structure[subKey]['G%'] = globalPercent;
			structure[subKey]['S%'] = stypePercent;
			structure[subKey]['CG%'] = currentGlobalPercent;
			structure[subKey]['Freq%'] = currentStypePercent;
			dataStructure[key][subKey] = structure[subKey];
			// console.log(dataStructure[key][subKey])

			// console.log(
			// 	`    └─ ${stype} - ${Label} - Objective: ${Objective}, Frequency: ${Frequency}, TotalObjective: ${TotalObjective}, To Do: ${toDo}, Obj%: ${objPercent}, Total%: ${totalPercent}, Global%: ${globalPercent}, Stype%: ${stypePercent}, CurrentGlobal%: ${currentGlobalPercent}, CurrentStype%: ${currentStypePercent}`
			// );

			// console.log(
			// 	`    └─ ${Label} - Objective: ${Objective}, Frequency: ${Frequency}`
			// );
		});
	});

	// console.log(dataStructure.cell)
};

const restructureByQuota = (dataStructure) => {
	const result = {};

	Object.entries(dataStructure).forEach(([type, quotas]) => {
		if (typeof quotas !== 'object') return; // skip non-objects

		Object.entries(quotas).forEach(([quotaKey, data]) => {
			if (!result[quotaKey]) {
				result[quotaKey] = {};
			}

			result[quotaKey][type] = data;
		});
	});

	return result;
};

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
	let projectIds = {};
	let dataStructure = {
		total: {
			total: {
				Label: 'Total',
				StratumId: 0,
				Objective: 0,
				Frequency: 0,
				TotalObjective: 0,
			},
		},
	};

	if (phoneProjects.length > 0) {
		await Promise.all(
			phoneProjects.map((project) =>
				buildPhoneStructure(project, token, dataStructure)
			)
		);
		// Run buildPhoneStructure for each phone project in parallel and wait for all to finish.
		// const results = await Promise.all(
		// 	phoneProjects.map((project) => buildPhoneStructure(project, token, dataStructure))
		// );

		// Loop through each result returned from buildPhoneStructure
		// for (const result of results) {
		// 	if (result) {
		// 		// Destructure the result into 'type' and 'structure'
		// 		const { type, structure } = result;

		// 		// Assign the structure to dataStructure using 'type' as the key
		// 		dataStructure[type] = structure;
		// 	}
		// }
	}

	const webProject = await ProjectInfo.getWebProjects(projectId);

	if (webProject.length > 0) {
		const webId = webProject[0]?.id;
		const webStructure = await buildWebStructure(webId, dataStructure);
		for (const type in webStructure) {
			dataStructure[type] = webStructure[type];
		}
	}
	calculateData(dataStructure);
	// console.log(Object.keys(dataStructure));
	// console.log(restructureByQuota(dataStructure));
	// delete dataStructure.com;

	const mergedRows = restructureByQuota(dataStructure);

	// console.log(dataStructure)
	// console.log('merged')
	// console.log(mergedRows);
	let emptyStructures = {};
	// console.log(mergedRows)
	return res.status(200).json({ mergedRows, emptyStructures });
	return mergedRows;

	// console.log(dataStructure.total)

	// notice we are not setting the dataStructure, object is JS are passed by reference, a return is not needed
	// calculateData(dataStructure);
	// console.log(dataStructure.total)
});

const _handleGetQuotas = handleAsync(async (req, res) => {
	const resd = await _handleGetQuotas(req, res);
	let emptyStructures = {};
	return res.status(200).json({ mergedRows: resd, emptyStructures });
	return;
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

	// const emptyStructures = {};
	// Object.entries(allStructures).forEach(([key, arr]) => {
	// 	emptyStructures[key] = arr.length === 0; // true if empty, false otherwise
	// });
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
