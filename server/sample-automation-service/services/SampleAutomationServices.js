const { withDbConnection, sql, DATABASE_TYPES } = require('@internal/db-connection');
const path = require('path');
const fs = require('fs').promises;
const { PROMARK: promark } = DATABASE_TYPES;
const {
  getPromarkConstantsAsHeaders,
  getPromarkConstantDefault,
} = require('../config/promarkConstants');

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
    database: 'promark',
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

        // Generate unique table name with timestamp
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '_')
          .slice(0, -5);
        const sanitizedTableName = sanitizeTableName(tableName);
        const finalTableName = `uploaded_${sanitizedTableName}_${timestamp}`;

        console.log('Generated table name:', finalTableName);

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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
 * Update VTYPE column based on extraction split logic
 */
const updateVTYPEBySplit = async (tableName, ageThreshold, clientId = null) => {
  return withDbConnection({
    database: promark,
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
 * Apply WDNC scrubbing to table
 */
const applyWDNCScrubbing = async (tableName) => {
  return withDbConnection({
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
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
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Starting file extraction from table: ${tableName}`);

        const finalHeaders = [...selectedHeaders];

        if (!finalHeaders.includes('SOURCE')) {
          finalHeaders.push('SOURCE');
        }

        if (!finalHeaders.includes('BATCH')) {
          finalHeaders.push('BATCH');
        }

        if (splitMode === 'split' && !finalHeaders.includes('VTYPE')) {
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

        // Update VTYPE if in split mode
        let vtypeUpdate = null;
        if (splitMode === 'split') {
          vtypeUpdate = await updateVTYPEBySplit(tableName, selectedAgeRange, clientId);
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

            await createStratifiedBatches(cellTableName, 'IAGE,GEND,PARTY,ETHNICITY,IZIP', 20);
          }
        } else {
          await createStratifiedBatches(tableName, 'IAGE,GEND,PARTY,ETHNICITY,IZIP', 20);
        }

        if (splitMode === 'split') {
          const landlineHeaders = finalHeaders.filter(h => h !== 'BATCH');
          const cellHeaders = finalHeaders;

          const landlineSelectClause = landlineHeaders.map((header) => `[${header}]`).join(', ');
          const cellSelectClause = cellHeaders.map((header) => `[${header}]`).join(', ');

          const landlineQuery = `SELECT ${landlineSelectClause} FROM FAJITA.dbo.[${landlineTableName}]`;
          const cellQuery = `SELECT ${cellSelectClause} FROM FAJITA.dbo.[${cellTableName}]`;

          const landlineResult = await pool.request().query(landlineQuery);
          const cellResult = await pool.request().query(cellQuery);

          const landlineCSV = convertToCSV(landlineResult.recordset, landlineHeaders);
          const cellCSV = convertToCSV(cellResult.recordset, cellHeaders);

          const tempDir = userId ? await ensureUserTempDir(userId) : path.join(__dirname, '../temp');
          if (!userId) {
            await fs.mkdir(tempDir, { recursive: true });
          }

          const BOM = '\uFEFF';
          const landlineFilePath = path.join(tempDir, `${fileNames.landline}.csv`);
          const cellFilePath = path.join(tempDir, `${fileNames.cell}.csv`);

          await fs.writeFile(landlineFilePath, BOM + landlineCSV, 'utf8');
          await fs.writeFile(cellFilePath, BOM + cellCSV, 'utf8');

          const mergedFiles = {
            landline: {
              filename: `${fileNames.landline}.csv`,
              path: landlineFilePath,
              url: getTempFileUrl(`${fileNames.landline}.csv`, userId),
              records: landlineResult.recordset.length,
              headers: landlineHeaders,
              conditions: [`Extracted from table: ${landlineTableName}`],
            },
            cell: {
              filename: `${fileNames.cell}.csv`,
              path: cellFilePath,
              url: getTempFileUrl(`${fileNames.cell}.csv`, userId),
              records: cellResult.recordset.length,
              headers: cellHeaders,
              conditions: [`Extracted from table: ${cellTableName}`],
            },
            ...(householdingDuplicateFiles?.files || {})
          };

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

module.exports = {
  createTableFromFileData,
  getClients,
  getVendors,
  getClientsAndVendors,
  getHeaderMappings,
  saveHeaderMappings,
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
};
