const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');

/**
 * Get the next available project ID
 */
const getNextProjectNumber = async () => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query('SELECT MAX(projectID) as maxNumber FROM FAJITA.dbo.Projects');
      
      const maxNumber = result.recordset[0].maxNumber || 0;
      return maxNumber + 1;
    },
    fnName: 'getNextProjectNumber',
  });
};

/**
 * Create a new project
 */
const createProject = async (projectData, username) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request();
      
      request.input('clientProjectID', sql.NVarChar, projectData.clientProjectID || null);
      request.input('projectName', sql.NVarChar, projectData.projectName);
      request.input('NSize', sql.Int, projectData.NSize || null);
      request.input('clientTime', sql.Decimal(10, 2), projectData.clientTime || null);
      request.input('promarkTime', sql.Decimal(10, 2), projectData.promarkTime || null);
      request.input('openends', sql.Char(1), projectData.openends || 'n');
      request.input('startDate', sql.Date, projectData.startDate || null);
      request.input('endDate', sql.Date, projectData.endDate || null);
      request.input('client', sql.NVarChar, projectData.client || null);
      request.input('contactName', sql.NVarChar, projectData.contactName || null);
      request.input('contactNumber', sql.NVarChar, projectData.contactNumber || null);
      request.input('dataProcessing', sql.Bit, projectData.dataProcessing || 0);
      request.input('createdBy', sql.NVarChar, username);
      
      const result = await request.query(`
        INSERT INTO FAJITA.dbo.Projects 
        (clientProjectID, projectName, NSize, clientTime, promarkTime, openends, 
         startDate, endDate, client, contactName, contactNumber, dataProcessing, createdBy, updatedBy)
        VALUES 
        (@clientProjectID, @projectName, @NSize, @clientTime, @promarkTime, @openends, 
         @startDate, @endDate, @client, @contactName, @contactNumber, @dataProcessing, @createdBy, @createdBy);
        
        SELECT SCOPE_IDENTITY() as id;
      `);
      
      const projectID = result.recordset[0].id;
      
      return { id: projectID, projectID: projectID };
    },
    fnName: 'createProject',
  });
};

/**
 * Get all projects with pagination and sorting
 */
const getAllProjects = async (options = {}) => {
  const {
    page = 1,
    limit = 75,
    sortBy = 'projectID',
    sortOrder = 'DESC',
    searchTerm = null,
  } = options;
  
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const offset = (page - 1) * limit;
      const request = pool.request();
      
      request.input('limit', sql.Int, limit);
      request.input('offset', sql.Int, offset);
      
      let whereClause = '';
      if (searchTerm) {
        request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
        whereClause = `
          WHERE projectName LIKE @searchTerm 
          OR clientProjectID LIKE @searchTerm 
          OR CAST(projectID AS NVARCHAR) LIKE @searchTerm
          OR client LIKE @searchTerm
          OR contactName LIKE @searchTerm
        `;
      }
      
      // Validate sortBy to prevent SQL injection
      const allowedSortColumns = [
        'projectID', 'clientProjectID', 'projectName', 'NSize', 'clientTime', 
        'promarkTime', 'startDate', 'endDate', 'client', 
        'contactName', 'contactNumber', 'dataProcessing'
      ];
      const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'projectID';
      const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      const query = `
        SELECT 
          projectID, clientProjectID, projectName, NSize, clientTime, promarkTime, 
          openends, startDate, endDate, client, contactName, contactNumber, 
          dataProcessing, dateCreated, dateUpdated, createdBy, updatedBy
        FROM FAJITA.dbo.Projects
        ${whereClause}
        ORDER BY ${validSortBy} ${validSortOrder}
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;
        
        SELECT COUNT(*) as total FROM FAJITA.dbo.Projects ${whereClause};
      `;
      
      const result = await request.query(query);
      
      return {
        projects: result.recordsets[0],
        total: result.recordsets[1][0].total,
        page,
        limit,
        totalPages: Math.ceil(result.recordsets[1][0].total / limit),
      };
    },
    fnName: 'getAllProjects',
  });
};

/**
 * Get a single project by ID
 */
const getProjectByNumber = async (projectID) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('projectID', sql.Int, projectID)
        .query(`
          SELECT 
            projectID, clientProjectID, projectName, NSize, clientTime, promarkTime, 
            openends, startDate, endDate, client, contactName, contactNumber, 
            dataProcessing, dateCreated, dateUpdated, createdBy, updatedBy
          FROM FAJITA.dbo.Projects
          WHERE projectID = @projectID
        `);
      
      return result.recordset[0] || null;
    },
    fnName: 'getProjectByNumber',
  });
};

