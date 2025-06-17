const handleAsync = require('./asyncController');
const ProjectInfo = require('../services/ProjectInfo');
const QuotaServices = require('../services/QuotaServices');
const VoxcoApi = require('../services/VoxcoApi');
const { cleanQueryParam } = require('../utils/CleanQueryParam');

// Constants
const STATUS_MAP = {
  0: 'O',
  1: 'H',
  2: 'C',
  Open: 'O',
  'Half Open': 'H',
  Closed: 'C',
};

const STYPE_MAP = {
  1: 'Landline',
  2: 'Cell',
  3: 'Panel',
  4: 'T2W',
  5: 'Email',
  6: 'Mailer',
};

const STYPE_REVERSE_MAP = Object.fromEntries(
  Object.entries(STYPE_MAP).map(([key, value]) => [value, `STYPE=${key}`])
);

// Precompiled regex patterns
const REGEX_PATTERNS = {
  LABEL_CLEANUP: /\((?:T|P|MIN|MAX)?\s*:?\s*\d+\)/gi,
  WHITESPACE: /\s{2,}/g,
  TOTAL_OBJECTIVE: /\((?:(?:MIN|MAX|T)\s*:?\s*)?(\d+)\)/gi,
  STYPE_CRITERION: / AND STYPE=\d+/,
  VTYPE_CRITERION: / AND VTYPE=1/,
  STYPE_EXTRACT: /STYPE=(\d+)/i,
};

// Utility functions
const cleanLabel = (label) => {
  return label
    .replace(REGEX_PATTERNS.LABEL_CLEANUP, '')
    .trim()
    .replace(REGEX_PATTERNS.WHITESPACE, ' ');
};

const extractTotalObjective = (label) => {
  const matches = [...label.matchAll(REGEX_PATTERNS.TOTAL_OBJECTIVE)];
  return matches.length > 0 ? parseInt(matches[matches.length - 1][1], 10) : 0;
};

const cleanCriterion = (criterion) => {
  return criterion
    .replace(REGEX_PATTERNS.STYPE_CRITERION, '')
    .replace(REGEX_PATTERNS.VTYPE_CRITERION, '');
};

const calculatePercentages = (frequency, total, decimals = 1) => {
  return total > 0 ? ((frequency / total) * 100).toFixed(decimals) : '0.0';
};

// Create base data structure
const createBaseDataStructure = (label, newLabel) => ({
  Total: {
    Label: label,
    StratumId: 0,
    Objective: 0,
    Frequency: 0,
    Unused: 0,
    TotalObjective: 0,
    Status: 'C',
  },
  Phone: {
    Total: {
      Label: newLabel,
      StratumId: 0,
      Objective: 0,
      Frequency: 0,
      Unused: 0,
      TotalObjective: 0,
      Status: 'C',
    },
  },
});

const createWebDataStructure = (label) => ({
  Total: {
    Label: label,
    StratumId: 0,
    Objective: 0,
    Frequency: 0,
    Unused: 0,
    TotalObjective: 0,
    Status: 'C',
  },
  Web: {
    Total: {
      Label: label,
      StratumId: 0,
      Objective: 0,
      Frequency: 0,
      Unused: 0,
      TotalObjective: 0,
      Status: 'C',
    },
  },
});

