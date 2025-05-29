const handleAsync = require('./asyncController');
const ProjectInfo = require('../services/ProjectInfo');
const QuotaServices = require('../services/QuotaServices');
const VoxcoApi = require('../services/VoxcoApi');
const { cleanQueryParam } = require('../utils/CleanQueryParam');
// Add unused

const buildPhoneStructure = async (project, token, dataStructure) => {
  const phone = await QuotaServices.getPhoneQuotas(project.k_Id, token);
  const structure = {};

  for (const item of phone) {
    const {
      Position: StratumId,
      Criterion,
      Label,
      Quota: Objective,
      Frequence: Frequency,
      Unused,
    } = item;

    const newLabel = Label.replace(/\((?:T|P|MIN|MAX)?\s*:?\s*\d+\)/gi, '')
      .trim()
      .replace(/\s{2,}/g, ' ');

    // Extract TotalObjective from Label
    const matches = [
      ...Label.matchAll(/\((?:(?:MIN|MAX|T)\s*:?\s*)?(\d+)\)/gi),
    ];

    const TotalObjective =
      matches.length > 0 ? parseInt(matches[matches.length - 1][1], 10) : 0;

    let modifiedCriterion = Criterion.replace(/ AND STYPE=\d+/, '');
    modifiedCriterion = modifiedCriterion.replace(' AND VTYPE=1', '');

    // Update structure
    structure[modifiedCriterion] = {
      StratumId,
      Label: newLabel,
      Objective,
      Frequency,
      Unused,
      TotalObjective,
    };

    // Update total
    if (!dataStructure.total[modifiedCriterion]) {
      dataStructure.total[modifiedCriterion] = {
        Label: newLabel,
        StratumId,
        Objective: 0,
        Frequency: 0,
        Unused,
        TotalObjective,
      };
    }
    if (dataStructure.total[modifiedCriterion].TotalObjective === 0) {
      dataStructure.total[modifiedCriterion].TotalObjective = TotalObjective;
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
};

const buildWebStructure = async (projectId, dataStructure) => {
  const web = await QuotaServices.getWebQuotas(projectId);

  web.forEach(
    ({ StratumId, Criterion, Label, Objective, Frequency, Unused }) => {
      const newLabel = Label.replace(/\((?:T|P|MIN|MAX)?\s*:?\s*\d+\)/gi, '')
        .trim()
        .replace(/\s{2,}/g, ' ');

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
          Unused,
          TotalObjective,
        };
      }

      if (!dataStructure[type]) dataStructure[type] = {};

      dataStructure[type][modifiedCriterion] = {
        StratumId,
        Label: newLabel,
        Objective,
        Frequency,
        Unused,
        TotalObjective,
      };

      if (!dataStructure.total[modifiedCriterion]) {
        dataStructure.total[modifiedCriterion] = {
          Label: newLabel,
          StratumId,
          Objective: 0,
          Frequency: 0,
          Unused,
          TotalObjective,
        };
      }
      dataStructure.total[modifiedCriterion].Frequency += Frequency;
    }
  );

  // Handle merging `unknown` into a known key
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
    Object.keys(structure).forEach((subKey) => {
      const { StratumId, Label, Objective, Frequency, TotalObjective } =
        structure[subKey];

      const toDo = TotalObjective - Frequency;
      let objPercent = 0;
      let totalPercent = 0;
      let globalPercent = 0;
      let stypePercent = 0;
      let currentGlobalPercent = 0;
      let currentStypePercent = 0;

      if (subKey === 'total') {
        if (structure.total.TotalObjective > 0) {
          objPercent = (TotalObjective * 100) / structure.total.TotalObjective;
        } else {
          console.log('No Objective found for total');
        }

        if (dataStructure.total.total.Frequency > 0) {
          currentStypePercent =
            (Frequency * 100) / dataStructure.total.total.Frequency;
        }

        dataStructure[key].total['Obj%'] = objPercent.toFixed(1);
        dataStructure[key].total['Freq%'] = currentStypePercent.toFixed(1);
        dataStructure[key].total['To Do'] = toDo;

        return;
      }

      if (dataStructure.total[subKey].TotalObjective > 0) {
        globalPercent = (
          (Frequency * 100) /
          dataStructure.total[subKey].TotalObjective
        ).toFixed(1);
      }

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
            (TotalObjective * 100) /
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
        if (structure.total.TotalObjective > 0) {
          objPercent = (
            (TotalObjective * 100) /
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
      }

      structure[subKey]['To Do'] = toDo;
      structure[subKey]['Obj%'] = objPercent;
      structure[subKey]['%'] = totalPercent;
      structure[subKey]['G%'] = globalPercent;
      structure[subKey]['S%'] = stypePercent;
      structure[subKey]['CG%'] = currentGlobalPercent;
      structure[subKey]['Freq%'] = currentStypePercent;
      dataStructure[key][subKey] = structure[subKey];
    });
  });
};

const restructureByQuota = (dataStructure, isInternalUser) => {
  const result = {};
  const skipRowsByCriterion = [
    'TZONE',
    'VTYPE',
    'TFLAG',
    'PREL',
    'SOURCE',
    'STYPE',
    'LNREL',
    'CNREL',
    '>',
  ];
  const skipRowsByLabel = ['Sample'];

  Object.entries(dataStructure).forEach(([type, quotas]) => {
    if (typeof quotas !== 'object') return;

    Object.entries(quotas).forEach(([quotaKey, data]) => {
      if (!isInternalUser) {
        const shouldSkip =
          skipRowsByCriterion.some((criterion) =>
            quotaKey.includes(criterion)
          ) ||
          (skipRowsByLabel.length &&
            skipRowsByLabel.some((label) => data.Label.includes(label)));

        if (shouldSkip) return;
      }

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
  const isInternalUser = req?.query?.isInternalUser === 'true';
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

  const mergedRows = restructureByQuota(dataStructure, isInternalUser);
  const visibleStructures = Object.keys(dataStructure);
  return res.status(200).json({ mergedRows, visibleStructures });
});

const handleGetProjectList = handleAsync(async (req, res) => {
  const userId = cleanQueryParam(req?.query?.userId);
  const projects = await QuotaServices.getProjectsList(userId);
  if (!projects) {
    return res.status(404).json({ message: 'Problem getting projects' });
  }
  res.status(200).json(projects);
});

module.exports = { handleGetQuotas, handleGetProjectList };
