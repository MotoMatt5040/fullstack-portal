const axios = require('@internal/voxco-api');
const { withDbConnection, sql } = require('@internal/db-connection');

const getVoxcoID = async (projectID, suffix, isWeb = false) => {
  if (isWeb) {
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
  } else {
    return withDbConnection({
      database: 'voxco',
      queryFn: async (pool) => {
        // Match exact projectID OR projectID with valid suffixes (C, W, COM)
        // C = Cell, W = Web, COM = Combined, base = Landline
        const result = await pool
          .request()
          .input('projectId', sql.NVarChar, projectID)
          .input('projectIdC', sql.NVarChar, projectID + 'C')
          .input('projectIdW', sql.NVarChar, projectID + 'W')
          .input('projectIdCOM', sql.NVarChar, projectID + 'COM')
          .query(
            `SELECT k_Id, name FROM [VoxcoSystem].[dbo].[tblObjects]
             WHERE tblobjects.Type = 1
             AND name IN (@projectId, @projectIdC, @projectIdW, @projectIdCOM)
             AND ParentId > 1000
             AND name NOT LIKE '%WOE%'
             ORDER BY name DESC`,
          );

        // If multiple matches, return the one with the same suffix (e.g. if suffix is COM, return 13247COM instead of 13247C)
        if (suffix && result.recordset.length > 1) {
          const matched =
            suffix ?
              result.recordset.find((r) => r.name.endsWith(suffix))
            : result.recordset.find((r) => r.name === projectID);
          return matched ? matched.k_Id : result.recordset[0]?.k_Id;
        }

        return result.recordset[0]?.k_Id;
      },
      fnName: 'getVoxcoPhoneID',
    });
  }
};

/**
 * Handles the creation of an extraction task in VOXCO.
 * @param {string} name - Task name / DestinationFileName (e.g. projectID + "DAT")
 * @param {number} surveyId - Voxco survey ID
 * @param {string[]} variables - Array of variable alias strings
 */
const createExtractionTask = async (payload, voxcoProjectId) => {
  const URL = `Voxco.API/projects/${voxcoProjectId}/extraction/tasks`;
  try {
    const res = await axios.post(URL, payload);
    return {
      success: true,
      message: `Extraction task created successfully for VOXCO project ${voxcoProjectId}`,
      taskId: res.data.taskId,
    };
  } catch (error) {
    console.error('Error creating extraction task:', error);
    return {
      success: false,
      message: `Failed to create extraction task for VOXCO project ${voxcoProjectId}`,
      error: error.message,
    };
  }
};

module.exports = {
  getVoxcoID,
  createExtractionTask,
};
