const BaseFileProcessor = require('./BaseFileProcessor');
const ExcelJS = require('exceljs');

class ExcelProcessor extends BaseFileProcessor {
  async process() {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);
      
      const worksheet = workbook.worksheets[0]; // Use first worksheet
      
      if (!worksheet || worksheet.rowCount === 0) {
        throw new Error('No data found in Excel file');
      }

      const jsonData = [];
      const headers = [];
      
      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers.push({
          name: cell.value?.toString() || `Column_${colNumber}`,
          type: 'TEXT' // Will be refined when we see actual data
        });
      });

      // Process data rows
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};
        
        row.eachCell((cell, colNumber) => {
          const headerName = headers[colNumber - 1]?.name;
          if (headerName) {
            rowData[headerName] = cell.value;
            
            // Refine data type based on actual data
            if (rowNumber === 2) { // First data row
              headers[colNumber - 1].type = this.detectDataType(cell.value);
            }
          }
        });
        
        // Only add row if it has data
        if (Object.keys(rowData).length > 0) {
          jsonData.push(rowData);
        }
      }

      if (jsonData.length === 0) {
        throw new Error('No data rows found in Excel file');
      }

      return {
        headers: headers,
        tableName: this.tableName,
        rowsInserted: jsonData.length,
        totalRows: jsonData.length,
        data: jsonData
      };
    } catch (error) {
      throw new Error(`Error processing Excel file: ${error.message}`);
    }
  }
}

module.exports = ExcelProcessor;