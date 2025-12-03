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
    
    -- Currently active projects
    SELECT COUNT(*) as ActiveProjects
    FROM FAJITA.dbo.CallIDUsage
    WHERE CAST(GETDATE() AS DATE) BETWEEN StartDate AND EndDate
      AND (CallIDL1 IS NOT NULL OR CallIDL2 IS NOT NULL OR CallIDC1 IS NOT NULL OR CallIDC2 IS NOT NULL)

    -- Available numbers (not currently assigned)
    SELECT COUNT(*) as AvailableNumbers
    FROM FAJITA.dbo.CallIDs c
    WHERE NOT EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
        AND (c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2))
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
      s1.StateAbbr,
      u.StartDate,
      u.EndDate,
      DATEDIFF(day, u.StartDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    LEFT JOIN FAJITA.dbo.CallIDs c1 ON u.CallIDL1 = c1.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s1 ON c1.StateFIPS = s1.StateFIPS
    WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
      AND u.CallIDL1 IS NOT NULL

    UNION ALL

    SELECT
      u.ProjectID,
      'CallIDL2' as SlotName,
      2 as SlotNumber,
      u.CallIDL2 as PhoneNumberID,
      c2.PhoneNumber,
      c2.CallerName,
      s2.StateAbbr,
      u.StartDate,
      u.EndDate,
      DATEDIFF(day, u.StartDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    LEFT JOIN FAJITA.dbo.CallIDs c2 ON u.CallIDL2 = c2.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s2 ON c2.StateFIPS = s2.StateFIPS
    WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
      AND u.CallIDL2 IS NOT NULL

    UNION ALL

    SELECT
      u.ProjectID,
      'CallIDC1' as SlotName,
      3 as SlotNumber,
      u.CallIDC1 as PhoneNumberID,
      c3.PhoneNumber,
      c3.CallerName,
      s3.StateAbbr,
      u.StartDate,
      u.EndDate,
      DATEDIFF(day, u.StartDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    LEFT JOIN FAJITA.dbo.CallIDs c3 ON u.CallIDC1 = c3.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s3 ON c3.StateFIPS = s3.StateFIPS
    WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
      AND u.CallIDC1 IS NOT NULL

    UNION ALL

    SELECT
      u.ProjectID,
      'CallIDC2' as SlotName,
      4 as SlotNumber,
      u.CallIDC2 as PhoneNumberID,
      c4.PhoneNumber,
      c4.CallerName,
      s4.StateAbbr,
      u.StartDate,
      u.EndDate,
      DATEDIFF(day, u.StartDate, CAST(GETDATE() AS DATE)) as DaysActive
    FROM FAJITA.dbo.CallIDUsage u
    LEFT JOIN FAJITA.dbo.CallIDs c4 ON u.CallIDC2 = c4.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s4 ON c4.StateFIPS = s4.StateFIPS
    WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
      AND u.CallIDC2 IS NOT NULL

    ORDER BY ProjectID, SlotNumber
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
 * Get recent activity - Using only StartDate and EndDate
 */
const getRecentActivity = async () => {
  const query = `
    WITH RecentChanges AS (
      SELECT TOP 20
        u.ProjectID,
        u.StartDate,
        u.EndDate,
        u.CallIDL1,
        u.CallIDL2,
        u.CallIDC1,
        u.CallIDC2
      FROM FAJITA.dbo.CallIDUsage u
      ORDER BY u.StartDate DESC
    )
    SELECT 
      rc.ProjectID,
      COALESCE(c1.PhoneNumber, c2.PhoneNumber, c3.PhoneNumber, c4.PhoneNumber) as PhoneNumber,
      COALESCE(c1.CallerName, c2.CallerName, c3.CallerName, c4.CallerName) as CallerName,
      COALESCE(s1.StateAbbr, s2.StateAbbr, s3.StateAbbr, s4.StateAbbr) as StateAbbr,
      rc.StartDate,
      rc.EndDate,
      CASE
        WHEN rc.EndDate >= CAST(GETDATE() AS DATE) THEN 'Active'
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
      WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
        AND c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2)
    )`);
  } else if (filters.inUse === 'false') {
    whereConditions.push(`NOT EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage u
      WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
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
          WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
            AND c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2)
        ) THEN 1
        ELSE 0
      END as CurrentlyInUse,
      (
        SELECT TOP 1 ProjectID
        FROM FAJITA.dbo.CallIDUsage u
        WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
          AND c.PhoneNumberID IN (u.CallIDL1, u.CallIDL2, u.CallIDC1, u.CallIDC2)
      ) as ActiveProjectID
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    LEFT JOIN FAJITA.dbo.CallIDStatus cs ON c.Status = cs.StatusCode
    ${whereClause}
    ORDER BY c.DateCreated DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `;

  return withDbConnection({
    database: promark,
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
          WHERE u.PhoneNumberID = c.PhoneNumberID
            AND CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
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
        AND CAST(GETDATE() AS DATE) BETWEEN StartDate AND EndDate
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
        WHEN u.EndDate >= CAST(GETDATE() AS DATE) THEN 'Active'
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
 * Get project with all its call ID slots
 */
const getProjectCallIDs = async (projectId) => {
  const query = `
    SELECT 
      u.ProjectID,
      u.CallIDL1,
      u.CallIDL2,
      u.CallIDC1,
      u.CallIDC2,
      u.StartDate,
      u.EndDate,
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
      DATEDIFF(day, u.StartDate, u.EndDate) as DurationDays,
      CASE
        WHEN u.EndDate >= CAST(GETDATE() AS DATE) THEN 'Active'
        ELSE 'Ended'
      END as Status
    FROM FAJITA.dbo.CallIDUsage u
    LEFT JOIN FAJITA.dbo.CallIDs c1 ON u.CallIDL1 = c1.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c2 ON u.CallIDL2 = c2.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c3 ON u.CallIDC1 = c3.PhoneNumberID
    LEFT JOIN FAJITA.dbo.CallIDs c4 ON u.CallIDC2 = c4.PhoneNumberID
    LEFT JOIN FAJITA.dbo.States s1 ON c1.StateFIPS = s1.StateFIPS
    LEFT JOIN FAJITA.dbo.States s2 ON c2.StateFIPS = s2.StateFIPS
    LEFT JOIN FAJITA.dbo.States s3 ON c3.StateFIPS = s3.StateFIPS
    LEFT JOIN FAJITA.dbo.States s4 ON c4.StateFIPS = s4.StateFIPS
    WHERE u.ProjectID = @projectId
    ORDER BY u.StartDate DESC
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
 * Assign a call ID to a project WITH SLOT
 */
const assignCallIDToProject = async (assignmentData) => {
  const { projectId, phoneNumberId, startDate, endDate, callIdSlot } = assignmentData;

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
    
    -- Check if slot is already occupied for this project
    IF @callIdSlot IS NOT NULL AND EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage
      WHERE ProjectID = @projectId
        AND CallIDSlot = @callIdSlot
        AND (
          (@startDate BETWEEN StartDate AND EndDate)
          OR (@endDate BETWEEN StartDate AND EndDate)
          OR (StartDate BETWEEN @startDate AND @endDate)
        )
    )
    BEGIN
      SELECT 0 as Success, 'This slot is already occupied for this project during this time period' as Message
      RETURN
    END
    
    -- Insert the assignment
    INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, PhoneNumberID, StartDate, EndDate, CallIDSlot)
    VALUES (@projectId, @phoneNumberId, @startDate, @endDate, @callIdSlot)
    
    SELECT 1 as Success, 'Assignment created successfully' as Message
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      // Validate required fields
      if (!endDate) {
        throw new Error('End date is required');
      }

      const result = await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('startDate', sql.DateTime, startDate || new Date())
        .input('endDate', sql.DateTime, endDate)
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
//     database: promark,
//     queryFn: async (pool) => {
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
 * End an assignment WITH SLOT INFO
 */
const endAssignment = async (projectId, phoneNumberId) => {
  const query = `
    UPDATE FAJITA.dbo.CallIDUsage
    SET EndDate = CAST(GETDATE() AS DATE)
    WHERE ProjectID = @projectId
      AND PhoneNumberID = @phoneNumberId
      AND EndDate >= CAST(GETDATE() AS DATE)

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

/**
 * FIXED: Reassign a call ID to use a different phone number
 * This preserves the slot and swaps out the phone number
 */
const reassignCallID = async (data) => {
  const { projectId, oldPhoneNumberId, newPhoneNumberId } = data;
  
  const query = `
    BEGIN TRANSACTION

    -- Get the slot and end date from the current assignment
    DECLARE @slot TINYINT
    DECLARE @endDate DATETIME
    SELECT @slot = CallIDSlot, @endDate = EndDate
    FROM FAJITA.dbo.CallIDUsage
    WHERE ProjectID = @projectId
      AND PhoneNumberID = @oldPhoneNumberId
      AND EndDate >= CAST(GETDATE() AS DATE)

    -- End current assignment
    UPDATE FAJITA.dbo.CallIDUsage
    SET EndDate = CAST(GETDATE() AS DATE)
    WHERE ProjectID = @projectId
      AND PhoneNumberID = @oldPhoneNumberId
      AND EndDate >= CAST(GETDATE() AS DATE)

    -- Create new assignment with same slot and end date
    INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, PhoneNumberID, StartDate, EndDate, CallIDSlot)
    VALUES (@projectId, @newPhoneNumberId, CAST(GETDATE() AS DATE), @endDate, @slot)

    COMMIT TRANSACTION

    SELECT 'Success' as Result
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
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

    -- Currently in use
    SELECT COUNT(DISTINCT u.PhoneNumberID) as InUseNumbers
    FROM FAJITA.dbo.CallIDUsage u
    WHERE CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate

    -- Average usage duration (in days)
    SELECT AVG(DATEDIFF(day, StartDate, EndDate)) as AvgDurationDays
    FROM FAJITA.dbo.CallIDUsage
    WHERE EndDate < CAST(GETDATE() AS DATE)
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
      COUNT(u.ProjectID) as UsageCount,
      MAX(u.EndDate) as LastUsed
    FROM FAJITA.dbo.CallIDs c
    INNER JOIN FAJITA.dbo.CallIDUsage u ON c.PhoneNumberID = u.PhoneNumberID
    INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
    GROUP BY c.PhoneNumber, c.CallerName, s.StateAbbr
    ORDER BY LastUsed DESC, UsageCount DESC
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
 * Get state coverage analysis - FIXED VERSION
 * @returns {Array} State coverage data
 */
const getStateCoverage = async () => {
  const query = `
    SELECT 
      s.StateAbbr,
      s.StateName,
      COUNT(c.PhoneNumberID) as TotalNumbers,
      COUNT(CASE 
        WHEN u.PhoneNumberID IS NOT NULL 
        THEN 1 
      END) as InUseNumbers,
      COUNT(CASE 
        WHEN u.PhoneNumberID IS NULL 
        THEN 1 
      END) as AvailableNumbers
    FROM FAJITA.dbo.States s
    INNER JOIN FAJITA.dbo.CallIDs c ON s.StateFIPS = c.StateFIPS
    LEFT JOIN (
      SELECT DISTINCT PhoneNumberID
      FROM FAJITA.dbo.CallIDUsage
      WHERE CAST(GETDATE() AS DATE) BETWEEN StartDate AND EndDate
    ) u ON c.PhoneNumberID = u.PhoneNumberID
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


/**
 * Get projects with their CURRENT slot assignments
 */
const getAllProjectsWithAssignments = async () => {
  const query = `
    SELECT
      u.ProjectID,
      -- Count active assignments by slot (check if slot is filled and date is current)
      SUM(CASE WHEN CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate AND u.CallIDL1 IS NOT NULL THEN 1 ELSE 0 END) as Slot1Active,
      SUM(CASE WHEN CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate AND u.CallIDL2 IS NOT NULL THEN 1 ELSE 0 END) as Slot2Active,
      SUM(CASE WHEN CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate AND u.CallIDC1 IS NOT NULL THEN 1 ELSE 0 END) as Slot3Active,
      SUM(CASE WHEN CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate AND u.CallIDC2 IS NOT NULL THEN 1 ELSE 0 END) as Slot4Active,
      -- Count rows where at least one slot is active
      SUM(CASE WHEN CAST(GETDATE() AS DATE) BETWEEN u.StartDate AND u.EndDate
               AND (u.CallIDL1 IS NOT NULL OR u.CallIDL2 IS NOT NULL OR u.CallIDC1 IS NOT NULL OR u.CallIDC2 IS NOT NULL)
          THEN 1 ELSE 0 END) as ActiveAssignments,
      COUNT(*) as TotalAssignments,
      MIN(u.StartDate) as FirstUsed,
      MAX(u.EndDate) as LastUsed
    FROM FAJITA.dbo.CallIDUsage u
    GROUP BY u.ProjectID
    ORDER BY u.ProjectID
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(query);
      return result.recordset;
    },
    fnName: 'getAllProjectsWithAssignments',
    attempts: 3
  });
};

/**
 * Check if a call ID is available for assignment (no conflicts)
 * @param {Number} phoneNumberId - Phone number ID
 * @param {String} startDate - Assignment start date
 * @param {String} endDate - Assignment end date
 * @param {String} excludeProjectId - Optional: Exclude this project from conflict check (for updates)
 * @returns {Object} Conflict check result
 */
const checkAssignmentConflict = async (phoneNumberId, startDate, endDate, excludeProjectId = null) => {
  const query = `
    SELECT
      u.ProjectID,
      u.StartDate,
      u.EndDate,
      c.PhoneNumber
    FROM FAJITA.dbo.CallIDUsage u
    LEFT JOIN FAJITA.dbo.CallIDs c ON (
      c.PhoneNumberID = u.CallIDL1
      OR c.PhoneNumberID = u.CallIDL2
      OR c.PhoneNumberID = u.CallIDC1
      OR c.PhoneNumberID = u.CallIDC2
    )
    WHERE (u.CallIDL1 = @phoneNumberId OR u.CallIDL2 = @phoneNumberId OR u.CallIDC1 = @phoneNumberId OR u.CallIDC2 = @phoneNumberId)
      ${excludeProjectId ? 'AND u.ProjectID != @excludeProjectId' : ''}
      AND (
        (@startDate BETWEEN u.StartDate AND u.EndDate)
        OR (@endDate BETWEEN u.StartDate AND u.EndDate)
        OR (u.StartDate BETWEEN @startDate AND @endDate)
        OR (u.EndDate BETWEEN @startDate AND @endDate)
      )
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request()
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('startDate', sql.DateTime, startDate)
        .input('endDate', sql.DateTime, endDate);

      if (excludeProjectId) {
        request.input('excludeProjectId', sql.NVarChar(20), excludeProjectId);
      }

      const result = await request.query(query);

      return {
        hasConflict: result.recordset.length > 0,
        conflicts: result.recordset
      };
    },
    fnName: 'checkAssignmentConflict',
    attempts: 3
  });
};

/**
 * Update an existing assignment (change dates)
 * @param {String} projectId - Project ID
 * @param {Number} phoneNumberId - Phone number ID
 * @param {Object} updates - New start/end dates
 * @returns {Object} Updated assignment
 */
const updateAssignment = async (projectId, phoneNumberId, updates) => {
  const { startDate, endDate } = updates;

  // Check for conflicts first (excluding current project)
  const conflictCheck = await checkAssignmentConflict(phoneNumberId, startDate, endDate, projectId);

  if (conflictCheck.hasConflict) {
    throw new Error(`Assignment conflict: This number is already assigned to project ${conflictCheck.conflicts[0].ProjectID} during this period`);
  }

  const query = `
    UPDATE FAJITA.dbo.CallIDUsage
    SET
      StartDate = @startDate,
      EndDate = @endDate
    WHERE ProjectID = @projectId
      AND (CallIDL1 = @phoneNumberId OR CallIDL2 = @phoneNumberId OR CallIDC1 = @phoneNumberId OR CallIDC2 = @phoneNumberId)

    SELECT
      u.ProjectID,
      u.StartDate,
      u.EndDate
    FROM FAJITA.dbo.CallIDUsage u
    WHERE u.ProjectID = @projectId
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('startDate', sql.DateTime, startDate)
        .input('endDate', sql.DateTime, endDate)
        .query(query);

      return result.recordset[0];
    },
    fnName: 'updateAssignment',
    attempts: 3
  });
};

/**
 * Swap a call ID assignment from one project to another
 * @param {String} fromProjectId - Source project ID
 * @param {String} toProjectId - Destination project ID
 * @param {Number} phoneNumberId - Phone number ID to swap
 * @param {Object} newDates - Optional new start/end dates for destination project
 * @returns {Object} Swap result
 */
const swapCallIDAssignment = async (fromProjectId, toProjectId, phoneNumberId, newDates = {}) => {
  const { startDate = new Date(), endDate } = newDates;

  const query = `
    BEGIN TRANSACTION

    -- End the assignment from the source project
    UPDATE FAJITA.dbo.CallIDUsage
    SET EndDate = DATEADD(second, -1, @startDate)
    WHERE ProjectID = @fromProjectId
      AND PhoneNumberID = @phoneNumberId
      AND CAST(GETDATE() AS DATE) BETWEEN StartDate AND EndDate

    -- Create new assignment for destination project
    INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, PhoneNumberID, StartDate, EndDate)
    VALUES (@toProjectId, @phoneNumberId, @startDate, @endDate)

    COMMIT TRANSACTION

    SELECT 'Success' as Result
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      // Validate required fields
      if (!endDate) {
        throw new Error('End date is required for swap assignment');
      }

      const result = await pool.request()
        .input('fromProjectId', sql.NVarChar(20), fromProjectId)
        .input('toProjectId', sql.NVarChar(20), toProjectId)
        .input('phoneNumberId', sql.Int, phoneNumberId)
        .input('startDate', sql.DateTime, startDate)
        .input('endDate', sql.DateTime, endDate)
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
 */
const updateProjectSlot = async (projectId, slotName, phoneNumberId, startDate = null, endDate = null) => {
  // Validate slot name
  const validSlots = ['CallIDL1', 'CallIDL2', 'CallIDC1', 'CallIDC2'];
  if (!validSlots.includes(slotName)) {
    throw new Error('Invalid slot name');
  }

  const query = `
    -- Check if project has a usage row
    DECLARE @RowExists BIT = 0

    IF EXISTS (
      SELECT 1 FROM FAJITA.dbo.CallIDUsage
      WHERE ProjectID = @projectId
    )
    BEGIN
      SET @RowExists = 1
    END

    IF @RowExists = 0
    BEGIN
      -- Create new usage row with provided dates (or defaults if not provided)
      INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, ${slotName}, StartDate, EndDate)
      VALUES (@projectId, @phoneNumberId, COALESCE(@startDate, GETDATE()), COALESCE(@endDate, '1900-01-01'))

      SELECT 1 as Success, 'Slot assigned successfully' as Message, 'INSERT' as Action, @@ROWCOUNT as RowsAffected
    END
    ELSE
    BEGIN
      -- Update existing row (keep existing dates, only update the slot)
      UPDATE FAJITA.dbo.CallIDUsage
      SET ${slotName} = @phoneNumberId
      WHERE ProjectID = @projectId

      SELECT 1 as Success, 'Slot updated successfully' as Message, 'UPDATE' as Action, @@ROWCOUNT as RowsAffected
    END
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      console.log('[updateProjectSlot] Executing query for:', { projectId, slotName, phoneNumberId, startDate, endDate });
      const request = pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .input('phoneNumberId', sql.Int, phoneNumberId);

      if (startDate) {
        request.input('startDate', sql.DateTime, startDate);
      }
      if (endDate) {
        request.input('endDate', sql.DateTime, endDate);
      }

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
 */
const removeProjectSlot = async (projectId, slotName) => {
  const validSlots = ['CallIDL1', 'CallIDL2', 'CallIDC1', 'CallIDC2'];
  if (!validSlots.includes(slotName)) {
    throw new Error('Invalid slot name');
  }

  const query = `
    UPDATE FAJITA.dbo.CallIDUsage
    SET ${slotName} = NULL
    WHERE ProjectID = @projectId
      AND CAST(GETDATE() AS DATE) BETWEEN StartDate AND EndDate

    SELECT 1 as Success, 'Slot cleared successfully' as Message
  `;

  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request()
        .input('projectId', sql.NVarChar(20), projectId)
        .query(query);
      return result.recordset[0];
    },
    fnName: 'removeProjectSlot',
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
  removeProjectSlot
};