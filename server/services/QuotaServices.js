const axios = require('../api/axios');
const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');
const {
  tblUserProjects,
  tblAuthentication,
  tblUserProfiles,
  tblClients,
} = require('../models');

const getWebQuotas = async (sid) => {
  //sid is a voxco project id
  try {
    const res = await axios.get(`/api/quotas/${sid}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching web quotas:');
  }
};

const getPhoneQuotas = async (sid, token) => {
  //sid is a voxco project id
  // console.log(sid)
  try {
    const res = await axios.get(
      `/voxco.api/projects/${sid}/stratas?status=All`,
      {
        headers: {
          Authorization: `Client ${token}`,
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error('Error fetching phone quotas:');
  }
};

// const getPublishedProjects = async () => {
//   const projectIdCondition = projectId ? `AND hp.projectId = @projectId` : '';
//   const qry = `
// SELECT
//     uproj.projectid,
//     c.clientid,
//     c.clientname
// FROM
//     dbo.tblClients AS c
// INNER JOIN
//     dbo.tblUserProfiles AS up ON c.ClientID = up.ClientID
// INNER JOIN
//     dbo.tblUserProjects AS uproj ON uproj.UUID = up.Uuid
// ORDER BY
//     uproj.projectID DESC;`;

//   const res = withDbConnection({
//     database: promark,
//     queryFn: async (pool) => {
//       const request = pool.request();

//       const result = await request.query(qry);
//       return result.recordset;
//     },
//     attempts: 5,
//     fnName: 'getPublishedProjects',
//     allowAbort: true,
//     allowRetry: true,
//   });
//   return res;
// };

const getPublishedProjects = async () => {
  try {
    const results = await tblUserProjects.findAll({
      attributes: ['projectid'], // Select the projectid
      order: [['projectid', 'DESC']],
      // Nest the includes to create the chain of INNER JOINs
      include: [
        {
          model: tblAuthentication,
          as: 'UU', // Alias from your init-models.js
          required: true, // INNER JOIN
          attributes: [], // We don't need columns from this table
          include: [
            {
              model: tblUserProfiles,
              as: 'tblUserProfile', // Alias from your init-models.js
              required: true, // INNER JOIN
              attributes: [],
              include: [
                {
                  model: tblClients,
                  as: 'Client', // Alias from your init-models.js
                  required: true, // INNER JOIN
                  attributes: ['ClientID', 'ClientName'], // Select the client info
                },
              ],
            },
          ],
        },
      ],
      raw: true, // Returns plain data objects, not Sequelize instances
      nest: true, // Groups nested association data
    });

    const flattenedResults = results.map((item) => ({
      projectid: item.projectid,
      clientid: item.UU.tblUserProfile.Client.ClientID,
      clientname: item.UU.tblUserProfile.Client.ClientName,
    }));

    return flattenedResults;
  } catch (error) {
    console.error('Error in getPublishedProjects:', error);
    throw error;
  }
};

module.exports = {
  getWebQuotas,
  getPhoneQuotas,
  getPublishedProjects,
};
