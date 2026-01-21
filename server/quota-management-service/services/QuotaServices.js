const axios = require('../api/axios');
const { withDbConnection, sql, DATABASE_TYPES } = require('@internal/db-connection');
const { VOXCO: voxco, PROMARK: promark } = DATABASE_TYPES;

/**
 * Get list of projects for quota management
 * Uses tblcc3projectheader with filters:
 * - Last 180 days based on fieldstart
 * - Excludes projects ending in 'c' or 'w'
 * @param {string} userId - Optional user ID for external user filtering
 */
const getQuotaProjects = async (userId) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      let query = `
        SELECT DISTINCT
          ph.projectid,
          ph.projectname,
          ph.fieldstart
        FROM tblcc3projectheader ph
        WHERE
          ph.projectid NOT LIKE '%c' AND
          ph.projectid NOT LIKE '%w' AND
          ph.fieldstart >= DATEADD(DAY, -180, GETDATE())
      `;

      // TODO: If userId is provided, add user access filtering
      // This would require joining with user access tables

      query += ` ORDER BY ph.projectid DESC`;

      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getQuotaProjects',
  });
};

const getWebQuotas = async (sid) => {
  try {
    const res = await axios.get(`/api/quotas/${sid}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching web quotas:', error.message);
    return [];
  }
};

const getPhoneQuotas = async (sid, token) => {
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
    console.error('Error fetching phone quotas:', error.message);
    return [];
  }
};

module.exports = {
  getQuotaProjects,
  getWebQuotas,
  getPhoneQuotas,
};
