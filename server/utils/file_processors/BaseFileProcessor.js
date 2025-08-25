// Base File Processor Interface
class BaseFileProcessor {
  constructor(filePath, tableName) {
    this.filePath = filePath;
    this.tableName = tableName;
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

    // Try to parse as number
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return Number.isInteger(numValue) ? 'INTEGER' : 'REAL';
    }

    // Try to parse as date
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime())) {
      return 'DATE';
    }

    return 'TEXT';
  }
}

module.exports = BaseFileProcessor;