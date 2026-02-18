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
            `SELECT k_Id FROM [VoxcoSystem].[dbo].[tblObjects]
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
 * Builds the extraction task payload with static defaults and dynamic fields.
 * @param {string} name - Task name and DestinationFileName (e.g. projectID + "DAT")
 * @param {number} surveyId - Voxco survey ID
 * @param {string[]} variables - Array of variable alias strings
 */
const buildExtractionPayload = (name, surveyId, variables) => ({
  Name: name,
  SurveyId: surveyId,
  Language: 'en',
  DestinationFileName: name,
  ExtractFormat: 'TXT',
  Filter: {
    CaseStatus: 'Completed',
    CaseActiveStatus: 'Active',
    Strata: 'All',
  },
  StripHtmlFromLabels: true,
  IncludeOpenEnds: false,
  Encoding: 'Windows1252',
  Variables: variables,
  RemoveBracesOfSystemVariables: false,
});

/**
 * Handles the creation of an extraction task in VOXCO.
 * @param {string} name - Task name / DestinationFileName (e.g. projectID + "DAT")
 * @param {number} surveyId - Voxco survey ID
 * @param {string[]} variables - Array of variable alias strings
 */
const createExtractionTask = async (name, surveyId, variables) => {
  const URL = `/api/results/extract`;
  const payload = buildExtractionPayload(name, surveyId, variables);
  try {
    const res = await axios.post(URL, payload);
    return {
      success: true,
      message: `Extraction task created successfully for VOXCO project ${surveyId}`,
      taskId: res.data.taskId,
    };
  } catch (error) {
    console.error('Error creating extraction task:', error);
    return {
      success: false,
      message: `Failed to create extraction task for VOXCO project ${surveyId}`,
      error: error.message,
    };
  }
};

module.exports = {
  getVoxcoID,
  buildExtractionPayload,
  createExtractionTask,
};

/**
 * {
  "IncludeConnectionHistory": true,
  "IncludeLabels": true,
  "FieldDelimiter": "Comma",
  "EncloseValuesInDoubleQuotes": true,
  "IncludeHeader": true,
  "IncludeQuestionText": true,
  "UseChoiceLabels": true,
  "MergeOpenEnds": true,
  "DichotomizedMultiple": true,
  "DichotomizedEmptyWhenNoAnswer": true,
  "UseNegativeIntegersForEmptyAnswers": true,
  "DapresyDataFormat": true,
  "DefaultFieldSize": 255,
  "LoopsInQuestionnaireOrder": true,
  "IncludeRespondentFiles": true,
  "RespondentFileExtractionStructure": "Variable",
}
 */
