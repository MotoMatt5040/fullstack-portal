const FileProcessorFactory = require('./FileProcessorFactory');
const BaseFileProcessor = require('./BaseFileProcessor');
const CSVProcessor = require('./CSVProcessor');
const ExcelProcessor = require('./ExcelProcessor');
const JSONProcessor = require('./JSONProcessor');
const TextProcessor = require('./TextProcessor');
const XMLProcessor = require('./XMLProcessor');

module.exports = {
  FileProcessorFactory,
  BaseFileProcessor,
  CSVProcessor,
  ExcelProcessor,
  JSONProcessor,
  TextProcessor,
  XMLProcessor
};