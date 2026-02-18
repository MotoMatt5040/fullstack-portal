const { withDbConnection, sql, DATABASE_TYPES } = require('@internal/db-connection');
const path = require('path');
const fs = require('fs').promises;
const { CALIGULAD: caligulad } = DATABASE_TYPES;
const {
  getPromarkConstantsAsHeaders,
  getPromarkConstantDefault,
} = require('@internal/promark-constants');

/**
 * Get user-specific temp directory path
 * @param {string} userId - User identifier (email/username)
 * @returns {string} - Path to user-specific temp directory
 */
const getUserTempDir = (userId) => {
  // Sanitize userId to create valid directory name (replace @ and . with _)
  const sanitizedUserId = userId.replace(/[@.]/g, '_');
  return path.join(__dirname, '../temp', sanitizedUserId);
};

/**
 * Clean up user-specific temp directory (remove if exists)
 * @param {string} userId - User identifier (email/username)
 */
const cleanupUserTempDir = async (userId) => {
  const userTempDir = getUserTempDir(userId);
  try {
    await fs.rm(userTempDir, { recursive: true, force: true });
    console.log(`🗑️  Cleaned up temp directory for user: ${userId}`);
  } catch (error) {
    // Ignore errors if directory doesn't exist
    console.log(`Note: Could not clean up temp directory: ${error.message}`);
  }
};

/**
 * Ensure user-specific temp directory exists
 * @param {string} userId - User identifier (email/username)
 * @returns {string} - Path to user-specific temp directory
 */
const ensureUserTempDir = async (userId) => {
  const userTempDir = getUserTempDir(userId);
  await fs.mkdir(userTempDir, { recursive: true });
  console.log(`📁 Created temp directory for user: ${userId}`);
  return userTempDir;
};

/**
 * Get URL for temp file
 * @param {string} filename - File name
 * @param {string} userId - User identifier (optional)
 * @returns {string} - URL path to file
 */
const getTempFileUrl = (filename, userId) => {
  if (userId) {
    return `/api/sample-automation/download/${filename}`;
  }
  return `/api/sample-automation/download/${filename}`;
};

/**
 * Create a SQL table from processed file data with Promark internal variables
 * @param {Object} processedData - Data from file processor containing headers and data
 * @param {string} tableName - Base name for the table
 * @returns {Object} - Result object with table creation details
 */
const createTableFromFileData = async (processedData, tableName) => {
  return withDbConnection({
    database: 'caligulad',
    queryFn: async (pool) => {
      try {
        console.log('Starting createTableFromFileData with:', {
          tableName,
          dataRowCount: processedData.data?.length,
          headerCount: processedData.headers?.length,
        });

        const { headers, data } = processedData;

        if (!headers || !Array.isArray(headers) || headers.length === 0) {
          throw new Error('No headers found in processed data');
        }

        if (!data || !Array.isArray(data)) {
          throw new Error('No data array found in processed data');
        }

        // Generate table name: SA_{projectId}_{MMDD_HHMM}
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const timestamp = `${month}${day}_${hour}${minute}`;
        const finalTableName = `SA_${tableName}_${timestamp}`;

        console.log('Generated table name:', finalTableName);

        // Force certain columns to be TEXT type regardless of detected type
        // This prevents issues with columns like RDATE where the first row might
        // look numeric (20260113) but other rows have date strings (1/13/2026 0:00)
        const columnsToForceText = ['RDATE', 'REGDATE', 'DOB', 'BIRTHDATE'];
        headers.forEach(header => {
          if (columnsToForceText.includes(header.name?.toUpperCase())) {
            console.log(`Forcing ${header.name} column to TEXT type (was: ${header.type})`);
            header.type = 'TEXT';
          }
        });

        // Get Promark internal variables and combine with original headers
        const promarkConstants = getPromarkConstantsAsHeaders();
        const enhancedHeaders = [...headers, ...promarkConstants];

        console.log('Original headers:', headers.length);
        console.log('Promark constants added:', promarkConstants.length);
        console.log('Total headers:', enhancedHeaders.length);

        // Create table with enhanced schema (original + constants)
        console.log('Creating table with Promark internal variables...');
        await createTable(pool, finalTableName, enhancedHeaders);

        // Insert the data with constants applied
        console.log('Inserting data with constants...');
        const insertedRows = await insertDataWithConstants(
          pool,
          finalTableName,
          headers, // Original headers from file
          enhancedHeaders, // All headers (original + constants)
          data,
          promarkConstants
        );

        console.log(
          `Successfully created table ${finalTableName} with ${insertedRows} rows and Promark internal variables`
        );

        return {
          success: true,
          tableName: finalTableName,
          headers: enhancedHeaders, // Return all headers including constants
          rowsInserted: insertedRows,
          totalRows: data.length,
          message: `Successfully created table ${finalTableName} with ${insertedRows} rows and Promark internal variables`,
          promarkConstantsAdded: promarkConstants.map((c) => c.name),
        };
      } catch (error) {
        console.error('Error creating table from file data:', error);
        console.error('Error stack:', error.stack);
        throw new Error(`Failed to create table: ${error.message}`);
      }
    },
    fnName: 'createTableFromFileData',
    allowRetry: false,
  });
};

/**
 * Get header mappings from database based on vendor/client and original headers
 * @param {number|null} vendorId - Vendor ID (null for any vendor)
 * @param {number|null} clientId - Client ID (null for any client)
 * @param {string[]} originalHeaders - Array of original header names
 * @returns {Object} - Mapping object with original headers as keys
 */
const getHeaderMappings = async (vendorId, clientId, originalHeaders) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        if (
          !originalHeaders ||
          !Array.isArray(originalHeaders) ||
          originalHeaders.length === 0
        ) {
          return {};
        }

        console.log('Fetching header mappings for:', {
          vendorId,
          clientId,
          originalHeadersCount: originalHeaders.length,
          sampleHeaders: originalHeaders.slice(0, 3),
        });

        // Build the WHERE clause with proper precedence
        let whereConditions = [];
        const request = pool.request();

        // Always add vendorId and clientId parameters (even if null)
        request.input('vendorId', vendorId);
        request.input('clientId', clientId);

        // Add parameters for original headers
        originalHeaders.forEach((header, index) => {
          const paramName = `header${index}`;
          request.input(paramName, header.toUpperCase());
        });

        const headerParams = originalHeaders
          .map((_, index) => `@header${index}`)
          .join(',');

        // Build vendor/client conditions with precedence
        if (vendorId && clientId) {
          whereConditions.push(
            `(hm.VendorID = @vendorId AND hm.ClientID = @clientId)`
          );
          whereConditions.push(
            `(hm.VendorID = @vendorId AND hm.ClientID IS NULL)`
          );
          whereConditions.push(
            `(hm.VendorID IS NULL AND hm.ClientID = @clientId)`
          );
        } else if (vendorId) {
          whereConditions.push(`(hm.VendorID = @vendorId)`);
          whereConditions.push(`(hm.VendorID IS NULL)`);
        } else if (clientId) {
          whereConditions.push(`(hm.ClientID = @clientId)`);
          whereConditions.push(`(hm.ClientID IS NULL)`);
        }

        // Always include fallback mappings where both are NULL
        whereConditions.push(`(hm.VendorID IS NULL AND hm.ClientID IS NULL)`);

        const whereClause =
          whereConditions.length > 0 ? whereConditions.join(' OR ') : '1=1';

        const query = `
          SELECT DISTINCT
            hm.OriginalHeader,
            hm.MappedHeader,
            COALESCE(v.VendorName, 'All') as VendorName,
            COALESCE(c.ClientName, 'All') as ClientName,
            hm.VendorID,
            hm.ClientID,
            CASE
              WHEN hm.VendorID = @vendorId AND hm.ClientID = @clientId THEN 1
              WHEN hm.VendorID = @vendorId AND hm.ClientID IS NULL THEN 2
              WHEN hm.VendorID IS NULL AND hm.ClientID = @clientId THEN 3
              WHEN hm.VendorID IS NULL AND hm.ClientID IS NULL THEN 4
              ELSE 5
            END as Priority
          FROM FAJITA.dbo.HeaderMappings hm
          LEFT JOIN FAJITA.dbo.Vendors v ON v.VendorID = hm.VendorID
          LEFT JOIN CaligulaD.dbo.tblClients c ON c.ClientID = hm.ClientID
          WHERE (${whereClause})
          AND UPPER(hm.OriginalHeader) IN (${headerParams})
          ORDER BY Priority ASC, hm.OriginalHeader
        `;

        console.log('Executing header mapping query...');
        const result = await request.query(query);

        // Process results - keep only the highest priority mapping for each header
        const mappings = {};

        result.recordset.forEach((row) => {
          const originalKey = row.OriginalHeader.toUpperCase();

          if (
            !mappings[originalKey] ||
            row.Priority < mappings[originalKey].priority
          ) {
            mappings[originalKey] = {
              original: row.OriginalHeader.toUpperCase(),
              mapped: row.MappedHeader.toUpperCase(),
              vendorName: row.VendorName,
              clientName: row.ClientName,
              vendorId: row.VendorID,
              clientId: row.ClientID,
              priority: row.Priority,
            };
          }
        });

        const mappingCount = Object.keys(mappings).length;
        const unmappedCount = originalHeaders.length - mappingCount;

        console.log(`Header mapping results:`, {
          totalHeaders: originalHeaders.length,
          mappedHeaders: mappingCount,
          unmappedHeaders: unmappedCount,
        });

        return mappings;
      } catch (error) {
        console.error('Error in getHeaderMappings service:', error);
        throw new Error(`Failed to fetch header mappings: ${error.message}`);
      }
    },
    fnName: 'getHeaderMappings',
  });
};

/**
 * Save header mappings to database
 * @param {number|null} vendorId - Vendor ID
 * @param {number|null} clientId - Client ID
 * @param {Object[]} mappings - Array of {original, mapped} objects
 * @returns {number} - Number of mappings saved
 */
const saveHeaderMappings = async (vendorId, clientId, mappings) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
          return 0;
        }

        console.log('Saving header mappings:', {
          vendorId,
          clientId,
          mappingCount: mappings.length,
        });

        let savedCount = 0;

        for (let i = 0; i < mappings.length; i++) {
          const { original, mapped } = mappings[i];

          if (!original || !mapped) {
            console.warn(`Skipping invalid mapping at index ${i}:`, {
              original,
              mapped,
            });
            continue;
          }

          const upperOriginal = original.toUpperCase();
          const upperMapped = mapped.toUpperCase();

          // Check if mapping already exists
          const checkQuery = `
            SELECT COUNT(*) as count
            FROM FAJITA.dbo.HeaderMappings
            WHERE UPPER(OriginalHeader) = UPPER(@original)
            AND VendorID ${vendorId ? '= @vendorId' : 'IS NULL'}
            AND ClientID ${clientId ? '= @clientId' : 'IS NULL'}
          `;

          const checkRequest = pool.request();
          checkRequest.input('original', upperOriginal);
          if (vendorId) checkRequest.input('vendorId', vendorId);
          if (clientId) checkRequest.input('clientId', clientId);

          const checkResult = await checkRequest.query(checkQuery);
          const exists = checkResult.recordset[0].count > 0;

          if (exists) {
            // Update existing mapping
            const updateQuery = `
              UPDATE FAJITA.dbo.HeaderMappings
              SET MappedHeader = @mapped,
                  ModifiedDate = GETDATE()
              WHERE UPPER(OriginalHeader) = UPPER(@original)
              AND VendorID ${vendorId ? '= @vendorId' : 'IS NULL'}
              AND ClientID ${clientId ? '= @clientId' : 'IS NULL'}
            `;

            const updateRequest = pool.request();
            updateRequest.input('mapped', upperMapped);
            updateRequest.input('original', upperOriginal);
            if (vendorId) updateRequest.input('vendorId', vendorId);
            if (clientId) updateRequest.input('clientId', clientId);

            await updateRequest.query(updateQuery);
            console.log(`Updated mapping: ${upperOriginal} → ${upperMapped}`);
          } else {
            // Insert new mapping
            const insertQuery = `
              INSERT INTO FAJITA.dbo.HeaderMappings (VendorID, ClientID, OriginalHeader, MappedHeader, CreatedDate)
              VALUES (@vendorId, @clientId, @original, @mapped, GETDATE())
            `;

            const insertRequest = pool.request();
            insertRequest.input('vendorId', vendorId);
            insertRequest.input('clientId', clientId);
            insertRequest.input('original', upperOriginal);
            insertRequest.input('mapped', upperMapped);

            await insertRequest.query(insertQuery);
            console.log(`Inserted new mapping: ${upperOriginal} → ${upperMapped}`);
          }

          savedCount++;
        }

        console.log(`Successfully saved ${savedCount} header mappings`);
        return savedCount;
      } catch (error) {
        console.error('Error in saveHeaderMappings service:', error);
        throw new Error(`Failed to save header mappings: ${error.message}`);
      }
    },
    fnName: 'saveHeaderMappings',
  });
};

/**
 * Get all header mappings for management page
 * @param {Object} filters - Optional filters: vendorId, clientId, search
 * @returns {Array} - Array of header mapping objects
 */
