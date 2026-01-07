const axios = require('axios');

/**
 * CallID API Client
 * Makes HTTP calls to the callid-service for CallID management
 */

// CallID service base URL - uses Docker service name for internal communication
const CALLID_SERVICE_URL = process.env.CALLID_SERVICE_URL || 'http://callid:5004';

console.log('========================================');
console.log('[CallIDApiClient] MODULE LOADED');
console.log(`[CallIDApiClient] CALLID_SERVICE_URL = ${CALLID_SERVICE_URL}`);
console.log('========================================');

/**
 * Create axios instance with default config
 */
const callIdApi = axios.create({
  baseURL: CALLID_SERVICE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get CallIDs assigned to a project
 * @param {number} projectId - Project ID
 * @param {string} authToken - JWT token for authentication
 * @returns {Promise<Array>} - Array of CallID assignments
 */
const getProjectCallIDs = async (projectId, gatewayHeaders) => {
  console.log(`[CallIDApiClient] getProjectCallIDs called with projectId=${projectId}`);
  console.log(`[CallIDApiClient] gatewayHeaders:`, gatewayHeaders);

  const url = `/api/callid/projects/${projectId}`;
  console.log(`[CallIDApiClient] Making GET request to: ${CALLID_SERVICE_URL}${url}`);

  try {
    const response = await callIdApi.get(url, {
      headers: {
        'x-user-authenticated': gatewayHeaders.authenticated,
        'x-user-name': gatewayHeaders.username,
        'x-user-roles': gatewayHeaders.roles,
      },
    });
    console.log(`[CallIDApiClient] getProjectCallIDs response status: ${response.status}`);
    console.log(`[CallIDApiClient] getProjectCallIDs response data:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`[CallIDApiClient] Error getting project CallIDs:`, error.message);
    console.error(`[CallIDApiClient] Error response status: ${error.response?.status}`);
    console.error(`[CallIDApiClient] Error response data:`, error.response?.data);
    if (error.response?.status === 404) {
      console.log(`[CallIDApiClient] 404 - No CallIDs found for project, returning empty array`);
      return []; // No CallIDs found for project
    }
    throw error;
  }
};

/**
 * Auto-assign CallIDs to a project based on sample table area codes
 * @param {string} tableName - Sample table name to analyze
 * @param {number} projectId - Project ID to assign CallIDs to
 * @param {number|null} clientId - Client ID (102 = Tarrance uses PHONE column)
 * @param {string} authToken - JWT token for authentication
 * @returns {Promise<Object>} - Result with assigned CallIDs
 */
const autoAssignCallIDs = async (tableName, projectId, clientId, gatewayHeaders) => {
  console.log(`[CallIDApiClient] ========== AUTO-ASSIGN START ==========`);
  console.log(`[CallIDApiClient] autoAssignCallIDs called with:`);
  console.log(`[CallIDApiClient]   tableName: ${tableName}`);
  console.log(`[CallIDApiClient]   projectId: ${projectId}`);
  console.log(`[CallIDApiClient]   clientId: ${clientId}`);
  console.log(`[CallIDApiClient]   gatewayHeaders:`, gatewayHeaders);

  const url = '/api/callid/auto-assign';
  const requestBody = { tableName, projectId, clientId };
  console.log(`[CallIDApiClient] Making POST request to: ${CALLID_SERVICE_URL}${url}`);
  console.log(`[CallIDApiClient] Request body:`, JSON.stringify(requestBody, null, 2));

  try {
    const response = await callIdApi.post(
      url,
      requestBody,
      {
        headers: {
          'x-user-authenticated': gatewayHeaders.authenticated,
          'x-user-name': gatewayHeaders.username,
          'x-user-roles': gatewayHeaders.roles,
        },
      }
    );

    console.log(`[CallIDApiClient] Auto-assign response status: ${response.status}`);
    console.log(`[CallIDApiClient] Auto-assign response data:`, JSON.stringify(response.data, null, 2));
    console.log(`[CallIDApiClient] ========== AUTO-ASSIGN END ==========`);
    return response.data;
  } catch (error) {
    console.error(`[CallIDApiClient] ========== AUTO-ASSIGN ERROR ==========`);
    console.error(`[CallIDApiClient] Error auto-assigning CallIDs:`, error.message);
    console.error(`[CallIDApiClient] Error code: ${error.code}`);
    console.error(`[CallIDApiClient] Error response status: ${error.response?.status}`);
    console.error(`[CallIDApiClient] Error response data:`, JSON.stringify(error.response?.data, null, 2));
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

/**
 * Update sample table's CallID columns with existing phone numbers
 * This is called internally via direct DB access since the callid-service
 * doesn't expose this as an API endpoint
 */
const updateSampleTableCallIDs = async (tableName, callIdData) => {
  const { withDbConnection, sql } = require('@internal/db-connection');

  const { phoneNumberL1, phoneNumberL2, phoneNumberC1, phoneNumberC2 } = callIdData;

  // Build SET clause dynamically based on which phone numbers are provided
  const setClauses = [];
  if (phoneNumberL1) setClauses.push(`CALLIDL1 = '${phoneNumberL1}'`);
  if (phoneNumberL2) setClauses.push(`CALLIDL2 = '${phoneNumberL2}'`);
  if (phoneNumberC1) setClauses.push(`CALLIDC1 = '${phoneNumberC1}'`);
  if (phoneNumberC2) setClauses.push(`CALLIDC2 = '${phoneNumberC2}'`);

  if (setClauses.length === 0) {
    return { success: false, message: 'No CallID phone numbers provided to update' };
  }

  const query = `
    UPDATE FAJITA.dbo.[${tableName}]
    SET ${setClauses.join(', ')}
  `;

  return withDbConnection({
    database: 'fajita',
    queryFn: async (pool) => {
      console.log(`[CallIDApiClient] Updating sample table CallIDs: ${query}`);
      const result = await pool.request().query(query);
      console.log(`[CallIDApiClient] Updated ${result.rowsAffected[0]} rows`);

      return {
        success: true,
        message: `Updated ${result.rowsAffected[0]} rows with existing CallID phone numbers`,
        rowsAffected: result.rowsAffected[0],
      };
    },
    fnName: 'updateSampleTableCallIDs',
  });
};

/**
 * Format existing CallIDs to match the autoAssign response format
 * @param {Object} existing - Existing CallID data from getProjectCallIDs
 * @param {number} projectId - Project ID
 * @returns {Object} - Formatted callIdAssignment response
 */
const formatExistingCallIDs = (existing, projectId) => {
  const assigned = [];

  if (existing.CallIDL1) {
    assigned.push({
      slot: 'CallIDL1',
      phoneNumberId: existing.CallIDL1,
      phoneNumber: existing.PhoneNumberL1,
      areaCode: existing.PhoneNumberL1?.substring(0, 3) || '',
      stateAbbr: existing.StateAbbrL1 || '',
    });
  }
  if (existing.CallIDL2) {
    assigned.push({
      slot: 'CallIDL2',
      phoneNumberId: existing.CallIDL2,
      phoneNumber: existing.PhoneNumberL2,
      areaCode: existing.PhoneNumberL2?.substring(0, 3) || '',
      stateAbbr: existing.StateAbbrL2 || '',
    });
  }
  if (existing.CallIDC1) {
    assigned.push({
      slot: 'CallIDC1',
      phoneNumberId: existing.CallIDC1,
      phoneNumber: existing.PhoneNumberC1,
      areaCode: existing.PhoneNumberC1?.substring(0, 3) || '',
      stateAbbr: existing.StateAbbrC1 || '',
    });
  }
  if (existing.CallIDC2) {
    assigned.push({
      slot: 'CallIDC2',
      phoneNumberId: existing.CallIDC2,
      phoneNumber: existing.PhoneNumberC2,
      areaCode: existing.PhoneNumberC2?.substring(0, 3) || '',
      stateAbbr: existing.StateAbbrC2 || '',
    });
  }

  return {
    success: true,
    message: `Reusing ${assigned.length} existing CallID(s) for project`,
    projectId: projectId,
    assigned: assigned,
    reused: true, // Flag to indicate these were existing, not newly assigned
  };
};

/**
 * Handle CallID assignment for a processed sample table
 * Checks for existing CallIDs first, then auto-assigns if needed
 * @param {string} tableName - Sample table name
 * @param {number} projectId - Project ID
 * @param {number|null} clientId - Client ID
 * @param {string} authToken - JWT token for authentication
 * @returns {Promise<Object|null>} - CallID assignment result or null if failed
 */
const handleCallIDAssignment = async (tableName, projectId, clientId, gatewayHeaders) => {
  console.log(`[CallIDApiClient] ########## handleCallIDAssignment CALLED ##########`);
  console.log(`[CallIDApiClient] Parameters:`);
  console.log(`[CallIDApiClient]   tableName: ${tableName}`);
  console.log(`[CallIDApiClient]   projectId: ${projectId}`);
  console.log(`[CallIDApiClient]   clientId: ${clientId}`);
  console.log(`[CallIDApiClient]   gatewayHeaders:`, gatewayHeaders);

  if (!projectId) {
    console.log(`[CallIDApiClient] No projectId provided, returning null`);
    return null;
  }

  try {
    // First check if project already has CallIDs assigned
    console.log(`[CallIDApiClient] Checking for existing CallIDs...`);
    const existingCallIDs = await getProjectCallIDs(parseInt(projectId, 10), gatewayHeaders);
    console.log(`[CallIDApiClient] existingCallIDs result:`, JSON.stringify(existingCallIDs, null, 2));

    if (existingCallIDs && existingCallIDs.length > 0) {
      const existing = existingCallIDs[0];
      // Check if any CallID slots are filled
      const hasExistingCallIDs =
        existing.CallIDL1 || existing.CallIDL2 || existing.CallIDC1 || existing.CallIDC2;

      if (hasExistingCallIDs) {
        console.log('[CallIDApiClient] Project already has CallIDs assigned, reusing existing...');

        const callIdAssignment = formatExistingCallIDs(existing, parseInt(projectId, 10));
        console.log(`[CallIDApiClient] Reusing ${callIdAssignment.assigned.length} existing CallID(s)`);

        // Update the sample table's CallID columns with the existing phone numbers
        try {
          const updateResult = await updateSampleTableCallIDs(tableName, {
            phoneNumberL1: existing.PhoneNumberL1,
            phoneNumberL2: existing.PhoneNumberL2,
            phoneNumberC1: existing.PhoneNumberC1,
            phoneNumberC2: existing.PhoneNumberC2,
          });
          if (updateResult.success) {
            console.log(`[CallIDApiClient] Sample table CallID columns updated: ${updateResult.rowsAffected} rows`);
          } else {
            console.log(`[CallIDApiClient] Sample table CallID update: ${updateResult.message}`);
          }
        } catch (updateError) {
          console.error('[CallIDApiClient] Failed to update sample table CallID columns:', updateError.message);
        }

        return callIdAssignment;
      } else {
        // Project has a CallIDUsage row but no CallIDs assigned - auto-assign
        console.log('[CallIDApiClient] Auto-assigning CallIDs (no existing assignments)...');
        const callIdAssignment = await autoAssignCallIDs(tableName, parseInt(projectId, 10), clientId, gatewayHeaders);

        if (callIdAssignment.success) {
          console.log(`[CallIDApiClient] CallIDs assigned: ${callIdAssignment.assigned?.length || 0} slots filled`);
        } else {
          console.log(`[CallIDApiClient] CallID assignment: ${callIdAssignment.message}`);
        }

        return callIdAssignment;
      }
    } else {
      // No CallIDUsage row exists - auto-assign
      console.log('[CallIDApiClient] Auto-assigning CallIDs...');
      const callIdAssignment = await autoAssignCallIDs(tableName, parseInt(projectId, 10), clientId, gatewayHeaders);

      if (callIdAssignment.success) {
        console.log(`[CallIDApiClient] CallIDs assigned: ${callIdAssignment.assigned?.length || 0} slots filled`);
      } else {
        console.log(`[CallIDApiClient] CallID assignment: ${callIdAssignment.message}`);
      }

      return callIdAssignment;
    }
  } catch (callIdError) {
    console.error('[CallIDApiClient] CallID auto-assignment failed (non-critical):', callIdError.message);
    // Don't throw - CallID failures shouldn't kill the whole request
    return null;
  }
};

module.exports = {
  getProjectCallIDs,
  autoAssignCallIDs,
  updateSampleTableCallIDs,
  formatExistingCallIDs,
  handleCallIDAssignment,
};
