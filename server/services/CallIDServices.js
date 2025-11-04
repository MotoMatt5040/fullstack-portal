const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');

/**
 * CallID Service
 * Handles all database operations for Call ID management system
 */

// ==================== DASHBOARD QUERIES ====================

/**
 * Get dashboard metrics including totals and breakdowns
 * @returns {Object} Dashboard metrics
 */
const getDashboardMetrics = async () => {
  const query = `
    -- Total counts by status
    SELECT 
      cs.StatusDescription,
      COUNT(c.PhoneNumberID) as Count
    FROM FAJITA.dbo.CallIDs c
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    GROUP BY cs.StatusDescription
    
    -- Total call IDs
    SELECT COUNT(*) as TotalCallIDs FROM FAJITA.dbo.CallIDs
    
    -- Currently active projects (using call IDs right now)
    SELECT COUNT(DISTINCT ProjectID) as ActiveProjects
    FROM FAJITA.dbo.CallIDUsage
    WHERE GETDATE() BETWEEN StartDate AND EndDate
    
    -- Available numbers (not currently assigned)
    SELECT COUNT(*) as AvailableNumbers
    FROM FAJITA.dbo.CallIDs c
    WHERE NOT EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      WHERE u.PhoneNumberID = c.PhoneNumberID
        AND GETDATE() BETWEEN u.StartDate AND u.EndDate
    )
    
    -- Numbers by state
    SELECT 
      s.StateName,
      s.StateAbbr,
      COUNT(c.PhoneNumberID) as Count
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    GROUP BY s.StateName, s.StateAbbr
    ORDER BY Count DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      
      // Parse multiple result sets
      const statusBreakdown = result.recordsets[0];
      const totalCallIDs = result.recordsets[1][0].TotalCallIDs;
      const activeProjects = result.recordsets[2][0].ActiveProjects;
      const availableNumbers = result.recordsets[3][0].AvailableNumbers;
      const stateDistribution = result.recordsets[4];

      return {
        totalCallIDs,
        activeProjects,
        availableNumbers,
        statusBreakdown,
        stateDistribution
      };
    },
    fnName: 'getDashboardMetrics',
    attempts: 3
  });
};

/**
 * Get currently active assignments (projects using call IDs right now)
 * @returns {Array} Active assignments
 */
const getCurrentActiveAssignments = async () => {
  const query = `
    SELECT 
      u.ProjectID,
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      s.StateName,
      u.StartDate,
      DATEDIFF(day, u.StartDate, GETDATE()) as DaysActive,
      cs.StatusDescription as Status
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.CallIDs c ON u.PhoneNumberID = c.PhoneNumberID
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    WHERE GETDATE() BETWEEN u.StartDate AND u.EndDate
    ORDER BY u.StartDate DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getCurrentActiveAssignments',
    attempts: 3
  });
};

/**
 * Get recent activity (last 20 assignments/changes)
 * @returns {Array} Recent activity
 */
const getRecentActivity = async () => {
  const query = `
    SELECT TOP 20
      u.ProjectID,
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      u.StartDate,
      u.EndDate,
      CASE 
        WHEN u.EndDate >= GETDATE() THEN 'Active'
        ELSE 'Ended'
      END as AssignmentStatus
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.CallIDs c ON u.PhoneNumberID = c.PhoneNumberID
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    ORDER BY u.StartDate DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getRecentActivity',
    attempts: 3
  });
};

// ==================== INVENTORY QUERIES ====================

/**
 * Get all call IDs with optional filters
 * @param {Object} filters - Filter options
 * @returns {Array} Call IDs
 */
const getAllCallIDs = async (filters = {}) => {
  let whereConditions = [];
  
  if (filters.status) whereConditions.push(`c.Status = @status`);
  if (filters.stateFIPS) whereConditions.push(`c.StateFIPS = @stateFIPS`);
  if (filters.callerName) whereConditions.push(`c.CallerName LIKE @callerName`);
  if (filters.phoneNumber) whereConditions.push(`c.PhoneNumber LIKE @phoneNumber`);
  
  // Filter by "currently in use"
  if (filters.inUse === 'true') {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      WHERE u.PhoneNumberID = c.PhoneNumberID
        AND GETDATE() BETWEEN u.StartDate AND u.EndDate
    )`);
  } else if (filters.inUse === 'false') {
    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      WHERE u.PhoneNumberID = c.PhoneNumberID
        AND GETDATE() BETWEEN u.StartDate AND u.EndDate
    )`);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  const query = `
    SELECT 
      c.PhoneNumberID,
      c.PhoneNumber,
      c.Status,
      cs.StatusDescription,
      c.CallerName,
      c.StateFIPS,
      s.StateAbbr,
      s.StateName,
      c.DateCreated,
      c.DateUpdated,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM FAJITA.dbo.CallIDUsage u
          WHERE u.PhoneNumberID = c.PhoneNumberID
            AND GETDATE() BETWEEN u.StartDate AND u.EndDate
        ) THEN 1
        ELSE 0
      END as CurrentlyInUse,
      (
        SELECT TOP 1 ProjectID 
        FROM FAJITA.dbo.CallIDUsage u
        WHERE u.PhoneNumberID = c.PhoneNumberID
          AND GETDATE() BETWEEN u.StartDate AND u.EndDate
      ) as ActiveProjectID
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    ${whereClause}
    ORDER BY c.DateCreated DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request();
      
      if (filters.status) request.input('status', sql.TinyInt, filters.status);
      if (filters.stateFIPS) request.input('stateFIPS', sql.Char(2), filters.stateFIPS);
      if (filters.callerName) request.input('callerName', sql.NVarChar, `%${filters.callerName}%`);
      if (filters.phoneNumber) request.input('phoneNumber', sql.NVarChar, `%${filters.phoneNumber}%`);

      const result = await request.query(query);
      return result.recordset;
    },
    fnName: 'getAllCallIDs',
    attempts: 3
  });
};