const getAllHeaderMappings = async (filters = {}) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const { vendorId, clientId, search } = filters;

        let query = `
          SELECT
            hm.OriginalHeader,
            hm.MappedHeader,
            hm.VendorID,
            hm.ClientID,
            hm.CreatedDate,
            hm.ModifiedDate,
            v.VendorName,
            c.ClientName
          FROM FAJITA.dbo.HeaderMappings hm
          LEFT JOIN FAJITA.dbo.Vendors v ON v.VendorID = hm.VendorID
          LEFT JOIN CaligulaD.dbo.tblClients c ON c.ClientID = hm.ClientID
          WHERE 1=1
        `;

        const request = pool.request();

        if (vendorId) {
          query += ' AND hm.VendorID = @vendorId';
          request.input('vendorId', vendorId);
        }

        if (clientId) {
          query += ' AND hm.ClientID = @clientId';
          request.input('clientId', clientId);
        }

        if (search) {
          query += ' AND (hm.OriginalHeader LIKE @search OR hm.MappedHeader LIKE @search)';
          request.input('search', `%${search}%`);
        }

        query += ' ORDER BY hm.VendorID, hm.ClientID, hm.OriginalHeader';

        const result = await request.query(query);

        return result.recordset.map(row => ({
          originalHeader: row.OriginalHeader,
          mappedHeader: row.MappedHeader,
          vendorId: row.VendorID,
          clientId: row.ClientID,
          vendorName: row.VendorName || 'Global',
          clientName: row.ClientName || 'All Clients',
          createdDate: row.CreatedDate,
          modifiedDate: row.ModifiedDate,
        }));
      } catch (error) {
        console.error('Error in getAllHeaderMappings service:', error);
        throw new Error(`Failed to fetch header mappings: ${error.message}`);
      }
    },
    fnName: 'getAllHeaderMappings',
  });
};

/**
 * Delete a header mapping
 * @param {string} originalHeader - Original header name
 * @param {number|null} vendorId - Vendor ID
 * @param {number|null} clientId - Client ID
 * @returns {Object} - Result object with deleted flag
 */
const deleteHeaderMapping = async (originalHeader, vendorId, clientId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          DELETE FROM FAJITA.dbo.HeaderMappings
          WHERE UPPER(OriginalHeader) = UPPER(@originalHeader)
          AND VendorID ${vendorId ? '= @vendorId' : 'IS NULL'}
          AND ClientID ${clientId ? '= @clientId' : 'IS NULL'}
        `;

        const request = pool.request();
        request.input('originalHeader', originalHeader);
        if (vendorId) request.input('vendorId', vendorId);
        if (clientId) request.input('clientId', clientId);

        const result = await request.query(query);

        return {
          deleted: result.rowsAffected[0] > 0,
          rowsAffected: result.rowsAffected[0],
        };
      } catch (error) {
        console.error('Error in deleteHeaderMapping service:', error);
        throw new Error(`Failed to delete header mapping: ${error.message}`);
      }
    },
    fnName: 'deleteHeaderMapping',
  });
};

// ============================================================================
// Variable Exclusions Functions
// ============================================================================

/**
 * Get all variable exclusions
 * @param {Object} filters - Optional filters { search }
 * @returns {Array} - Array of variable exclusion objects
 */
const getVariableExclusions = async (filters = {}) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const { search } = filters;

        let query = `
          SELECT
            ExclusionID,
            VariableName,
            Description,
            CreatedDate,
            CreatedBy
          FROM FAJITA.dbo.VariableExclusions
          WHERE 1=1
        `;

        const request = pool.request();

        if (search) {
          query += ' AND (VariableName LIKE @search OR Description LIKE @search)';
          request.input('search', `%${search}%`);
        }

        query += ' ORDER BY VariableName';

        const result = await request.query(query);

        return result.recordset.map(row => ({
          exclusionId: row.ExclusionID,
          variableName: row.VariableName,
          description: row.Description,
          createdDate: row.CreatedDate,
          createdBy: row.CreatedBy,
        }));
      } catch (error) {
        console.error('Error in getVariableExclusions service:', error);
        throw new Error(`Failed to get variable exclusions: ${error.message}`);
      }
    },
    fnName: 'getVariableExclusions',
  });
};

/**
 * Add a new variable exclusion
 * @param {string} variableName - Variable name to exclude
 * @param {string} description - Optional description
 * @param {string} createdBy - User who created the exclusion
 * @returns {Object} - Created exclusion object
 */
const addVariableExclusion = async (variableName, description, createdBy) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          INSERT INTO FAJITA.dbo.VariableExclusions (VariableName, Description, CreatedBy)
          OUTPUT INSERTED.ExclusionID, INSERTED.VariableName, INSERTED.Description, INSERTED.CreatedDate, INSERTED.CreatedBy
          VALUES (UPPER(@variableName), @description, @createdBy)
        `;

        const request = pool.request();
        request.input('variableName', variableName);
        request.input('description', description || null);
        request.input('createdBy', createdBy || null);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
          throw new Error('Failed to create variable exclusion');
        }

        const row = result.recordset[0];
        return {
          exclusionId: row.ExclusionID,
          variableName: row.VariableName,
          description: row.Description,
          createdDate: row.CreatedDate,
          createdBy: row.CreatedBy,
        };
      } catch (error) {
        console.error('Error in addVariableExclusion service:', error);
        if (error.message.includes('UNIQUE') || error.message.includes('duplicate')) {
          throw new Error('This variable is already excluded');
        }
        throw new Error(`Failed to add variable exclusion: ${error.message}`);
      }
    },
    fnName: 'addVariableExclusion',
  });
};

/**
 * Update a variable exclusion
 * @param {number} exclusionId - ID of exclusion to update
 * @param {string} description - New description
 * @returns {Object} - Updated exclusion object
 */
const updateVariableExclusion = async (exclusionId, description) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          UPDATE FAJITA.dbo.VariableExclusions
          SET Description = @description
          OUTPUT INSERTED.ExclusionID, INSERTED.VariableName, INSERTED.Description, INSERTED.CreatedDate, INSERTED.CreatedBy
          WHERE ExclusionID = @exclusionId
        `;

        const request = pool.request();
        request.input('exclusionId', exclusionId);
        request.input('description', description || null);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
          throw new Error('Variable exclusion not found');
        }

        const row = result.recordset[0];
        return {
          exclusionId: row.ExclusionID,
          variableName: row.VariableName,
          description: row.Description,
          createdDate: row.CreatedDate,
          createdBy: row.CreatedBy,
        };
      } catch (error) {
        console.error('Error in updateVariableExclusion service:', error);
        throw new Error(`Failed to update variable exclusion: ${error.message}`);
      }
    },
    fnName: 'updateVariableExclusion',
  });
};

/**
 * Delete a variable exclusion
 * @param {number} exclusionId - ID of exclusion to delete
 * @returns {Object} - Deletion result
 */
const deleteVariableExclusion = async (exclusionId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          DELETE FROM FAJITA.dbo.VariableExclusions
          WHERE ExclusionID = @exclusionId
        `;

        const request = pool.request();
        request.input('exclusionId', exclusionId);

        const result = await request.query(query);

        return {
          deleted: result.rowsAffected[0] > 0,
          rowsAffected: result.rowsAffected[0],
        };
      } catch (error) {
        console.error('Error in deleteVariableExclusion service:', error);
        throw new Error(`Failed to delete variable exclusion: ${error.message}`);
      }
    },
    fnName: 'deleteVariableExclusion',
  });
};

/**
 * Get project variable inclusions (excluded variables that are included for a specific project)
 * @param {number} projectId - Project ID
 * @returns {Array} - Array of inclusion objects
 */
const getProjectVariableInclusions = async (projectId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          SELECT
            pvi.InclusionID,
            pvi.ProjectID,
            pvi.OriginalVariableName,
            pvi.MappedVariableName,
            pvi.CreatedDate,
            pvi.CreatedBy
          FROM FAJITA.dbo.ProjectVariableInclusions pvi
          WHERE pvi.ProjectID = @projectId
          ORDER BY pvi.OriginalVariableName
        `;

        const request = pool.request();
        request.input('projectId', projectId);

        const result = await request.query(query);

        return result.recordset.map(row => ({
          inclusionId: row.InclusionID,
          projectId: row.ProjectID,
          originalVariableName: row.OriginalVariableName,
          mappedVariableName: row.MappedVariableName,
          createdDate: row.CreatedDate,
          createdBy: row.CreatedBy,
        }));
      } catch (error) {
        console.error('Error in getProjectVariableInclusions service:', error);
        throw new Error(`Failed to get project variable inclusions: ${error.message}`);
      }
    },
    fnName: 'getProjectVariableInclusions',
  });
};

/**
 * Add a project variable inclusion (include an excluded variable for a specific project)
 * @param {number} projectId - Project ID
 * @param {string} originalVariableName - Original variable name
 * @param {string} mappedVariableName - What to rename the variable to
 * @param {string} createdBy - User who created the inclusion
 * @returns {Object} - Created inclusion object
 */
const addProjectVariableInclusion = async (projectId, originalVariableName, mappedVariableName, createdBy) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          INSERT INTO FAJITA.dbo.ProjectVariableInclusions (ProjectID, OriginalVariableName, MappedVariableName, CreatedBy)
          OUTPUT INSERTED.InclusionID, INSERTED.ProjectID, INSERTED.OriginalVariableName, INSERTED.MappedVariableName, INSERTED.CreatedDate, INSERTED.CreatedBy
          VALUES (@projectId, UPPER(@originalVariableName), UPPER(@mappedVariableName), @createdBy)
        `;

        const request = pool.request();
        request.input('projectId', projectId);
        request.input('originalVariableName', originalVariableName);
        request.input('mappedVariableName', mappedVariableName);
        request.input('createdBy', createdBy || null);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
          throw new Error('Failed to create project variable inclusion');
        }

        const row = result.recordset[0];
        return {
          inclusionId: row.InclusionID,
          projectId: row.ProjectID,
          originalVariableName: row.OriginalVariableName,
          mappedVariableName: row.MappedVariableName,
          createdDate: row.CreatedDate,
          createdBy: row.CreatedBy,
        };
      } catch (error) {
        console.error('Error in addProjectVariableInclusion service:', error);
        if (error.message.includes('UNIQUE') || error.message.includes('duplicate')) {
          throw new Error('This variable is already included for this project');
        }
        throw new Error(`Failed to add project variable inclusion: ${error.message}`);
      }
    },
    fnName: 'addProjectVariableInclusion',
  });
};

/**
 * Update a project variable inclusion
 * @param {number} inclusionId - ID of inclusion to update
 * @param {string} mappedVariableName - New mapped variable name
 * @returns {Object} - Updated inclusion object
 */
const updateProjectVariableInclusion = async (inclusionId, mappedVariableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          UPDATE FAJITA.dbo.ProjectVariableInclusions
          SET MappedVariableName = UPPER(@mappedVariableName)
          OUTPUT INSERTED.InclusionID, INSERTED.ProjectID, INSERTED.OriginalVariableName, INSERTED.MappedVariableName, INSERTED.CreatedDate, INSERTED.CreatedBy
          WHERE InclusionID = @inclusionId
        `;

        const request = pool.request();
        request.input('inclusionId', inclusionId);
        request.input('mappedVariableName', mappedVariableName);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
          throw new Error('Project variable inclusion not found');
        }

        const row = result.recordset[0];
        return {
          inclusionId: row.InclusionID,
          projectId: row.ProjectID,
          originalVariableName: row.OriginalVariableName,
          mappedVariableName: row.MappedVariableName,
          createdDate: row.CreatedDate,
          createdBy: row.CreatedBy,
        };
      } catch (error) {
        console.error('Error in updateProjectVariableInclusion service:', error);
        throw new Error(`Failed to update project variable inclusion: ${error.message}`);
      }
    },
    fnName: 'updateProjectVariableInclusion',
  });
};

/**
 * Delete a project variable inclusion
 * @param {number} inclusionId - ID of inclusion to delete
 * @returns {Object} - Deletion result
 */
const deleteProjectVariableInclusion = async (inclusionId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          DELETE FROM FAJITA.dbo.ProjectVariableInclusions
          WHERE InclusionID = @inclusionId
        `;

        const request = pool.request();
        request.input('inclusionId', inclusionId);

        const result = await request.query(query);

        return {
          deleted: result.rowsAffected[0] > 0,
          rowsAffected: result.rowsAffected[0],
        };
      } catch (error) {
        console.error('Error in deleteProjectVariableInclusion service:', error);
        throw new Error(`Failed to delete project variable inclusion: ${error.message}`);
      }
    },
    fnName: 'deleteProjectVariableInclusion',
  });
};

/**
 * Get all exclusion variable names as a Set for efficient lookup during file processing
 * @returns {Set<string>} - Set of excluded variable names (uppercase)
 */
const getExcludedVariableSet = async () => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `SELECT VariableName FROM FAJITA.dbo.VariableExclusions`;
        const result = await pool.request().query(query);
        return new Set(result.recordset.map(row => row.VariableName.toUpperCase()));
      } catch (error) {
        console.error('Error in getExcludedVariableSet service:', error);
        // Return empty set on error to not block processing
        return new Set();
      }
    },
    fnName: 'getExcludedVariableSet',
  });
};

/**
 * Get project inclusions as a Map for efficient lookup during file processing
 * @param {number} projectId - Project ID
 * @returns {Map<string, string>} - Map of original variable name (uppercase) to mapped variable name
 */
const getProjectInclusionsMap = async (projectId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const query = `
          SELECT OriginalVariableName, MappedVariableName
          FROM FAJITA.dbo.ProjectVariableInclusions
          WHERE ProjectID = @projectId
        `;
        const request = pool.request();
        request.input('projectId', projectId);
        const result = await request.query(query);

        const map = new Map();
        result.recordset.forEach(row => {
          map.set(row.OriginalVariableName.toUpperCase(), row.MappedVariableName);
        });
        return map;
      } catch (error) {
        console.error('Error in getProjectInclusionsMap service:', error);
        // Return empty map on error to not block processing
        return new Map();
      }
    },
    fnName: 'getProjectInclusionsMap',
  });
};

/**
 * Sanitize table name for SQL Server compatibility
 * @param {string} tableName - Raw table name
 * @returns {string} - Sanitized table name
 */
const sanitizeTableName = (tableName) => {
  return tableName
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, 'tbl_$&')
    .substring(0, 50);
};

/**
 * Create SQL table with dynamic schema including default values for constants
 * @param {Object} pool - Database connection pool
 * @param {string} tableName - Name of table to create
 * @param {Array} headers - Array of header objects with name, type, and optional defaultValue
 */