const buildPhoneStructure = async (project, token, data, visibleStypes) => {
  const phone = await QuotaServices.getPhoneQuotas(project.k_Id, token);

  const projectTypeFallback = project.name.endsWith('C')
    ? 'Cell'
    : project.name.endsWith('COM')
    ? 'com'
    : 'Landline';

  if (
    projectTypeFallback !== 'com' &&
    !visibleStypes.Phone.includes(projectTypeFallback)
  ) {
    visibleStypes.Phone.push(projectTypeFallback);
  }

  const structure = new Map();

  for (const item of phone) {
    const {
      Position: StratumId,
      Criterion,
      Label,
      Quota: Objective,
      Frequence: Frequency,
      Unused,
      Status,
    } = item;

    const stypeMatch = Criterion.match(REGEX_PATTERNS.STYPE_EXTRACT);
    const subType = stypeMatch ? STYPE_MAP[stypeMatch[1]] : projectTypeFallback;

    // --- FIX: Prevent web types from being processed in the phone structure ---
    const webTypes = ['Panel', 'T2W', 'Email', 'Mailer'];
    if (webTypes.includes(subType)) {
      continue; // Skip this iteration if it's a web type
    }
    // --- END FIX ---

    if (subType && !visibleStypes.Phone.includes(subType)) {
      visibleStypes.Phone.push(subType);
    }

    const newLabel = cleanLabel(Label);
    const newStatus = STATUS_MAP[Status] || 'Unknown';

    // let newStatus = STATUS_MAP[Status] || 'Unknown';
    // if (newLabel.includes('*')) {
    //   newStatus = '-'; // Force status to Closed if label contains '*'
    // }

    const TotalObjective = extractTotalObjective(Label);
    const modifiedCriterion = cleanCriterion(Criterion);

    if (!data[modifiedCriterion]) {
      data[modifiedCriterion] = createBaseDataStructure(Label, newLabel);
    }

    const structureEntry = {
      StratumId,
      Label: newLabel,
      Objective,
      Frequency,
      Unused,
      TotalObjective,
      Status: newStatus,
    };

    structure.set(modifiedCriterion, structureEntry);

    if (data[modifiedCriterion].Total.TotalObjective === 0) {
      data[modifiedCriterion].Total.TotalObjective = TotalObjective;
      data[modifiedCriterion].Phone.Total.TotalObjective = TotalObjective;
    }

    if (!modifiedCriterion.includes('STYPE') && subType !== 'com') {
      data[modifiedCriterion].Total.Frequency += Frequency;
      data[modifiedCriterion].Phone.Total.Frequency += Frequency;
    }

    data[modifiedCriterion].Phone[subType] = structureEntry;
  }

  const updateTotals = (stypeKey, typeKey) => {
    const stypeData = structure.get(stypeKey);
    if (!stypeData) return;

    data[stypeKey].Total = stypeData;
    data.totalRow.Total.TotalObjective += stypeData.TotalObjective;
    data.totalRow.Total.Frequency += stypeData.Frequency;
    data.totalRow.Phone.Total.Frequency += stypeData.Frequency;

    data.totalRow.Phone[typeKey] = {
      TotalObjective: stypeData.TotalObjective,
      Frequency: stypeData.Frequency,
    };
  };

  if (projectTypeFallback === 'Cell') {
    updateTotals('STYPE=2', 'Cell');
  } else if (projectTypeFallback === 'Landline') {
    updateTotals('STYPE=1', 'Landline');
  }
};

const buildWebStructure = async (projectId, data, visibleStypes) => {
  const web = await QuotaServices.getWebQuotas(projectId);
  data.totalRow.Web = { Total: { Frequency: 0 } };
  visibleStypes.Web = [];

  for (const item of web) {
    const {
      StratumId,
      Criterion,
      Label,
      Objective,
      Frequency,
      Unused,
      Status,
    } = item;

    const stypeMatch = Criterion.match(REGEX_PATTERNS.STYPE_EXTRACT);
    const stypeId = stypeMatch ? stypeMatch[1] : null;

    if (stypeId === '1' || stypeId === '2') {
      continue;
    }

    const newLabel = cleanLabel(Label);
    const newStatus = STATUS_MAP[Status] || 'Unknown';
    const TotalObjective = extractTotalObjective(Label);
    const modifiedCriterion = cleanCriterion(Criterion);
    const type = stypeId ? STYPE_MAP[stypeId] : 'unknown';

    if (!data[modifiedCriterion]) {
      data[modifiedCriterion] = createWebDataStructure(Label);
    } else if (!data[modifiedCriterion].Web) {
      data[modifiedCriterion].Web = {
        Total: createWebDataStructure(Label).Web.Total,
      };
    }

    if (modifiedCriterion.includes('STYPE') && type !== 'unknown') {
      if (!visibleStypes.Web.includes(type)) visibleStypes.Web.push(type);
      data.totalRow.Total.TotalObjective += TotalObjective;
      data.totalRow.Total.Frequency += Frequency;
      data.totalRow.Web.Total.Frequency += Frequency;

      data.totalRow.Web[type] = {
        TotalObjective,
        Frequency,
      };
    }

    data[modifiedCriterion].Total.Frequency += Frequency;
    data[modifiedCriterion].Total.TotalObjective = TotalObjective;
    data[modifiedCriterion].Web.Total.Frequency += Frequency;
    data[modifiedCriterion].Web.Total.TotalObjective = TotalObjective;

    data[modifiedCriterion].Web[type] = {
      StratumId,
      Label: newLabel,
      Objective,
      Frequency,
      Unused,
      TotalObjective,
      Status: newStatus,
    };
  }
};

