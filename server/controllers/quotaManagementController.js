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
  
  // Determine project type once
  let type;
  if (project.name.endsWith('C')) {
    type = 'Cell';
    visibleStypes.Phone.push(type);
  } else if (project.name.endsWith('COM')) {
    type = 'com';
  } else {
    type = 'Landline';
    visibleStypes.Phone.push(type);
  }

  const structure = new Map();

  // Process all phone items
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

    const newStatus = STATUS_MAP[Status] || 'Unknown';
    const newLabel = cleanLabel(Label);
    const TotalObjective = extractTotalObjective(Label);
    const modifiedCriterion = cleanCriterion(Criterion);

    // Initialize data structure if not exists
    if (!data[modifiedCriterion]) {
      data[modifiedCriterion] = createBaseDataStructure(Label, newLabel);
    }

    // Create structure entry
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

    // Update TotalObjective if needed
    if (data[modifiedCriterion].Total.TotalObjective === 0) {
      data[modifiedCriterion].Total.TotalObjective = TotalObjective;
      data[modifiedCriterion].Phone.Total.TotalObjective = TotalObjective;
    }

    // Update frequency conditionally
    if (!modifiedCriterion.includes('STYPE') && type !== 'com') {
      data[modifiedCriterion].Total.Frequency += Frequency;
      data[modifiedCriterion].Phone.Total.Frequency += Frequency;
    }

    data[modifiedCriterion].Phone[type] = structureEntry;
  }

  // Update totals based on project type
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

  if (type === 'Cell') {
    updateTotals('STYPE=2', 'Cell');
  } else if (type === 'Landline') {
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

    const newLabel = cleanLabel(Label);
    const TotalObjective = extractTotalObjective(Label);
    const modifiedCriterion = cleanCriterion(Criterion);
    const newStatus = STATUS_MAP[Status] || 'Unknown';

    // Initialize data structure if not exists
    if (!data[modifiedCriterion]) {
      data[modifiedCriterion] = createWebDataStructure(Label);
    } else if (!data[modifiedCriterion].Web) {
      data[modifiedCriterion].Web = {
        Total: createWebDataStructure(Label).Web.Total,
      };
    }

    if (modifiedCriterion === 'STYPE=2') continue;

    const stypeMatch = Criterion.match(REGEX_PATTERNS.STYPE_EXTRACT);
    const stype = stypeMatch ? stypeMatch[1] : null;
    const type = STYPE_MAP[stype] || 'unknown';

    // Handle STYPE totals
    if (modifiedCriterion.includes('STYPE') && type !== 'unknown') {
      visibleStypes.Web.push(type);
      data.totalRow.Total.TotalObjective += TotalObjective;
      data.totalRow.Total.Frequency += Frequency;
      data.totalRow.Web.Total.Frequency += Frequency;

      data.totalRow.Web[type] = {
        TotalObjective,
        Frequency,
      };
    }

    // Update data
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
  const quotaKeys = Object.keys(data).filter(key => key !== 'totalRow');
  
  for (const quota of quotaKeys) {
    const quotaData = data[quota];
    
    for (const [group, groupData] of Object.entries(quotaData)) {
      if (group === 'Total') {
        // Calculate frequency percentage for Total group
        const freqPercent = quotaData.Total.Frequency > 0 
          ? calculatePercentages(groupData.Frequency, quotaData.Total.Frequency)
          : '0.0';
        groupData['Freq%'] = freqPercent;

        // console.log(groupData)
        const toDo = groupData.TotalObjective - groupData.Frequency;
        groupData['To Do'] = toDo

        // groupData['Status'] = toDo > 0 ? 'O' : 'C';
        // console.log(todo)
        continue;
      }

      for (const [type, typeData] of Object.entries(groupData)) {
        const stype = STYPE_REVERSE_MAP[type] || 'unknown';

        // Calculate "To Do"
        // if (type === 'Total') {
        //   if (!quotaData.Total['To Do']) {
        //     quotaData.Total['To Do'] = quotaData.Total.TotalObjective;
        //   }
        //   quotaData.Total['To Do'] -= typeData.Frequency;
        // } else {
        
          // typeData['To Do'] = toDo
        // }

        // Calculate Obj%
        let objPercent = '0.0';
        if (stype !== 'unknown' && data.totalRow[group]?.[type]?.TotalObjective > 0) {
          objPercent = calculatePercentages(
            typeData.Frequency,
            data.totalRow[group][type].TotalObjective
          );
        }

        // Calculate Freq%
        let freqPercent = '0.0';
        if (stype !== 'unknown' && data[stype]?.Total?.Frequency > 0) {
          freqPercent = calculatePercentages(
            typeData.Frequency,
            data[stype].Total.Frequency
          );
        } else if (type === 'Total' && typeData.Frequency > 0) {
          const toDo = typeData.TotalObjective - typeData.Frequency 
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
  const quotaKeys = Object.keys(data).filter(key => key !== 'totalRow');
  
  for (const quotaKey of quotaKeys) {
    const hasPhoneCom = data[quotaKey].Phone?.com;
    const hasWebCom = data[quotaKey].Web?.com;
    
    if (!hasPhoneCom && !hasWebCom) {
      delete data[quotaKey];
    }
  }
};

const handleGetQuotas = handleAsync(async (req, res) => {
  // Get token once at the beginning
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
    // Parallel data fetching
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

    // Process phone projects
    if (phoneProjects.length > 0) {
      data.totalRow.Phone = { Total: { Frequency: 0 } };
      visibleStypes.Phone = [];
      
      await Promise.all(
        phoneProjects.map((project) =>
          buildPhoneStructure(project, token, data, visibleStypes)
        )
      );
    }

    // Process web projects
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
      message: 'Internal server error while processing quotas' 
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
      message: 'Internal server error while fetching projects' 
    });
  }
});

module.exports = { handleGetQuotas, handleGetProjectList };