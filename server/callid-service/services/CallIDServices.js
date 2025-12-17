const { sql, withDbConnection } = require('../config/dbConn');

/**
 * CallID Service
 * Handles all database operations for Call ID management system
 */

// ==================== DASHBOARD QUERIES ====================

/**
 * Get dashboard metrics including totals and breakdowns
 * Dates are now retrieved from the Projects table instead of CallIDUsage
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

    -- Total call IDs (only Available or In Use - exclude Removed/Flagged)
    SELECT COUNT(*) as TotalCallIDs FROM FAJITA.dbo.CallIDs WHERE Status IN (1, 2)

    -- Currently active projects (using dates from Projects table)
    SELECT COUNT(*) as ActiveProjects
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
      AND (CallIDL1 IS NOT NULL OR CallIDL2 IS NOT NULL OR CallIDC1 IS NOT NULL OR CallIDC2 IS NOT NULL)

    -- Available numbers (status 1 or 2, not currently assigned to active projects)
    SELECT COUNT(*) as AvailableNumbers
    FROM FAJITA.dbo.CallIDs c
    WHERE c.Status IN (1, 2)  -- Only Available or In Use (exclude Removed/Flagged)
      AND NOT EXISTS (
        SELECT 1 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
          AND (c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2))
      )

    -- Numbers by state (only Available or In Use - exclude Removed/Flagged)
    SELECT
      s.StateName,
      s.StateAbbr,
      COUNT(c.PhoneNumberID) as Count
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    WHERE c.Status IN (1, 2)  -- Only Available or In Use (exclude Removed/Flagged)
    GROUP BY s.StateName, s.StateAbbr
    ORDER BY Count DESC
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request().query(query);
      
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
 * Get currently active assignments - UNPIVOTED to show each slot as a row
 * Active assignments are determined by currently fielding projects (dates from Projects table)
 */
