const BaseFileProcessor = require('./BaseFileProcessor');
const fs = require('fs').promises;

class TextProcessor extends BaseFileProcessor {
  async process() {
    try {
      const fileContent = await fs.readFile(this.filePath, 'utf8');
      const lines = fileContent.split('\n').filter(line => line.trim() !== '');

      // Simple text processing - each line is a row with single column
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