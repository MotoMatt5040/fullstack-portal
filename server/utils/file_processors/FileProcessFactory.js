// server/utils/file_processors/FileProcessFactory.js
const path = require('path');
const CSVProcessor = require('./CSVProcessor');
const ExcelProcessor = require('./ExcelProcessor');
const JSONProcessor = require('./JSONProcessor');
const TextProcessor = require('./TextProcessor');
const XMLProcessor = require('./XMLProcessor');

// Factory Class
class FileProcessorFactory {
  static processorMap = {
    '.csv': CSVProcessor,
    '.xlsx': ExcelProcessor,
    '.xls': ExcelProcessor,
    '.json': JSONProcessor,
    '.txt': TextProcessor,
    '.xml': XMLProcessor,
  };

  // Original method - works with file paths
  static create(filePath, tableName, fileExtension = null) {
    const extension = fileExtension || path.extname(filePath).toLowerCase();
    const ProcessorClass = this.processorMap[extension];

    if (!ProcessorClass) {
      throw new Error(
        `Unsupported file type: ${extension}. Supported types: ${Object.keys(
          this.processorMap
        ).join(', ')}`
      );
    }

    return new ProcessorClass(filePath, tableName);
  }

  // NEW: Create processor from buffer (for memory storage)
  static createFromBuffer(buffer, tableName, fileExtension) {
    const extension = fileExtension.toLowerCase();
    const ProcessorClass = this.processorMap[extension];

    if (!ProcessorClass) {
      throw new Error(
        `Unsupported file type: ${extension}. Supported types: ${Object.keys(
          this.processorMap
        ).join(', ')}`
      );
    }

    // Create processor instance with buffer instead of file path
    const processor = new ProcessorClass(null, tableName);
    processor.buffer = buffer; // Add buffer to processor instance
    processor.isBuffer = true; // Flag to indicate buffer mode
    return processor;
  }

  static getSupportedExtensions() {
    return Object.keys(this.processorMap);
  }

  static isSupported(extension) {
    return extension.toLowerCase() in this.processorMap;
  }

  static registerProcessor(extension, ProcessorClass) {
    this.processorMap[extension.toLowerCase()] = ProcessorClass;
  }
}

module.exports = FileProcessorFactory;