const getCurrentActiveAssignments = async () => {
  const query = `
    SELECT
      u.ProjectID,
      'CallIDL1' as SlotName,
      1 as SlotNumber,
      u.CallIDL1 as PhoneNumberID,
      c1.PhoneNumber,
      c1.CallerName,
      c1.Status,
      s1.StateAbbr,
      p.startDate as StartDate,
      p.endDate as EndDate,
      DATEDIFF(day, p.startDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    LEFT JOIN FAJITA.dbo.CallIDs c1 ON u.CallIDL1 = c1.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s1 ON c1.StateFIPS = s1.StateFIPS
    WHERE u.CallIDL1 IS NOT NULL
      AND CAST(GETDATE() AS DATE) >= CAST(p.startDate AS DATE)
      AND CAST(GETDATE() AS DATE) <= CAST(p.endDate AS DATE)

    UNION ALL

    SELECT
      u.ProjectID,
      'CallIDL2' as SlotName,
      2 as SlotNumber,
      u.CallIDL2 as PhoneNumberID,
      c2.PhoneNumber,
      c2.CallerName,
      c2.Status,
      s2.StateAbbr,
      p.startDate as StartDate,
      p.endDate as EndDate,
      DATEDIFF(day, p.startDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    LEFT JOIN FAJITA.dbo.CallIDs c2 ON u.CallIDL2 = c2.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s2 ON c2.StateFIPS = s2.StateFIPS
    WHERE u.CallIDL2 IS NOT NULL
      AND CAST(GETDATE() AS DATE) >= CAST(p.startDate AS DATE)
      AND CAST(GETDATE() AS DATE) <= CAST(p.endDate AS DATE)

    UNION ALL

    SELECT
      u.ProjectID,
      'CallIDC1' as SlotName,
      3 as SlotNumber,
      u.CallIDC1 as PhoneNumberID,
      c3.PhoneNumber,
      c3.CallerName,
      c3.Status,
      s3.StateAbbr,
      p.startDate as StartDate,
      p.endDate as EndDate,
      DATEDIFF(day, p.startDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    LEFT JOIN FAJITA.dbo.CallIDs c3 ON u.CallIDC1 = c3.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s3 ON c3.StateFIPS = s3.StateFIPS
    WHERE u.CallIDC1 IS NOT NULL
      AND CAST(GETDATE() AS DATE) >= CAST(p.startDate AS DATE)
      AND CAST(GETDATE() AS DATE) <= CAST(p.endDate AS DATE)

    UNION ALL

    SELECT
      u.ProjectID,
      'CallIDC2' as SlotName,
      4 as SlotNumber,
      u.CallIDC2 as PhoneNumberID,
      c4.PhoneNumber,
      c4.CallerName,
      c4.Status,
      s4.StateAbbr,
      p.startDate as StartDate,
      p.endDate as EndDate,
      DATEDIFF(day, p.startDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    LEFT JOIN FAJITA.dbo.CallIDs c4 ON u.CallIDC2 = c4.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s4 ON c4.StateFIPS = s4.StateFIPS
    WHERE u.CallIDC2 IS NOT NULL
      AND CAST(GETDATE() AS DATE) >= CAST(p.startDate AS DATE)
      AND CAST(GETDATE() AS DATE) <= CAST(p.endDate AS DATE)

    ORDER BY ProjectID, SlotNumber
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getCurrentActiveAssignments',
    attempts: 3
  });
};

/**
 * Get recent activity - Using dates from Projects table
 */
const getRecentActivity = async () => {
  const query = `
    WITH RecentChanges AS (
      SELECT TOP 20
        u.ProjectID,
        p.startDate,
        p.endDate,
        u.CallIDL1,
        u.CallIDL2,
        u.CallIDC1,
        u.CallIDC2
      FROM FAJITA.dbo.CallIDUsage u
      INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
      ORDER BY p.startDate DESC
    )
    SELECT
      rc.ProjectID,
      COALESCE(c1.PhoneNumber, c2.PhoneNumber, c3.PhoneNumber, c4.PhoneNumber) as PhoneNumber,
      COALESCE(c1.CallerName, c2.CallerName, c3.CallerName, c4.CallerName) as CallerName,
      COALESCE(s1.StateAbbr, s2.StateAbbr, s3.StateAbbr, s4.StateAbbr) as StateAbbr,
      rc.startDate as StartDate,
      rc.endDate as EndDate,
      CASE
        WHEN rc.endDate >= CAST(GETDATE() AS DATE) THEN 'Active'
        ELSE 'Ended'
      END as AssignmentStatus
    FROM RecentChanges rc
    LEFT JOIN FAJITA.dbo.CallIDs c1 ON rc.CallIDL1 = c1.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c2 ON rc.CallIDL2 = c2.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c3 ON rc.CallIDC1 = c3.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c4 ON rc.CallIDC2 = c4.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s1 ON c1.StateFIPS = s1.StateFIPS
    LEFT JOIN FAJITA.dbo.States s2 ON c2.StateFIPS = s2.StateFIPS
    LEFT JOIN FAJITA.dbo.States s3 ON c3.StateFIPS = s3.StateFIPS
    LEFT JOIN FAJITA.dbo.States s4 ON c4.StateFIPS = s4.StateFIPS
  `;

  return withDbConnection({
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
 */
const getAllCallIDs = async (filters = {}) => {
  let whereConditions = [];

  if (filters.status) whereConditions.push(`c.Status = @status`);
  if (filters.stateFIPS) whereConditions.push(`c.StateFIPS = @stateFIPS`);
  if (filters.callerName) whereConditions.push(`c.CallerName LIKE @callerName`);
  if (filters.phoneNumber) whereConditions.push(`c.PhoneNumber LIKE @phoneNumber`);

  // Filter by "currently in use" - using dates from Projects table
  if (filters.inUse === 'true') {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
      WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
        AND c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2)
    )`);
  } else if (filters.inUse === 'false') {
    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
      WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
        AND c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2)
    )`);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Pagination parameters
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 50;
  const offset = (page - 1) * limit;

  // Count query for total records
  const countQuery = `
    SELECT COUNT(*) as TotalCount
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    ${whereClause}
  `;

  // Main query with pagination
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
          INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
          WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
            AND c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2)
        ) THEN 1
        ELSE 0
      END as CurrentlyInUse,
      (
        SELECT STRING_AGG(CAST(u.ProjectID AS VARCHAR), ', ') WITHIN GROUP (ORDER BY u.ProjectID)
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
          AND c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2)
      ) as ActiveProjectIDs
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    ${whereClause}
    ORDER BY c.DateCreated DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const request = pool.request();

      if (filters.status) request.input('status', sql.TinyInt, filters.status);
      if (filters.stateFIPS) request.input('stateFIPS', sql.Char(2), filters.stateFIPS);
      if (filters.callerName) request.input('callerName', sql.NVarChar, `%${filters.callerName}%`);
      if (filters.phoneNumber) request.input('phoneNumber', sql.NVarChar, `%${filters.phoneNumber}%`);

      // Get total count
      const countResult = await request.query(countQuery);
      const totalCount = countResult.recordset[0].TotalCount;

      // Get paginated data
      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);
      const result = await request.query(query);

      return {
        data: result.recordset,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      };
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
          INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
          WHERE (u.CallIDL1 = c.PhoneNumberID OR u.CallIDL2 = c.PhoneNumberID
                 OR u.CallIDC1 = c.PhoneNumberID OR u.CallIDC2 = c.PhoneNumberID)
            AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
        ) THEN 1
        ELSE 0
      END as CurrentlyInUse
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    WHERE c.PhoneNumberID = @phoneNumberId
  `;

  return withDbConnection({
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
    -- Check if call ID is currently in use (using dates from Projects table)
    IF EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
      WHERE (CallIDL1 = @phoneNumberId OR CallIDL2 = @phoneNumberId
             OR CallIDC1 = @phoneNumberId OR CallIDC2 = @phoneNumberId)
        AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
    )
    BEGIN
      SELECT 0 as Success, 'Cannot delete call ID that is currently in use' as Message
      RETURN
    END

    -- Clear this phone number from any usage slots
    UPDATE FAJITA.dbo.CallIDUsage
    SET CallIDL1 = CASE WHEN CallIDL1 = @phoneNumberId THEN NULL ELSE CallIDL1 END,
        CallIDL2 = CASE WHEN CallIDL2 = @phoneNumberId THEN NULL ELSE CallIDL2 END,
        CallIDC1 = CASE WHEN CallIDC1 = @phoneNumberId THEN NULL ELSE CallIDC1 END,
        CallIDC2 = CASE WHEN CallIDC2 = @phoneNumberId THEN NULL ELSE CallIDC2 END
    WHERE CallIDL1 = @phoneNumberId OR CallIDL2 = @phoneNumberId
       OR CallIDC1 = @phoneNumberId OR CallIDC2 = @phoneNumberId

    -- Delete the call ID
    DELETE FROM FAJITA.dbo.CallIDs WHERE PhoneNumberID = @phoneNumberId

    SELECT 1 as Success, 'Call ID deleted successfully' as Message
  `;

  return withDbConnection({
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
      @phoneNumberId as PhoneNumberID,
      c.PhoneNumber,
      p.startDate as StartDate,
      p.endDate as EndDate,
      CASE
        WHEN u.CallIDL1 = @phoneNumberId THEN 'CallIDL1'
        WHEN u.CallIDL2 = @phoneNumberId THEN 'CallIDL2'
        WHEN u.CallIDC1 = @phoneNumberId THEN 'CallIDC1'
        WHEN u.CallIDC2 = @phoneNumberId THEN 'CallIDC2'
      END as SlotName,
      DATEDIFF(day, p.startDate, p.endDate) as DurationDays,
      CASE
        WHEN p.endDate >= CAST(GETDATE() AS DATE) THEN 'Active'
        ELSE 'Ended'
      END as Status
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    INNER JOIN FAJITA.dbo.CallIDs c ON c.PhoneNumberID = @phoneNumberId
    WHERE u.CallIDL1 = @phoneNumberId OR u.CallIDL2 = @phoneNumberId
       OR u.CallIDC1 = @phoneNumberId OR u.CallIDC2 = @phoneNumberId
    ORDER BY p.startDate DESC
  `;

  return withDbConnection({
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
 * Get project with all its call ID slots
 * Dates are retrieved from the Projects table
 */
const getProjectCallIDs = async (projectId) => {
  const query = `
    SELECT
      u.ProjectID,
      u.CallIDL1,
      u.CallIDL2,
      u.CallIDC1,
      u.CallIDC2,
      p.startDate as StartDate,
      p.endDate as EndDate,
      c1.PhoneNumber as PhoneNumberL1,
      c1.CallerName as CallerNameL1,
      s1.StateAbbr as StateAbbrL1,
      c2.PhoneNumber as PhoneNumberL2,
      c2.CallerName as CallerNameL2,
      s2.StateAbbr as StateAbbrL2,
      c3.PhoneNumber as PhoneNumberC1,
      c3.CallerName as CallerNameC1,
      s3.StateAbbr as StateAbbrC1,
      c4.PhoneNumber as PhoneNumberC2,
      c4.CallerName as CallerNameC2,
      s4.StateAbbr as StateAbbrC2,
      DATEDIFF(day, p.startDate, p.endDate) as DurationDays,
      CASE
        WHEN p.endDate >= CAST(GETDATE() AS DATE) THEN 'Active'
        ELSE 'Ended'
      END as Status
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    LEFT JOIN FAJITA.dbo.CallIDs c1 ON u.CallIDL1 = c1.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c2 ON u.CallIDL2 = c2.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c3 ON u.CallIDC1 = c3.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c4 ON u.CallIDC2 = c4.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s1 ON c1.StateFIPS = s1.StateFIPS
    LEFT JOIN FAJITA.dbo.States s2 ON c2.StateFIPS = s2.StateFIPS
    LEFT JOIN FAJITA.dbo.States s3 ON c3.StateFIPS = s3.StateFIPS
    LEFT JOIN FAJITA.dbo.States s4 ON c4.StateFIPS = s4.StateFIPS
    WHERE u.ProjectID = @projectId
    ORDER BY p.startDate DESC
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.Int, parseInt(projectId, 10))
        .query(query);
      return result.recordset;
    },
    fnName: 'getProjectCallIDs',
    attempts: 3
  });
};

/**
 * Assign a call ID to a project WITH SLOT
 * Dates are now retrieved from the Projects table, not passed as parameters
 */
const assignCallIDToProject = async (assignmentData) => {
  const { projectId, phoneNumberId, callIdSlot } = assignmentData;

  // CallIDs can be assigned to multiple projects simultaneously - no conflict checking needed
  const query = `
    -- Check if project already has a CallIDUsage row
    IF NOT EXISTS (SELECT 1 FROM FAJITA.dbo.CallIDUsage WHERE ProjectID = @projectId)
    BEGIN
      -- Create new usage row
      INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, CallIDL1, CallIDL2, CallIDC1, CallIDC2)
      VALUES (@projectId, NULL, NULL, NULL, NULL)
    END

    SELECT 1 as Success, 'Assignment created successfully' as Message
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.Int, parseInt(projectId, 10))
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('callIdSlot', sql.TinyInt, callIdSlot || null)
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
// const updateAssignment = async (projectId, phoneNumberId, updates) => {
//   const { startDate, endDate } = updates;

//   const query = `
//     UPDATE FAJITA.dbo.CallIDUsage
//     SET 
//       StartDate = COALESCE(@startDate, StartDate),
//       EndDate = COALESCE(@endDate, EndDate)
//     WHERE ProjectID = @projectId AND PhoneNumberID = @phoneNumberId
    
//     SELECT 1 as Success, 'Assignment updated successfully' as Message
//   `;

//   return withDbConnection({
//     //     queryFn: async (pool) => {
//       const result = await pool.request()
//         .input('projectId', sql.NVarChar(20), projectId)
//         .input('phoneNumberId', sql.Int, phoneNumberId)
//         .input('startDate', sql.DateTime, startDate || null)
//         .input('endDate', sql.DateTime, endDate || null)
//         .query(query);
//       return result.recordset[0];
//     },
//     fnName: 'updateAssignment',
//     attempts: 3
//   });
// };

/**
 * End an assignment - clears the phone number from all slots it occupies
 * Also resets the CallID status to "Available" (status code 1) if not used elsewhere
 * Uses dates from Projects table
 */
const endAssignment = async (projectId, phoneNumberId) => {
  const query = `
    -- Clear this phone number from all slots where it appears for this project
    UPDATE FAJITA.dbo.CallIDUsage
    SET
      CallIDL1 = CASE WHEN CallIDL1 = @phoneNumberId THEN NULL ELSE CallIDL1 END,
      CallIDL2 = CASE WHEN CallIDL2 = @phoneNumberId THEN NULL ELSE CallIDL2 END,
      CallIDC1 = CASE WHEN CallIDC1 = @phoneNumberId THEN NULL ELSE CallIDC1 END,
      CallIDC2 = CASE WHEN CallIDC2 = @phoneNumberId THEN NULL ELSE CallIDC2 END
    WHERE ProjectID = @projectId
      AND (CallIDL1 = @phoneNumberId OR CallIDL2 = @phoneNumberId
           OR CallIDC1 = @phoneNumberId OR CallIDC2 = @phoneNumberId)

    -- If the phone number is not used in any other active project slot, reset to Available
    IF NOT EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
      WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
        AND (CallIDL1 = @phoneNumberId OR CallIDL2 = @phoneNumberId
             OR CallIDC1 = @phoneNumberId OR CallIDC2 = @phoneNumberId)
    )
    BEGIN
      -- Reset to Available (only if it was In Use)
      UPDATE FAJITA.dbo.CallIDs
      SET Status = 1, DateUpdated = GETDATE()
      WHERE PhoneNumberID = @phoneNumberId AND Status = 2
    END

    SELECT 1 as Success, 'Assignment ended successfully' as Message
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.Int, parseInt(projectId, 10))
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .query(query);
      return result.recordset[0];
    },
    fnName: 'endAssignment',
    attempts: 3
  });
};

/**
 * Reassign a call ID to use a different phone number
 * This preserves the slot and swaps out the phone number
 * No dates needed - dates come from Projects table
 */
const reassignCallID = async (data) => {
  const { projectId, oldPhoneNumberId, newPhoneNumberId } = data;

  const query = `
    BEGIN TRANSACTION

    -- Find which slot the old phone number is in and update it
    UPDATE FAJITA.dbo.CallIDUsage
    SET
      CallIDL1 = CASE WHEN CallIDL1 = @oldPhoneNumberId THEN @newPhoneNumberId ELSE CallIDL1 END,
      CallIDL2 = CASE WHEN CallIDL2 = @oldPhoneNumberId THEN @newPhoneNumberId ELSE CallIDL2 END,
      CallIDC1 = CASE WHEN CallIDC1 = @oldPhoneNumberId THEN @newPhoneNumberId ELSE CallIDC1 END,
      CallIDC2 = CASE WHEN CallIDC2 = @oldPhoneNumberId THEN @newPhoneNumberId ELSE CallIDC2 END
    WHERE ProjectID = @projectId
      AND (CallIDL1 = @oldPhoneNumberId OR CallIDL2 = @oldPhoneNumberId
           OR CallIDC1 = @oldPhoneNumberId OR CallIDC2 = @oldPhoneNumberId)

    -- Reset old phone number status to Available if not used elsewhere
    IF NOT EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
      WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
        AND (CallIDL1 = @oldPhoneNumberId OR CallIDL2 = @oldPhoneNumberId
             OR CallIDC1 = @oldPhoneNumberId OR CallIDC2 = @oldPhoneNumberId)
    )
    BEGIN
      UPDATE FAJITA.dbo.CallIDs
      SET Status = 1, DateUpdated = GETDATE()
      WHERE PhoneNumberID = @oldPhoneNumberId AND Status = 2
    END

    -- Set new phone number status to In Use
    UPDATE FAJITA.dbo.CallIDs
    SET Status = 2, DateUpdated = GETDATE()
    WHERE PhoneNumberID = @newPhoneNumberId

    COMMIT TRANSACTION

    SELECT 'Success' as Result
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      await pool.request()
        .input('projectId', sql.Int, parseInt(projectId, 10))
        .input('oldPhoneNumberId', sql.Int, oldPhoneNumberId)
        .input('newPhoneNumberId', sql.Int, newPhoneNumberId)
        .query(query);

      return {
        success: true,
        message: 'Call ID reassigned successfully'
      };
    },
    fnName: 'reassignCallID',
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

    -- Currently in use (count distinct phone numbers across all slots for active projects)
    SELECT COUNT(DISTINCT PhoneNumberID) as InUseNumbers
    FROM (
      SELECT u.CallIDL1 as PhoneNumberID FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL1 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
      UNION
      SELECT u.CallIDL2 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL2 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
      UNION
      SELECT u.CallIDC1 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC1 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
      UNION
      SELECT u.CallIDC2 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC2 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
    ) AllInUse

    -- Average usage duration (in days) - based on project dates
    SELECT AVG(DATEDIFF(day, p.startDate, p.endDate)) as AvgDurationDays
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    WHERE p.endDate < CAST(GETDATE() AS DATE)
  `;

  return withDbConnection({
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
    WITH UsageUnpivoted AS (
      SELECT u.ProjectID, u.CallIDL1 as PhoneNumberID, p.startDate, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL1 IS NOT NULL
      UNION ALL
      SELECT u.ProjectID, u.CallIDL2, p.startDate, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL2 IS NOT NULL
      UNION ALL
      SELECT u.ProjectID, u.CallIDC1, p.startDate, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC1 IS NOT NULL
      UNION ALL
      SELECT u.ProjectID, u.CallIDC2, p.startDate, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC2 IS NOT NULL
    )
    SELECT TOP (@limit)
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      COUNT(u.ProjectID) as UsageCount,
      MAX(u.endDate) as LastUsed
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN UsageUnpivoted u ON c.PhoneNumberID = u.PhoneNumberID
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    GROUP BY c.PhoneNumber, c.CallerName, s.StateAbbr
    ORDER BY LastUsed DESC, UsageCount DESC
  `;

  return withDbConnection({
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
    WITH UsageUnpivoted AS (
      SELECT u.CallIDL1 as PhoneNumberID, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL1 IS NOT NULL
      UNION ALL
      SELECT u.CallIDL2, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL2 IS NOT NULL
      UNION ALL
      SELECT u.CallIDC1, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC1 IS NOT NULL
      UNION ALL
      SELECT u.CallIDC2, p.endDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC2 IS NOT NULL
    )
    SELECT
      c.PhoneNumber,
      c.CallerName,
      s.StateAbbr,
      cs.StatusDescription,
      MAX(u.endDate) as LastUsed,
      DATEDIFF(day, MAX(u.endDate), GETDATE()) as DaysSinceLastUse
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    LEFT JOIN UsageUnpivoted u ON c.PhoneNumberID = u.PhoneNumberID
    GROUP BY c.PhoneNumber, c.CallerName, s.StateAbbr, cs.StatusDescription
    HAVING
      MAX(u.endDate) IS NULL
      OR DATEDIFF(day, MAX(u.endDate), GETDATE()) >= @days
    ORDER BY DaysSinceLastUse DESC
  `;

  return withDbConnection({
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
 * Get state coverage analysis - FIXED VERSION
 * @returns {Array} State coverage data
 */
const getStateCoverage = async () => {
  // Only count CallIDs with status 1 (Available) or 2 (In Use)
  // Exclude status 3 (Removed), 4 (Flagged as Spam), 5 (Flagged as Removed)
  const query = `
    WITH CurrentUsage AS (
      SELECT u.CallIDL1 as PhoneNumberID FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL1 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
      UNION
      SELECT u.CallIDL2 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL2 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
      UNION
      SELECT u.CallIDC1 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC1 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
      UNION
      SELECT u.CallIDC2 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC2 IS NOT NULL AND CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
    )
    SELECT
      s.StateAbbr,
      s.StateName,
      COUNT(c.PhoneNumberID) as TotalNumbers,
      COUNT(CASE
        WHEN cu.PhoneNumberID IS NOT NULL
        THEN 1
      END) as InUseNumbers,
      COUNT(CASE
        WHEN cu.PhoneNumberID IS NULL
        THEN 1
      END) as AvailableNumbers
    FROM FAJITA.dbo.States s
    INNER JOIN FAJITA.dbo.CallIDs c ON s.StateFIPS = c.StateFIPS
    LEFT JOIN CurrentUsage cu ON c.PhoneNumberID = cu.PhoneNumberID
    WHERE c.Status IN (1, 2)  -- Only Available or In Use (exclude Removed/Flagged)
    GROUP BY s.StateAbbr, s.StateName
    HAVING COUNT(c.PhoneNumberID) > 0
    ORDER BY TotalNumbers DESC
  `;

  return withDbConnection({
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
    ),
    UsageUnpivoted AS (
      SELECT u.ProjectID, u.CallIDL1 as PhoneNumberID, p.startDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL1 IS NOT NULL
      UNION ALL
      SELECT u.ProjectID, u.CallIDL2, p.startDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDL2 IS NOT NULL
      UNION ALL
      SELECT u.ProjectID, u.CallIDC1, p.startDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC1 IS NOT NULL
      UNION ALL
      SELECT u.ProjectID, u.CallIDC2, p.startDate
        FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE u.CallIDC2 IS NOT NULL
    )
    SELECT
      DATEPART(year, uu.startDate) as Year,
      DATEPART(month, uu.startDate) as Month,
      DATENAME(month, uu.startDate) as MonthName,
      COUNT(DISTINCT uu.PhoneNumberID) as UniqueNumbersUsed,
      COUNT(DISTINCT uu.ProjectID) as TotalAssignments
    FROM UsageUnpivoted uu
    CROSS JOIN DateRange dr
    WHERE uu.startDate >= dr.StartRange
    GROUP BY
      DATEPART(year, uu.startDate),
      DATEPART(month, uu.startDate),
      DATENAME(month, uu.startDate)
    ORDER BY Year, Month
  `;

  return withDbConnection({
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
  // CallIDs can be assigned to multiple projects simultaneously
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
      AND c.Status IN (1, 2)  -- Available or In Use (CallIDs can be shared)
    ORDER BY c.PhoneNumber
  `;

  return withDbConnection({
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


/**
 * Get projects with their CURRENT slot assignments
 * Only returns currently fielding projects (using dates from Projects table)
 */
const getAllProjectsWithAssignments = async () => {
  const query = `
    SELECT
      u.ProjectID,
      p.startDate as StartDate,
      p.endDate as EndDate,
      -- Check if each slot has a CallID assigned
      CASE WHEN u.CallIDL1 IS NOT NULL THEN 1 ELSE 0 END as Slot1Active,
      CASE WHEN u.CallIDL2 IS NOT NULL THEN 1 ELSE 0 END as Slot2Active,
      CASE WHEN u.CallIDC1 IS NOT NULL THEN 1 ELSE 0 END as Slot3Active,
      CASE WHEN u.CallIDC2 IS NOT NULL THEN 1 ELSE 0 END as Slot4Active,
      -- Count total active slots
      (CASE WHEN u.CallIDL1 IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN u.CallIDL2 IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN u.CallIDC1 IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN u.CallIDC2 IS NOT NULL THEN 1 ELSE 0 END) as ActiveAssignments
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    WHERE CAST(GETDATE() AS DATE) >= CAST(p.startDate AS DATE)
      AND CAST(GETDATE() AS DATE) <= CAST(p.endDate AS DATE)
    ORDER BY u.ProjectID
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getAllProjectsWithAssignments',
    attempts: 3
  });
};

/**
 * Check where else a CallID is assigned (informational only - CallIDs can be shared)
 * @param {Number} phoneNumberId - Phone number ID to check
 * @param {String} projectId - Project ID to check dates against
 * @param {String} excludeProjectId - Optional: Exclude this project from check (for updates)
 * @returns {Object} Info about other assignments (hasConflict is always false since sharing is allowed)
 */
const checkAssignmentConflict = async (phoneNumberId, projectId, excludeProjectId = null) => {
  // CallIDs can be assigned to multiple projects simultaneously - no conflicts
  // This function now just returns informational data about where else the CallID is used
  const query = `
    -- Get the project dates for reference
    DECLARE @newStartDate DATE, @newEndDate DATE
    SELECT @newStartDate = startDate, @newEndDate = endDate
    FROM FAJITA.dbo.Projects WHERE projectID = @projectId

    SELECT
      u.ProjectID,
      p.startDate as StartDate,
      p.endDate as EndDate,
      c.PhoneNumber
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    LEFT JOIN FAJITA.dbo.CallIDs c ON (
      c.PhoneNumberID = u.CallIDL1
      OR c.PhoneNumberID = u.CallIDL2
      OR c.PhoneNumberID = u.CallIDC1
      OR c.PhoneNumberID = u.CallIDC2
    )
    WHERE (u.CallIDL1 = @phoneNumberId OR u.CallIDL2 = @phoneNumberId OR u.CallIDC1 = @phoneNumberId OR u.CallIDC2 = @phoneNumberId)
      ${excludeProjectId ? 'AND u.ProjectID != @excludeProjectId' : ''}
      AND (
        (@newStartDate BETWEEN p.startDate AND p.endDate)
        OR (@newEndDate BETWEEN p.startDate AND p.endDate)
        OR (p.startDate BETWEEN @newStartDate AND @newEndDate)
        OR (p.endDate BETWEEN @newStartDate AND @newEndDate)
      )
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const request = pool.request()
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('projectId', sql.Int, parseInt(projectId, 10));

      if (excludeProjectId) {
        request.input('excludeProjectId', sql.Int, parseInt(excludeProjectId, 10));
      }

      const result = await request.query(query);

      // CallIDs can be shared - never report a conflict, just return other usages for info
      return {
        hasConflict: false,  // Always false - sharing is allowed
        otherUsages: result.recordset  // Informational: where else this CallID is used
      };
    },
    fnName: 'checkAssignmentConflict',
    attempts: 3
  });
};

/**
 * Update an existing assignment
 * Note: Since dates are now in the Projects table, this function just verifies the assignment exists
 * and returns the current state. Date changes should be made in the Projects table.
 * @param {String} projectId - Project ID
 * @param {Number} phoneNumberId - Phone number ID
 * @returns {Object} Current assignment info
 */
const updateAssignment = async (projectId, phoneNumberId) => {
  const query = `
    SELECT
      u.ProjectID,
      p.startDate as StartDate,
      p.endDate as EndDate
    FROM FAJITA.dbo.CallIDUsage u
    INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
    WHERE u.ProjectID = @projectId
      AND (u.CallIDL1 = @phoneNumberId OR u.CallIDL2 = @phoneNumberId OR u.CallIDC1 = @phoneNumberId OR u.CallIDC2 = @phoneNumberId)
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.Int, parseInt(projectId, 10))
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .query(query);

      return result.recordset[0];
    },
    fnName: 'updateAssignment',
    attempts: 3
  });
};

