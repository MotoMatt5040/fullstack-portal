const handleAsync = require('./asyncController');
const CallIDService = require('../services/CallIDServices');

// ==================== DASHBOARD CONTROLLERS ====================

/**
 * Get dashboard metrics
 * GET /api/callid/dashboard
 */
const handleGetDashboardMetrics = handleAsync(async (req, res) => {
  const metrics = await CallIDService.getDashboardMetrics();
  res.status(200).json(metrics);
});

/**
 * Get currently active assignments
 * GET /api/callid/dashboard/active-assignments
 */
const handleGetCurrentActiveAssignments = handleAsync(async (req, res) => {
  const assignments = await CallIDService.getCurrentActiveAssignments();
  res.status(200).json(assignments);
});

/**
 * Get recent activity
 * GET /api/callid/dashboard/recent-activity
 */
const handleGetRecentActivity = handleAsync(async (req, res) => {
  const activity = await CallIDService.getRecentActivity();
  res.status(200).json(activity);
});

// ==================== INVENTORY CONTROLLERS ====================

/**
 * Get all call IDs with optional filters
 * GET /api/callid/inventory
 * Query params: status, stateFIPS, callerName, phoneNumber, inUse
 */
const handleGetAllCallIDs = handleAsync(async (req, res) => {
  const filters = {
    status: req.query.status,
    stateFIPS: req.query.stateFIPS,
    callerName: req.query.callerName,
    phoneNumber: req.query.phoneNumber,
    inUse: req.query.inUse,
    page: req.query.page,
    limit: req.query.limit
  };

  // Remove undefined filters
  Object.keys(filters).forEach(key =>
    filters[key] === undefined && delete filters[key]
  );

  const result = await CallIDService.getAllCallIDs(filters);
  res.status(200).json(result);
});

/**
 * Get a single call ID by ID
 * GET /api/callid/inventory/:id
 */
const handleGetCallIDById = handleAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Valid Call ID is required' });
  }

  const callID = await CallIDService.getCallIDById(parseInt(id));
  
  if (!callID) {
    return res.status(404).json({ message: 'Call ID not found' });
  }

  res.status(200).json(callID);
});

/**
 * Create a new call ID
 * POST /api/callid/inventory
 * Body: { phoneNumber, status, callerName, stateFIPS }
 */
const handleCreateCallID = handleAsync(async (req, res) => {
  const { phoneNumber, status, callerName, stateFIPS } = req.body;

  // Validation
  if (!phoneNumber || !stateFIPS) {
    return res.status(400).json({ 
      message: 'Phone number and state FIPS are required' 
    });
  }

  // Validate phone number format (10 digits)
  if (!/^\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({
      message: 'Phone number must be exactly 10 digits'
    });
  }

  // Validate US phone number (area code cannot start with 0 or 1)
  const areaCode = phoneNumber.substring(0, 3);
  if (areaCode[0] === '0' || areaCode[0] === '1') {
    return res.status(400).json({
      message: 'Invalid phone number: area code cannot start with 0 or 1'
    });
  }

  // Validate exchange code (second group cannot start with 0 or 1)
  const exchangeCode = phoneNumber.substring(3, 6);
  if (exchangeCode[0] === '0' || exchangeCode[0] === '1') {
    return res.status(400).json({
      message: 'Invalid phone number: exchange code cannot start with 0 or 1'
    });
  }

  // Validate state FIPS format (2 chars)
  if (!/^\d{2}$/.test(stateFIPS)) {
    return res.status(400).json({ 
      message: 'State FIPS must be exactly 2 digits' 
    });
  }

  try {
    const newCallID = await CallIDService.createCallID({
      phoneNumber,
      status,
      callerName,
      stateFIPS
    });

    res.status(201).json({
      success: true,
      message: 'Call ID created successfully',
      data: newCallID
    });
  } catch (error) {
    // Handle duplicate phone number error
    if (error.message.includes('UNIQUE') || error.message.includes('duplicate')) {
      return res.status(409).json({ 
        message: 'This phone number already exists' 
      });
    }
    throw error;
  }
});

