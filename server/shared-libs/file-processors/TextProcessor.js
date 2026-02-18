const BaseFileProcessor = require('./BaseFileProcessor');
const fs = require('fs').promises;

class TextProcessor extends BaseFileProcessor {
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

      const lines = fileContent.split('\n').filter(line => line.trim() !== '');

      const data = lines.map((line, index) => ({
        line_number: index + 1,
        content: line.trim()
      }));

      const headers = [
        { name: 'line_number', type: 'INTEGER' },
        { name: 'content', type: 'TEXT' }
      ];

      return {
        headers: headers,
        tableName: this.tableName,
        rowsInserted: data.length,
        totalRows: data.length,
        data: data
      };
    } catch (error) {
      throw new Error(`Error processing text file: ${error.message}`);
    }
  }
}

module.exports = TextProcessor;
