const BaseFileProcessor = require('./BaseFileProcessor');
const fs = require('fs');
const csv = require('csv-parser');

class CSVProcessor extends BaseFileProcessor {
  async process() {
    return new Promise((resolve, reject) => {
      const results = [];
      const headers = [];
      let isFirstRow = true;

      fs.createReadStream(this.filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headerList.forEach(header => {
            headers.push({
              name: header,
              type: 'TEXT' // Will be refined when we see actual data
            });
          });
        })
        .on('data', (data) => {
          if (isFirstRow) {
            // If headers weren't captured in 'headers' event
            if (headers.length === 0) {
              Object.keys(data).forEach(key => {
                headers.push({
                  name: key,
                  type: this.detectDataType(data[key])
                });
              });
            } else {
              // Refine header types based on actual data
              headers.forEach((header, index) => {
                const key = header.name;
                if (data[key] !== undefined) {
                  header.type = this.detectDataType(data[key]);
                }
              });
            }
            isFirstRow = false;
          }
          results.push(data);
        })
        .on('end', () => {
          resolve({
            headers: headers,
            tableName: this.tableName,
            rowsInserted: results.length,
            totalRows: results.length,
            data: results
          });
        })
        .on('error', reject);
    });
  }
}

module.exports = CSVProcessor;