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
	let t2wStructure = [];
	let panelStructure = [];

	// You cant use a foreach loop for async/await operations
	// phoneProjects.forEach(async (project) => { will not work in this instance
	// for (const project of phoneProjects) { works but we can have multiple operations at once with the Promise.all instead
	// This allows all the async operations to run in parallel
	// const phone = await QuotaServices.getPhoneQuotas(phoneProjects[0].k_Id, token);
	await Promise.all(
		phoneProjects.map(async (project) => {
			const phone = await QuotaServices.getPhoneQuotas(project.k_Id, token);
			// const slimPhone = {

			// }
			// console.log(phone);
			//       const fs = require('fs');
			//       fs.writeFile(`phone ${project.k_Id}.json`, JSON.stringify(phone, null, 2), (err) => {
			//   if (err) {
			//     console.error('Error saving file:', err);
			//   } else {
			//     console.log('File saved successfully!');
			//   }
			// });
			const selectedPhones = phone.map(
				({ Position, Criterion, Label, Quota, Frequence, ToDo }) => {
					let modifiedCriterion = Criterion;
					if (project.name.endsWith('C')) {
						modifiedCriterion = Criterion.replace(' AND STYPE=2', '');
					}
					return {
						StratumId: Position,
						Criterion: modifiedCriterion,
						Label,
						// Objective: Quota,
						Frequency: Frequence,
						// ToDo,
						// Percent: Quota > 0 ? ((Frequence / Quota) * 100).toFixed(2) : 0,
					};
				}
			);

			// use ... to spread the array. Push only accepts single objects, this will push all the objects in the array
			if (project.name.length === 5) {
				projectIds['landline'] = project.k_Id;
				landlineStructure.push(...selectedPhones);
			} else if (project.name.endsWith('C')) {
				projectIds['cell'] = project.k_Id;

				cellStructure.push(...selectedPhones);
			} else if (project.name.endsWith('COM')) {
				projectIds['com'] = project.k_Id;
				// comStructure.push(...selectedPhones);
			}
		})
	);

	projectIds['web'] = webId;

	const web = await QuotaServices.getWebQuotas(projectIds['web']);
	const selectedWeb = web.map(
		({ StratumId, Criterion, Label, Objective, Frequency }) => ({
			StratumId,
			Criterion,
			Label,
			// Objective,
			Frequency,
			// ToDo: Objective - Frequency,
			// Percent: Objective > 0 ? ((Frequency / Objective) * 100).toFixed(2): 0,
		})
	);

	selectedWeb.forEach((variable) => {
		const stypeMatch = variable.Criterion.match(/AND STYPE=(\d+)/i);
		if (stypeMatch) {
			const stype = stypeMatch[1];
			variable.Criterion = variable.Criterion.replace(/ AND STYPE=\d+/i, '');

			switch (stype) {
				case '3':
					t2wStructure.push(variable);
					break;
				case '4':
					panelStructure.push(variable);
					break;
				case '5':
					// handle stype=5
					break;
				case '6':
					// handle stype=6
					break;
			}
		}
	});

	// selectedWeb.forEach((variable) => {
	// 	// variable.ToDo = variable.Objective - variable.Frequency;
	// 	// variable.Percent = (
	// 	// 	(variable.Frequency / variable.Objective) *
	// 	// 	100
	// 	// ).toFixed(2);
	// 	if (variable.Criterion.includes('STYPE=3')) {
	// 		t2wStructure.push(variable);
	// 	} else if (variable.Criterion.includes('STYPE=4')) {
	// 		panelStructure.push(variable);
	// 	} else if (variable.Criterion.includes('STYPE=5')) {
	// 	} else if (variable.Criterion.includes('STYPE=6')) {
	// 	}
	// });
	// console.log(t2wStructure);
	// console.log(web[135]);

	// console.log(web);
	// const d = QuotaManagement.getPhoneQuotas(projectIds['ll']);
	// const c = QuotaManagement.getPhoneQuotas(projectIds['c']);
	// console.log(d);
	// constole.log(c);
	//   console.log(Array.isArray(cellStructure));      // should be true
	// console.log(Array.isArray(comStructure));       // should be true
	// console.log(Array.isArray(landlineStructure));  // should be true

	// console.log(cellStructure.length, comStructure.length, landlineStructure.length);

	// console.log(cellStructure[0]);
	// console.log(comStructure[0]);
	// console.log(landlineStructure[0]);

	// // For a deeper structural check:
	// function keysOfFirstItem(arr) {
	//   return arr.length ? Object.keys(arr[0]) : [];
	// }

	// console.log(keysOfFirstItem(cellStructure));
	// console.log(keysOfFirstItem(comStructure));
	// console.log(keysOfFirstItem(landlineStructure));
	// console.log(Object.keys(cellStructure[0]));
	// console.log(Object.keys(comStructure[0]));
	// console.log(Object.keys(landlineStructure[0]));

	const rowCount = (
		Math.max(
			landlineStructure.length,
			cellStructure.length,
			comStructure.length,
			t2wStructure.length,
			panelStructure.length
		) + 1
	).toString();
	console.log(rowCount);