/**
 * Get a single call ID by ID
 * @param {Number} phoneNumberId - Phone number ID
 * @returns {Object} Call ID details
 */
const getCallIDById = async (phoneNumberId) => {
  const query = `
    SELECT 
      c.PhoneNumberID,
      c.PhoneNumber,
      c.Status,
      cs.StatusDescription,
      c.CallerName,
      c.StateFIPS,
      s.StateAbbr,
      s.StateName,
      c.DateCreated,
      c.DateUpdated,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM FAJITA.dbo.CallIDUsage u
          WHERE u.PhoneNumberID = c.PhoneNumberID
            AND GETDATE() BETWEEN u.StartDate AND u.EndDate
        ) THEN 1
        ELSE 0
      END as CurrentlyInUse
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    WHERE c.PhoneNumberID = @phoneNumberId
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .query(query);
      return result.recordset[0];
    },
    fnName: 'getCallIDById',
    attempts: 3
  });
};

/**
 * Create a new call ID
 * @param {Object} callIdData - Call ID data
 * @returns {Object} Created call ID
 */
const createCallID = async (callIdData) => {
  const { phoneNumber, status, callerName, stateFIPS } = callIdData;

  const query = `
    INSERT INTO FAJITA.dbo.CallIDs (PhoneNumber, Status, CallerName, StateFIPS)
    VALUES (@phoneNumber, @status, @callerName, @stateFIPS);
    
    SELECT SCOPE_IDENTITY() as PhoneNumberID;
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('phoneNumber', sql.NVarChar(10), phoneNumber)
        .input('status', sql.TinyInt, status || 1)
        .input('callerName', sql.NVarChar(25), callerName || 'Survey Research')
        .input('stateFIPS', sql.Char(2), stateFIPS)
        .query(query);
      
      const newId = result.recordset[0].PhoneNumberID;
      return getCallIDById(newId);
    },
    fnName: 'createCallID',
    attempts: 3
  });
};

/**
 * Update an existing call ID
 * @param {Number} phoneNumberId - Phone number ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated call ID
 */
const updateCallID = async (phoneNumberId, updates) => {
  const allowedFields = ['Status', 'CallerName', 'StateFIPS'];
  const setStatements = [];
  
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      setStatements.push(`${key} = @${key}`);
    }
  });

  if (setStatements.length === 0) {
    throw new Error('No valid fields to update');
  }

  const query = `
    UPDATE FAJITA.dbo.CallIDs
    SET ${setStatements.join(', ')}, DateUpdated = GETDATE()
    WHERE PhoneNumberID = @phoneNumberId
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request()
        .input('phoneNumberId', sql.Int, phoneNumberId);
      
      if (updates.Status !== undefined) request.input('Status', sql.TinyInt, updates.Status);
      if (updates.CallerName) request.input('CallerName', sql.NVarChar(25), updates.CallerName);
      if (updates.StateFIPS) request.input('StateFIPS', sql.Char(2), updates.StateFIPS);

      await request.query(query);
      return getCallIDById(phoneNumberId);
    },
    fnName: 'updateCallID',
    attempts: 3
  });
};

/**
 * Delete a call ID
 * @param {Number} phoneNumberId - Phone number ID
 * @returns {Object} Result
 */
const deleteCallID = async (phoneNumberId) => {
  const query = `
    -- Check if call ID is currently in use
    IF EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage
      WHERE PhoneNumberID = @phoneNumberId
        AND GETDATE() BETWEEN StartDate AND EndDate
    )
    BEGIN
      SELECT 0 as Success, 'Cannot delete call ID that is currently in use' as Message
      RETURN
    END
    
    -- Delete usage history first
    DELETE FROM FAJITA.dbo.CallIDUsage WHERE PhoneNumberID = @phoneNumberId
    
    -- Delete the call ID
    DELETE FROM FAJITA.dbo.CallIDs WHERE PhoneNumberID = @phoneNumberId
    
    SELECT 1 as Success, 'Call ID deleted successfully' as Message
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .query(query);
      return result.recordset[0];
    },
    fnName: 'deleteCallID',
    attempts: 3
  });
};

