const sql = require('mssql');
const path = require('path');
const fs = require('fs').promises;
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');
const {
  getPromarkConstantsAsHeaders,
  getPromarkConstantDefault,
} = require('../config/promarkConstants');

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
        // This prevents the "Must declare the scalar variable" error
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
          // Priority 1: Exact vendor and client match
          whereConditions.push(
            `(hm.VendorID = @vendorId AND hm.ClientID = @clientId)`
          );

          // Priority 2: Vendor match with null client
          whereConditions.push(
            `(hm.VendorID = @vendorId AND hm.ClientID IS NULL)`
          );

          // Priority 3: Client match with null vendor
          whereConditions.push(
            `(hm.VendorID IS NULL AND hm.ClientID = @clientId)`
          );
        } else if (vendorId) {
          // Vendor only - prioritize vendor-specific mappings
          whereConditions.push(`(hm.VendorID = @vendorId)`);
          whereConditions.push(`(hm.VendorID IS NULL)`);
        } else if (clientId) {
          // Client only - prioritize client-specific mappings
          whereConditions.push(`(hm.ClientID = @clientId)`);
          whereConditions.push(`(hm.ClientID IS NULL)`);
        }

        // Always include fallback mappings where both are NULL (lowest priority)
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
        console.log(query);
        const result = await request.query(query);

        // console.log(`Found ${result.recordset.length} raw mapping records`);

        // Process results - keep only the highest priority mapping for each header
        const mappings = {};

        result.recordset.forEach((row) => {
          const originalKey = row.OriginalHeader.toUpperCase();

          // Only keep this mapping if we don't have one yet, or if this one has higher priority
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
          sampleMappings: Object.values(mappings)
            .slice(0, 3)
            .map(
              (m) =>
                `${m.original} → ${m.mapped} (${m.vendorName}→${m.clientName})`
            ),
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
 * Save header mappings to database (for when user edits mappings)
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
            console.log(
              `Inserted new mapping: ${upperOriginal} → ${upperMapped}`
            );
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
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars with underscore
    .replace(/^[0-9]/, 'tbl_$&') // Prefix with tbl_ if starts with number
    .substring(0, 50); // Limit length
};

/**
 * Create SQL table with dynamic schema including default values for constants
 * @param {Object} pool - Database connection pool
 * @param {string} tableName - Name of table to create
 * @param {Array} headers - Array of header objects with name, type, and optional defaultValue
 */
const createTable = async (pool, tableName, headers) => {
  try {
    console.log(
      'Creating table with headers (including constants):',
      headers.length
    );

    // Build column definitions with DEFAULT clauses for constants
    const columnDefinitions = headers
      .map((header) => {
        const columnName = sanitizeColumnName(header.name);
        const sqlType = mapDataTypeToSQL(header.type);

        // Add DEFAULT clause if header has defaultValue (for Promark constants)
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
          console.log(
            `Promark constant: ${columnName} -> ${sqlType}${defaultClause}`
          );
        } else {
          console.log(`File column: ${columnName} -> ${sqlType}`);
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
    const result = await pool.request().query(createTableSQL);
    console.log(
      `Table [${tableName}] created successfully with Promark constants`
    );
  } catch (error) {
    console.error('Error in createTable:', error);
    throw error;
  }
};

/**
 * Insert data with Promark constants applied
 * @param {Object} pool - Database connection pool
 * @param {string} tableName - Name of the table
 * @param {Array} originalHeaders - Original headers from file
 * @param {Array} allHeaders - All headers (original + constants)
 * @param {Array} data - Array of data objects
 * @param {Array} promarkConstants - Array of Promark constant definitions
 * @returns {number} - Number of rows inserted
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

    console.log(
      `Bulk inserting ${data.length} rows with Promark constants into table ${tableName}`
    );

    // Use SQL Server's bulk insert capability
    const table = new sql.Table(`FAJITA.dbo.${tableName}`);

    // Define columns for bulk insert (all headers including constants)
    allHeaders.forEach((header) => {
      const columnName = sanitizeColumnName(header.name);
      const sqlType = getSQLParameterType(header.type);
      table.columns.add(columnName, sqlType, { nullable: true });
    });

    // Add all rows to the table with constants
    data.forEach((row) => {
      const rowValues = allHeaders.map((header) => {
        // Check if this is a Promark constant column
        const isConstant = promarkConstants.find((c) => c.name === header.name);

        if (isConstant) {
          // Use the default value for constants
          const defaultValue = getPromarkConstantDefault(header.name);
          return convertValue(defaultValue, header.type);
        } else {
          // Use original file data
          const value = row[header.name];
          return convertValue(value, header.type);
        }
      });

      table.rows.add(...rowValues);
    });

    console.log('Executing bulk insert with constants...');
    const request = pool.request();
    await request.bulk(table);

    console.log(
      `Successfully bulk inserted ${data.length} rows with Promark constants`
    );
    return data.length;
  } catch (error) {
    console.error('Error in bulk insert with constants:', error);
    throw error;
  }
};

/**
 * Sanitize column name for SQL Server
 * @param {string} columnName - Raw column name
 * @returns {string} - Sanitized column name
 */
const sanitizeColumnName = (columnName) => {
  if (!columnName || typeof columnName !== 'string') {
    return 'UNNAMED_COLUMN';
  }
  
  return columnName
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace other invalid chars with underscore
    .replace(/^[0-9]/, 'col_$&') // Prefix if starts with number
    .substring(0, 128); // SQL Server column name limit
};

/**
 * Map detected data type to SQL Server data type
 * @param {string} dataType - Detected data type from processor
 * @returns {string} - SQL Server data type
 */
const mapDataTypeToSQL = (dataType) => {
  // Use more conservative types to avoid issues
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
 * @param {string} dataType - Detected data type
 * @returns {Object} - SQL parameter type
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
 * @param {any} value - Raw value
 * @param {string} dataType - Expected data type
 * @returns {any} - Converted value
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
        // Check if date is valid and within SQL Server DATETIME2 range
        // SQL Server DATETIME2 range: 0001-01-01 to 9999-12-31
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
        .query(
          'SELECT ClientID, ClientName FROM tblClients ORDER BY ClientName'
        );
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
    database: promark, // Same connection, different database
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .query(
          'SELECT VendorID, VendorName FROM FAJITA.dbo.Vendors ORDER BY VendorName'
        );
      return result.recordset;
    },
    fnName: 'getVendors',
  });
};