/**
 * Swap a call ID assignment from one project to another
 * Moves the phone number from source project slots to destination project
 * @param {String} fromProjectId - Source project ID
 * @param {String} toProjectId - Destination project ID
 * @param {Number} phoneNumberId - Phone number ID to swap
 * @param {String} slotName - Target slot name in destination project (CallIDL1, CallIDL2, CallIDC1, CallIDC2)
 * @returns {Object} Swap result
 */
const swapCallIDAssignment = async (fromProjectId, toProjectId, phoneNumberId, slotName = 'CallIDL1') => {
  // Validate slot name
  const validSlots = ['CallIDL1', 'CallIDL2', 'CallIDC1', 'CallIDC2'];
  if (!validSlots.includes(slotName)) {
    throw new Error('Invalid slot name');
  }

  const query = `
    BEGIN TRANSACTION

    -- Remove the phone number from the source project
    UPDATE FAJITA.dbo.CallIDUsage
    SET
      CallIDL1 = CASE WHEN CallIDL1 = @phoneNumberId THEN NULL ELSE CallIDL1 END,
      CallIDL2 = CASE WHEN CallIDL2 = @phoneNumberId THEN NULL ELSE CallIDL2 END,
      CallIDC1 = CASE WHEN CallIDC1 = @phoneNumberId THEN NULL ELSE CallIDC1 END,
      CallIDC2 = CASE WHEN CallIDC2 = @phoneNumberId THEN NULL ELSE CallIDC2 END
    WHERE ProjectID = @fromProjectId
      AND (CallIDL1 = @phoneNumberId OR CallIDL2 = @phoneNumberId
           OR CallIDC1 = @phoneNumberId OR CallIDC2 = @phoneNumberId)

    -- Check if destination project has a CallIDUsage row
    IF NOT EXISTS (SELECT 1 FROM FAJITA.dbo.CallIDUsage WHERE ProjectID = @toProjectId)
    BEGIN
      INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, CallIDL1, CallIDL2, CallIDC1, CallIDC2)
      VALUES (@toProjectId, NULL, NULL, NULL, NULL)
    END

    -- Add the phone number to the destination project in the specified slot
    UPDATE FAJITA.dbo.CallIDUsage
    SET ${slotName} = @phoneNumberId
    WHERE ProjectID = @toProjectId

    COMMIT TRANSACTION

    SELECT 'Success' as Result
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      await pool.request()
        .input('fromProjectId', sql.Int, parseInt(fromProjectId, 10))
        .input('toProjectId', sql.Int, parseInt(toProjectId, 10))
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .query(query);

      return {
        success: true,
        message: `Call ID swapped from ${fromProjectId} to ${toProjectId}`
      };
    },
    fnName: 'swapCallIDAssignment',
    attempts: 3
  });
};

/**
 * Update a specific slot for a project
 * Also updates the CallID status to "In Use" (status code 2) when assigning
 * Dates are now managed in the Projects table, not CallIDUsage
 */
const updateProjectSlot = async (projectId, slotName, phoneNumberId) => {
  // Validate slot name
  const validSlots = ['CallIDL1', 'CallIDL2', 'CallIDC1', 'CallIDC2'];
  if (!validSlots.includes(slotName)) {
    throw new Error('Invalid slot name');
  }

  // Status codes: 1 = Available, 2 = In Use, 3 = Removed, 4 = Flagged as Spam
  const IN_USE_STATUS = 2;

  const query = `
    -- First verify the project exists in the Projects table
    IF NOT EXISTS (SELECT 1 FROM FAJITA.dbo.Projects WHERE projectID = @projectId)
    BEGIN
      SELECT 0 as Success, 'Project ID ' + CAST(@projectId AS NVARCHAR(20)) + ' does not exist' as Message
      RETURN
    END

    -- Check if project has a usage row
    DECLARE @RowExists BIT = 0
    DECLARE @OldPhoneNumberId INT = NULL

    IF EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage
      WHERE ProjectID = @projectId
    )
    BEGIN
      SET @RowExists = 1
      -- Get the old phone number in this slot (if any) to reset its status
      SELECT @OldPhoneNumberId = ${slotName} FROM FAJITA.dbo.CallIDUsage WHERE ProjectID = @projectId
    END

    -- If there was an old phone number in this slot, check if it's still used elsewhere
    -- If not, reset it to Available (status 1)
    IF @OldPhoneNumberId IS NOT NULL AND @OldPhoneNumberId != @phoneNumberId
    BEGIN
      -- Check if this old phone number is used in any other active project slot
      IF NOT EXISTS (
        SELECT 1 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
          AND (
            (CallIDL1 = @OldPhoneNumberId AND NOT (u.ProjectID = @projectId AND '${slotName}' = 'CallIDL1'))
            OR (CallIDL2 = @OldPhoneNumberId AND NOT (u.ProjectID = @projectId AND '${slotName}' = 'CallIDL2'))
            OR (CallIDC1 = @OldPhoneNumberId AND NOT (u.ProjectID = @projectId AND '${slotName}' = 'CallIDC1'))
            OR (CallIDC2 = @OldPhoneNumberId AND NOT (u.ProjectID = @projectId AND '${slotName}' = 'CallIDC2'))
          )
      )
      BEGIN
        -- Reset old phone number to Available (only if it was In Use)
        UPDATE FAJITA.dbo.CallIDs
        SET Status = 1, DateUpdated = GETDATE()
        WHERE PhoneNumberID = @OldPhoneNumberId AND Status = 2
      END
    END

    IF @RowExists = 0
    BEGIN
      -- Create new usage row (no dates - dates come from Projects table)
      INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, CallIDL1, CallIDL2, CallIDC1, CallIDC2)
      VALUES (@projectId,
        CASE WHEN '${slotName}' = 'CallIDL1' THEN @phoneNumberId ELSE NULL END,
        CASE WHEN '${slotName}' = 'CallIDL2' THEN @phoneNumberId ELSE NULL END,
        CASE WHEN '${slotName}' = 'CallIDC1' THEN @phoneNumberId ELSE NULL END,
        CASE WHEN '${slotName}' = 'CallIDC2' THEN @phoneNumberId ELSE NULL END
      )

      -- Update CallID status to In Use (only if currently Available)
      IF @phoneNumberId IS NOT NULL
      BEGIN
        UPDATE FAJITA.dbo.CallIDs
        SET Status = @inUseStatus, DateUpdated = GETDATE()
        WHERE PhoneNumberID = @phoneNumberId AND Status = 1
      END

      SELECT 1 as Success, 'Slot assigned successfully' as Message, 'INSERT' as Action, @@ROWCOUNT as RowsAffected
    END
    ELSE
    BEGIN
      -- Update existing row - just update the slot (no date columns to update)
      UPDATE FAJITA.dbo.CallIDUsage
      SET ${slotName} = @phoneNumberId
      WHERE ProjectID = @projectId

      -- Update CallID status to In Use (only if currently Available)
      IF @phoneNumberId IS NOT NULL
      BEGIN
        UPDATE FAJITA.dbo.CallIDs
        SET Status = @inUseStatus, DateUpdated = GETDATE()
        WHERE PhoneNumberID = @phoneNumberId AND Status = 1
      END

      SELECT 1 as Success, 'Slot updated successfully' as Message, 'UPDATE' as Action, @@ROWCOUNT as RowsAffected
    END
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      console.log('[updateProjectSlot] Executing query for:', { projectId, slotName, phoneNumberId });
      const request = pool.request()
        .input('projectId', sql.Int, parseInt(projectId, 10))
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('inUseStatus', sql.TinyInt, IN_USE_STATUS);

      const result = await request.query(query);
      console.log('[updateProjectSlot] Query result:', result.recordset[0]);
      console.log('[updateProjectSlot] RowsAffected from query:', result.rowsAffected);
      return result.recordset[0];
    },
    fnName: 'updateProjectSlot',
    attempts: 3
  });
};

