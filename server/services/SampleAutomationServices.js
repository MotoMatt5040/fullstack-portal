const sql = require('mssql');
const withDbConnection = require('../config/dbConn');

/**
 * Create a SQL table from processed file data
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

        // Create table with dynamic schema
        console.log('Creating table...');
        await createTable(pool, finalTableName, headers);

        // Insert the data
        console.log('Inserting data...');
        const insertedRows = await insertData(
          pool,
          finalTableName,
          headers,
          data
        );

        console.log(
          `Successfully created table ${finalTableName} with ${insertedRows} rows`
        );

        return {
          success: true,
          tableName: finalTableName,
          headers: headers,
          rowsInserted: insertedRows,
          totalRows: data.length,
          message: `Successfully created table ${finalTableName} with ${insertedRows} rows`,
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
 * Create SQL table with dynamic schema
 * @param {Object} pool - Database connection pool
 * @param {string} tableName - Name of table to create
 * @param {Array} headers - Array of header objects with name and type
 */
const createTable = async (pool, tableName, headers) => {
  try {
    console.log('Creating table with headers:', headers);

    // Build column definitions - just the file data columns
    const columnDefinitions = headers
      .map((header) => {
        const columnName = sanitizeColumnName(header.name);
        const sqlType = mapDataTypeToSQL(header.type);
        console.log(`Column: ${columnName} -> ${sqlType}`);
        return `[${columnName}] ${sqlType}`;
      })
      .join(',\n    ');

    const createTableSQL = `
    CREATE TABLE [dbo].[${tableName}] (
      ${columnDefinitions}
    )
  `;

    console.log('Executing CREATE TABLE SQL:', createTableSQL);

    const result = await pool.request().query(createTableSQL);
    console.log('Table creation result:', result);
    console.log(`Table [${tableName}] created successfully`);
  } catch (error) {
    console.error('Error in createTable:', error);
    console.error('SQL Error details:', {
      message: error.message,
      number: error.number,
      state: error.state,
      class: error.class,
      serverName: error.serverName,
      procName: error.procName,
      lineNumber: error.lineNumber,
    });
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
 * Insert data into the created table using bulk operations
 * @param {Object} pool - Database connection pool
 * @param {string} tableName - Name of the table
 * @param {Array} headers - Array of header objects
 * @param {Array} data - Array of data objects
 * @returns {number} - Number of rows inserted
 */
const insertData = async (pool, tableName, headers, data) => {
  try {
    if (data.length === 0) {
      console.log('No data to insert');
      return 0;
    }

    console.log(`Bulk inserting ${data.length} rows into table ${tableName}`);

    // Use SQL Server's bulk insert capability
    const table = new sql.Table(`dbo.${tableName}`);

    // Define columns for bulk insert
    headers.forEach((header) => {
      const columnName = sanitizeColumnName(header.name);
      const sqlType = getSQLParameterType(header.type);
      table.columns.add(columnName, sqlType, { nullable: true });
    });

    // Add all rows to the table
    data.forEach((row) => {
      const rowValues = headers.map((header) => {
        const value = row[header.name];
        return convertValue(value, header.type);
      });
      table.rows.add(...rowValues);
    });

    console.log('Executing bulk insert...');
    const request = pool.request();
    await request.bulk(table);

    console.log(`Successfully bulk inserted ${data.length} rows`);
    return data.length;
  } catch (error) {
    console.error('Error in bulk insert:', error);

    // Fallback to single row inserts if bulk insert fails
    // console.log('Bulk insert failed, falling back to single row inserts...');
    // return await insertDataSingleRows(pool, tableName, headers, data);
  }
};

/**
 * Fallback method: Insert data row by row (slower but more reliable)
 */
// const insertDataSingleRows = async (pool, tableName, headers, data) => {
//   try {
//     console.log(`Fallback: Inserting ${data.length} rows one by one...`);

//     let insertedCount = 0;

//     // Build dynamic INSERT query once
//     const columnNames = headers
//       .map((h) => `[${sanitizeColumnName(h.name)}]`)
//       .join(', ');
//     const valuePlaceholders = headers
//       .map((_, index) => `@param${index}`)
//       .join(', ');

//     const insertSQL = `
//       INSERT INTO [dbo].[${tableName}] (${columnNames})
//       VALUES (${valuePlaceholders})
//     `;

//     // Process in smaller batches for better performance
//     const batchSize = 50;
//     for (
//       let batchStart = 0;
//       batchStart < data.length;
//       batchStart += batchSize
//     ) {
//       const batchEnd = Math.min(batchStart + batchSize, data.length);
//       console.log(
//         `Processing batch: rows ${batchStart + 1}-${batchEnd} of ${data.length}`
//       );

//       for (let i = batchStart; i < batchEnd; i++) {
//         const row = data[i];
//         const request = pool.request();

//         // Add parameters for each column
//         headers.forEach((header, index) => {
//           const value = row[header.name];
//           const convertedValue = convertValue(value, header.type);
//           const sqlType = getSQLParameterType(header.type);
//           request.input(`param${index}`, sqlType, convertedValue);
//         });

//         await request.query(insertSQL);
//         insertedCount++;
//       }

//       // Show progress every batch
//       console.log(
//         `Completed ${insertedCount} of ${data.length} rows (${Math.round(
//           (insertedCount / data.length) * 100
//         )}%)`
//       );
//     }

//     console.log(
//       `Successfully inserted all ${insertedCount} rows using single row method`
//     );
//     return insertedCount;
//   } catch (error) {
//     console.error('Error in single row insert fallback:', error);
//     throw error;
//   }
// };

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

module.exports = {
  createTableFromFileData,
};
