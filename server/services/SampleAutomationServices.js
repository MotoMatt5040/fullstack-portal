const sql = require('mssql');
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
        console.log(query)
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
  return columnName
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars
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
        if (isNaN(dateVal.getTime()) || 
            dateVal.getFullYear() < 1 || 
            dateVal.getFullYear() > 9999) {
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
        const columns = dataResult.recordset.length > 0
          ? Object.keys(dataResult.recordset[0]).map(colName => ({
              name: colName,
              type: 'unknown' // We'll get type from data
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

        const result = await pool.request()
          .input('SourceTableName', sql.NVarChar, sourceTableName)
          .execute('FAJITA.dbo.sp_CreateDNCScrubbed');

        const data = result.recordset[0];
        
        console.log(`DNC scrub complete:`, {
          rowsRemoved: data.RowsRemoved,
          landlinesCleared: data.LandlinesCleared,
          newTable: data.NewTableName
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
        throw new Error(`Failed to create DNC-scrubbed table: ${error.message}`);
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

        const result = await pool.request()
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

        const result = await pool.request()
          .input('TableName', sql.NVarChar, tableName)
          .execute('FAJITA.dbo.sp_UpdateSourceColumn');

        const rowsUpdated = result.recordset[0].RowsUpdated;
        console.log(`✅ SOURCE column updated for ${rowsUpdated} rows in ${tableName}`);

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

        const result = await pool.request()
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

        const result = await pool.request()
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
};