const createTable = async (pool, tableName, headers) => {
  try {
    console.log('Creating table with headers (including constants):', headers.length);

    const columnDefinitions = headers
      .map((header) => {
        const columnName = sanitizeColumnName(header.name);
        const sqlType = mapDataTypeToSQL(header.type);

        const defaultClause =
          header.defaultValue !== undefined && header.defaultValue !== null
            ? ` DEFAULT ${
                typeof header.defaultValue === 'string'
                  ? `'${header.defaultValue}'`
                  : header.defaultValue
              }`
            : '';

        const columnDef = `[${columnName}] ${sqlType}${defaultClause}`;

        if (header.isPromarkConstant) {
          console.log(`Promark constant: ${columnName} -> ${sqlType}${defaultClause}`);
        }

        return columnDef;
      })
      .join(',\n    ');

    const createTableSQL = `
    CREATE TABLE FAJITA.dbo.[${tableName}] (
      ${columnDefinitions}
    )
  `;

    console.log('Executing CREATE TABLE SQL with constants...');
    await pool.request().query(createTableSQL);
    console.log(`Table [${tableName}] created successfully with Promark constants`);
  } catch (error) {
    console.error('Error in createTable:', error);
    throw error;
  }
};

/**
 * Insert data with Promark constants applied
 */
const insertDataWithConstants = async (
  pool,
  tableName,
  originalHeaders,
  allHeaders,
  data,
  promarkConstants
) => {
  try {
    if (data.length === 0) {
      console.log('No data to insert');
      return 0;
    }

    console.log(`Bulk inserting ${data.length} rows with Promark constants into table ${tableName}`);

    const table = new sql.Table(`FAJITA.dbo.${tableName}`);

    allHeaders.forEach((header) => {
      const columnName = sanitizeColumnName(header.name);
      const sqlType = getSQLParameterType(header.type);
      table.columns.add(columnName, sqlType, { nullable: true });
    });

    data.forEach((row) => {
      const rowValues = allHeaders.map((header) => {
        const isConstant = promarkConstants.find((c) => c.name === header.name);

        if (isConstant) {
          const defaultValue = getPromarkConstantDefault(header.name);
          return convertValue(defaultValue, header.type);
        } else {
          const value = row[header.name];
          return convertValue(value, header.type);
        }
      });

      table.rows.add(...rowValues);
    });

    console.log('Executing bulk insert with constants...');
    const request = pool.request();
    await request.bulk(table);

    console.log(`Successfully bulk inserted ${data.length} rows with Promark constants`);
    return data.length;
  } catch (error) {
    console.error('Error in bulk insert with constants:', error);
    throw error;
  }
};

/**
 * Sanitize column name for SQL Server
 */
const sanitizeColumnName = (columnName) => {
  if (!columnName || typeof columnName !== 'string') {
    return 'UNNAMED_COLUMN';
  }

  return columnName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, 'col_$&')
    .substring(0, 128);
};

/**
 * Map detected data type to SQL Server data type
 */
const mapDataTypeToSQL = (dataType) => {
  switch (dataType?.toUpperCase()) {
    case 'INTEGER':
      return 'BIGINT NULL';
    case 'REAL':
    case 'FLOAT':
      return 'FLOAT NULL';
    case 'BOOLEAN':
      return 'BIT NULL';
    case 'DATE':
    case 'DATETIME':
      return 'DATETIME2 NULL';
    case 'TEXT':
    default:
      return 'NVARCHAR(500) NULL';
  }
};

/**
 * Get SQL parameter type for mssql library
 */
const getSQLParameterType = (dataType) => {
  switch (dataType?.toUpperCase()) {
    case 'INTEGER':
      return sql.BigInt;
    case 'REAL':
    case 'FLOAT':
      return sql.Float;
    case 'BOOLEAN':
      return sql.Bit;
    case 'DATE':
    case 'DATETIME':
      return sql.DateTime2;
    case 'TEXT':
    default:
      return sql.NVarChar;
  }
};

/**
 * Convert value to appropriate type for SQL insertion
 */
const convertValue = (value, dataType) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  switch (dataType?.toUpperCase()) {
    case 'INTEGER':
      const intVal = parseInt(value);
      return isNaN(intVal) ? null : intVal;

    case 'REAL':
    case 'FLOAT':
      const floatVal = parseFloat(value);
      return isNaN(floatVal) ? null : floatVal;

    case 'BOOLEAN':
      return Boolean(value);

    case 'DATE':
    case 'DATETIME':
      try {
        const dateVal = new Date(value);
        if (
          isNaN(dateVal.getTime()) ||
          dateVal.getFullYear() < 1 ||
          dateVal.getFullYear() > 9999
        ) {
          return null;
        }
        return dateVal;
      } catch (e) {
        return null;
      }

    case 'TEXT':
    default:
      return String(value);
  }
};

/**
 * Get clients from CaligulaD database
 */
const getClients = async () => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query('SELECT ClientID, ClientName FROM tblClients ORDER BY ClientName');
      return result.recordset;
    },
    fnName: 'getClients',
  });
};

/**
 * Get all vendors from Vendors table in FAJITA database
 */
const getVendors = async () => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query('SELECT VendorID, VendorName FROM FAJITA.dbo.Vendors ORDER BY VendorName');
      return result.recordset;
    },
    fnName: 'getVendors',
  });
};

/**
 * Get both clients and vendors in one call
 */
const getClientsAndVendors = async () => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const [clientsResult, vendorsResult] = await Promise.all([
        pool.request().query('SELECT ClientID, ClientName FROM tblClients ORDER BY ClientName'),
        pool.request().query('SELECT VendorID, VendorName FROM FAJITA.dbo.Vendors ORDER BY VendorName'),
      ]);

      return {
        clients: clientsResult.recordset,
        vendors: vendorsResult.recordset,
      };
    },
    fnName: 'getClientsAndVendors',
  });
};

/**
 * Get top N rows from a table for preview
 */
const getTablePreview = async (tableName, limit = 10) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Fetching top ${limit} rows from ${tableName}`);

        if (!tableName || tableName.trim() === '') {
          throw new Error('Table name is required');
        }

        const dataQuery = `
          SELECT TOP ${parseInt(limit)} *
          FROM FAJITA.dbo.[${tableName}]
        `;

        console.log('Executing data query:', dataQuery);
        const dataResult = await pool.request().query(dataQuery);

        console.log(`Successfully fetched ${dataResult.recordset.length} rows from ${tableName}`);

        const columns =
          dataResult.recordset.length > 0
            ? Object.keys(dataResult.recordset[0]).map((colName) => ({
                name: colName,
                type: 'unknown',
              }))
            : [];

        return {
          success: true,
          tableName: tableName,
          columns: columns,
          data: dataResult.recordset,
          rowCount: dataResult.recordset.length,
          message: `Retrieved top ${dataResult.recordset.length} rows`,
        };
      } catch (error) {
        console.error('Error in getTablePreview:', error);
        throw new Error(`Failed to get table preview: ${error.message}`);
      }
    },
    fnName: 'getTablePreview',
  });
};

/**
 * Create a DNC-scrubbed copy of the table using stored procedure
 */
const createDNCScrubbed = async (sourceTableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Creating DNC-scrubbed table from: ${sourceTableName}`);

        const result = await pool
          .request()
          .input('SourceTableName', sql.NVarChar, sourceTableName)
          .execute('FAJITA.dbo.sp_CreateDNCScrubbed');

        const data = result.recordset[0];

        console.log(`DNC scrub complete:`, {
          rowsRemoved: data.RowsRemoved,
          landlinesCleared: data.LandlinesCleared,
          newTable: data.NewTableName,
        });

        return {
          success: true,
          sourceTableName: data.SourceTableName,
          newTableName: data.NewTableName,
          phoneColumnsChecked: ['LAND (SOURCE 1 removed, SOURCE 3 cleared)'],
          rowsOriginal: data.RowsOriginal,
          rowsClean: data.RowsClean,
          rowsRemoved: data.RowsRemoved,
          landlinesCleared: data.LandlinesCleared,
          message: `Successfully created ${data.NewTableName} with ${data.RowsClean} records`,
        };
      } catch (error) {
        console.error('Error in createDNCScrubbed:', error);
        throw new Error(`Failed to create DNC-scrubbed table: ${error.message}`);
      }
    },
    fnName: 'createDNCScrubbed',
  });
};

/**
 * Format phone numbers in a table using stored procedure
 */
const formatPhoneNumbersInTable = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Formatting phone numbers in table: ${tableName}`);

        await pool
          .request()
          .input('TableName', tableName)
          .execute('FAJITA.dbo.FormatPhoneNumbers');

        console.log(`Phone numbers formatted successfully in ${tableName}`);

        return {
          success: true,
          message: `Phone numbers formatted in ${tableName}`,
        };
      } catch (error) {
        console.error('Error formatting phone numbers:', error);
        throw new Error(`Failed to format phone numbers: ${error.message}`);
      }
    },
    fnName: 'formatPhoneNumbersInTable',
  });
};

/**
 * Update SOURCE column based on LAND and CELL values
 */
const updateSourceColumn = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Updating SOURCE column in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_UpdateSourceColumn');

        const data = result.recordset[0];
        const rowsUpdated = data.RowsUpdated;
        const landlineOnlyCount = data.LandlineOnlyCount || 0;
        const cellOnlyCount = data.CellOnlyCount || 0;
        const bothCount = data.BothCount || 0;

        console.log(`✅ SOURCE column updated for ${rowsUpdated} rows in ${tableName}`);

        return {
          success: true,
          rowsUpdated: rowsUpdated,
          landlineOnlyCount: landlineOnlyCount,
          cellOnlyCount: cellOnlyCount,
          bothCount: bothCount,
          message: `SOURCE column updated: ${landlineOnlyCount} landline only, ${cellOnlyCount} cell only, ${bothCount} both`,
        };
      } catch (error) {
        console.error('Error updating SOURCE column:', error);
        throw new Error(`Failed to update SOURCE column: ${error.message}`);
      }
    },
    fnName: 'updateSourceColumn',
  });
};

/**
 * Route Tarrance phone numbers to LAND or CELL based on WPHONE
 */
const routeTarrancePhones = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Routing Tarrance phones in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_RouteTarrancePhones');

        const stats = result.recordset[0];
        console.log(`✅ Tarrance phone routing complete:`, stats);

        return {
          success: true,
          landlineCount: stats.LandlineCount,
          cellCount: stats.CellCount,
          totalRouted: stats.TotalRouted,
          message: `Routed ${stats.TotalRouted} phones (${stats.LandlineCount} landlines, ${stats.CellCount} cells)`,
        };
      } catch (error) {
        console.error('Error routing Tarrance phones:', error);
        throw new Error(`Failed to route Tarrance phones: ${error.message}`);
      }
    },
    fnName: 'routeTarrancePhones',
  });
};

/**
 * Pad Tarrance REGN column to width 2 with leading zeros
 */
const padTarranceRegion = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Padding Tarrance REGN in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_PadTarranceRegion');

        const stats = result.recordset[0];
        console.log(`✅ Tarrance REGN padding complete:`, stats);

        return {
          success: true,
          recordsPadded: stats.RecordsPadded,
          message: `Padded ${stats.RecordsPadded} REGN values to width 2`,
        };
      } catch (error) {
        console.error('Error padding Tarrance REGN:', error);
        throw new Error(`Failed to pad Tarrance REGN: ${error.message}`);
      }
    },
    fnName: 'padTarranceRegion',
  });
};

/**
 * Populate AGERANGE column based on IAGE and AgeRange lookup table
 */
const populateAgeRange = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Populating AGERANGE in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_PopulateAgeRange');

        const stats = result.recordset[0];
        console.log(`✅ Age range population complete:`, stats);

        return {
          success: true,
          totalWithIAge: stats.TotalWithIAge,
          recordsWithAgeRange: stats.RecordsWithAgeRange,
          recordsWithoutAgeRange: stats.RecordsWithoutAgeRange,
          message: `Populated AGERANGE for ${stats.RecordsWithAgeRange} records`,
        };
      } catch (error) {
        console.error('Error populating age range:', error);
        throw new Error(`Failed to populate age range: ${error.message}`);
      }
    },
    fnName: 'populateAgeRange',
  });
};

/**
 * Create stratified batches by adding BatchNumber column
 */
const createStratifiedBatches = async (
  tableName,
  stratifyColumns = 'AGERANGE,SOURCE',
  batchCount = 20
) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Creating stratified batches for table: ${tableName}`);
        console.log(`Requested stratify columns: ${stratifyColumns}`);

        const columnCheckQuery = `
          SELECT COLUMN_NAME
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
        `;

        const columnResult = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .query(columnCheckQuery);

        const existingColumns = columnResult.recordset.map((row) =>
          row.COLUMN_NAME.toUpperCase()
        );

        const requestedColumns = stratifyColumns
          .split(',')
          .map((col) => col.trim().toUpperCase())
          .filter((col) => existingColumns.includes(col));

        if (requestedColumns.length === 0) {
          console.warn('⚠️ None of the requested stratify columns exist in the table.');
          return {
            success: false,
            batchCount: 0,
            stratifyColumns: '',
            message: 'No valid stratify columns found - skipping batch creation',
          };
        }

        const finalStratifyColumns = requestedColumns.join(',');
        console.log(`✓ Using existing columns for stratification: ${finalStratifyColumns}`);

        await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .input('StratifyColumns', sql.NVarChar, finalStratifyColumns)
          .input('BatchCount', sql.Int, batchCount)
          .execute('FAJITA.dbo.sp_StratifiedSplit');

        console.log(`✅ Stratified batches created successfully`);

        return {
          success: true,
          batchCount: batchCount,
          stratifyColumns: finalStratifyColumns,
          columnsUsed: requestedColumns,
          columnsSkipped: stratifyColumns
            .split(',')
            .map((col) => col.trim().toUpperCase())
            .filter((col) => !existingColumns.includes(col)),
          message: `Created ${batchCount} stratified batches using ${finalStratifyColumns}`,
        };
      } catch (error) {
        console.error('Error creating stratified batches:', error);
        throw new Error(`Failed to create stratified batches: ${error.message}`);
      }
    },
    fnName: 'createStratifiedBatches',
  });
};