/**
 * Update an existing call ID
 * PUT /api/callid/inventory/:id
 * Body: { status, callerName, stateFIPS }
 */
const handleUpdateCallID = handleAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Valid Call ID is required' });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No updates provided' });
  }

  // Validate state FIPS if provided
  if (updates.stateFIPS && !/^\d{2}$/.test(updates.stateFIPS)) {
    return res.status(400).json({ 
      message: 'State FIPS must be exactly 2 digits' 
    });
  }

  const updatedCallID = await CallIDService.updateCallID(parseInt(id), updates);

  if (!updatedCallID) {
    return res.status(404).json({ message: 'Call ID not found' });
  }

  res.status(200).json({
    success: true,
    message: 'Call ID updated successfully',
    data: updatedCallID
  });
});

/**
 * Delete a call ID
 * DELETE /api/callid/inventory/:id
 */
const handleDeleteCallID = handleAsync(async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Valid Call ID is required' });
  }

  const result = await CallIDService.deleteCallID(parseInt(id));

  if (!result.Success) {
    return res.status(400).json({ message: result.Message });
  }

  res.status(200).json({
    success: true,
    message: result.Message
  });
});

// ==================== USAGE/ASSIGNMENT CONTROLLERS ====================

/**
 * Get usage history for a specific call ID
 * GET /api/callid/usage/history/:phoneNumberId
 */
const handleGetCallIDUsageHistory = handleAsync(async (req, res) => {
  const { phoneNumberId } = req.params;

  if (!phoneNumberId || isNaN(phoneNumberId)) {
    return res.status(400).json({ message: 'Valid Phone Number ID is required' });
  }

  const history = await CallIDService.getCallIDUsageHistory(parseInt(phoneNumberId));
  res.status(200).json(history);
});

/**
 * Get all call IDs used by a specific project
 * GET /api/callid/usage/project/:projectId
 */
const handleGetProjectCallIDs = handleAsync(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  const callIDs = await CallIDService.getProjectCallIDs(projectId);
  res.status(200).json(callIDs);
});

const handleAssignCallIDToProject = handleAsync(async (req, res) => {
  const { projectId, phoneNumberId, startDate, endDate, callIdSlot } = req.body;

  // Validation
  if (!projectId || !phoneNumberId) {
    return res.status(400).json({ 
      message: 'Project ID and Phone Number ID are required' 
    });
  }

  const result = await CallIDService.assignCallIDToProject({
    projectId,
    phoneNumberId: parseInt(phoneNumberId),
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    callIdSlot: callIdSlot ? parseInt(callIdSlot) : null
  });

  if (!result.Success) {
    return res.status(409).json({ message: result.Message });
  }

  res.status(201).json({
    success: true,
    message: result.Message
  });
});

/**
 * End an assignment (set end date to now)
 * DELETE /api/callid/usage/assign/:projectId/:phoneNumberId
 */
const handleEndAssignment = handleAsync(async (req, res) => {
  const { projectId, phoneNumberId } = req.params;

  if (!projectId || !phoneNumberId) {
    return res.status(400).json({ 
      message: 'Project ID and Phone Number ID are required' 
    });
  }

  const result = await CallIDService.endAssignment(
    projectId,
    parseInt(phoneNumberId)
  );

  res.status(200).json({
    success: true,
    message: result.Message
  });
});

// ==================== ANALYTICS CONTROLLERS ====================

/**
 * Get utilization metrics
 * GET /api/callid/analytics/utilization
 */
const handleGetUtilizationMetrics = handleAsync(async (req, res) => {
  const metrics = await CallIDService.getUtilizationMetrics();
  res.status(200).json(metrics);
});

/**
 * Get most used call IDs
 * GET /api/callid/analytics/most-used
 * Query params: limit (default 10)
 */
