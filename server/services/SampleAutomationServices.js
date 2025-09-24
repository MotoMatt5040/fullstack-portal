const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');
const { 
  getPromarkConstantsAsHeaders, 
  getPromarkConstantDefault 
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
          promarkConstantsAdded: promarkConstants.map(c => c.name)
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
    console.log('Creating table with headers (including constants):', headers.length);

    // Build column definitions with DEFAULT clauses for constants
    const columnDefinitions = headers
      .map((header) => {
        const columnName = sanitizeColumnName(header.name);
        const sqlType = mapDataTypeToSQL(header.type);
        
        // Add DEFAULT clause if header has defaultValue (for Promark constants)
        const defaultClause = header.defaultValue !== undefined && header.defaultValue !== null
          ? ` DEFAULT ${typeof header.defaultValue === 'string' ? `'${header.defaultValue}'` : header.defaultValue}`
          : '';
        
        const columnDef = `[${columnName}] ${sqlType}${defaultClause}`;
        
        if (header.isPromarkConstant) {
          console.log(`Promark constant: ${columnName} -> ${sqlType}${defaultClause}`);
        } else {
          console.log(`File column: ${columnName} -> ${sqlType}`);
        }
        
        return columnDef;
      })
      .join(',\n    ');

    const createTableSQL = `
    CREATE TABLE [dbo].[${tableName}] (
      ${columnDefinitions}
    )
  `;

    console.log('Executing CREATE TABLE SQL with constants...');
    const result = await pool.request().query(createTableSQL);
    console.log(`Table [${tableName}] created successfully with Promark constants`);
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
const insertDataWithConstants = async (pool, tableName, originalHeaders, allHeaders, data, promarkConstants) => {
  try {
    if (data.length === 0) {
      console.log('No data to insert');
      return 0;
    }

    console.log(`Bulk inserting ${data.length} rows with Promark constants into table ${tableName}`);

    // Use SQL Server's bulk insert capability
    const table = new sql.Table(`dbo.${tableName}`);

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
        const isConstant = promarkConstants.find(c => c.name === header.name);
        
        if (isConstant) {
          // Use the default value for constants
          const defaultValue = getPromarkConstantDefault(header.name);
          return convertValue(defaultValue, header.type);
        } else {
          // Use original file data
          // const dataKey = header.originalName || header.name;
          // const value = row[dataKey];
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
      return parseInt(value);
    case 'REAL':
    case 'FLOAT':
      return parseFloat(value);
    case 'BOOLEAN':
      return Boolean(value);
    case 'DATE':
    case 'DATETIME':
      return new Date(value);
    case 'TEXT':
    default:
      return String(value);
  }
};

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
    database: promark, // Same connection, different database
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
 * Get both clients and vendors in one call for efficiency
 */
const getClientsAndVendors = async () => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      // Execute both queries in parallel
      const [clientsResult, vendorsResult] = await Promise.all([
        pool.request().query('SELECT ClientID, ClientName FROM tblClients ORDER BY ClientName'),
        pool.request().query('SELECT VendorID, VendorName FROM FAJITA.dbo.Vendors ORDER BY VendorName')
      ]);

      return {
        clients: clientsResult.recordset,
        vendors: vendorsResult.recordset
      };
    },
    fnName: 'getClientsAndVendors',
  });
};

module.exports = {
  createTableFromFileData,
  getClients,
  getVendors,
  getClientsAndVendors,
};