/**
 * Split table into landline and cell tables based on age threshold
 */
const splitIntoLandlineAndCell = async (tableName, ageThreshold) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Splitting table ${tableName} with age threshold ${ageThreshold}`);

        const result = await pool
          .request()
          .input('SourceTableName', sql.NVarChar, tableName)
          .input('AgeThreshold', sql.Int, ageThreshold)
          .execute('FAJITA.dbo.sp_SplitIntoLandlineAndCell');

        const data = result.recordset[0];

        if (data.Status === 'SUCCESS') {
          console.log(`✅ Table split complete:`, {
            landlineTable: data.LandlineTableName,
            cellTable: data.CellTableName,
            landlineRecords: data.LandlineRecords,
            cellRecords: data.CellRecords,
          });

          return {
            success: true,
            status: data.Status,
            sourceTableName: data.SourceTableName,
            landlineTableName: data.LandlineTableName,
            cellTableName: data.CellTableName,
            totalRecords: data.TotalRecords,
            landlineRecords: data.LandlineRecords,
            cellRecords: data.CellRecords,
            ageThreshold: data.AgeThreshold,
            message: data.Message,
          };
        } else {
          throw new Error(data.Message);
        }
      } catch (error) {
        console.error('Error splitting table:', error);
        throw new Error(`Failed to split table into landline and cell: ${error.message}`);
      }
    },
    fnName: 'splitIntoLandlineAndCell',
  });
};

/**
 * Get distinct age ranges from a table
 */
const getDistinctAgeRanges = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Fetching distinct age ranges from table: ${tableName}`);

        const columnCheckQuery = `
          SELECT COUNT(*) as ColumnExists
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME = 'AGERANGE'
        `;

        const columnCheck = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .query(columnCheckQuery);

        if (columnCheck.recordset[0].ColumnExists === 0) {
          console.log(`AGERANGE column not found in table ${tableName}`);
          return {
            ageRanges: [],
            count: 0,
          };
        }

        const query = `
          SELECT DISTINCT AGERANGE
          FROM FAJITA.dbo.[${tableName}]
          WHERE AGERANGE IS NOT NULL
          AND AGERANGE != ''
          ORDER BY AGERANGE ASC
        `;

        const result = await pool.request().query(query);
        const ageRanges = result.recordset.map((row) => row.AGERANGE);

        console.log(`Found ${ageRanges.length} distinct age ranges:`, ageRanges);

        return {
          ageRanges,
          count: ageRanges.length,
        };
      } catch (error) {
        console.error('Error fetching distinct age ranges:', error);
        throw new Error(`Failed to fetch distinct age ranges: ${error.message}`);
      }
    },
    fnName: 'getDistinctAgeRanges',
  });
};

/**
 * Convert database results to CSV format
 */
const convertToCSV = (records, headers) => {
  const CRLF = '\r\n';

  if (!records || records.length === 0) {
    return headers.join(',') + CRLF;
  }

  const headerRow = headers.join(',');

  const dataRows = records.map((record) => {
    return headers
      .map((header) => {
        const value = record[header];
        if (value === null || value === undefined) {
          return '';
        }

        const stringValue = String(value);
        if (
          stringValue.includes(',') ||
          stringValue.includes('\r') ||
          stringValue.includes('\n') ||
          stringValue.includes('"')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      })
      .join(',');
  });

  return headerRow + CRLF + dataRows.join(CRLF);
};

// Include remaining functions - this file is very large
// Continuing with additional service functions...

/**
 * Calculate age from birth year
 */
const calculateAgeFromBirthYear = async (tableName, useJanuaryFirst = true) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Calculating age from birth year in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .input('UseJanuaryFirst', sql.Bit, useJanuaryFirst)
          .execute('FAJITA.dbo.sp_CalculateAgeFromBirthYear');

        const data = result.recordset[0];

        if (data.Status === 'SUCCESS') {
          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            recordsProcessed: data.RecordsProcessed,
            recordsWithNullBirthYear: data.RecordsWithNullBirthYear,
            recordsWithInvalidBirthYear: data.RecordsWithInvalidBirthYear,
            recordsWithValidAge:
              data.RecordsProcessed -
              data.RecordsWithNullBirthYear -
              data.RecordsWithInvalidBirthYear,
            birthYearColumnUsed: data.BirthYearColumnUsed,
            calculationBase: data.CalculationBase,
            calculationBaseDate: data.CalculationBaseDate,
            message: data.Message,
          };
        } else if (data.Status === 'SKIPPED') {
          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            recordsProcessed: 0,
            message: data.Message,
            skipped: true,
          };
        } else {
          return {
            success: false,
            status: data.Status,
            tableName: data.TableName,
            message: data.Message,
            error: true,
          };
        }
      } catch (error) {
        console.error('Error calculating age from birth year:', error);
        throw new Error(`Failed to calculate age from birth year: ${error.message}`);
      }
    },
    fnName: 'calculateAgeFromBirthYear',
  });
};

/**
 * Convert AGE column to IAGE format
 */
const convertAgeToIAge = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Converting AGE to IAGE in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_ConvertAgeToIAge');

        const data = result.recordset[0];

        if (data.Status === 'SUCCESS') {
          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            rowsUpdated: data.RowsUpdated,
            totalRows: data.TotalRows,
            message: data.Message,
          };
        } else if (data.Status === 'SKIPPED') {
          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            rowsUpdated: 0,
            totalRows: 0,
            message: data.Message,
          };
        } else {
          throw new Error(data.Message);
        }
      } catch (error) {
        console.error('Error converting AGE to IAGE:', error);
        throw new Error(`Failed to convert AGE to IAGE: ${error.message}`);
      }
    },
    fnName: 'convertAgeToIAge',
  });
};

/**
 * Pad columns using stored procedure
 */
const padColumns = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Padding columns in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_PadColumns');

        const stats = result.recordset[0];
        console.log(`✅ Column padding complete:`, stats);

        return {
          success: true,
          recordsProcessed: stats.RecordsProcessed,
          message: `Column padding completed: ${stats.RecordsProcessed} records processed`,
        };
      } catch (error) {
        console.error('Error padding columns:', error);
        throw new Error(`Failed to pad columns: ${error.message}`);
      }
    },
    fnName: 'padColumns',
  });
};

/**
 * Pad IZIP column to 5 characters with leading zeros
 * Some zip codes start with 0 (e.g., 01234) and may have been stored as numbers
 */
const padIZIP = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Padding IZIP to 5 characters in table: ${tableName}`);

        // First check if IZIP column exists
        const columnCheck = await pool.request().query(`
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = '${tableName}'
          AND COLUMN_NAME = 'IZIP'
        `);

        if (columnCheck.recordset.length === 0) {
          console.log(`⚠️ IZIP column does not exist in table ${tableName}`);
          return {
            success: true,
            recordsUpdated: 0,
            message: 'IZIP column does not exist in table',
          };
        }

        // Pad IZIP to 5 characters with leading zeros
        // Handle both numeric values and strings that are too short
        const result = await pool.request().query(`
          UPDATE FAJITA.dbo.[${tableName}]
          SET IZIP = RIGHT('00000' + LTRIM(RTRIM(CAST(IZIP AS VARCHAR(10)))), 5)
          WHERE IZIP IS NOT NULL
            AND IZIP <> ''
            AND LEN(LTRIM(RTRIM(CAST(IZIP AS VARCHAR(10))))) < 5
        `);

        const recordsUpdated = result.rowsAffected[0];
        console.log(`✅ IZIP padding complete: ${recordsUpdated} records updated`);

        return {
          success: true,
          recordsUpdated,
          message: `IZIP padding completed: ${recordsUpdated} records updated`,
        };
      } catch (error) {
        console.error('Error padding IZIP:', error);
        throw new Error(`Failed to pad IZIP: ${error.message}`);
      }
    },
    fnName: 'padIZIP',
  });
};

/**
 * Update VTYPE column based on extraction split logic
 */
const updateVTYPEBySplit = async (tableName, ageThreshold, clientId = null) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        // Special handling for Tarrance client (clientId === 102)
        if (clientId === 102) {
          console.log(`Updating VTYPE for Tarrance client using WPHONE column`);

          const checkWPhoneSQL = `
            SELECT COUNT(*) as ColumnExists
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @tableName
            AND COLUMN_NAME = 'WPHONE'
          `;

          const wphoneCheck = await pool
            .request()
            .input('tableName', sql.NVarChar, tableName)
            .query(checkWPhoneSQL);

          if (wphoneCheck.recordset[0].ColumnExists === 0) {
            throw new Error('WPHONE column not found in table for Tarrance client split');
          }

          const checkVTypeSQL = `
            SELECT COUNT(*) as ColumnExists
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @tableName
            AND COLUMN_NAME = 'VTYPE'
          `;

          const vtypeCheck = await pool
            .request()
            .input('tableName', sql.NVarChar, tableName)
            .query(checkVTypeSQL);

          if (vtypeCheck.recordset[0].ColumnExists === 0) {
            const createVTypeSQL = `
              ALTER TABLE FAJITA.dbo.[${tableName}]
              ADD VTYPE INT NULL
            `;
            await pool.request().query(createVTypeSQL);
          }

          const updateSQL = `
            UPDATE FAJITA.dbo.[${tableName}]
            SET VTYPE = CASE
              WHEN WPHONE = 'Y' THEN 2
              WHEN WPHONE = 'N' THEN 1
              ELSE 1
            END
          `;

          await pool.request().query(updateSQL);

          const countSQL = `
            SELECT
              SUM(CASE WHEN VTYPE = 1 THEN 1 ELSE 0 END) as LandlineCount,
              SUM(CASE WHEN VTYPE = 2 THEN 1 ELSE 0 END) as CellCount,
              COUNT(*) as TotalUpdated
            FROM FAJITA.dbo.[${tableName}]
          `;

          const countResult = await pool.request().query(countSQL);
          const counts = countResult.recordset[0];

          return {
            success: true,
            tableName: tableName,
            method: 'WPHONE',
            ageThreshold: null,
            landlineCount: counts.LandlineCount,
            cellCount: counts.CellCount,
            totalUpdated: counts.TotalUpdated,
            message: `VTYPE updated using WPHONE`,
          };
        }

        // Standard age-based split logic
        console.log(`Updating VTYPE in table: ${tableName} with age threshold: ${ageThreshold}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .input('AgeThreshold', sql.Int, ageThreshold)
          .execute('FAJITA.dbo.sp_UpdateVTYPEBySplit');

        const data = result.recordset[0];

        return {
          success: true,
          tableName: data.TableName,
          ageThreshold: data.AgeThreshold,
          landlineCount: data.LandlineCount,
          cellCount: data.CellCount,
          totalUpdated: data.TotalUpdated,
          message: `VTYPE updated: ${data.LandlineCount} landline, ${data.CellCount} cell records`,
        };
      } catch (error) {
        console.error('Error updating VTYPE by split logic:', error);
        throw new Error(`Failed to update VTYPE by split: ${error.message}`);
      }
    },
    fnName: 'updateVTYPEBySplit',
  });
};

/**
 * Update VTYPE column for all records with a single value (for "All Records" mode)
 * @param {string} tableName - The table to update
 * @param {number} vtypeValue - The VTYPE value (1=landline, 2=cell)
 */
const updateVTYPEForAllRecords = async (tableName, vtypeValue) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Updating VTYPE to ${vtypeValue} for all records in table: ${tableName}`);

        // Check if VTYPE column exists
        const checkVTypeSQL = `
          SELECT COUNT(*) as ColumnExists
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME = 'VTYPE'
        `;

        const vtypeCheck = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .query(checkVTypeSQL);

        // Create VTYPE column if it doesn't exist
        if (vtypeCheck.recordset[0].ColumnExists === 0) {
          console.log(`Creating VTYPE column in table: ${tableName}`);
          const addColumnSQL = `ALTER TABLE FAJITA.dbo.[${tableName}] ADD VTYPE INT`;
          await pool.request().query(addColumnSQL);
        }

        // Update all records to the specified VTYPE value
        const updateSQL = `UPDATE FAJITA.dbo.[${tableName}] SET VTYPE = @vtypeValue`;
        const result = await pool
          .request()
          .input('vtypeValue', sql.Int, vtypeValue)
          .query(updateSQL);

        console.log(`VTYPE updated to ${vtypeValue} for ${result.rowsAffected[0]} records`);

        return {
          success: true,
          vtypeValue,
          recordsUpdated: result.rowsAffected[0],
          message: `VTYPE set to ${vtypeValue} for all records`,
        };
      } catch (error) {
        console.error(`Error updating VTYPE for all records:`, error);
        throw new Error(`Failed to update VTYPE for all records: ${error.message}`);
      }
    },
    fnName: 'updateVTYPEForAllRecords',
  });
};

/**
 * Apply WDNC scrubbing to table
 */
const applyWDNCScrubbing = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Applying WDNC scrubbing to table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_ApplyWDNCScrubbing');

        const data = result.recordset[0];

        return {
          success: true,
          tableName: data.TableName,
          rowsOriginal: data.RowsOriginal,
          rowsAfter: data.RowsAfter,
          rowsRemoved: data.RowsRemoved,
          landlinesCleared: data.LandlinesCleared,
          sourceUpdatedToCell: data.SourceUpdatedToCell || 0,
          message: `WDNC scrubbing complete`,
        };
      } catch (error) {
        console.error('Error applying WDNC scrubbing:', error);
        throw new Error(`Failed to apply WDNC scrubbing: ${error.message}`);
      }
    },
    fnName: 'applyWDNCScrubbing',
  });
};

/**
 * Create and populate $N column
 */
const createDollarNColumn = async (tableName, fileType = null, clientId = null) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Creating $N column in table: ${tableName}`);

        // Special handling for Tarrance client (clientId === 102)
        if (clientId === 102) {
          const checkDollarNSQL = `
            SELECT COUNT(*) as ColumnExists
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @tableName
            AND COLUMN_NAME = '$N'
          `;

          const dollarNCheck = await pool
            .request()
            .input('tableName', sql.NVarChar, tableName)
            .query(checkDollarNSQL);

          if (dollarNCheck.recordset[0].ColumnExists === 0) {
            const createDollarNSQL = `ALTER TABLE FAJITA.dbo.[${tableName}] ADD [$N] VARCHAR(20) NULL`;
            await pool.request().query(createDollarNSQL);
          }

          const checkColumnsSQL = `
            SELECT
              SUM(CASE WHEN COLUMN_NAME = 'CELL' THEN 1 ELSE 0 END) as HasCell,
              SUM(CASE WHEN COLUMN_NAME = 'LAND' THEN 1 ELSE 0 END) as HasLand,
              SUM(CASE WHEN COLUMN_NAME = 'WPHONE' THEN 1 ELSE 0 END) as HasWPhone
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @tableName
          `;

          const columnsCheck = await pool
            .request()
            .input('tableName', sql.NVarChar, tableName)
            .query(checkColumnsSQL);

          const { HasCell, HasLand, HasWPhone } = columnsCheck.recordset[0];

          if (HasWPhone === 0) {
            throw new Error(`WPHONE column not found in ${tableName} for Tarrance client`);
          }

          const updateDollarNSQL = `
            UPDATE FAJITA.dbo.[${tableName}]
            SET [$N] = CASE
              WHEN WPHONE = 'Y' AND '${HasCell}' = '1' THEN CELL
              WHEN WPHONE = 'N' AND '${HasLand}' = '1' THEN LAND
              ELSE NULL
            END
          `;

          await pool.request().query(updateDollarNSQL);

          const countSQL = `
            SELECT
              COUNT(*) as Total,
              SUM(CASE WHEN WPHONE = 'Y' THEN 1 ELSE 0 END) as CellCount,
              SUM(CASE WHEN WPHONE = 'N' THEN 1 ELSE 0 END) as LandCount
            FROM FAJITA.dbo.[${tableName}]
            WHERE [$N] IS NOT NULL
          `;

          const counts = await pool.request().query(countSQL);
          const { Total, CellCount, LandCount } = counts.recordset[0];

          return {
            success: true,
            rowsUpdated: Total,
            cellCount: CellCount,
            landCount: LandCount,
            message: `$N column created and populated for Tarrance client`,
          };
        }

        // Standard logic
        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .input('FileType', sql.NVarChar, fileType)
          .execute('FAJITA.dbo.sp_CreateDollarNColumn');

        const rowsUpdated = result.recordset[0].RowsUpdated;
        console.log(`✅ $N column created for ${rowsUpdated} rows in ${tableName}`);

        return {
          success: true,
          rowsUpdated: rowsUpdated,
          message: `$N column created and populated in ${tableName}`,
        };
      } catch (error) {
        console.error('Error creating $N column:', error);
        throw new Error(`Failed to create $N column: ${error.message}`);
      }
    },
    fnName: 'createDollarNColumn',
  });
};