const calculateData = (data) => {
  const quotaKeys = Object.keys(data).filter((key) => key !== 'totalRow');

  for (const quota of quotaKeys) {
    const quotaData = data[quota];

    for (const [group, groupData] of Object.entries(quotaData)) {
      if (group === 'Total') {
        const freqPercent =
          quotaData.Total.Frequency > 0
            ? calculatePercentages(
                groupData.Frequency,
                quotaData.Total.Frequency
              )
            : '0.0';
        groupData['Freq%'] = freqPercent;
        const toDo = groupData.TotalObjective - groupData.Frequency;
        groupData['To Do'] = toDo;
        groupData['Obj%'] = calculatePercentages(
          groupData.TotalObjective,
          data.totalRow.Total.TotalObjective
        );
        if (groupData.Label.includes('*')) {
          groupData.Status = '-';
        } else {
          if (groupData.TotalObjective === 0) {
            groupData.Status = 'C'; 
          } else {
            groupData.Status = toDo > 0 ? 'O' : 'C';
          }
        }
        continue;
      }

      for (const [type, typeData] of Object.entries(groupData)) {
        const stype = STYPE_REVERSE_MAP[type] || 'unknown';

        let objPercent = '0.0';
        if (
          stype !== 'unknown' &&
          data.totalRow[group]?.[type]?.TotalObjective > 0
        ) {
          objPercent = calculatePercentages(
            typeData.Frequency,
            data.totalRow[group][type].TotalObjective
          );
        }

        let freqPercent = '0.0';
        if (stype !== 'unknown' && data[stype]?.Total?.Frequency > 0) {
          freqPercent = calculatePercentages(
            typeData.Frequency,
            data[stype].Total.Frequency
          );
        } else if (type === 'Total' && typeData.Frequency > 0) {
          const toDo = typeData.TotalObjective - typeData.Frequency;
          typeData.Status = toDo > 0 ? 'O' : 'C';
          freqPercent = calculatePercentages(
            typeData.Frequency,
            data.totalRow[group].Total.Frequency
          );
        }

        typeData['Obj%'] = objPercent;
        typeData['Freq%'] = freqPercent;
      }
    }
  }
};

const filterForExternalUsers = (data) => {
  const quotaKeys = Object.keys(data).filter((key) => key !== 'totalRow');

  for (const quotaKey of quotaKeys) {
    const hasPhoneCom = data[quotaKey].Phone?.com;
    const hasWebCom = data[quotaKey].Web?.com;

    if (!hasPhoneCom && !hasWebCom) {
      delete data[quotaKey];
    }
  }
};

const sortPhoneProjectsUltraRobust = (projects) => {
  return projects.sort((a, b) => {
    const aEndsCOM = /com$/i.test(a.name);
    const bEndsCOM = /com$/i.test(b.name);
    
    if (aEndsCOM && !bEndsCOM) return -1;
    if (bEndsCOM && !aEndsCOM) return 1;
    
    const aContainsCOM = /com/i.test(a.name);
    const bContainsCOM = /com/i.test(b.name);
    
    if (aContainsCOM && !bContainsCOM) return -1;
    if (bContainsCOM && !aContainsCOM) return 1;
    
    return a.name.localeCompare(b.name);
  });
};

const handleGetQuotas = handleAsync(async (req, res) => {
  const apiUser = await VoxcoApi.refreshAccessToken();
  const token = apiUser?.Token;

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Unauthorized credentials for Voxco' });
  }

  const { projectId } = req.query;
  const isInternalUser = req?.query?.isInternalUser === 'true';

  if (!projectId) {
    return res.status(400).json({ message: 'Project ID required' });
  }

  try {
    const [phoneProjects, webProject] = await Promise.all([
      ProjectInfo.getPhoneProjects(projectId),
      ProjectInfo.getWebProjects(projectId),
    ]);

    const data = {
      totalRow: {
        Total: {
          Label: 'Total',
          TotalObjective: 0,
          Frequency: 0,
        },
      },
    };
    const visibleStypes = {};

    if (phoneProjects.length > 0) {
      // phoneProjects.sort((a, b) => {
      //   if (a.name.endsWith('COM')) return -1;
      //   if (b.name.endsWith('COM')) return 1;
      //   return 0;
      // });

      const sortedPhoneProjects = sortPhoneProjectsUltraRobust(phoneProjects);

      data.totalRow.Phone = { Total: { Frequency: 0 } };
      visibleStypes.Phone = [];

       for (const project of sortedPhoneProjects) {
        await buildPhoneStructure(project, token, data, visibleStypes);
      }

      // await Promise.all(
      //   phoneProjects.map((project) =>
      //     buildPhoneStructure(project, token, data, visibleStypes)
      //   )
      // );
    }

    if (webProject.length > 0) {
      await buildWebStructure(webProject[0].id, data, visibleStypes);
    }

    if (!isInternalUser) {
      filterForExternalUsers(data);
    }

    calculateData(data);

    return res.status(200).json({
      visibleStypes,
      data,
    });
  } catch (error) {
    console.error('Error in handleGetQuotas:', error);
    return res.status(500).json({
      message: 'Internal server error while processing quotas',
    });
  }
});

const handleGetProjectList = handleAsync(async (req, res) => {
  const userId = cleanQueryParam(req?.query?.userId);

  try {
    const projects = await QuotaServices.getProjectsList(userId);

    if (!projects) {
      return res.status(404).json({ message: 'Problem getting projects' });
    }

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error in handleGetProjectList:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching projects',
    });
  }
});

module.exports = { handleGetQuotas, handleGetProjectList };
