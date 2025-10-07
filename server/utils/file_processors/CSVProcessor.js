const BaseFileProcessor = require('./BaseFileProcessor');
const fs = require('fs');
const csv = require('csv-parser');
const { Readable } = require('stream'); // ⭐ ADD THIS IMPORT

class CSVProcessor extends BaseFileProcessor {
  async process() {
    return new Promise((resolve, reject) => {
      const results = [];
      const headers = [];
      let isFirstRow = true;

      // ⭐ CREATE STREAM BASED ON BUFFER OR FILE PATH
      let stream;
      if (this.isBuffer && this.buffer) {
        // Create readable stream from buffer
        stream = Readable.from(this.buffer);
      } else if (this.filePath) {
        // Create read stream from file (backward compatibility)
        stream = fs.createReadStream(this.filePath);
      } else {
        return reject(new Error('No buffer or file path provided'));
      }

      // ⭐ USE THE STREAM VARIABLE INSTEAD OF fs.createReadStream
      stream
        .pipe(csv())
        .on('headers', (headerList) => {
          headerList.forEach(header => {
            headers.push({
              name: header,
              type: 'TEXT'
            });
          });
        })
        .on('data', (data) => {
          if (isFirstRow) {
            if (headers.length === 0) {
              Object.keys(data).forEach(key => {
                headers.push({
                  name: key,
                  type: this.detectDataType(data[key])
                });
              });
            } else {
              headers.forEach((header) => {
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