/**
 * Create VFREQGEN and VFREQPR columns
 */
const createVFREQColumns = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Creating VFREQGEN and VFREQPR columns in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_CreateVFREQColumns');

        const data = result.recordset[0];

        if (data.ColumnsUsed === 'No VH columns found') {
          return {
            success: true,
            skipped: true,
            rowsUpdated: 0,
            message: data.Message,
          };
        }

        return {
          success: true,
          skipped: false,
          rowsUpdated: data.RowsUpdated,
          yearsUsed: {
            oldest: data.OldestYear,
            year3: data.Year3,
            year2: data.Year2,
            newest: data.NewestYear,
          },
          columnsUsed: data.ColumnsUsed,
          message: `VFREQGEN and VFREQPR columns created`,
        };
      } catch (error) {
        console.error('Error creating VFREQ columns:', error);
        throw new Error(`Failed to create VFREQ columns: ${error.message}`);
      }
    },
    fnName: 'createVFREQColumns',
  });
};

/**
 * Fix IAGE values
 */
const fixIAGEValues = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Fixing IAGE values in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_FixIAGEValues');

        const data = result.recordset[0];

        return {
          success: true,
          rowsUpdated: data.RowsUpdated,
          totalIAGERows: data.TotalIAGERows,
          message: data.RowsUpdated > 0
            ? `Fixed ${data.RowsUpdated} IAGE values from -1 to 00`
            : 'No IAGE values of -1 found',
        };
      } catch (error) {
        console.error('Error fixing IAGE values:', error);
        throw new Error(`Failed to fix IAGE values: ${error.message}`);
      }
    },
    fnName: 'fixIAGEValues',
  });
};

/**
 * Format RDATE column
 */
const formatRDateColumn = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Formatting RDATE column in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_FormatRDateColumn');

        const data = result.recordset[0];

        if (data.Status === 'SKIPPED') {
          return {
            success: true,
            skipped: true,
            rowsUpdated: 0,
            message: data.Message,
          };
        }

        return {
          success: true,
          skipped: false,
          rowsUpdated: data.RowsUpdated,
          message: data.Message,
        };
      } catch (error) {
        console.error('Error formatting RDATE column:', error);
        throw new Error(`Failed to format RDATE column: ${error.message}`);
      }
    },
    fnName: 'formatRDateColumn',
  });
};

/**
 * Process householding for landline records
 */
const processHouseholding = async (tableName, selectedAgeRange) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Starting householding process for table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .input('SelectedAgeRange', sql.Int, selectedAgeRange)
          .execute('FAJITA.dbo.sp_ProcessHouseholding');

        const data = result.recordset[0];

        if (!data.Success) {
          throw new Error(data.Message);
        }

        return {
          success: true,
          totalProcessed: data.TotalProcessed,
          mainTableFinalCount: data.MainTableFinalCount,
          duplicateCounts: {
            duplicate2: data.Duplicate2Count,
            duplicate3: data.Duplicate3Count,
            duplicate4: data.Duplicate4Count,
          },
          tablesCreated: {
            backup: data.BackupTableName,
            duplicate2: data.Duplicate2Table,
            duplicate3: data.Duplicate3Table,
            duplicate4: data.Duplicate4Table,
          },
          message: `Householding completed`,
        };
      } catch (error) {
        console.error('Error processing householding:', error);
        throw new Error(`Failed to process householding: ${error.message}`);
      }
    },
    fnName: 'processHouseholding',
  });
};

/**
 * Extract CSV files from householding duplicate tables
 */
const extractHouseholdingDuplicateFiles = async (tableName, selectedHeaders, userId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Extracting householding duplicate files for table: ${tableName}`);

        const finalHeaders = [...selectedHeaders];

        const potentialSystemColumns = [
          'SOURCE', 'VTYPE',
          'FNAME2', 'LNAME2', 'FNAME3', 'LNAME3', 'FNAME4', 'LNAME4',
          'IAGE2', 'IAGE3', 'IAGE4',
          'GEND2', 'GEND3', 'GEND4',
          'PARTY2', 'PARTY3', 'PARTY4',
          'VFREQGEN2', 'VFREQGEN3', 'VFREQGEN4',
          'VFREQPR2', 'VFREQPR3', 'VFREQPR4'
        ];

        const checkSystemColumnsSQL = `
          SELECT COLUMN_NAME
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME IN (${potentialSystemColumns.map((_, i) => `@col${i}`).join(', ')})
        `;

        const systemColsRequest = pool.request().input('tableName', sql.NVarChar, tableName);
        potentialSystemColumns.forEach((col, i) => {
          systemColsRequest.input(`col${i}`, sql.NVarChar, col);
        });

        const existingSystemCols = await systemColsRequest.query(checkSystemColumnsSQL);
        const systemColumns = existingSystemCols.recordset.map(row => row.COLUMN_NAME);

        systemColumns.forEach(col => {
          if (!finalHeaders.includes(col)) {
            finalHeaders.push(col);
          }
        });

        const additionalColumnsQuery = `
          SELECT COLUMN_NAME
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME IN ('VFREQGEN', 'VFREQPR', '$N')
        `;

        const additionalResult = await pool.request()
          .input('tableName', sql.NVarChar, tableName)
          .query(additionalColumnsQuery);

        additionalResult.recordset.forEach(row => {
          if (!finalHeaders.includes(row.COLUMN_NAME)) {
            finalHeaders.push(row.COLUMN_NAME);
          }
        });

        const selectClause = finalHeaders.map(header => `[${header}]`).join(', ');

        const duplicateTables = [
          { suffix: 'duplicate2', rank: 2 },
          { suffix: 'duplicate3', rank: 3 },
          { suffix: 'duplicate4', rank: 4 }
        ];

        const files = {};
        const tempDir = userId ? getUserTempDir(userId) : path.join(__dirname, '../temp');
        await fs.mkdir(tempDir, { recursive: true });

        for (const dupTable of duplicateTables) {
          const fullTableName = `${tableName}${dupTable.suffix}`;

          const tableExistsQuery = `
            SELECT COUNT(*) as TableExists
            FROM FAJITA.INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @tableName
          `;

          const tableCheck = await pool.request()
            .input('tableName', sql.NVarChar, fullTableName)
            .query(tableExistsQuery);

          if (tableCheck.recordset[0].TableExists === 0) {
            continue;
          }

          const countQuery = `SELECT COUNT(*) as RecordCount FROM FAJITA.dbo.[${fullTableName}]`;
          const countResult = await pool.request().query(countQuery);
          const recordCount = countResult.recordset[0].RecordCount;

          if (recordCount === 0) {
            continue;
          }

          const extractQuery = `
            SELECT ${selectClause}
            FROM FAJITA.dbo.[${fullTableName}]
          `;

          const result = await pool.request().query(extractQuery);
          const csv = convertToCSV(result.recordset, finalHeaders);

          const BOM = '\uFEFF';
          const filename = `${tableName}_${dupTable.suffix}.csv`;
          const filePath = path.join(tempDir, filename);

          await fs.writeFile(filePath, BOM + csv, 'utf8');

          files[dupTable.suffix] = {
            filename: filename,
            path: filePath,
            url: getTempFileUrl(filename, userId),
            records: result.recordset.length,
            headers: finalHeaders,
            rank: dupTable.rank,
            description: `Rank ${dupTable.rank} household members`
          };
        }

        const totalFiles = Object.keys(files).length;
        const totalRecords = Object.values(files).reduce((sum, file) => sum + file.records, 0);

        return {
          success: true,
          filesGenerated: totalFiles,
          totalRecords: totalRecords,
          files: files,
          message: `Successfully extracted ${totalFiles} householding duplicate files`
        };
      } catch (error) {
        console.error('Error extracting householding duplicate files:', error);
        throw new Error(`Failed to extract householding duplicate files: ${error.message}`);
      }
    },
    fnName: 'extractHouseholdingDuplicateFiles',
  });
};

/**
 * Calculate PARTY from RPARTYROLLUP for RNC vendor data
 */
const calculatePartyFromRPartyRollup = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Calculating PARTY from RPARTYROLLUP in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_CalculatePartyFromRPartyRollup');

        const data = result.recordset[0];

        if (data.Status === 'SUCCESS') {
          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            rowsUpdated: data.RowsUpdated,
            totalRows: data.TotalRows,
            message: data.Message,
          };
        } else if (data.Status === 'SKIPPED') {
          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            rowsUpdated: 0,
            totalRows: 0,
            message: data.Message,
            skipped: true
          };
        } else {
          return {
            success: false,
            status: data.Status,
            tableName: data.TableName,
            message: data.Message,
            error: true
          };
        }
      } catch (error) {
        console.error('Error calculating PARTY from RPARTYROLLUP:', error);
        throw new Error(`Failed to calculate PARTY from RPARTYROLLUP: ${error.message}`);
      }
    },
    fnName: 'calculatePartyFromRPartyRollup',
  });
};

/**
 * Get next FileID for a project
 */
const getNextFileID = async (projectId, requestedFileId = null) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('ProjectID', sql.Int, parseInt(projectId))
        .input('RequestedFileID', sql.Int, requestedFileId)
        .execute('FAJITA.dbo.sp_GetNextFileID');

      return {
        nextFileID: result.recordset[0].NextFileID,
      };
    },
    fnName: 'getNextFileID',
  });
};

/**
 * Register a project file
 */
const registerProjectFile = async (
  projectId,
  fileId,
  originalFileName,
  uploadedTableName,
  createdBy
) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('ProjectID', sql.Int, parseInt(projectId))
        .input('FileID', sql.Int, fileId)
        .input('OriginalFileName', sql.NVarChar, originalFileName)
        .input('UploadedTableName', sql.NVarChar, uploadedTableName)
        .input('CreatedBy', sql.NVarChar, createdBy)
        .execute('FAJITA.dbo.sp_RegisterProjectFile');

      return result.recordset[0];
    },
    fnName: 'registerProjectFile',
  });
};

/**
 * Update project file table name
 */
const updateProjectFileTableName = async (projectId, fileId, tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('ProjectID', sql.Int, parseInt(projectId))
        .input('FileID', sql.Int, fileId)
        .input('UploadedTableName', sql.NVarChar, tableName)
        .execute('FAJITA.dbo.sp_UpdateProjectFileTableName');

      return {
        success: true,
        fileInfo: result.recordset[0]
      };
    },
    fnName: 'updateProjectFileTableName',
  });
};

/**
 * Delete a project file (mark as deleted)
 */
const deleteProjectFile = async (projectId, fileId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('ProjectID', sql.Int, parseInt(projectId))
        .input('FileID', sql.Int, fileId)
        .execute('FAJITA.dbo.sp_DeleteProjectFile');

      return { rowsDeleted: result.recordset[0].RowsDeleted };
    },
    fnName: 'deleteProjectFile',
  });
};

/**
 * Get current headers from a table
 */
const getTableHeaders = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const result = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .query(`
            SELECT COLUMN_NAME
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);

        return result.recordset.map(row => row.COLUMN_NAME);
      } catch (error) {
        console.error('Error getting table headers:', error);
        throw new Error(`Failed to get table headers: ${error.message}`);
      }
    },
    fnName: 'getTableHeaders',
  });
};

/**
 * Check if a specific column exists in a table
 */