// ==================== USAGE/ASSIGNMENT QUERIES ====================

/**
 * Get usage history for a specific call ID
 * @param {Number} phoneNumberId - Phone number ID
 * @returns {Array} Usage history
 */
const getCallIDUsageHistory = async (phoneNumberId) => {
  const query = `
    SELECT 
      u.ProjectID,
      u.PhoneNumberID,
      c.PhoneNumber,
      u.StartDate,
      u.EndDate,
      DATEDIFF(day, u.StartDate, u.EndDate) as DurationDays,
      CASE 
        WHEN u.EndDate >= GETDATE() THEN 'Active'
        ELSE 'Ended'
      END as Status
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.CallIDs c ON u.PhoneNumberID = c.PhoneNumberID
    WHERE u.PhoneNumberID = @phoneNumberId
    ORDER BY u.StartDate DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .query(query);
      return result.recordset;
    },
    fnName: 'getCallIDUsageHistory',
    attempts: 3
  });
};

/**
 * Get all call IDs used by a specific project
 * @param {String} projectId - Project ID
 * @returns {Array} Project's call IDs
 */
const getProjectCallIDs = async (projectId) => {
  const query = `
    SELECT 
      u.ProjectID,
      u.PhoneNumberID,
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      s.StateName,
      cs.StatusDescription,
      u.StartDate,
      u.EndDate,
      DATEDIFF(day, u.StartDate, u.EndDate) as DurationDays,
      CASE 
        WHEN u.EndDate >= GETDATE() THEN 'Active'
        ELSE 'Ended'
      END as Status
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.CallIDs c ON u.PhoneNumberID = c.PhoneNumberID
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    WHERE u.ProjectID = @projectId
    ORDER BY u.StartDate ASC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .query(query);
      return result.recordset;
    },
    fnName: 'getProjectCallIDs',
    attempts: 3
  });
};

/**
 * Assign a call ID to a project
 * @param {Object} assignmentData - Assignment data
 * @returns {Object} Created assignment
 */
const assignCallIDToProject = async (assignmentData) => {
  const { projectId, phoneNumberId, startDate, endDate } = assignmentData;

  const query = `
    -- Check for conflicts (same number assigned to different project in overlapping time)
    IF EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage
      WHERE PhoneNumberID = @phoneNumberId
        AND ProjectID != @projectId
        AND (
          (@startDate BETWEEN StartDate AND EndDate)
          OR (@endDate BETWEEN StartDate AND EndDate)
          OR (StartDate BETWEEN @startDate AND @endDate)
        )
    )
    BEGIN
      SELECT 0 as Success, 'This call ID is already assigned to another project during this time period' as Message
      RETURN
    END
    
    -- Insert the assignment
    INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, PhoneNumberID, StartDate, EndDate)
    VALUES (@projectId, @phoneNumberId, @startDate, @endDate)
    
    SELECT 1 as Success, 'Assignment created successfully' as Message
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('startDate', sql.DateTime, startDate || new Date())
        .input('endDate', sql.DateTime, endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) // Default 1 year
        .query(query);
      return result.recordset[0];
    },
    fnName: 'assignCallIDToProject',
    attempts: 3
  });
};

/**
 * Update an existing assignment
 * @param {String} projectId - Project ID
 * @param {Number} phoneNumberId - Phone number ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Result
 */
const updateAssignment = async (projectId, phoneNumberId, updates) => {
  const { startDate, endDate } = updates;

  const query = `
    UPDATE FAJITA.dbo.CallIDUsage
    SET 
      StartDate = COALESCE(@startDate, StartDate),
      EndDate = COALESCE(@endDate, EndDate)
    WHERE ProjectID = @projectId AND PhoneNumberID = @phoneNumberId
    
    SELECT 1 as Success, 'Assignment updated successfully' as Message
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('startDate', sql.DateTime, startDate || null)
        .input('endDate', sql.DateTime, endDate || null)
        .query(query);
      return result.recordset[0];
    },
    fnName: 'updateAssignment',
    attempts: 3
  });
};

