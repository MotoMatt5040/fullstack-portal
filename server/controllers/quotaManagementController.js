const handleAsync = require('./asyncController');
const ProjectInfo = require('../services/ProjectInfo');
const QuotaServices = require('../services/QuotaServices');
const VoxcoApi = require('../services/VoxcoApi');

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

    const webTypes = ['Panel', 'T2W', 'Email', 'Mailer'];
    if (webTypes.includes(subType)) {
      continue;
    }

    if (subType && !visibleStypes.Phone.includes(subType) && subType !== 'com') {
      visibleStypes.Phone.push(subType);
    }

    const newLabel = cleanLabel(Label);
    const newStatus = STATUS_MAP[Status] || 'Unknown';

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

const calculateTotalRowPercentages = (data) => {
  if (data.totalRow.Phone) {
    const phoneTotalFreq = data.totalRow.Phone.Total.Frequency;

    for (const [typeKey, typeData] of Object.entries(data.totalRow.Phone)) {
      if (typeKey !== 'Total' && typeData.Frequency !== undefined) {
        typeData['Freq%'] = calculatePercentages(
          typeData.Frequency,
          phoneTotalFreq
        );
      } else if (typeKey === 'Total') {
        typeData['Freq%'] = calculatePercentages(
          phoneTotalFreq,
          data.totalRow.Total.Frequency
        );
      }
    }
  }

  if (data.totalRow.Web) {
    const webTotalFreq = data.totalRow.Web.Total.Frequency;

    for (const [typeKey, typeData] of Object.entries(data.totalRow.Web)) {
      if (typeKey !== 'Total' && typeData.Frequency !== undefined) {
        typeData['Freq%'] = calculatePercentages(
          typeData.Frequency,
          webTotalFreq
        );
      } else if (typeKey === 'Total') {
        typeData['Freq%'] = calculatePercentages(
          webTotalFreq,
          data.totalRow.Total.Frequency
        );
      }
    }
  }

  data.totalRow.Total['Freq%'] = calculatePercentages(
    data.totalRow.Total.Frequency,
    data.totalRow.Total.TotalObjective
  );
};

const calculateData = (data) => {
  const quotaKeys = Object.keys(data).filter((key) => key !== 'totalRow');
  calculateTotalRowPercentages(data);

  data.totalRow.Total['To Do'] =
    data.totalRow.Total.TotalObjective - data.totalRow.Total.Frequency;

  for (const quota of quotaKeys) {
    const quotaData = data[quota];

    for (const [group, groupData] of Object.entries(quotaData)) {
      if (group === 'Total') {
        // Remove text in parentheses from the Label
        if (groupData.Label) {
          groupData.Label = groupData.Label.replace(/ *\([^)]*\) */g, '');
        }

        const freqPercent =
          quotaData.Total.Frequency > 0
            ? calculatePercentages(
                quotaData.Total.Frequency,
                data.totalRow.Total.Frequency
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
          groupData.Status = '';
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
        // This check is likely redundant if all labels are at the 'Total' level,
        // but is included for completeness.
        if (typeData.Label) {
          typeData.Label = typeData.Label.replace(/ *\([^)]*\) */g, '');
        }

        const stype = STYPE_REVERSE_MAP[type] || 'unknown';

        let objPercent = '0.0';
        // console.log(stype, group, type, data.totalRow[group]?.[type].TotalObjective);
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

  const trackerKey = Object.keys(data).find((key) => key === 'STYPE>0');

  if (trackerKey) {
    delete data[trackerKey];
  }

  const quotaKeys = Object.keys(data).filter((key) => key !== 'totalRow');

  for (const quotaKey of quotaKeys) {
    const hasPhoneCom = data[quotaKey].Phone?.com;

    if (!hasPhoneCom) {
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
      const sortedPhoneProjects = sortPhoneProjectsUltraRobust(phoneProjects);

      data.totalRow.Phone = { Total: { Frequency: 0 } };
      visibleStypes.Phone = [];

      for (const project of sortedPhoneProjects) {
        await buildPhoneStructure(project, token, data, visibleStypes);
      }
    }

    if (webProject.length > 0) {
      await buildWebStructure(webProject[0].id, data, visibleStypes);
    }

    calculateData(data);

    if (!isInternalUser && data?.Phone?.com) {
      filterForExternalUsers(data);
    }

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

module.exports = { handleGetQuotas };