/**
 * Remove a phone number from a specific slot
 * Also resets the CallID status to "Available" (status code 1) if not used elsewhere
 * Uses dates from Projects table
 */
const removeProjectSlot = async (projectId, slotName) => {
  const validSlots = ['CallIDL1', 'CallIDL2', 'CallIDC1', 'CallIDC2'];
  if (!validSlots.includes(slotName)) {
    throw new Error('Invalid slot name');
  }

  const query = `
    -- Get the phone number being removed
    DECLARE @PhoneNumberId INT
    SELECT @PhoneNumberId = ${slotName} FROM FAJITA.dbo.CallIDUsage
    WHERE ProjectID = @projectId

    -- Clear the slot
    UPDATE FAJITA.dbo.CallIDUsage
    SET ${slotName} = NULL
    WHERE ProjectID = @projectId

    -- If the phone number is not used in any other active project slot, reset to Available
    IF @PhoneNumberId IS NOT NULL
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM FAJITA.dbo.CallIDUsage u
        INNER JOIN FAJITA.dbo.Projects p ON u.ProjectID = p.projectID
        WHERE CAST(GETDATE() AS DATE) BETWEEN p.startDate AND p.endDate
          AND (CallIDL1 = @PhoneNumberId OR CallIDL2 = @PhoneNumberId
               OR CallIDC1 = @PhoneNumberId OR CallIDC2 = @PhoneNumberId)
      )
      BEGIN
        -- Reset to Available (only if it was In Use)
        UPDATE FAJITA.dbo.CallIDs
        SET Status = 1, DateUpdated = GETDATE()
        WHERE PhoneNumberID = @PhoneNumberId AND Status = 2
      END
    END

    SELECT 1 as Success, 'Slot cleared successfully' as Message
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.Int, parseInt(projectId, 10))
        .query(query);
      return result.recordset[0];
    },
    fnName: 'removeProjectSlot',
    attempts: 3
  });
};

/**
 * Get top area codes from a sample table's LAND and CELL columns
 * @param {string} tableName - The sample table name to analyze
 * @param {number} limit - Number of top area codes to return (default 10)
 * @returns {Array} - Array of {areaCode, count} sorted by count descending
 */
const getTopAreaCodesFromSampleTable = async (tableName, limit = 10) => {
  const query = `
    -- Check which phone columns exist in the table
    DECLARE @hasLand BIT = 0, @hasCell BIT = 0

    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName AND COLUMN_NAME = 'LAND'
    ) SET @hasLand = 1

    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName AND COLUMN_NAME = 'CELL'
    ) SET @hasCell = 1

    -- Return which columns were found
    SELECT @hasLand as HasLand, @hasCell as HasCell
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      // First check which columns exist
      const checkResult = await pool.request()
        .input('tableName', sql.NVarChar, tableName)
        .query(query);

      const { HasLand, HasCell } = checkResult.recordset[0];

      if (!HasLand && !HasCell) {
        return { areaCodes: [], message: 'No LAND or CELL columns found in table' };
      }

      // Build dynamic query to extract area codes
      let unionParts = [];

      if (HasLand) {
        unionParts.push(`
          SELECT LEFT(LAND, 3) as AreaCode
          FROM FAJITA.dbo.[${tableName}]
          WHERE LAND IS NOT NULL AND LEN(LAND) >= 10 AND LEFT(LAND, 1) NOT IN ('0', '1')
        `);
      }

      if (HasCell) {
        unionParts.push(`
          SELECT LEFT(CELL, 3) as AreaCode
          FROM FAJITA.dbo.[${tableName}]
          WHERE CELL IS NOT NULL AND LEN(CELL) >= 10 AND LEFT(CELL, 1) NOT IN ('0', '1')
        `);
      }

      const areaCodeQuery = `
        WITH AllAreaCodes AS (
          ${unionParts.join(' UNION ALL ')}
        )
        SELECT TOP (@limit)
          AreaCode,
          COUNT(*) as Count
        FROM AllAreaCodes
        WHERE AreaCode IS NOT NULL AND LEN(AreaCode) = 3
        GROUP BY AreaCode
        ORDER BY COUNT(*) DESC
      `;

      const result = await pool.request()
        .input('limit', sql.Int, limit)
        .query(areaCodeQuery);

      return {
        areaCodes: result.recordset,
        columnsFound: { hasLand: HasLand === 1, hasCell: HasCell === 1 }
      };
    },
    fnName: 'getTopAreaCodesFromSampleTable',
    attempts: 3
  });
};

