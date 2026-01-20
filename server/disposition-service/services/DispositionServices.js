const axios = require('../api/axios');
const projectInfo = require('./ProjectInfo');
const { withDbConnection } = require('@internal/db-connection');

/**
 * Get web disposition data from Voxco API
 */
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
    console.error('Error fetching web dispositions:', error.message);
    return {};
  }
};

/**
 * Get web dropout counts by question
 */
const getWebDropoutCounts = async (projectId) => {
  const projectData = await projectInfo.getWebProjects(projectId);
  const sid = projectData?.[0]?.id;
  if (!sid) {
    console.error('No project ID found for web dropout counts');
    return {};
  }

  const qry = `
WITH RankedCalls AS (
    SELECT
        *,
        ROW_NUMBER() OVER(PARTITION BY HisRespondent ORDER BY HisCallNumber DESC) AS rn
    FROM [A4Survey_Client_1].[Survey_1_${sid}].[Historic]
)
SELECT
    H.HisLastDisplayedQuestionName,
    COUNT(R.ResRespondent) AS CountOfDropouts
FROM
    [A4Survey_Client_1].[Survey_1_${sid}].[Respondent] AS R
INNER JOIN
    RankedCalls AS H ON R.resRespondent = H.hisRespondent
WHERE
    R.resdisposition = 2 -- dropouts
    AND H.rn = 1
GROUP BY
    H.HisLastDisplayedQuestionName
ORDER BY
    CountOfDropouts DESC;`;

  try {
    return withDbConnection({
      database: 'voxco',
      queryFn: async (pool) => {
        const result = await pool.request().query(qry);
        return result.recordset;
      },
      fnName: 'getWebDropoutCounts',
    });
  } catch (error) {
    console.error('Error fetching web dropout counts:', error);
    return {};
  }
};

module.exports = { getWebDisposition, getWebDropoutCounts };