const handleGetMostUsedCallIDs = handleAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data = await CallIDService.getMostUsedCallIDs(limit);
  res.status(200).json(data);
});

/**
 * Get idle call IDs
 * GET /api/callid/analytics/idle
 * Query params: days (default 30)
 */
const handleGetIdleCallIDs = handleAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const data = await CallIDService.getIdleCallIDs(days);
  res.status(200).json(data);
});

/**
 * Get state coverage analysis
 * GET /api/callid/analytics/state-coverage
 */
const handleGetStateCoverage = handleAsync(async (req, res) => {
  const data = await CallIDService.getStateCoverage();
  res.status(200).json(data);
});

/**
 * Get usage timeline
 * GET /api/callid/analytics/timeline
 * Query params: months (default 6)
 */
const handleGetUsageTimeline = handleAsync(async (req, res) => {
  const months = parseInt(req.query.months) || 6;
  const data = await CallIDService.getUsageTimeline(months);
  res.status(200).json(data);
});

// ==================== LOOKUP/UTILITY CONTROLLERS ====================

/**
 * Get all status codes
 * GET /api/callid/lookups/status-codes
 */
const handleGetAllStatusCodes = handleAsync(async (req, res) => {
  const statusCodes = await CallIDService.getAllStatusCodes();
  res.status(200).json(statusCodes);
});

/**
 * Get all states
 * GET /api/callid/lookups/states
 */
const handleGetAllStates = handleAsync(async (req, res) => {
  const states = await CallIDService.getAllStates();
  res.status(200).json(states);
});

/**
 * Get available call IDs for a specific state and date range
 * GET /api/callid/lookups/available
 * Query params: stateFIPS, startDate, endDate
 */
const handleGetAvailableCallIDsForState = handleAsync(async (req, res) => {
  const { stateFIPS, startDate, endDate } = req.query;

  if (!stateFIPS || !startDate || !endDate) {
    return res.status(400).json({ 
      message: 'State FIPS, start date, and end date are required' 
    });
  }

  const availableIDs = await CallIDService.getAvailableCallIDsForState(
    stateFIPS,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json(availableIDs);
});

// Add these functions to server/controllers/callIDController.js

const {
  getAllProjectsWithAssignments,
  checkAssignmentConflict,
  updateAssignment,
  swapCallIDAssignment,
} = require('../services/CallIDServices');

/**
 * Get all projects with their call ID assignment summary
 * GET /api/callid/assignments/projects
 */
const handleGetAllProjectsWithAssignments = async (req, res) => {
  try {
    const projects = await getAllProjectsWithAssignments();
    
    res.json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error('Error in handleGetAllProjectsWithAssignments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch projects with assignments'
    });
  }
};

/**
 * Check for assignment conflicts
 * POST /api/callid/assignments/check-conflict
 * Body: { phoneNumberId, startDate, endDate, excludeProjectId? }
 */
const handleCheckAssignmentConflict = async (req, res) => {
  try {
    const { phoneNumberId, startDate, endDate, excludeProjectId } = req.body;

    if (!phoneNumberId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Phone number ID, start date, and end date are required'
      });
    }

    const conflictCheck = await checkAssignmentConflict(
      phoneNumberId, 
      startDate, 
      endDate, 
      excludeProjectId
    );
    
    res.json({
      success: true,
      ...conflictCheck
    });
  } catch (error) {
    console.error('Error in handleCheckAssignmentConflict:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check assignment conflict'
    });
  }
};

/**
 * Update an existing assignment
 * PUT /api/callid/assignments/:projectId/:phoneNumberId
 * Body: { startDate, endDate }
 */
const handleUpdateAssignment = async (req, res) => {
  try {
    const { projectId, phoneNumberId } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const updated = await updateAssignment(projectId, parseInt(phoneNumberId), {
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: updated,
      message: 'Assignment updated successfully'
    });
  } catch (error) {
    console.error('Error in handleUpdateAssignment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update assignment'
    });
  }
};

