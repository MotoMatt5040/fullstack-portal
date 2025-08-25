const sql = require('mssql');
const XLSX = require('xlsx');
const withDbConnection = require('../config/dbConn');

/**
 * Main service function to process Excel file upload
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} fileName - Original file name
 * @param {string} uploadedBy - User who uploaded the file
 */
const processExcelUpload = async (fileBuffer, fileName, uploadedBy) => {
  return withDbConnection({
    database: 'promark', 
    queryFn: async (pool) => {
      try {
        // Parse Excel file
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; // Use first sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: null,
          blankrows: false
        });
        
        if (jsonData.length === 0) {
          throw new Error('Excel file is empty');
        }
        
        // Extract headers (first row)
        const headers = jsonData[0].filter(header => header !== null && header !== undefined && header !== '');
        
        if (headers.length === 0) {
          throw new Error('No valid headers found in Excel file');
        }
        
        // Convert remaining rows to objects
        const dataRows = jsonData.slice(1)
          .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
          .map(row => {
            const rowObj = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index] || null;
            });
            return rowObj;
          });
        
        if (dataRows.length === 0) {
          throw new Error('No data rows found in Excel file');
        }
        
        // Generate table name based on file name and timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '_').slice(0, -5);
        const baseTableName = fileName
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[^a-zA-Z0-9_]/g, '_') // Sanitize
          .substring(0, 50); // Limit length
        
        const tableName = `uploaded_${baseTableName}_${timestamp}`;
        
        // Create dynamic table
        const finalTableName = await createDynamicTable(tableName, headers, dataRows, pool);
        
        // Insert data
        const insertResult = await insertDataIntoTable(
          finalTableName, 
          headers, 
          dataRows, 
          fileName, 
          uploadedBy, 
          pool
        );
        
        return {
          success: true,
          tableName: finalTableName,
          headers: headers,
          rowsInserted: insertResult.insertedRows,
          totalRows: dataRows.length,
          sheetName: sheetName,
          message: `Successfully uploaded ${insertResult.insertedRows} rows to table ${finalTableName}`
        };
        
      } catch (error) {
        console.error('Error processing Excel upload:', error);
        throw new Error(`Failed to process Excel file: ${error.message}`);
      }
    },
    fnName: 'processExcelUpload',
    allowRetry: false
  });
};

module.exports = {
  processExcelUpload,
};