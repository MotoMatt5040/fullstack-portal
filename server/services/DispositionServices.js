const axios = require('../api/axios');
const { voxco } = require('../utils/databaseTypes');
const projectInfo = require('./ProjectInfo');
const withDbConnection = require('../config/dbConn');

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

const getWebDropoutCounts = async (projectId) => {
  const projectData = await projectInfo.getWebProjects(projectId);
  const sid = projectData?.[0]?.id;
  if (!sid) {
    console.error('No project ID found for web dropout counts');
    return {};
  }

  qry = `
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
      database: voxco,
      queryFn: async (pool) => {
        const result = await pool.request().query(qry);
        return result.recordset;
      },
      fnName: 'getPhoneProjects',
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching web dropout counts:', error);
    return {};
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

//THIS WILL PROVIDE THE RESULTS SEEN ON THE PARTICIPATION SCREEN
// WITH RankedCalls AS (
//     SELECT
//         *,
//         ROW_NUMBER() OVER(PARTITION BY HisRespondent ORDER BY HisCallNumber DESC) AS rn
//     FROM [A4Survey_Client_1].[Survey_1_756].[Historic]
// )
// SELECT
//     H.HisLastDisplayedQuestionName,
//     COUNT(R.ResRespondent) AS CountOfDropouts
// FROM
//     [A4Survey_Client_1].[Survey_1_756].[Respondent] AS R
// INNER JOIN
//     RankedCalls AS H ON R.resRespondent = H.hisRespondent
// WHERE
//     R.resdisposition = 2 -- dropouts
//     AND H.rn = 1
// GROUP BY
//     H.HisLastDisplayedQuestionName
// ORDER BY
//     CountOfDropouts DESC;

module.exports = { getWebDisposition, getWebDropoutCounts };
