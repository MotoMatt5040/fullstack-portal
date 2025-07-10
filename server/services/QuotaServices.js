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
    // console.error(error);
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

const getPublishedProjects = async () => {
  try {
    const results = await tblUserProjects.findAll({
      attributes: ['projectid'], // Select the projectid
      order: [['projectid', 'DESC']],
      // Nest the includes to create the chain of INNER JOINs
      include: [
        {
          model: tblAuthentication,
          as: 'UU', // Alias from init-models.js
          required: true, // INNER JOIN
          attributes: [], 
          include: [
            {
              model: tblUserProfiles,
              as: 'tblUserProfile', // Alias from init-models.js
              required: true, // INNER JOIN
              attributes: [],
              include: [
                {
                  model: tblClients,
                  as: 'Client', // Alias from init-models.js
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