/**
 * Get both clients and vendors in one call for efficiency
 */
const getClientsAndVendors = async () => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      // Execute both queries in parallel
      const [clientsResult, vendorsResult] = await Promise.all([
        pool
          .request()
          .query(
            'SELECT ClientID, ClientName FROM tblClients ORDER BY ClientName'
          ),
        pool
          .request()
          .query(
            'SELECT VendorID, VendorName FROM FAJITA.dbo.Vendors ORDER BY VendorName'
          ),
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
 * @param {string} tableName - Name of the table to query
 * @param {number} limit - Number of rows to return (default 10)
 * @returns {Object} - Result object with preview data
 */
const getTablePreview = async (tableName, limit = 10) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Fetching top ${limit} rows from ${tableName}`);

        // Don't sanitize - table name is already sanitized from creation
        // Just validate it's not empty
        if (!tableName || tableName.trim() === '') {
          throw new Error('Table name is required');
        }

        // First, let's try to query the table directly to see if it exists
        // Skip INFORMATION_SCHEMA and just query the data directly
        const dataQuery = `
          SELECT TOP ${parseInt(limit)} *
          FROM FAJITA.dbo.[${tableName}]
        `;

        console.log('Executing data query:', dataQuery);
        const dataResult = await pool.request().query(dataQuery);

        console.log(
          `Successfully fetched ${dataResult.recordset.length} rows from ${tableName}`
        );

        // Get columns from the result set
        const columns =
          dataResult.recordset.length > 0
            ? Object.keys(dataResult.recordset[0]).map((colName) => ({
                name: colName,
                type: 'unknown', // We'll get type from data
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
        console.error('Table name was:', tableName);
        console.error('Full error:', error);
        throw new Error(`Failed to get table preview: ${error.message}`);
      }
    },
    fnName: 'getTablePreview',
  });
};

/**
 * Create a DNC-scrubbed copy of the table using stored procedure
 * @param {string} sourceTableName - Name of the source table
 * @returns {Object} - Result with new table info
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
          message: `Successfully created ${data.NewTableName} with ${data.RowsClean} records (${data.RowsRemoved} landline-only records removed, ${data.LandlinesCleared} landlines cleared from dual records)`,
        };
      } catch (error) {
        console.error('Error in createDNCScrubbed:', error);
        throw new Error(
          `Failed to create DNC-scrubbed table: ${error.message}`
        );
      }
    },
    fnName: 'createDNCScrubbed',
  });
};

/**
 * Format phone numbers in a table using stored procedure
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result
 */
const formatPhoneNumbersInTable = async (tableName) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Formatting phone numbers in table: ${tableName}`);

        const result = await pool
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
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with rows updated
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

        const rowsUpdated = result.recordset[0].RowsUpdated;
        console.log(
          `✅ SOURCE column updated for ${rowsUpdated} rows in ${tableName}`
        );

        return {
          success: true,
          rowsUpdated: rowsUpdated,
          message: `SOURCE column updated in ${tableName}`,
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
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with routing statistics
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
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with padding statistics
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
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with population statistics
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
 * Only uses columns that actually exist in the table
 * @param {string} tableName - Name of the table
 * @param {string} stratifyColumns - Comma-separated column names to stratify by
 * @param {number} batchCount - Number of batches to create (default 20)
 * @returns {Object} - Result with batch statistics
 */
const createStratifiedBatches = async (tableName, stratifyColumns = 'AGERANGE,SOURCE', batchCount = 20) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Creating stratified batches for table: ${tableName}`);
        console.log(`Requested stratify columns: ${stratifyColumns}`);

        // Get list of columns that actually exist in the table
        const columnCheckQuery = `
          SELECT COLUMN_NAME
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
        `;
        
        const columnResult = await pool.request()
          .input('tableName', sql.NVarChar, tableName)
          .query(columnCheckQuery);
        
        const existingColumns = columnResult.recordset.map(row => row.COLUMN_NAME.toUpperCase());
        
        // Parse requested columns and filter to only those that exist
        const requestedColumns = stratifyColumns
          .split(',')
          .map(col => col.trim().toUpperCase())
          .filter(col => existingColumns.includes(col));
        
        if (requestedColumns.length === 0) {
          console.warn('⚠️ None of the requested stratify columns exist in the table. Skipping stratification.');
          return {
            success: false,
            batchCount: 0,
            stratifyColumns: '',
            message: 'No valid stratify columns found - skipping batch creation',
          };
        }
        
        const finalStratifyColumns = requestedColumns.join(',');
        console.log(`✓ Using existing columns for stratification: ${finalStratifyColumns}`);

        // Call stored procedure with validated columns
        const result = await pool.request()
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
          columnsSkipped: stratifyColumns.split(',')
            .map(col => col.trim().toUpperCase())
            .filter(col => !existingColumns.includes(col)),
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
 * Get distinct age ranges from a table
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with age ranges array
 */
const getDistinctAgeRanges = async (tableName) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Fetching distinct age ranges from table: ${tableName}`);

        // First check if AGERANGE column exists
        const columnCheckQuery = `
          SELECT COUNT(*) as ColumnExists
          FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = @tableName
          AND COLUMN_NAME = 'AGERANGE'
        `;

        const columnCheck = await pool.request()
          .input('tableName', sql.NVarChar, tableName)
          .query(columnCheckQuery);

        if (columnCheck.recordset[0].ColumnExists === 0) {
          console.log(`AGERANGE column not found in table ${tableName}`);
          return {
            ageRanges: [],
            count: 0
          };
        }

        // Get distinct age ranges
        const query = `
          SELECT DISTINCT AGERANGE
          FROM FAJITA.dbo.[${tableName}]
          WHERE AGERANGE IS NOT NULL 
          AND AGERANGE != ''
          ORDER BY AGERANGE ASC
        `;

        const result = await pool.request().query(query);
        
        const ageRanges = result.recordset.map(row => row.AGERANGE);

        console.log(`Found ${ageRanges.length} distinct age ranges:`, ageRanges);

        return {
          ageRanges,
          count: ageRanges.length
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
 * Extract files from table with optional split configuration
 * @param {Object} config - Extraction configuration
 * @param {string} config.tableName - Name of the source table
 * @param {string[]} config.selectedHeaders - Array of column names to include
 * @param {string} config.splitMode - 'all' or 'split'
 * @param {string|number} config.selectedAgeRange - Age threshold for split mode
 * @param {Object} config.fileNames - Object containing file names for outputs
 * @returns {Object} - Result with file information
 */
const extractFilesFromTable = async (config) => {
  const { tableName, selectedHeaders, splitMode, selectedAgeRange, fileNames } = config;
  
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Starting file extraction from table: ${tableName}`);
        
        // Build final headers list - include selected headers plus system columns
        const finalHeaders = [...selectedHeaders];
        
        // Add SOURCE if not already included
        if (!finalHeaders.includes('SOURCE')) {
          finalHeaders.push('SOURCE');
        }
        
        // Add BATCH if not already included  
        if (!finalHeaders.includes('BATCH')) {
          finalHeaders.push('BATCH');
        }
        
        // Add VTYPE if not already included
        if (!finalHeaders.includes('VTYPE')) {
          finalHeaders.push('VTYPE');
        }

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
        
        // Add additional columns if they exist
        additionalResult.recordset.forEach(row => {
          if (!finalHeaders.includes(row.COLUMN_NAME)) {
            finalHeaders.push(row.COLUMN_NAME);
            console.log(`Added ${row.COLUMN_NAME} column to export headers`);
          }
        });
        
        // Build the SELECT clause with final headers
        const selectClause = finalHeaders.map(header => `[${header}]`).join(', ');
        
        if (splitMode === 'split') {
          // FIRST: Update VTYPE in the table based on split logic
          console.log(`Updating VTYPE in table based on split logic (age threshold: ${selectedAgeRange})`);
          const vtypeUpdate = await updateVTYPEBySplit(tableName, selectedAgeRange);
          console.log(`VTYPE updated: ${vtypeUpdate.landlineCount} landline, ${vtypeUpdate.cellCount} cell`);
          
          // SECOND: Create $N column based on VTYPE
          console.log('Creating $N column based on VTYPE...');
          const dollarNResult = await createDollarNColumn(tableName);
          console.log(`$N column: ${dollarNResult.rowsUpdated} rows populated`);
          
          // THEN: Extract with the same logic (VTYPE set, $N created, WDNC already applied in controller)
          const landlineQuery = `
            SELECT ${selectClause}
            FROM FAJITA.dbo.[${tableName}]
            WHERE SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ${selectedAgeRange})
          `;
          
          const cellQuery = `
            SELECT ${selectClause}
            FROM FAJITA.dbo.[${tableName}]
            WHERE SOURCE = 2 OR (SOURCE = 3 AND AGERANGE < ${selectedAgeRange})
          `;
          
          console.log('Executing landline query:', landlineQuery);
          const landlineResult = await pool.request().query(landlineQuery);
          
          console.log('Executing cell query:', cellQuery);
          const cellResult = await pool.request().query(cellQuery);
          
          // Convert results to CSV using final headers
          const landlineCSV = convertToCSV(landlineResult.recordset, finalHeaders);
          const cellCSV = convertToCSV(cellResult.recordset, finalHeaders);
          
          // Create temp directory if it doesn't exist
          const tempDir = path.join(__dirname, '../temp');
          await fs.mkdir(tempDir, { recursive: true });
          
          // Write CSV files
          const landlineFilePath = path.join(tempDir, `${fileNames.landline}.csv`);
          const cellFilePath = path.join(tempDir, `${fileNames.cell}.csv`);
          
          await fs.writeFile(landlineFilePath, landlineCSV, 'utf8');
          console.log('Landline file written to:', landlineFilePath);

          await fs.writeFile(cellFilePath, cellCSV, 'utf8');
          console.log('Cell file written to:', cellFilePath);
          
          return {
            success: true,
            splitMode: 'split',
            vtypeUpdated: true,
            vtypeStats: {
              landlineCount: vtypeUpdate.landlineCount,
              cellCount: vtypeUpdate.cellCount,
              ageThreshold: selectedAgeRange
            },
            files: {
              landline: {
                filename: `${fileNames.landline}.csv`,
                path: landlineFilePath,
                url: `/temp/${fileNames.landline}.csv`,
                records: landlineResult.recordset.length,
                headers: finalHeaders,
                conditions: [`SOURCE = 1`, `SOURCE = 3 AND AGERANGE >= ${selectedAgeRange}`, `All records now have VTYPE=1 in table`]
              },
              cell: {
                filename: `${fileNames.cell}.csv`,
                path: cellFilePath,
                url: `/temp/${fileNames.cell}.csv`,
                records: cellResult.recordset.length,
                headers: finalHeaders,
                conditions: [`SOURCE = 2`, `SOURCE = 3 AND AGERANGE < ${selectedAgeRange}`, `All records now have VTYPE=2 in table`]
              }
            },
            message: `Split extraction complete with VTYPE updated and $N created: ${landlineResult.recordset.length} landline records (VTYPE=1), ${cellResult.recordset.length} cell records (VTYPE=2)`
          };
          
        } else {
          // All records mode: Single file with all data (no VTYPE update needed)
          const allQuery = `
            SELECT ${selectClause}
            FROM FAJITA.dbo.[${tableName}]
          `;
          
          console.log('Executing all records query:', allQuery);
          const allResult = await pool.request().query(allQuery);
          
          // Convert to CSV using final headers
          const allCSV = convertToCSV(allResult.recordset, finalHeaders);
          
          // Create temp directory if it doesn't exist
          const tempDir = path.join(__dirname, '../temp');
          await fs.mkdir(tempDir, { recursive: true });
          
          // Write CSV file
          const filePath = path.join(tempDir, `${fileNames.single}.csv`);
          await fs.writeFile(filePath, allCSV, 'utf8');
          
          return {
            success: true,
            splitMode: 'all',
            vtypeUpdated: false,
            files: {
              single: {
                filename: `${fileNames.single}.csv`,
                path: filePath,
                url: `/temp/${fileNames.single}.csv`,
                records: allResult.recordset.length,
                headers: finalHeaders
              }
            },
            message: `Extraction complete: ${allResult.recordset.length} total records`
          };
        }
        
      } catch (error) {
        console.error('Error in extractFilesFromTable:', error);
        throw new Error(`Failed to extract files: ${error.message}`);
      }
    },
    fnName: 'extractFilesFromTable',
  });
};

/**
 * Convert database results to CSV format
 * @param {Array} records - Database records
 * @param {Array} headers - Column headers
 * @returns {string} - CSV string
 */
const convertToCSV = (records, headers) => {
  if (!records || records.length === 0) {
    return headers.join(',') + '\n';
  }
  
  // Create header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = records.map(record => {
    return headers.map(header => {
      const value = record[header];
      // Handle null/undefined values and escape commas/quotes
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      // If value contains comma, newline, or quote, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });
  
  return headerRow + '\n' + dataRows.join('\n');
};

/**
 * Calculate age from birth year and create IAGE column if AGE/IAGE don't already exist
 * @param {string} tableName - Name of the table
 * @param {boolean} useJanuaryFirst - Toggle for calculation base (true = Jan 1st, false = July 1st)
 * @returns {Object} - Result with calculation statistics
 */
const calculateAgeFromBirthYear = async (tableName, useJanuaryFirst = true) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Calculating age from birth year in table: ${tableName}`);
        console.log(`Using calculation base: ${useJanuaryFirst ? 'January 1st' : 'July 1st'}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .input('UseJanuaryFirst', sql.Bit, useJanuaryFirst)
          .execute('FAJITA.dbo.sp_CalculateAgeFromBirthYear');

        const data = result.recordset[0];
        
        if (data.Status === 'SUCCESS') {
          console.log(`✅ Age calculation complete:`, {
            recordsProcessed: data.RecordsProcessed,
            recordsWithNullBirthYear: data.RecordsWithNullBirthYear,
            recordsWithInvalidBirthYear: data.RecordsWithInvalidBirthYear,
            birthYearColumn: data.BirthYearColumnUsed,
            calculationBase: data.CalculationBase
          });

          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            recordsProcessed: data.RecordsProcessed,
            recordsWithNullBirthYear: data.RecordsWithNullBirthYear,
            recordsWithInvalidBirthYear: data.RecordsWithInvalidBirthYear,
            recordsWithValidAge: data.RecordsProcessed - data.RecordsWithNullBirthYear - data.RecordsWithInvalidBirthYear,
            birthYearColumnUsed: data.BirthYearColumnUsed,
            calculationBase: data.CalculationBase,
            calculationBaseDate: data.CalculationBaseDate,
            message: data.Message,
          };
        } else if (data.Status === 'SKIPPED') {
          console.log(`⚠️ Age calculation skipped: ${data.Message}`);
          
          return {
            success: true,
            status: data.Status,
            tableName: data.TableName,
            recordsProcessed: 0,
            recordsWithNullBirthYear: 0,
            recordsWithInvalidBirthYear: 0,
            recordsWithValidAge: 0,
            message: data.Message,
            skipped: true
          };
        } else {
          console.error(`❌ Age calculation failed: ${data.Message}`);
          
          return {
            success: false,
            status: data.Status,
            tableName: data.TableName,
            message: data.Message,
            error: true
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
 * Pad columns using stored procedure
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with padding statistics
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
 * @param {string} tableName - Name of the table
 * @param {number} ageThreshold - Age threshold for split (same as used in extraction)
 * @returns {Object} - Result with split counts
 */
const updateVTYPEBySplit = async (tableName, ageThreshold) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Updating VTYPE in table: ${tableName} with age threshold: ${ageThreshold}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .input('AgeThreshold', sql.Int, ageThreshold)
          .execute('FAJITA.dbo.sp_UpdateVTYPEBySplit');

        const data = result.recordset[0];
        
        console.log(
          `✅ VTYPE updated based on split logic:`,
          `Landline (VTYPE=1): ${data.LandlineCount},`,
          `Cell (VTYPE=2): ${data.CellCount}`
        );

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
 * Apply WDNC scrubbing to table in-place using stored procedure
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with scrubbing statistics
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
        
        console.log(
          `✅ WDNC scrubbing complete:`,
          `${data.RowsRemoved} records removed,`,
          `${data.LandlinesCleared} landlines cleared`
        );

        return {
          success: true,
          tableName: data.TableName,
          rowsOriginal: data.RowsOriginal,
          rowsAfter: data.RowsAfter,
          rowsRemoved: data.RowsRemoved,
          landlinesCleared: data.LandlinesCleared,
          message: `WDNC scrubbing complete: ${data.RowsRemoved} records removed, ${data.LandlinesCleared} landlines cleared`,
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
 * Create and populate $N column based on VTYPE using stored procedure
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with rows updated
 */
const createDollarNColumn = async (tableName) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      try {
        console.log(`Creating $N column in table: ${tableName}`);

        const result = await pool
          .request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_CreateDollarNColumn');

        const rowsUpdated = result.recordset[0].RowsUpdated;
        console.log(
          `✅ $N column created and populated for ${rowsUpdated} rows in ${tableName}`
        );

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
 * Create and populate VFREQGEN and VFREQPR columns based on previous 4 even years
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with calculation details
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
        console.log(
          `✅ VFREQ columns created for ${data.RowsUpdated} rows using years: ${data.OldestYear}-${data.NewestYear}`
        );
        console.log(`Columns used: ${data.ColumnsUsed}`);

        return {
          success: true,
          rowsUpdated: data.RowsUpdated,
          yearsUsed: {
            oldest: data.OldestYear,
            year3: data.Year3,
            year2: data.Year2,
            newest: data.NewestYear
          },
          columnsUsed: data.ColumnsUsed,
          message: `VFREQGEN and VFREQPR columns created using ${data.ColumnsUsed}`,
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
 * Fix IAGE values by changing -1 to 00 using stored procedure
 * @param {string} tableName - Name of the table
 * @returns {Object} - Result with update statistics
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
        
        if (data.RowsUpdated > 0) {
          console.log(`✅ Fixed ${data.RowsUpdated} IAGE values from -1 to 00 in ${tableName}`);
        } else {
          console.log(`✅ No IAGE values of -1 found in ${tableName}`);
        }

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
  getDistinctAgeRanges,
  extractFilesFromTable,
  calculateAgeFromBirthYear,
  padColumns,
  updateVTYPEBySplit,
  applyWDNCScrubbing,
  createDollarNColumn,
  createVFREQColumns,
  fixIAGEValues,
};