const checkColumnExists = async (tableName, columnName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const result = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .input('columnName', sql.NVarChar, columnName)
          .query(`
            SELECT COUNT(*) as ColumnExists
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @tableName
            AND COLUMN_NAME = @columnName
          `);

        return result.recordset[0].ColumnExists > 0;
      } catch (error) {
        console.error('Error checking column existence:', error);
        throw new Error(`Failed to check column existence: ${error.message}`);
      }
    },
    fnName: 'checkColumnExists',
  });
};

// Computed Variables helpers
const escapeSQL = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "''");
};

const buildConditionSQL = (condition) => {
  const column = `[${sanitizeColumnName(condition.variable)}]`;
  const isStringValue = typeof condition.value === 'string';
  const value = isStringValue
    ? `'${escapeSQL(condition.value)}'`
    : condition.value;

  switch (condition.operator) {
    case 'equals':
      return `${column} = ${value}`;
    case 'not_equals':
      return `${column} <> ${value}`;
    case 'contains':
      return `${column} LIKE '%' + ${value} + '%'`;
    case 'starts_with':
      return `${column} LIKE ${value} + '%'`;
    case 'ends_with':
      return `${column} LIKE '%' + ${value}`;
    case 'greater_than':
      return `${column} > ${value}`;
    case 'less_than':
      return `${column} < ${value}`;
    case 'greater_equal':
      return `${column} >= ${value}`;
    case 'less_equal':
      return `${column} <= ${value}`;
    case 'is_empty':
      return `(${column} IS NULL OR ${column} = '')`;
    case 'is_not_empty':
      return `(${column} IS NOT NULL AND ${column} <> '')`;
    default:
      throw new Error(`Unknown operator: ${condition.operator}`);
  }
};

const buildCaseExpression = (definition) => {
  if (definition.inputMode === 'formula' && definition.formula) {
    const trimmedFormula = definition.formula.trim().toUpperCase();
    if (!trimmedFormula.startsWith('CASE') &&
        !trimmedFormula.includes('CONCAT') &&
        !trimmedFormula.match(/^\[?[A-Z0-9_]+\]?\s*[\+\-\*\/]/)) {
      throw new Error('Formula must be a valid SQL CASE expression or arithmetic operation');
    }
    return definition.formula;
  }

  if (!definition.rules || definition.rules.length === 0) {
    const defaultValue = typeof definition.defaultValue === 'string'
      ? `'${escapeSQL(definition.defaultValue)}'`
      : definition.defaultValue;
    return defaultValue;
  }

  let caseExpr = 'CASE\n';

  for (const rule of definition.rules) {
    if (!rule.conditions || rule.conditions.length === 0) {
      continue;
    }

    const conditions = rule.conditions
      .map((cond) => buildConditionSQL(cond))
      .join(` ${rule.conditionLogic || 'AND'} `);

    const outputValue =
      typeof rule.outputValue === 'string'
        ? `'${escapeSQL(rule.outputValue)}'`
        : rule.outputValue;

    caseExpr += `  WHEN ${conditions} THEN ${outputValue}\n`;
  }

  const defaultValue =
    typeof definition.defaultValue === 'string'
      ? `'${escapeSQL(definition.defaultValue)}'`
      : definition.defaultValue ?? 'NULL';

  caseExpr += `  ELSE ${defaultValue}\n`;
  caseExpr += 'END';

  return caseExpr;
};

const buildSQLType = (definition) => {
  switch (definition.outputType) {
    case 'INT':
      return 'INT NULL';
    case 'TEXT':
      const textLength = definition.outputLength || 255;
      return `NVARCHAR(${Math.min(textLength, 4000)}) NULL`;
    case 'CHAR':
      return `CHAR(${definition.outputLength || 10}) NULL`;
    case 'VARCHAR':
      return `VARCHAR(${definition.outputLength || 50}) NULL`;
    default:
      return 'NVARCHAR(255) NULL';
  }
};

/**
 * Preview a computed variable without applying it
 */
const previewComputedVariable = async (tableName, variableDefinition) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const caseExpression = buildCaseExpression(variableDefinition);
        const columnName = sanitizeColumnName(variableDefinition.name);

        const usedColumns = new Set();
        if (variableDefinition.rules) {
          for (const rule of variableDefinition.rules) {
            for (const cond of rule.conditions || []) {
              usedColumns.add(sanitizeColumnName(cond.variable));
            }
          }
        }

        const selectColumns = usedColumns.size > 0
          ? [...usedColumns].map(col => `[${col}]`).join(', ') + ', '
          : '';

        const query = `
          SELECT TOP 10
            ${selectColumns}
            ${caseExpression} AS [${columnName}]
          FROM FAJITA.dbo.[${tableName}]
        `;

        const result = await pool.request().query(query);

        let estimatedLength = 0;
        result.recordset.forEach((row) => {
          const value = row[columnName];
          if (value && String(value).length > estimatedLength) {
            estimatedLength = String(value).length;
          }
        });
        estimatedLength = Math.max(10, Math.ceil(estimatedLength * 1.2));

        return {
          success: true,
          sampleData: result.recordset,
          estimatedLength,
          columnName,
          errors: [],
        };
      } catch (error) {
        console.error('Error previewing computed variable:', error);
        return {
          success: false,
          sampleData: [],
          estimatedLength: 0,
          errors: [error.message],
        };
      }
    },
    fnName: 'previewComputedVariable',
  });
};

/**
 * Add a computed variable to the table
 */
const addComputedVariable = async (tableName, variableDefinition) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const startTime = Date.now();
        const columnName = sanitizeColumnName(variableDefinition.name);

        const checkQuery = `
          SELECT COUNT(*) as ColumnExists
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME = @columnName
        `;

        const checkResult = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .input('columnName', sql.NVarChar, columnName)
          .query(checkQuery);

        if (checkResult.recordset[0].ColumnExists > 0) {
          throw new Error(`Variable '${columnName}' already exists in the table`);
        }

        const sqlType = buildSQLType(variableDefinition);
        const alterQuery = `
          ALTER TABLE FAJITA.dbo.[${tableName}]
          ADD [${columnName}] ${sqlType}
        `;

        await pool.request().query(alterQuery);

        const caseExpression = buildCaseExpression(variableDefinition);
        const updateQuery = `
          UPDATE FAJITA.dbo.[${tableName}]
          SET [${columnName}] = ${caseExpression}
        `;

        const updateResult = await pool.request().query(updateQuery);
        const rowsUpdated = updateResult.rowsAffected[0];

        const executionTimeMs = Date.now() - startTime;

        return {
          success: true,
          message: `Variable '${columnName}' created successfully`,
          newColumnName: columnName,
          rowsUpdated,
          executionTimeMs,
        };
      } catch (error) {
        console.error('Error adding computed variable:', error);
        throw new Error(`Failed to add computed variable: ${error.message}`);
      }
    },
    fnName: 'addComputedVariable',
  });
};

/**
 * Remove a computed variable from the table
 */
const removeComputedVariable = async (tableName, columnName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const sanitizedColumnName = sanitizeColumnName(columnName);

        const checkQuery = `
          SELECT COUNT(*) as ColumnExists
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME = @columnName
        `;

        const checkResult = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .input('columnName', sql.NVarChar, sanitizedColumnName)
          .query(checkQuery);

        if (checkResult.recordset[0].ColumnExists === 0) {
          return {
            success: true,
            message: `Column '${sanitizedColumnName}' does not exist (already removed)`,
            columnName: sanitizedColumnName,
          };
        }

        const dropQuery = `
          ALTER TABLE FAJITA.dbo.[${tableName}]
          DROP COLUMN [${sanitizedColumnName}]
        `;

        await pool.request().query(dropQuery);

        return {
          success: true,
          message: `Variable '${sanitizedColumnName}' removed successfully`,
          columnName: sanitizedColumnName,
        };
      } catch (error) {
        console.error('Error removing computed variable:', error);
        throw new Error(`Failed to remove computed variable: ${error.message}`);
      }
    },
    fnName: 'removeComputedVariable',
  });
};

/**
 * Extract files from table with optional split configuration
 */
const extractFilesFromTable = async (config) => {
  const { tableName, selectedHeaders, splitMode, selectedAgeRange, fileNames, clientId, userId } =
    config;

  // Clean up existing user temp directory before starting
  if (userId) {
    await cleanupUserTempDir(userId);
  }

  const result = await withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        console.log(`Starting file extraction from table: ${tableName}`);
        console.log(`[Extract Debug] splitMode: "${splitMode}", selectedAgeRange: "${selectedAgeRange}", clientId: ${clientId}`);

        const finalHeaders = [...selectedHeaders];

        if (!finalHeaders.includes('SOURCE')) {
          finalHeaders.push('SOURCE');
        }

        if (!finalHeaders.includes('BATCH')) {
          finalHeaders.push('BATCH');
        }

        // Always include VTYPE - it indicates file type (1=landline, 2=cell)
        if (!finalHeaders.includes('VTYPE')) {
          finalHeaders.push('VTYPE');
        }

        if (!finalHeaders.includes('$N')) {
          finalHeaders.push('$N');
        }

        const additionalColumnsQuery = `
          SELECT COLUMN_NAME
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME IN ('VFREQGEN', 'VFREQPR')
        `;

        const additionalResult = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .query(additionalColumnsQuery);

        additionalResult.recordset.forEach((row) => {
          if (!finalHeaders.includes(row.COLUMN_NAME)) {
            finalHeaders.push(row.COLUMN_NAME);
          }
        });

        // Update VTYPE based on mode
        let vtypeUpdate = null;
        if (splitMode === 'split') {
          // Split mode: VTYPE based on age threshold or WPHONE (for Tarrance)
          console.log(`[Extract Debug] Calling updateVTYPEBySplit with tableName: ${tableName}, ageRange: ${selectedAgeRange}, clientId: ${clientId}`);
          vtypeUpdate = await updateVTYPEBySplit(tableName, selectedAgeRange, clientId);
          console.log(`[Extract Debug] VTYPE update result:`, vtypeUpdate);
        } else {
          // All Records mode: VTYPE based on fileType (landline=1, cell=2)
          const vtypeValue = config.fileType === 'cell' ? 2 : 1;
          console.log(`[Extract Debug] Setting VTYPE to ${vtypeValue} for all records (fileType: ${config.fileType})`);
          vtypeUpdate = await updateVTYPEForAllRecords(tableName, vtypeValue);
          console.log(`[Extract Debug] VTYPE update result:`, vtypeUpdate);
        }

        // Create $N column
        const fileTypeForDollarN = splitMode === 'split' ? null : config.fileType;
        await createDollarNColumn(tableName, fileTypeForDollarN, clientId);

        let householdingResult = null;
        let householdingDuplicateFiles = null;
        if (config.householdingEnabled) {
          try {
            const checkPartyColumnsSQL = `
              SELECT
                SUM(CASE WHEN COLUMN_NAME = 'RPARTYROLLUP' THEN 1 ELSE 0 END) as HasRPartyRollup,
                SUM(CASE WHEN COLUMN_NAME = 'PARTY' THEN 1 ELSE 0 END) as HasParty
              FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = @tableName
            `;

            const partyCheck = await pool.request()
              .input('tableName', sql.NVarChar, tableName)
              .query(checkPartyColumnsSQL);

            const hasRPartyRollup = partyCheck.recordset[0].HasRPartyRollup > 0;
            const hasParty = partyCheck.recordset[0].HasParty > 0;

            if (hasRPartyRollup && !hasParty) {
              await calculatePartyFromRPartyRollup(tableName);
            }

            householdingResult = await processHouseholding(tableName, selectedAgeRange);

            const checkHouseholdingColumnsSQL = `
              SELECT COLUMN_NAME
              FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = @tableName
              AND COLUMN_NAME IN (
                'FNAME2', 'LNAME2', 'FNAME3', 'LNAME3', 'FNAME4', 'LNAME4',
                'IAGE2', 'IAGE3', 'IAGE4',
                'GEND2', 'GEND3', 'GEND4',
                'PARTY2', 'PARTY3', 'PARTY4',
                'CALCPARTY2', 'CALCPARTY3', 'CALCPARTY4',
                'VFREQGEN2', 'VFREQGEN3', 'VFREQGEN4',
                'VFREQPR2', 'VFREQPR3', 'VFREQPR4'
              )
            `;

            const existingHouseholdingCols = await pool.request()
              .input('tableName', sql.NVarChar, tableName)
              .query(checkHouseholdingColumnsSQL);

            const existingColNames = existingHouseholdingCols.recordset.map(row => row.COLUMN_NAME);

            existingColNames.forEach((col) => {
              if (!finalHeaders.includes(col)) {
                finalHeaders.push(col);
              }
            });

            const householdingHeaders = finalHeaders.filter(h => h !== 'BATCH');
            householdingDuplicateFiles = await extractHouseholdingDuplicateFiles(tableName, householdingHeaders, userId);
          } catch (error) {
            console.error('Householding failed:', error);
            throw new Error(`Householding process failed: ${error.message}`);
          }
        }

        let landlineTableName = null;
        let cellTableName = null;

        if (splitMode === 'split') {
          const splitResult = await splitIntoLandlineAndCell(tableName, selectedAgeRange);

          if (splitResult.success) {
            landlineTableName = splitResult.landlineTableName;
            cellTableName = splitResult.cellTableName;

            // Only create stratified batches for cell table if it exists
            if (cellTableName) {
              await createStratifiedBatches(cellTableName, 'IAGE,GEND,PARTY,ETHNICITY,IZIP', 20);
            }
          }
        } else {
          await createStratifiedBatches(tableName, 'IAGE,GEND,PARTY,ETHNICITY,IZIP', 20);
        }

        if (splitMode === 'split') {
          const landlineHeaders = finalHeaders.filter(h => h !== 'BATCH');
          const cellHeaders = finalHeaders;

          const tempDir = userId ? await ensureUserTempDir(userId) : path.join(__dirname, '../temp');
          if (!userId) {
            await fs.mkdir(tempDir, { recursive: true });
          }

          const BOM = '\uFEFF';
          const mergedFiles = {
            ...(householdingDuplicateFiles?.files || {})
          };

          // Process landline table if it exists
          if (landlineTableName) {
            const landlineSelectClause = landlineHeaders.map((header) => `[${header}]`).join(', ');
            const landlineQuery = `SELECT ${landlineSelectClause} FROM FAJITA.dbo.[${landlineTableName}]`;
            const landlineResult = await pool.request().query(landlineQuery);
            const landlineCSV = convertToCSV(landlineResult.recordset, landlineHeaders);
            const landlineFilePath = path.join(tempDir, `${fileNames.landline}.csv`);
            await fs.writeFile(landlineFilePath, BOM + landlineCSV, 'utf8');

            mergedFiles.landline = {
              filename: `${fileNames.landline}.csv`,
              path: landlineFilePath,
              url: getTempFileUrl(`${fileNames.landline}.csv`, userId),
              records: landlineResult.recordset.length,
              headers: landlineHeaders,
              conditions: [`Extracted from table: ${landlineTableName}`],
            };
          }

          // Process cell table if it exists
          if (cellTableName) {
            const cellSelectClause = cellHeaders.map((header) => `[${header}]`).join(', ');
            const cellQuery = `SELECT ${cellSelectClause} FROM FAJITA.dbo.[${cellTableName}]`;
            const cellResult = await pool.request().query(cellQuery);
            const cellCSV = convertToCSV(cellResult.recordset, cellHeaders);
            const cellFilePath = path.join(tempDir, `${fileNames.cell}.csv`);
            await fs.writeFile(cellFilePath, BOM + cellCSV, 'utf8');

            mergedFiles.cell = {
              filename: `${fileNames.cell}.csv`,
              path: cellFilePath,
              url: getTempFileUrl(`${fileNames.cell}.csv`, userId),
              records: cellResult.recordset.length,
              headers: cellHeaders,
              conditions: [`Extracted from table: ${cellTableName}`],
            };
          }

          return {
            success: true,
            splitMode: 'split',
            vtypeUpdated: true,
            householdingProcessed: config.householdingEnabled,
            vtypeStats: {
              landlineCount: vtypeUpdate?.landlineCount,
              cellCount: vtypeUpdate?.cellCount,
              ageThreshold: selectedAgeRange,
            },
            householdingStats: householdingResult || null,
            householdingDuplicateFiles: householdingDuplicateFiles || null,
            splitTableNames: {
              landline: landlineTableName,
              cell: cellTableName,
            },
            files: mergedFiles,
            message: `Split extraction complete`,
          };
        } else {
          const selectClause = finalHeaders.map((header) => `[${header}]`).join(', ');
          const allQuery = `SELECT ${selectClause} FROM FAJITA.dbo.[${tableName}]`;
          const allResult = await pool.request().query(allQuery);

          const allCSV = convertToCSV(allResult.recordset, finalHeaders);

          const tempDir = userId ? await ensureUserTempDir(userId) : path.join(__dirname, '../temp');
          if (!userId) {
            await fs.mkdir(tempDir, { recursive: true });
          }

          let finalFilename = fileNames.single;
          if (!finalFilename.startsWith('LSAM_') && !finalFilename.startsWith('CSAM_')) {
            const prefix = config.fileType === 'cell' ? 'CSAM' : 'LSAM';
            finalFilename = finalFilename.replace(/^SAMP_/, `${prefix}_`);
          }

          const BOM = '\uFEFF';
          const filePath = path.join(tempDir, `${finalFilename}.csv`);
          await fs.writeFile(filePath, BOM + allCSV, 'utf8');

          return {
            success: true,
            splitMode: 'all',
            vtypeUpdated: false,
            householdingProcessed: config.householdingEnabled,
            householdingStats: householdingResult || null,
            householdingDuplicateFiles: householdingDuplicateFiles || null,
            files: {
              single: {
                filename: `${finalFilename}.csv`,
                path: filePath,
                url: getTempFileUrl(`${finalFilename}.csv`, userId),
                records: allResult.recordset.length,
                headers: finalHeaders,
                conditions: [`File type: ${config.fileType === 'cell' ? 'Cell' : 'Landline'}`],
              },
              ...(householdingDuplicateFiles?.files || {})
            },
            message: `Extraction complete: ${allResult.recordset.length} total records`,
          };
        }
      } catch (error) {
        console.error('Error in extractFilesFromTable:', error);
        throw new Error(`Failed to extract files: ${error.message}`);
      }
    },
    fnName: 'extractFilesFromTable',
  });

  return result;
};