/**
 * End an assignment (set end date to now)
 * @param {String} projectId - Project ID
 * @param {Number} phoneNumberId - Phone number ID
 * @returns {Object} Result
 */
const endAssignment = async (projectId, phoneNumberId) => {
  const query = `
    UPDATE FAJITA.dbo.CallIDUsage
    SET EndDate = GETDATE()
    WHERE ProjectID = @projectId AND PhoneNumberID = @phoneNumberId
    
    SELECT 1 as Success, 'Assignment ended successfully' as Message
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .query(query);
      return result.recordset[0];
    },
    fnName: 'endAssignment',
    attempts: 3
  });
};

// ==================== ANALYTICS QUERIES ====================

/**
 * Get utilization metrics
 * @returns {Object} Utilization data
 */
const getUtilizationMetrics = async () => {
  const query = `
    -- Total numbers
    SELECT COUNT(*) as TotalNumbers FROM FAJITA.dbo.CallIDs
    
    -- Currently in use
    SELECT COUNT(DISTINCT u.PhoneNumberID) as InUseNumbers
    FROM FAJITA.dbo.CallIDUsage u
    WHERE GETDATE() BETWEEN u.StartDate AND u.EndDate
    
    -- Average usage duration (in days)
    SELECT AVG(DATEDIFF(day, StartDate, EndDate)) as AvgDurationDays
    FROM FAJITA.dbo.CallIDUsage
    WHERE EndDate < GETDATE()
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      
      const totalNumbers = result.recordsets[0][0].TotalNumbers;
      const inUseNumbers = result.recordsets[1][0].InUseNumbers;
      const avgDurationDays = result.recordsets[2][0].AvgDurationDays || 0;
      const utilizationRate = totalNumbers > 0 
        ? ((inUseNumbers / totalNumbers) * 100).toFixed(2)
        : 0;

      return {
        totalNumbers,
        inUseNumbers,
        availableNumbers: totalNumbers - inUseNumbers,
        utilizationRate: parseFloat(utilizationRate),
        avgDurationDays: Math.round(avgDurationDays)
      };
    },
    fnName: 'getUtilizationMetrics',
    attempts: 3
  });
};

/**
 * Get most used call IDs
 * @param {Number} limit - Number of results to return
 * @returns {Array} Most used call IDs
 */
const getMostUsedCallIDs = async (limit = 10) => {
  const query = `
    SELECT TOP (@limit)
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      COUNT(u.ProjectID) as TimesUsed,
      MAX(u.EndDate) as LastUsed
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.CallIDUsage u ON c.PhoneNumberID = u.PhoneNumberID
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    GROUP BY c.PhoneNumber, c.CallerName, s.StateAbbr
    ORDER BY TimesUsed DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('limit', sql.Int, limit)
        .query(query);
      return result.recordset;
    },
    fnName: 'getMostUsedCallIDs',
    attempts: 3
  });
};

/**
 * Get idle call IDs (not used in X days)
 * @param {Number} days - Number of days threshold
 * @returns {Array} Idle call IDs
 */
const getIdleCallIDs = async (days = 30) => {
  const query = `
    SELECT 
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      cs.StatusDescription,
      MAX(u.EndDate) as LastUsed,
      DATEDIFF(day, MAX(u.EndDate), GETDATE()) as DaysSinceLastUse
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    LEFT JOIN FAJITA.dbo.CallIDUsage u ON c.PhoneNumberID = u.PhoneNumberID
    GROUP BY c.PhoneNumber, c.CallerName, s.StateAbbr, cs.StatusDescription
    HAVING 
      MAX(u.EndDate) IS NULL 
      OR DATEDIFF(day, MAX(u.EndDate), GETDATE()) >= @days
    ORDER BY DaysSinceLastUse DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('days', sql.Int, days)
        .query(query);
      return result.recordset;
    },
    fnName: 'getIdleCallIDs',
    attempts: 3
  });
};

/**
 * Get state coverage analysis
 * @returns {Array} State coverage data
 */
