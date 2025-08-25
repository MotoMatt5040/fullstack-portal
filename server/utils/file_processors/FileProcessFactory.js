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

  static getSupportedExtensions() {
    return Object.keys(this.processorMap);
  }

  static isSupported(extension) {
    return extension.toLowerCase() in this.processorMap;
  }

  // Method to register new processors dynamically
  static registerProcessor(extension, ProcessorClass) {
    this.processorMap[extension.toLowerCase()] = ProcessorClass;
  }
}

module.exports = FileProcessorFactory;