//all row counts
console.log(
		landlineStructure.length,
		cellStructure.length,
		comStructure.length,
		t2wStructure.length,
		panelStructure.length)

	const allStructures = {
		com: comStructure,
		landline: landlineStructure,
		cell: cellStructure,
		t2w: t2wStructure,
		panel: panelStructure,
	};

	const mergedRows = {};
	totalStructure = [];

	function processRow(row) {
		const label = row.Label.split(' (')[0];
		const objText = (row.Label.match(/\(([^)]+)\)/) || [])[1] || '';
		const obj = parseFloat(objText) || 0;
		const percent = obj > 0 ? ((row.Frequency / obj) * 100).toFixed(2) : 0;
		const toDo = obj - row.Frequency;

		return {
			StratumId: row.StratumId,
			Label: label,
			'%': percent,
			Objective: obj,
			Frequency: row.Frequency,
			'To Do': toDo,
		};
	}

	Object.entries(allStructures).forEach(([category, rows]) => {
		rows.forEach((row) => {
			const key = row.Criterion;
			if (!mergedRows[key]) {
				mergedRows[key] = {
					total: { Objective: 0, Frequency: 0, '%': 0, 'To Do': 0 },
				};
			}

			const processed = processRow(row);
			mergedRows[key][category] = processed;

			// Update totals right here
			mergedRows[key].total.Objective += processed.Objective;
			mergedRows[key].total.Frequency += processed.Frequency;

			// Recalculate % and To Do for total on the fly
			mergedRows[key].total['%'] =
				mergedRows[key].total.Objective > 0
					? (
							(mergedRows[key].total.Frequency / mergedRows[key].total.Objective) *
							100
					  ).toFixed(2)
					: '0';
			mergedRows[key].total['To Do'] =
				mergedRows[key].total.Objective - mergedRows[key].total.Frequency;

			// Optionally copy some common fields (StratumId, Label) from the current row if needed
			mergedRows[key].total.StratumId = processed.StratumId;
			mergedRows[key].total.Label = processed.Label;
		});
	});
	// console.log(mergedRows);
	// console.log(mergedRows)
	const emptyStructures = {};
Object.entries(allStructures).forEach(([key, arr]) => {
  emptyStructures[key] = arr.length === 0;  // true if empty, false otherwise
});
	return res.status(200).json({mergedRows, emptyStructures});
	// return;

	const quotas = await User.getQuotas(type);
	if (!quotas) {
		return res.status(404).json({ message: 'Problem getting quotas' });
	}
	res.status(200).json(quotas);
});

const handleGetProjectList = handleAsync(async (req, res) => {
	// const { directorId } = req.query;
	// if (!directorId) {
	// 	return res.status(400).json({ message: 'Director ID required' });
	// }
	const projects = await QuotaServices.getProjectsList('');
	if (!projects) {
		return res.status(404).json({ message: 'Problem getting projects' });
	}
	res.status(200).json(projects);
});

module.exports = { handleGetQuotas, handleGetProjectList };
