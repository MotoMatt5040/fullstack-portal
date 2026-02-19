const BaseFileProcessor = require('./BaseFileProcessor');
const ExcelJS = require('exceljs');
const fs = require('fs');
const { Readable } = require('stream');

class ExcelProcessor extends BaseFileProcessor {
  // Process cell value - convert Date objects to mm/dd/yyyy format
  // so they can be processed by sp_FormatRDateColumn stored procedure
  processCellValue(value, headerName) {
    // Check if value is a Date object (Excel stores dates as Date objects)
    if (value instanceof Date && !isNaN(value.getTime())) {
      // Return in mm/dd/yyyy format for the stored procedure to convert
      const month = value.getMonth() + 1;
      const day = value.getDate();
      const year = value.getFullYear();
      return `${month}/${day}/${year}`;
    }
    return value;
  }

  _getReadStream() {
    if (this.isBuffer && this.buffer) {
      return Readable.from(this.buffer);
    } else if (this.filePath) {
      return fs.createReadStream(this.filePath);
    }
    throw new Error('No buffer or file path provided');
  }

  _processRow(row, headers, isHeaderRow, isFirstDataRow) {
    if (isHeaderRow) {
      row.eachCell((cell, colNumber) => {
        headers.push({
          name: cell.value?.toString() || `Column_${colNumber}`,
          type: 'TEXT'
        });
      });
      return null;
    }

    const rowData = {};
    row.eachCell((cell, colNumber) => {
      const headerName = headers[colNumber - 1]?.name;
      if (headerName) {
        rowData[headerName] = this.processCellValue(cell.value, headerName);
        if (isFirstDataRow) {
          headers[colNumber - 1].type = this.detectDataType(rowData[headerName]);
        }
      }
    });

    return Object.keys(rowData).length > 0 ? rowData : null;
  }

  async process() {
    try {
      const stream = this._getReadStream();
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream);

      const jsonData = [];
      const headers = [];

      for await (const worksheetReader of workbookReader) {
        let rowNumber = 0;
        for await (const row of worksheetReader) {
          rowNumber++;
          const isHeaderRow = rowNumber === 1;
          const isFirstDataRow = rowNumber === 2;

          const rowData = this._processRow(row, headers, isHeaderRow, isFirstDataRow);
          if (rowData) {
            jsonData.push(rowData);
          }
        }
        break; // Only process first worksheet
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

  async processHeaders() {
    try {
      const stream = this._getReadStream();
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(stream);

      const headers = [];

      for await (const worksheetReader of workbookReader) {
        let rowNumber = 0;
        for await (const row of worksheetReader) {
          rowNumber++;
          if (rowNumber === 1) {
            this._processRow(row, headers, true, false);
          } else if (rowNumber === 2) {
            this._processRow(row, headers, false, true);
            break;
          }
        }
        break; // Only process first worksheet
      }

      // Destroy the stream to stop reading the rest of the file
      stream.destroy();

      if (headers.length === 0) {
        throw new Error('No headers found in Excel file');
      }

      return {
        headers: headers,
        tableName: this.tableName,
        rowsInserted: 0,
        totalRows: 0,
        data: []
      };
    } catch (error) {
      throw new Error(`Error processing Excel file: ${error.message}`);
    }
  }
}

module.exports = ExcelProcessor;
