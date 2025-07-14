const axios = require('../api/axios');
const { voxco } = require('../utils/databaseTypes');
const projectInfo = require('./ProjectInfo');

const getWebDisposition = async (projectId) => {
  const projectData = await projectInfo.getWebProjects(projectId);
  const sid = projectData?.[0]?.id;
  if (!sid) {
    console.error('No project ID found for web disposition');
    return {};
  }
  try {
    const res = await axios.get(`/api/analyze/participation/summary/${sid}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching web dispositions:');
  }
};

// WITH RankedCalls AS (
//     SELECT
//         *,
//         ROW_NUMBER() OVER(PARTITION BY HisRespondent ORDER BY HisCallNumber DESC) AS rn
//     FROM [A4Survey_Client_1].[Survey_1_633].[Historic]
// ) SELECT * FROM RankedCalls
// WHERE rn = 1 and hisresult between 1 and 5

// SELECT * FROM [A4Survey_Client_1].[Survey_1_633].[RespondentActivitySummary] 
// --where disposition between 1 and 5
// ORDER BY disposition asc

module.exports = { getWebDisposition };
