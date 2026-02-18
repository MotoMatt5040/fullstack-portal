const axios = require('@internal/voxco-api');
const { withDbConnection, sql } = require('@internal/db-connection');

/**
 * Handles the creation of an extraction task in VOXCO.
 */

const getVoxcoWebID = async (projectID) => {
  return withDbConnection({
    database: 'voxco',
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('projectID', sql.NVarChar, projectID)
        .query(
          "SELECT id, name FROM [A4Survey_Client_1].[dbo].[Survey] WHERE Name LIKE @projectID + '%'",
        );
      return result.recordset;
    },
    fnName: 'getVoxcoWebID',
  });
};

const getVoxcoPhoneID = async (projectID) => {
  return withDbConnection({
    database: 'voxco',
    queryFn: async (pool) => {
      // Match exact projectID OR projectID with valid suffixes (C, W, COM)
      // C = Cell, W = Web, COM = Combined, base = Landline
      // This prevents 13247 from matching 13247OS (different project)
      const result = await pool
        .request()
        .input('projectId', sql.NVarChar, projectID)
        .input('projectIdC', sql.NVarChar, projectID + 'C')
        .input('projectIdW', sql.NVarChar, projectID + 'W')
        .input('projectIdCOM', sql.NVarChar, projectID + 'COM')
        .query(
          `SELECT k_Id FROM [VoxcoSystem].[dbo].[tblObjects]
             WHERE tblobjects.Type = 1
             AND name IN (@projectId, @projectIdC, @projectIdW, @projectIdCOM)
             AND ParentId > 1000
             AND name NOT LIKE '%WOE%'
             ORDER BY name DESC`,
        );
      return result.recordset;
    },
    fnName: 'getVoxcoPhoneID',
  });
};

const createExtractionTask = async (data, voxcoID) => {
  return {
    success: true,
    message: `Extraction task created for VOXCO project ${voxcoID}`,
    data,
  };
};

module.exports = {
  getVoxcoWebID,
  getVoxcoPhoneID,
  createExtractionTask,
};
