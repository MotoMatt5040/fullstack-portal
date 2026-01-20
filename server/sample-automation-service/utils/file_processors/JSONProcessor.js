const BaseFileProcessor = require('./BaseFileProcessor');
const fs = require('fs').promises;

class JSONProcessor extends BaseFileProcessor {
  async process() {
    try {
      let fileContent;

      // Handle buffer or file path
      if (this.isBuffer && this.buffer) {
        fileContent = this.buffer.toString('utf8');
      } else if (this.filePath) {
        fileContent = await fs.readFile(this.filePath, 'utf8');
      } else {
        throw new Error('No buffer or file path provided');
      }

      const jsonData = JSON.parse(fileContent);

      if (!Array.isArray(jsonData)) {
        throw new Error('JSON file must contain an array of objects');
      }

      if (jsonData.length === 0) {
        throw new Error('No data found in JSON file');
      }

      const headers = Object.keys(jsonData[0]).map(key => ({
        name: key,
        type: this.detectDataType(jsonData[0][key])
      }));

      return {
        headers: headers,
        tableName: this.tableName,
        rowsInserted: jsonData.length,
        totalRows: jsonData.length,
        data: jsonData
      };
    } catch (error) {
      throw new Error(`Error processing JSON file: ${error.message}`);
    }
  }
}

module.exports = JSONProcessor;
