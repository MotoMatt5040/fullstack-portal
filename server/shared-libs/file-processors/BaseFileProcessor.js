// server/utils/file_processors/BaseFileProcessor.js
class BaseFileProcessor {
  constructor(filePath, tableName) {
    this.filePath = filePath;
    this.tableName = tableName;
    this.buffer = null; // Will be set if using buffer mode
    this.isBuffer = false; // Flag for buffer mode
  }

  async process() {
    throw new Error('Process method must be implemented by subclass');
  }

  async processHeaders() {
    return this.process();
  }

  detectDataType(value) {
    if (value === null || value === undefined || value === '') {
      return 'TEXT';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INTEGER' : 'REAL';
    }

    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    }

    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return Number.isInteger(numValue) ? 'INTEGER' : 'REAL';
    }

    // Only detect dates if the value looks like an actual date string
    // Patterns: YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, etc.
    // Avoid false positives from random text that Date() can parse
    if (typeof value === 'string') {
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // ISO format: 2024-01-15
        /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // US format: 1/15/2024 or 01/15/24
        /^\d{1,2}-\d{1,2}-\d{2,4}/, // Dash format: 1-15-2024
        /^\d{1,2}\.\d{1,2}\.\d{2,4}/, // Dot format: 1.15.2024
        /^\w{3}\s+\d{1,2},?\s+\d{4}/, // Month name: Jan 15, 2024
        /^\d{1,2}\s+\w{3}\s+\d{4}/, // Day Month Year: 15 Jan 2024
      ];

      const looksLikeDate = datePatterns.some((pattern) => pattern.test(value.trim()));
      if (looksLikeDate) {
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
          return 'DATE';
        }
      }
    }

    return 'TEXT';
  }
}

module.exports = BaseFileProcessor;