/**
 * Swap call ID from one project to another
 * POST /api/callid/assignments/swap
 * Body: { fromProjectId, toProjectId, phoneNumberId, startDate?, endDate? }
 */
const handleSwapCallIDAssignment = async (req, res) => {
  try {
    const { fromProjectId, toProjectId, phoneNumberId, startDate, endDate } = req.body;

    if (!fromProjectId || !toProjectId || !phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'From project ID, to project ID, and phone number ID are required'
      });
    }

    const result = await swapCallIDAssignment(
      fromProjectId,
      toProjectId,
      phoneNumberId,
      { startDate, endDate }
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in handleSwapCallIDAssignment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to swap call ID assignment'
    });
  }
};

const handleReassignCallID = handleAsync(async (req, res) => {
  const { projectId, oldPhoneNumberId, newPhoneNumberId } = req.body;

  console.log('Reassign request body:', req.body); // Debug log

  if (!projectId || !oldPhoneNumberId || !newPhoneNumberId) {
    return res.status(400).json({ 
      message: 'Project ID, old phone number ID, and new phone number ID are required',
      received: { projectId, oldPhoneNumberId, newPhoneNumberId }
    });
  }

  const result = await CallIDService.reassignCallID({
    projectId,
    oldPhoneNumberId: parseInt(oldPhoneNumberId),
    newPhoneNumberId: parseInt(newPhoneNumberId)
  });

  res.status(200).json({
    success: true,
    message: result.message
  });
});

const handleUpdateProjectSlot = handleAsync(async (req, res) => {
  const { projectId, slotName, phoneNumberId } = req.body;

  if (!projectId || !slotName) {
    return res.status(400).json({ 
      message: 'Project ID and slot name are required' 
    });
  }

  // Validate slot name
  const validSlots = ['CallIDL1', 'CallIDL2', 'CallIDC1', 'CallIDC2'];
  if (!validSlots.includes(slotName)) {
    return res.status(400).json({ 
      message: 'Invalid slot name. Must be CallIDL1, CallIDL2, CallIDC1, or CallIDC2' 
    });
  }

  const result = await CallIDService.updateProjectSlot(
    projectId,
    slotName,
    phoneNumberId ? parseInt(phoneNumberId) : null
  );

  res.status(200).json({
    success: true,
    message: result.Message
  });
});

const handleRemoveProjectSlot = handleAsync(async (req, res) => {
  const { projectId, slotName } = req.body;

  if (!projectId || !slotName) {
    return res.status(400).json({ 
      message: 'Project ID and slot name are required' 
    });
  }

  const result = await CallIDService.removeProjectSlot(projectId, slotName);

  res.status(200).json({
    success: true,
    message: result.Message
  });
});

module.exports = {
  // Dashboard
  handleGetDashboardMetrics,
  handleGetCurrentActiveAssignments,
  handleGetRecentActivity,

  // Inventory
  handleGetAllCallIDs,
  handleGetCallIDById,
  handleCreateCallID,
  handleUpdateCallID,
  handleDeleteCallID,

  // Usage/Assignments
  handleGetCallIDUsageHistory,
  handleGetProjectCallIDs,
  handleAssignCallIDToProject,
  handleUpdateAssignment,
  handleEndAssignment,
  handleReassignCallID,
  handleUpdateProjectSlot,
  handleRemoveProjectSlot,

  // Advanced Assignments
  handleGetAllProjectsWithAssignments,
  handleCheckAssignmentConflict,
  handleSwapCallIDAssignment,

  // Analytics
  handleGetUtilizationMetrics,
  handleGetMostUsedCallIDs,
  handleGetIdleCallIDs,
  handleGetStateCoverage,
  handleGetUsageTimeline,

  // Lookups
  handleGetAllStatusCodes,
  handleGetAllStates,
  handleGetAvailableCallIDsForState
};