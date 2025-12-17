const BaseFileProcessor = require('./BaseFileProcessor');
const ExcelJS = require('exceljs');

class ExcelProcessor extends BaseFileProcessor {
  async process() {
    try {
      const workbook = new ExcelJS.Workbook();

      // LOAD FROM BUFFER OR FILE
      if (this.isBuffer && this.buffer) {
        await workbook.xlsx.load(this.buffer);
      } else if (this.filePath) {
        await workbook.xlsx.readFile(this.filePath);
      } else {
        throw new Error('No buffer or file path provided');
      }

      const worksheet = workbook.worksheets[0];

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
          type: 'TEXT'
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

            if (rowNumber === 2) {
              headers[colNumber - 1].type = this.detectDataType(cell.value);
            }
          }
        });

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