const getStateCoverage = async () => {
  const query = `
    SELECT 
      s.StateAbbr,
      s.StateName,
      COUNT(c.PhoneNumberID) as TotalNumbers,
      SUM(CASE 
        WHEN EXISTS (
          SELECT 1 FROM FAJITA.dbo.CallIDUsage u
          WHERE u.PhoneNumberID = c.PhoneNumberID
            AND GETDATE() BETWEEN u.StartDate AND u.EndDate
        ) THEN 1 ELSE 0
      END) as InUseNumbers,
      SUM(CASE 
        WHEN NOT EXISTS (
          SELECT 1 FROM FAJITA.dbo.CallIDUsage u
          WHERE u.PhoneNumberID = c.PhoneNumberID
            AND GETDATE() BETWEEN u.StartDate AND u.EndDate
        ) THEN 1 ELSE 0
      END) as AvailableNumbers
    FROM FAJITA.dbo.States s
    LEFT JOIN FAJITA.dbo.CallIDs c ON s.StateFIPS = c.StateFIPS
    GROUP BY s.StateAbbr, s.StateName
    HAVING COUNT(c.PhoneNumberID) > 0
    ORDER BY TotalNumbers DESC
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getStateCoverage',
    attempts: 3
  });
};

/**
 * Get usage over time (for timeline charts)
 * @param {Number} months - Number of months to look back
 * @returns {Array} Usage timeline data
 */
const getUsageTimeline = async (months = 6) => {
  const query = `
    WITH DateRange AS (
      SELECT DATEADD(month, -@months, GETDATE()) as StartRange
    )
    SELECT 
      DATEPART(year, u.StartDate) as Year,
      DATEPART(month, u.StartDate) as Month,
      DATENAME(month, u.StartDate) as MonthName,
      COUNT(DISTINCT u.PhoneNumberID) as UniqueNumbersUsed,
      COUNT(u.ProjectID) as TotalAssignments
    FROM FAJITA.dbo.CallIDUsage u
    CROSS JOIN DateRange dr
    WHERE u.StartDate >= dr.StartRange
    GROUP BY 
      DATEPART(year, u.StartDate),
      DATEPART(month, u.StartDate),
      DATENAME(month, u.StartDate)
    ORDER BY Year, Month
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('months', sql.Int, months)
        .query(query);
      return result.recordset;
    },
    fnName: 'getUsageTimeline',
    attempts: 3
  });
};

// ==================== LOOKUP/UTILITY QUERIES ====================

/**
 * Get all status codes
 * @returns {Array} Status codes
 */
const getAllStatusCodes = async () => {
  const query = `SELECT StatusCode, StatusDescription FROM FAJITA.dbo.CallIDStatus ORDER BY StatusCode`;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getAllStatusCodes',
    attempts: 3
  });
};

/**
 * Get all states
 * @returns {Array} States
 */
const getAllStates = async () => {
  const query = `SELECT StateFIPS, StateAbbr, StateName FROM FAJITA.dbo.States ORDER BY StateName`;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getAllStates',
    attempts: 3
  });
};

/**
 * Get available call IDs for a specific state and date range
 * @param {String} stateFIPS - State FIPS code
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Available call IDs
 */
const getAvailableCallIDsForState = async (stateFIPS, startDate, endDate) => {
  const query = `
    SELECT 
      c.PhoneNumberID,
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      cs.StatusDescription
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    WHERE c.StateFIPS = @stateFIPS
      AND c.Status = 1  -- Only active status
      AND NOT EXISTS (
        SELECT 1 FROM FAJITA.dbo.CallIDUsage u
        WHERE u.PhoneNumberID = c.PhoneNumberID
          AND (
            (@startDate BETWEEN u.StartDate AND u.EndDate)
            OR (@endDate BETWEEN u.StartDate AND u.EndDate)
            OR (u.StartDate BETWEEN @startDate AND @endDate)
          )
      )
    ORDER BY c.PhoneNumber
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('stateFIPS', sql.Char(2), stateFIPS)
        .input('startDate', sql.DateTime, startDate)
        .input('endDate', sql.DateTime, endDate)
        .query(query);
      return result.recordset;
    },
    fnName: 'getAvailableCallIDsForState',
    attempts: 3
  });
};

module.exports = {
  // Dashboard
  getDashboardMetrics,
  getCurrentActiveAssignments,
  getRecentActivity,
  
  // Inventory
  getAllCallIDs,
  getCallIDById,
  createCallID,
  updateCallID,
  deleteCallID,
  
  // Usage/Assignments
  getCallIDUsageHistory,
  getProjectCallIDs,
  assignCallIDToProject,
  updateAssignment,
  endAssignment,
  
  // Analytics
  getUtilizationMetrics,
  getMostUsedCallIDs,
  getIdleCallIDs,
  getStateCoverage,
  getUsageTimeline,
  
  // Lookups
  getAllStatusCodes,
  getAllStates,
  getAvailableCallIDsForState
};