/**
 * Find CallIDs by area code, prioritized by the order of area codes provided
 * CallIDs can be assigned to multiple projects simultaneously
 * @param {Array} areaCodes - Array of area codes in priority order
 * @param {number} count - Number of CallIDs to find
 * @param {number} projectId - Project ID (kept for compatibility but not used for conflict checking)
 * @returns {Array} - Array of matching CallIDs
 */
const findAvailableCallIDsByAreaCodes = async (areaCodes, count, projectId) => {
  if (!areaCodes || areaCodes.length === 0) {
    return [];
  }

  const query = `
    ;WITH MatchingCallIDs AS (
      SELECT
        c.PhoneNumberID,
        c.PhoneNumber,
        c.CallerName,
        c.StateFIPS,
        s.StateAbbr,
        LEFT(c.PhoneNumber, 3) as AreaCode,
        -- Priority based on position in area code list (lower = higher priority)
        CASE
          ${areaCodes.map((ac, idx) => `WHEN LEFT(c.PhoneNumber, 3) = '${ac}' THEN ${idx + 1}`).join(' ')}
          ELSE 999
        END as Priority
      FROM FAJITA.dbo.CallIDs c
      INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
      WHERE c.Status IN (1, 2)  -- Available or In Use (CallIDs can be shared across projects)
        AND LEFT(c.PhoneNumber, 3) IN (${areaCodes.map(ac => `'${ac}'`).join(',')})
    )
    SELECT TOP (@count)
      PhoneNumberID,
      PhoneNumber,
      CallerName,
      StateFIPS,
      StateAbbr,
      AreaCode,
      Priority
    FROM MatchingCallIDs
    ORDER BY Priority, PhoneNumber
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.Int, projectId)
        .input('count', sql.Int, count)
        .query(query);

      return result.recordset;
    },
    fnName: 'findAvailableCallIDsByAreaCodes',
    attempts: 3
  });
};

/**
 * Get project details from the Projects table
 * @param {number} projectId - Project ID
 * @returns {Object} - Project details including dates
 */
const getProjectDetails = async (projectId) => {
  const query = `
    SELECT
      projectID,
      clientProjectID,
      projectName,
      NSize,
      startDate,
      endDate,
      client,
      contactName,
      contactNumber,
      dataProcessing,
      multiCallID
    FROM FAJITA.dbo.Projects
    WHERE projectID = @projectId
  `;

  return withDbConnection({
        queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.Int, projectId)
        .query(query);

      return result.recordset[0] || null;
    },
    fnName: 'getProjectDetails',
    attempts: 3
  });
};

/**
 * Auto-assign CallIDs to a project based on sample table area codes
 * Uses stored procedure sp_AutoAssignCallIDs for better performance
 * @param {string} tableName - Sample table name to analyze for area codes
 * @param {number} projectId - Project ID to assign CallIDs to
 * @param {number} clientId - Client ID (102 = Tarrance uses PHONE column, others use LAND/CELL)
 * @returns {Object} - Result with assigned CallIDs and any warnings
 */
const autoAssignCallIDsFromSample = async (tableName, projectId, clientId) => {
  return withDbConnection({
        queryFn: async (pool) => {
      console.log(`[autoAssignCallIDs] Starting for project ${projectId}, table ${tableName}, client ${clientId}`);

      // Execute the stored procedure with clientId parameter
      const result = await pool.request()
        .input('TableName', sql.NVarChar(128), tableName)
        .input('ProjectID', sql.Int, projectId)
        .input('ClientID', sql.Int, clientId || null)
        .execute('FAJITA.dbo.sp_AutoAssignCallIDs');

      // The stored procedure returns 3 result sets:
      // 1. Main result (Success, Message, ProjectID, ProjectName, StartDate, EndDate, Warning)
      // 2. Area codes (AreaCode, Count)
      // 3. Assignments (SlotName, PhoneNumberID, PhoneNumber, AreaCode, StateAbbr)

      const mainResult = result.recordsets[0]?.[0] || {};
      const areaCodes = result.recordsets[1] || [];
      const assignments = result.recordsets[2] || [];

      console.log(`[autoAssignCallIDs] SP result:`, mainResult);
      console.log(`[autoAssignCallIDs] Area codes found: ${areaCodes.length}`);
      console.log(`[autoAssignCallIDs] Assignments made: ${assignments.length}`);

      // Format response
      const formattedAssignments = assignments.map(a => ({
        slot: `CallID${a.SlotName}`,
        phoneNumberId: a.PhoneNumberID,
        phoneNumber: a.PhoneNumber,
        areaCode: a.AreaCode,
        stateAbbr: a.StateAbbr
      }));

      const warnings = mainResult.Warning ? [mainResult.Warning] : undefined;

      return {
        success: mainResult.Success === 1,
        message: mainResult.Message,
        projectId: mainResult.ProjectID,
        projectName: mainResult.ProjectName,
        dateRange: {
          startDate: mainResult.StartDate,
          endDate: mainResult.EndDate
        },
        areaCodes: areaCodes.map(ac => ({ AreaCode: ac.AreaCode, Count: ac.Count })),
        assigned: formattedAssignments,
        warnings: warnings
      };
    },
    fnName: 'autoAssignCallIDsFromSample',
    attempts: 3
  });
};

/**
 * Update sample table's CallID columns with existing phone numbers
 * Used when reusing existing Call IDs that are already assigned to a project
 * @param {string} tableName - Sample table name to update
 * @param {Object} callIdData - Object containing phoneNumber values for each slot
 * @returns {Object} - Result with success status
 */
const updateSampleTableCallIDs = async (tableName, callIdData) => {
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
        queryFn: async (pool) => {
      console.log(`[updateSampleTableCallIDs] Executing: ${query}`);
      const result = await pool.request().query(query);
      console.log(`[updateSampleTableCallIDs] Updated ${result.rowsAffected[0]} rows`);

      return {
        success: true,
        message: `Updated ${result.rowsAffected[0]} rows with existing CallID phone numbers`,
        rowsAffected: result.rowsAffected[0]
      };
    },
    fnName: 'updateSampleTableCallIDs',
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
  reassignCallID,

  // Analytics
  getUtilizationMetrics,
  getMostUsedCallIDs,
  getIdleCallIDs,
  getStateCoverage,
  getUsageTimeline,

  // Lookups
  getAllStatusCodes,
  getAllStates,
  getAvailableCallIDsForState,

  // Assignments
  getAllProjectsWithAssignments,
  checkAssignmentConflict,
  updateAssignment,
  swapCallIDAssignment,
  updateProjectSlot,
  removeProjectSlot,

  // Auto-assignment from sample
  getTopAreaCodesFromSampleTable,
  findAvailableCallIDsByAreaCodes,
  getProjectDetails,
  autoAssignCallIDsFromSample,
  updateSampleTableCallIDs
};