// =====================================================
// Extraction Defaults Functions
// =====================================================

/**
 * Get resolved extraction variables using hierarchy:
 * 1. Project overrides (highest priority)
 * 2. Vendor + Client defaults
 * 3. Client defaults (base layer)
 * @param {number|null} projectId - Project ID for overrides (optional)
 * @param {number} clientId - Client ID (required)
 * @param {number|null} vendorId - Vendor ID (optional)
 * @returns {Array} - Array of { variableName, source }
 */
const getExtractionVariables = async (projectId, clientId, vendorId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('ProjectID', sql.Int, projectId)
        .input('ClientID', sql.Int, clientId)
        .input('VendorID', sql.Int, vendorId)
        .execute('FAJITA.dbo.sp_GetExtractionVariables');

      return result.recordset.map((row) => ({
        variableName: row.VariableName,
        source: row.Source,
      }));
    },
    fnName: 'getExtractionVariables',
  });
};

/**
 * Get master extraction defaults (global defaults for all files)
 * @returns {Array} - Array of { id, variableName }
 */
const getMasterExtractionDefaults = async () => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool.request().query(`
          SELECT ID, VariableName, CreatedDate, ModifiedDate
          FROM FAJITA.dbo.ExtractionDefaultsMaster
          ORDER BY VariableName
        `);

      return result.recordset.map((row) => ({
        id: row.ID,
        variableName: row.VariableName,
        createdDate: row.CreatedDate,
        modifiedDate: row.ModifiedDate,
      }));
    },
    fnName: 'getMasterExtractionDefaults',
  });
};

/**
 * Save master extraction defaults (bulk upsert)
 * @param {Array} variables - Array of { variableName }
 * @returns {Object} - { added, deleted }
 */
const saveMasterExtractionDefaults = async (variables) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      // Get existing defaults
      const existing = await pool.request().query(`
            SELECT ID, VariableName
            FROM FAJITA.dbo.ExtractionDefaultsMaster
          `);

      const existingMap = new Map(
        existing.recordset.map((row) => [row.VariableName.toLowerCase(), row.ID])
      );

      const newNames = new Set(variables.map((v) => v.variableName.toLowerCase()));

      let added = 0;
      let deleted = 0;

      // Delete variables that are no longer in the list
      for (const [name, id] of existingMap) {
        if (!newNames.has(name)) {
          await pool.request().input('ID', sql.Int, id).query(`
                DELETE FROM FAJITA.dbo.ExtractionDefaultsMaster WHERE ID = @ID
              `);
          deleted++;
        }
      }

      // Add new variables
      for (const variable of variables) {
        const lowerName = variable.variableName.toLowerCase();
        if (!existingMap.has(lowerName)) {
          await pool.request().input('VariableName', sql.NVarChar, variable.variableName)
            .query(`
                INSERT INTO FAJITA.dbo.ExtractionDefaultsMaster (VariableName)
                VALUES (@VariableName)
              `);
          added++;
        }
      }

      return { added, deleted };
    },
    fnName: 'saveMasterExtractionDefaults',
  });
};

/**
 * Get client-level extraction defaults
 * @param {number} clientId - Client ID
 * @returns {Array} - Array of { id, variableName }
 */
const getClientExtractionDefaults = async (clientId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool.request().input('ClientID', sql.Int, clientId)
        .query(`
          SELECT ID, VariableName, CreatedDate, ModifiedDate
          FROM FAJITA.dbo.ExtractionDefaultsClient
          WHERE ClientID = @ClientID
          ORDER BY VariableName
        `);

      return result.recordset.map((row) => ({
        id: row.ID,
        variableName: row.VariableName,
        createdDate: row.CreatedDate,
        modifiedDate: row.ModifiedDate,
      }));
    },
    fnName: 'getClientExtractionDefaults',
  });
};

/**
 * Get vendor+client extraction defaults
 * @param {number} vendorId - Vendor ID
 * @param {number} clientId - Client ID
 * @returns {Array} - Array of { id, variableName }
 */
const getVendorClientExtractionDefaults = async (vendorId, clientId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('VendorID', sql.Int, vendorId)
        .input('ClientID', sql.Int, clientId).query(`
          SELECT ID, VariableName, CreatedDate, ModifiedDate
          FROM FAJITA.dbo.ExtractionDefaultsVendorClient
          WHERE VendorID = @VendorID AND ClientID = @ClientID
          ORDER BY VariableName
        `);

      return result.recordset.map((row) => ({
        id: row.ID,
        variableName: row.VariableName,
        createdDate: row.CreatedDate,
        modifiedDate: row.ModifiedDate,
      }));
    },
    fnName: 'getVendorClientExtractionDefaults',
  });
};

/**
 * Get project-level extraction overrides
 * @param {number} projectId - Project ID
 * @returns {Array} - Array of { id, variableName, clientId, vendorId }
 */
const getProjectExtractionOverrides = async (projectId) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const result = await pool.request().input('ProjectID', sql.Int, projectId)
        .query(`
          SELECT ID, VariableName, ClientID, VendorID, CreatedDate, ModifiedDate
          FROM FAJITA.dbo.ExtractionOverridesProject
          WHERE ProjectID = @ProjectID
          ORDER BY VariableName
        `);

      return result.recordset.map((row) => ({
        id: row.ID,
        variableName: row.VariableName,
        clientId: row.ClientID,
        vendorId: row.VendorID,
        createdDate: row.CreatedDate,
        modifiedDate: row.ModifiedDate,
      }));
    },
    fnName: 'getProjectExtractionOverrides',
  });
};

/**
 * Save client-level extraction defaults (bulk upsert)
 * @param {number} clientId - Client ID
 * @param {Array} variables - Array of { variableName }
 * @returns {Object} - { added, deleted }
 */
const saveClientExtractionDefaults = async (clientId, variables) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Get existing variables for this client
        const existingResult = await transaction
          .request()
          .input('ClientID', sql.Int, clientId).query(`
            SELECT ID, VariableName
            FROM FAJITA.dbo.ExtractionDefaultsClient
            WHERE ClientID = @ClientID
          `);

        const existing = new Map(
          existingResult.recordset.map((r) => [r.VariableName.toUpperCase(), r])
        );
        const incoming = new Map(
          variables.map((v) => [v.variableName.toUpperCase(), v])
        );

        let added = 0,
          deleted = 0;

        // Delete variables not in incoming list
        for (const [varName, row] of existing) {
          if (!incoming.has(varName)) {
            await transaction.request().input('ID', sql.Int, row.ID).query(`
                DELETE FROM FAJITA.dbo.ExtractionDefaultsClient WHERE ID = @ID
              `);
            deleted++;
          }
        }

        // Insert new variables (no updates needed since we only track name)
        for (const variable of variables) {
          const upperName = variable.variableName.toUpperCase();
          if (!existing.has(upperName)) {
            await transaction
              .request()
              .input('ClientID', sql.Int, clientId)
              .input('VariableName', sql.NVarChar, variable.variableName).query(`
                INSERT INTO FAJITA.dbo.ExtractionDefaultsClient (ClientID, VariableName)
                VALUES (@ClientID, @VariableName)
              `);
            added++;
          }
        }

        await transaction.commit();
        return { added, deleted };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
    fnName: 'saveClientExtractionDefaults',
  });
};

/**
 * Save vendor+client extraction defaults (bulk upsert)
 * @param {number} vendorId - Vendor ID
 * @param {number} clientId - Client ID
 * @param {Array} variables - Array of { variableName }
 * @returns {Object} - { added, deleted }
 */
const saveVendorClientExtractionDefaults = async (
  vendorId,
  clientId,
  variables
) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Get existing variables for this vendor+client
        const existingResult = await transaction
          .request()
          .input('VendorID', sql.Int, vendorId)
          .input('ClientID', sql.Int, clientId).query(`
            SELECT ID, VariableName
            FROM FAJITA.dbo.ExtractionDefaultsVendorClient
            WHERE VendorID = @VendorID AND ClientID = @ClientID
          `);

        const existing = new Map(
          existingResult.recordset.map((r) => [r.VariableName.toUpperCase(), r])
        );
        const incoming = new Map(
          variables.map((v) => [v.variableName.toUpperCase(), v])
        );

        let added = 0,
          deleted = 0;

        // Delete variables not in incoming list
        for (const [varName, row] of existing) {
          if (!incoming.has(varName)) {
            await transaction.request().input('ID', sql.Int, row.ID).query(`
                DELETE FROM FAJITA.dbo.ExtractionDefaultsVendorClient WHERE ID = @ID
              `);
            deleted++;
          }
        }

        // Insert new variables (no updates needed since we only track name)
        for (const variable of variables) {
          const upperName = variable.variableName.toUpperCase();
          if (!existing.has(upperName)) {
            await transaction
              .request()
              .input('VendorID', sql.Int, vendorId)
              .input('ClientID', sql.Int, clientId)
              .input('VariableName', sql.NVarChar, variable.variableName).query(`
                INSERT INTO FAJITA.dbo.ExtractionDefaultsVendorClient (VendorID, ClientID, VariableName)
                VALUES (@VendorID, @ClientID, @VariableName)
              `);
            added++;
          }
        }

        await transaction.commit();
        return { added, deleted };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
    fnName: 'saveVendorClientExtractionDefaults',
  });
};

/**
 * Save project-level extraction overrides (bulk upsert)
 * @param {number} projectId - Project ID
 * @param {number} clientId - Client ID
 * @param {number|null} vendorId - Vendor ID (optional)
 * @param {Array} variables - Array of { variableName }
 * @returns {Object} - { added, deleted }
 */
