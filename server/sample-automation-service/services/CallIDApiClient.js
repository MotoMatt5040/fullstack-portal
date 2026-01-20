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
 * Get top area codes from a sample table
 * @param {string} tableName - Sample table name to analyze
 * @param {Object} gatewayHeaders - Gateway headers for authentication
 * @returns {Promise<Object>} - Object with areaCodes array and columnsFound info
 */
const getTopAreaCodes = async (tableName, gatewayHeaders) => {
  console.log(`[CallIDApiClient] getTopAreaCodes called with tableName=${tableName}`);

  const url = `/api/callid/auto-assign/area-codes?tableName=${encodeURIComponent(tableName)}`;
  console.log(`[CallIDApiClient] Making GET request to: ${CALLID_SERVICE_URL}${url}`);

  try {
    const response = await callIdApi.get(url, {
      headers: {
        'x-user-authenticated': gatewayHeaders.authenticated,
        'x-user-name': gatewayHeaders.username,
        'x-user-roles': gatewayHeaders.roles,
      },
    });
    console.log(`[CallIDApiClient] getTopAreaCodes response:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`[CallIDApiClient] Error getting top area codes:`, error.message);
    throw error;
  }
};

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
 * Match existing CallIDs to the correct slots based on new file's area codes
 * @param {Object} existing - Existing CallID data from getProjectCallIDs
 * @param {Array} topAreaCodes - Array of {AreaCode, Count} from new sample table
 * @returns {Object} - Mapping of slot names to phone numbers based on area code match
 */
const matchCallIDsToSlots = (existing, topAreaCodes) => {
  console.log(`[CallIDApiClient] matchCallIDsToSlots called`);
  console.log(`[CallIDApiClient] Existing CallIDs:`, JSON.stringify(existing, null, 2));
  console.log(`[CallIDApiClient] Top area codes from new file:`, JSON.stringify(topAreaCodes, null, 2));

  // Extract existing CallIDs with their area codes
  const existingCallIDs = [];
  if (existing.PhoneNumberL1) {
    existingCallIDs.push({
      originalSlot: 'L1',
      phoneNumber: existing.PhoneNumberL1,
      phoneNumberId: existing.CallIDL1,
      areaCode: existing.PhoneNumberL1.substring(0, 3),
      stateAbbr: existing.StateAbbrL1,
    });
  }
  if (existing.PhoneNumberL2) {
    existingCallIDs.push({
      originalSlot: 'L2',
      phoneNumber: existing.PhoneNumberL2,
      phoneNumberId: existing.CallIDL2,
      areaCode: existing.PhoneNumberL2.substring(0, 3),
      stateAbbr: existing.StateAbbrL2,
    });
  }
  if (existing.PhoneNumberC1) {
    existingCallIDs.push({
      originalSlot: 'C1',
      phoneNumber: existing.PhoneNumberC1,
      phoneNumberId: existing.CallIDC1,
      areaCode: existing.PhoneNumberC1.substring(0, 3),
      stateAbbr: existing.StateAbbrC1,
    });
  }
  if (existing.PhoneNumberC2) {
    existingCallIDs.push({
      originalSlot: 'C2',
      phoneNumber: existing.PhoneNumberC2,
      phoneNumberId: existing.CallIDC2,
      areaCode: existing.PhoneNumberC2.substring(0, 3),
      stateAbbr: existing.StateAbbrC2,
    });
  }

  console.log(`[CallIDApiClient] Extracted ${existingCallIDs.length} existing CallIDs`);

  // Create area code priority map from new file (lower index = higher priority)
  const areaCodePriority = {};
  topAreaCodes.forEach((ac, index) => {
    areaCodePriority[ac.AreaCode] = index;
  });

  // Sort existing CallIDs by how well they match the new file's area codes
  // CallIDs matching top area codes should be assigned first
  const sortedCallIDs = [...existingCallIDs].sort((a, b) => {
    const priorityA = areaCodePriority[a.areaCode] !== undefined ? areaCodePriority[a.areaCode] : 9999;
    const priorityB = areaCodePriority[b.areaCode] !== undefined ? areaCodePriority[b.areaCode] : 9999;
    return priorityA - priorityB;
  });

  console.log(`[CallIDApiClient] Sorted CallIDs by area code priority:`, sortedCallIDs.map(c => `${c.areaCode} (priority: ${areaCodePriority[c.areaCode] ?? 'none'})`));

  // Assign to slots: L1, L2, C1, C2 in order of area code priority
  const slotOrder = ['L1', 'L2', 'C1', 'C2'];
  const result = {
    phoneNumberL1: null,
    phoneNumberL2: null,
    phoneNumberC1: null,
    phoneNumberC2: null,
    assigned: [],
  };

  sortedCallIDs.forEach((callId, index) => {
    if (index < slotOrder.length) {
      const newSlot = slotOrder[index];
      const slotKey = `phoneNumber${newSlot}`;
      result[slotKey] = callId.phoneNumber;
      result.assigned.push({
        slot: `CallID${newSlot}`,
        phoneNumberId: callId.phoneNumberId,
        phoneNumber: callId.phoneNumber,
        areaCode: callId.areaCode,
        stateAbbr: callId.stateAbbr,
        originalSlot: callId.originalSlot,
        movedFromSlot: callId.originalSlot !== newSlot,
      });
      console.log(`[CallIDApiClient] Assigned ${callId.phoneNumber} (area ${callId.areaCode}) to slot ${newSlot} (was ${callId.originalSlot})`);
    }
  });

  return result;
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
        console.log('[CallIDApiClient] Project already has CallIDs assigned, analyzing new file to match slots...');

        // Get top area codes from the NEW sample table to determine correct slot placement
        let topAreaCodesResult;
        try {
          topAreaCodesResult = await getTopAreaCodes(tableName, gatewayHeaders);
          console.log(`[CallIDApiClient] Top area codes from new file:`, JSON.stringify(topAreaCodesResult, null, 2));
        } catch (areaCodeError) {
          console.error('[CallIDApiClient] Failed to get area codes, falling back to original slot order:', areaCodeError.message);
          topAreaCodesResult = { areaCodes: [] };
        }

        // Match existing CallIDs to correct slots based on new file's area codes
        const matchedSlots = matchCallIDsToSlots(existing, topAreaCodesResult.areaCodes || []);
        console.log(`[CallIDApiClient] Matched ${matchedSlots.assigned.length} CallID(s) to slots based on new file`);

        // Update the sample table's CallID columns with the MATCHED phone numbers
        try {
          const updateResult = await updateSampleTableCallIDs(tableName, {
            phoneNumberL1: matchedSlots.phoneNumberL1,
            phoneNumberL2: matchedSlots.phoneNumberL2,
            phoneNumberC1: matchedSlots.phoneNumberC1,
            phoneNumberC2: matchedSlots.phoneNumberC2,
          });
          if (updateResult.success) {
            console.log(`[CallIDApiClient] Sample table CallID columns updated: ${updateResult.rowsAffected} rows`);
          } else {
            console.log(`[CallIDApiClient] Sample table CallID update: ${updateResult.message}`);
          }
        } catch (updateError) {
          console.error('[CallIDApiClient] Failed to update sample table CallID columns:', updateError.message);
        }

        // Return formatted response with matched assignments
        return {
          success: true,
          message: `Reusing ${matchedSlots.assigned.length} existing CallID(s) for project (re-matched to new file's area codes)`,
          projectId: parseInt(projectId, 10),
          assigned: matchedSlots.assigned,
          reused: true,
          rematched: true, // Flag indicating CallIDs were re-matched to new area codes
        };
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