/**
 * Update a project
 */
const updateProject = async (projectID, projectData, username) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request();
      
      request.input('projectID', sql.Int, projectID);
      request.input('clientProjectID', sql.NVarChar, projectData.clientProjectID || null);
      request.input('projectName', sql.NVarChar, projectData.projectName);
      request.input('NSize', sql.Int, projectData.NSize || null);
      request.input('clientTime', sql.Decimal(10, 2), projectData.clientTime || null);
      request.input('promarkTime', sql.Decimal(10, 2), projectData.promarkTime || null);
      request.input('openends', sql.Char(1), projectData.openends || 'n');
      request.input('startDate', sql.Date, projectData.startDate || null);
      request.input('endDate', sql.Date, projectData.endDate || null);
      request.input('client', sql.NVarChar, projectData.client || null);
      request.input('contactName', sql.NVarChar, projectData.contactName || null);
      request.input('contactNumber', sql.NVarChar, projectData.contactNumber || null);
      request.input('dataProcessing', sql.Bit, projectData.dataProcessing || 0);
      request.input('updatedBy', sql.NVarChar, username);
      
      await request.query(`
        UPDATE FAJITA.dbo.Projects
        SET 
          clientProjectID = @clientProjectID,
          projectName = @projectName,
          NSize = @NSize,
          clientTime = @clientTime,
          promarkTime = @promarkTime,
          openends = @openends,
          startDate = @startDate,
          endDate = @endDate,
          client = @client,
          contactName = @contactName,
          contactNumber = @contactNumber,
          dataProcessing = @dataProcessing,
          updatedBy = @updatedBy
        WHERE projectID = @projectID
      `);
      
      return true;
    },
    fnName: 'updateProject',
  });
};

/**
 * Delete a project
 */
const deleteProject = async (projectID) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('projectID', sql.Int, projectID)
        .query('DELETE FROM FAJITA.dbo.Projects WHERE projectID = @projectID');
      
      return result.rowsAffected[0] > 0;
    },
    fnName: 'deleteProject',
  });
};

/**
 * Search projects by various criteria
 */
const searchProjects = async (criteria) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const request = pool.request();
      const conditions = [];
      
      if (criteria.projectID) {
        request.input('projectID', sql.Int, criteria.projectID);
        conditions.push('projectID = @projectID');
      }
      
      if (criteria.clientProjectID) {
        request.input('clientProjectID', sql.NVarChar, `%${criteria.clientProjectID}%`);
        conditions.push('clientProjectID LIKE @clientProjectID');
      }
      
      if (criteria.projectName) {
        request.input('projectName', sql.NVarChar, `%${criteria.projectName}%`);
        conditions.push('projectName LIKE @projectName');
      }
      
      if (criteria.client) {
        request.input('client', sql.NVarChar, `%${criteria.client}%`);
        conditions.push('client LIKE @client');
      }
      
      if (criteria.startDateFrom) {
        request.input('startDateFrom', sql.Date, criteria.startDateFrom);
        conditions.push('startDate >= @startDateFrom');
      }
      
      if (criteria.startDateTo) {
        request.input('startDateTo', sql.Date, criteria.startDateTo);
        conditions.push('startDate <= @startDateTo');
      }
      
      if (criteria.contactName) {
        request.input('contactName', sql.NVarChar, `%${criteria.contactName}%`);
        conditions.push('contactName LIKE @contactName');
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          projectID, clientProjectID, projectName, NSize, clientTime, promarkTime, 
          openends, startDate, endDate, client, contactName, contactNumber, 
          dataProcessing, dateCreated, dateUpdated, createdBy, updatedBy
        FROM FAJITA.dbo.Projects
        ${whereClause}
        ORDER BY projectID DESC
      `;
      
      const result = await request.query(query);
      return result.recordset;
    },
    fnName: 'searchProjects',
  });
};

/**
 * Get project statistics
 */
const getProjectStats = async () => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool.request().query(`
        SELECT 
          COUNT(*) as totalProjects,
          COUNT(CASE WHEN openends = 'y' THEN 1 END) as projectsWithOpenEnds,
          COUNT(CASE WHEN dataProcessing = 1 THEN 1 END) as projectsWithDP,
          COUNT(CASE WHEN startDate >= DATEADD(month, -1, GETDATE()) THEN 1 END) as recentProjects
        FROM FAJITA.dbo.Projects
      `);
      
      return result.recordset[0];
    },
    fnName: 'getProjectStats',
  });
};

module.exports = {
  getNextProjectNumber,
  createProject,
  getAllProjects,
  getProjectByNumber,
  updateProject,
  deleteProject,
  searchProjects,
  getProjectStats,
};