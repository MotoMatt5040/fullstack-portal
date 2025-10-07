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

    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime())) {
      return 'DATE';
    }

    return 'TEXT';
  }
}

module.exports = BaseFileProcessor;