const saveProjectExtractionOverrides = async (
  projectId,
  clientId,
  vendorId,
  variables
) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Get existing variables for this project
        const existingResult = await transaction
          .request()
          .input('ProjectID', sql.Int, projectId).query(`
            SELECT ID, VariableName
            FROM FAJITA.dbo.ExtractionOverridesProject
            WHERE ProjectID = @ProjectID
          `);

        const existing = new Map(
          existingResult.recordset.map((r) => [r.VariableName.toUpperCase(), r])
        );
        const incoming = new Map(
          variables.map((v) => [v.variableName.toUpperCase(), v])
        );

        let added = 0,
          deleted = 0;

        // Delete variables not in incoming list
        for (const [varName, row] of existing) {
          if (!incoming.has(varName)) {
            await transaction.request().input('ID', sql.Int, row.ID).query(`
                DELETE FROM FAJITA.dbo.ExtractionOverridesProject WHERE ID = @ID
              `);
            deleted++;
          }
        }

        // Insert new variables (no updates needed since we only track name)
        for (const variable of variables) {
          const upperName = variable.variableName.toUpperCase();
          if (!existing.has(upperName)) {
            await transaction
              .request()
              .input('ProjectID', sql.Int, projectId)
              .input('ClientID', sql.Int, clientId)
              .input('VendorID', sql.Int, vendorId)
              .input('VariableName', sql.NVarChar, variable.variableName).query(`
                INSERT INTO FAJITA.dbo.ExtractionOverridesProject (ProjectID, ClientID, VendorID, VariableName)
                VALUES (@ProjectID, @ClientID, @VendorID, @VariableName)
              `);
            added++;
          }
        }

        await transaction.commit();
        return { added, deleted };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
    fnName: 'saveProjectExtractionOverrides',
  });
};

/**
 * Get all SA_* tables from INFORMATION_SCHEMA with their metadata and related tables
 * @param {Object} options - Filter options
 * @param {string} options.projectId - Filter by project ID (optional)
 * @param {number} options.limit - Maximum number of table families to return (default: 50)
 * @returns {Array} - Array of table family objects with parent and related tables
 */
const getSampleTables = async (options = {}) => {
  const { projectId, limit = 50 } = options;

  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        // Get all SA_* tables from INFORMATION_SCHEMA with row counts from sys.partitions
        // Filter out empty tables (0 rows) as they shouldn't exist
        let query = `
          SELECT
            t.TABLE_NAME,
            t.TABLE_SCHEMA,
            (
              SELECT SUM(p.rows)
              FROM FAJITA.sys.partitions p
              JOIN FAJITA.sys.tables tbl ON p.object_id = tbl.object_id
              JOIN FAJITA.sys.schemas s ON tbl.schema_id = s.schema_id
              WHERE tbl.name = t.TABLE_NAME
                AND s.name = t.TABLE_SCHEMA
                AND p.index_id IN (0, 1)
            ) as ROW_COUNT
          FROM FAJITA.INFORMATION_SCHEMA.TABLES t
          WHERE t.TABLE_SCHEMA = 'dbo'
            AND t.TABLE_NAME LIKE 'SA[_]%'
            AND t.TABLE_TYPE = 'BASE TABLE'
            AND (
              SELECT SUM(p.rows)
              FROM FAJITA.sys.partitions p
              JOIN FAJITA.sys.tables tbl ON p.object_id = tbl.object_id
              JOIN FAJITA.sys.schemas s ON tbl.schema_id = s.schema_id
              WHERE tbl.name = t.TABLE_NAME
                AND s.name = t.TABLE_SCHEMA
                AND p.index_id IN (0, 1)
            ) > 0
        `;

        const request = pool.request();

        if (projectId) {
          query += ` AND t.TABLE_NAME LIKE @projectPattern`;
          request.input('projectPattern', sql.NVarChar, `SA_${projectId}_%`);
        }

        query += ` ORDER BY t.TABLE_NAME DESC`;

        const tablesResult = await request.query(query);

        // Group tables into families (parent + derivatives), then group by project ID
        const tableFamilies = new Map();
        const derivativeSuffixes = ['_LANDLINE', '_CELL', '_LSAM', '_CSAM', '_DUPLICATES',
          'duplicate2', 'duplicate3', 'duplicate4', '_WDNC'];

        for (const row of tablesResult.recordset) {
          const tableName = row.TABLE_NAME;

          // Check if this is a derivative table
          let isDerivative = false;
          let parentName = null;
          let derivativeType = null;

          // Check for BACKUP pattern: SA_12345_0120_1530_BACKUP_20260120150215
          const backupMatch = tableName.match(/^(SA_\d+_\d{4}_\d{4})_BACKUP_\d+$/);
          if (backupMatch) {
            isDerivative = true;
            parentName = backupMatch[1];
            derivativeType = 'BACKUP';
          }

          // Check for standard suffixes
          if (!isDerivative) {
            for (const suffix of derivativeSuffixes) {
              if (tableName.endsWith(suffix)) {
                isDerivative = true;
                parentName = tableName.slice(0, -suffix.length);
                derivativeType = suffix.replace(/^_/, '');
                break;
              }
            }
          }

          if (isDerivative && parentName) {
            // Add to parent's derivatives
            if (!tableFamilies.has(parentName)) {
              tableFamilies.set(parentName, {
                parentTable: null,
                derivatives: []
              });
            }
            tableFamilies.get(parentName).derivatives.push({
              tableName: tableName,
              rowCount: row.ROW_COUNT || 0,
              type: derivativeType
            });
          } else {
            // This is a parent table
            if (!tableFamilies.has(tableName)) {
              tableFamilies.set(tableName, {
                parentTable: null,
                derivatives: []
              });
            }

            // Parse the table name to extract project ID and timestamp
            // Format: SA_{projectId}_{MMDD_HHMM}
            const match = tableName.match(/^SA_(\d+)_(\d{4})_(\d{4})$/);

            tableFamilies.get(tableName).parentTable = {
              tableName: tableName,
              rowCount: row.ROW_COUNT || 0,
              projectId: match ? match[1] : null,
              timestamp: match ? `${match[2]}_${match[3]}` : null,
              createdDate: match ? parseTableTimestamp(match[2], match[3]) : null
            };
          }
        }

        // Convert to array and filter out incomplete families
        const families = Array.from(tableFamilies.values())
          .filter(f => f.parentTable !== null)
          .sort((a, b) => {
            // Sort by table name descending (newest first)
            return b.parentTable.tableName.localeCompare(a.parentTable.tableName);
          });

        // Group families by project ID, sorted descending
        const projectGroups = new Map();
        for (const family of families) {
          const projId = family.parentTable.projectId || 'Unknown';
          if (!projectGroups.has(projId)) {
            projectGroups.set(projId, {
              projectId: projId,
              tables: []
            });
          }
          projectGroups.get(projId).tables.push(family);
        }

        // Convert to array and sort by project ID descending (numeric sort)
        const projects = Array.from(projectGroups.values())
          .sort((a, b) => {
            const aNum = parseInt(a.projectId, 10) || 0;
            const bNum = parseInt(b.projectId, 10) || 0;
            return bNum - aNum;
          })
          .slice(0, limit);

        return projects;
      } catch (error) {
        console.error('Error getting sample tables:', error);
        throw new Error(`Failed to get sample tables: ${error.message}`);
      }
    },
    fnName: 'getSampleTables',
  });
};

/**
 * Parse table timestamp from MMDD and HHMM parts
 */
const parseTableTimestamp = (datePart, timePart) => {
  try {
    const month = parseInt(datePart.slice(0, 2), 10) - 1;
    const day = parseInt(datePart.slice(2, 4), 10);
    const hour = parseInt(timePart.slice(0, 2), 10);
    const minute = parseInt(timePart.slice(2, 4), 10);
    const year = new Date().getFullYear();

    return new Date(year, month, day, hour, minute);
  } catch {
    return null;
  }
};

/**
 * Get detailed information about a specific table including columns and sample data
 * @param {string} tableName - The table name to get details for
 * @returns {Object} - Table details including columns and sample rows
 */
const getSampleTableDetails = async (tableName) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        // Get column information
        const columnsResult = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .query(`
            SELECT
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE,
              ORDINAL_POSITION
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);

        // Get row count
        const countResult = await pool.request().query(`
          SELECT COUNT(*) as total FROM FAJITA.dbo.[${tableName}]
        `);

        // Get sample rows (first 10)
        const sampleResult = await pool.request().query(`
          SELECT TOP 10 * FROM FAJITA.dbo.[${tableName}]
        `);

        return {
          tableName,
          columns: columnsResult.recordset.map(col => ({
            name: col.COLUMN_NAME,
            dataType: col.DATA_TYPE,
            maxLength: col.CHARACTER_MAXIMUM_LENGTH,
            nullable: col.IS_NULLABLE === 'YES',
            position: col.ORDINAL_POSITION
          })),
          totalRows: countResult.recordset[0].total,
          sampleRows: sampleResult.recordset
        };
      } catch (error) {
        console.error('Error getting table details:', error);
        throw new Error(`Failed to get table details: ${error.message}`);
      }
    },
    fnName: 'getSampleTableDetails',
  });
};

/**
 * Delete a sample table and all its derivative tables
 * @param {string} tableName - The parent table name
 * @param {boolean} includeDerivatives - Whether to delete derivative tables too
 * @returns {Object} - Result with deleted tables
 */
const deleteSampleTable = async (tableName, includeDerivatives = true) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      try {
        const deletedTables = [];
        const derivativeSuffixes = ['_LANDLINE', '_CELL', '_LSAM', '_CSAM', '_DUPLICATES',
          'duplicate2', 'duplicate3', 'duplicate4', '_WDNC'];

        // Delete derivative tables first if requested
        if (includeDerivatives) {
          for (const suffix of derivativeSuffixes) {
            const derivativeName = `${tableName}${suffix}`;

            // Check if derivative exists
            const existsResult = await pool
              .request()
              .input('tableName', sql.NVarChar, derivativeName)
              .query(`
                SELECT COUNT(*) as exists_count
                FROM FAJITA.INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName
              `);

            if (existsResult.recordset[0].exists_count > 0) {
              await pool.request().query(`DROP TABLE FAJITA.dbo.[${derivativeName}]`);
              deletedTables.push(derivativeName);
            }
          }
        }

        // Delete the parent table
        const existsResult = await pool
          .request()
          .input('tableName', sql.NVarChar, tableName)
          .query(`
            SELECT COUNT(*) as exists_count
            FROM FAJITA.INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName
          `);

        if (existsResult.recordset[0].exists_count > 0) {
          await pool.request().query(`DROP TABLE FAJITA.dbo.[${tableName}]`);
          deletedTables.push(tableName);
        }

        return {
          success: true,
          deletedTables,
          message: `Deleted ${deletedTables.length} table(s)`
        };
      } catch (error) {
        console.error('Error deleting sample table:', error);
        throw new Error(`Failed to delete sample table: ${error.message}`);
      }
    },
    fnName: 'deleteSampleTable',
  });
};

/**
 * Delete a single extraction default/override by ID and type
 * @param {string} type - 'client', 'vendorClient', or 'project'
 * @param {number} id - Record ID
 * @returns {boolean} - Success
 */
const deleteExtractionDefault = async (type, id) => {
  return withDbConnection({
    database: caligulad,
    queryFn: async (pool) => {
      let tableName;
      switch (type) {
        case 'client':
          tableName = 'ExtractionDefaultsClient';
          break;
        case 'vendorClient':
          tableName = 'ExtractionDefaultsVendorClient';
          break;
        case 'project':
          tableName = 'ExtractionOverridesProject';
          break;
        default:
          throw new Error(`Invalid type: ${type}`);
      }

      const result = await pool.request().input('ID', sql.Int, id).query(`
          DELETE FROM FAJITA.dbo.[${tableName}] WHERE ID = @ID
        `);

      return result.rowsAffected[0] > 0;
    },
    fnName: 'deleteExtractionDefault',
  });
};

module.exports = {
  createTableFromFileData,
  getClients,
  getVendors,
  getClientsAndVendors,
  getHeaderMappings,
  getAllHeaderMappings,
  saveHeaderMappings,
  deleteHeaderMapping,
  getTablePreview,
  createDNCScrubbed,
  formatPhoneNumbersInTable,
  updateSourceColumn,
  routeTarrancePhones,
  padTarranceRegion,
  populateAgeRange,
  createStratifiedBatches,
  splitIntoLandlineAndCell,
  getDistinctAgeRanges,
  getTableHeaders,
  extractFilesFromTable,
  calculateAgeFromBirthYear,
  convertAgeToIAge,
  padColumns,
  updateVTYPEBySplit,
  updateVTYPEForAllRecords,
  applyWDNCScrubbing,
  createDollarNColumn,
  createVFREQColumns,
  formatRDateColumn,
  fixIAGEValues,
  processHouseholding,
  extractHouseholdingDuplicateFiles,
  calculatePartyFromRPartyRollup,
  getNextFileID,
  registerProjectFile,
  updateProjectFileTableName,
  deleteProjectFile,
  checkColumnExists,
  previewComputedVariable,
  addComputedVariable,
  removeComputedVariable,
  // Extraction Defaults
  getExtractionVariables,
  getMasterExtractionDefaults,
  getClientExtractionDefaults,
  getVendorClientExtractionDefaults,
  getProjectExtractionOverrides,
  saveMasterExtractionDefaults,
  saveClientExtractionDefaults,
  saveVendorClientExtractionDefaults,
  saveProjectExtractionOverrides,
  deleteExtractionDefault,
  // Sample Tracking
  getSampleTables,
  getSampleTableDetails,
  deleteSampleTable,
  // Variable Exclusions
  getVariableExclusions,
  addVariableExclusion,
  updateVariableExclusion,
  deleteVariableExclusion,
  getProjectVariableInclusions,
  addProjectVariableInclusion,
  updateProjectVariableInclusion,
  deleteProjectVariableInclusion,
  getExcludedVariableSet,
  getProjectInclusionsMap,
};
