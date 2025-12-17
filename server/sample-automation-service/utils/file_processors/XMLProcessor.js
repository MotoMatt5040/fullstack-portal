const BaseFileProcessor = require('./BaseFileProcessor');
const fs = require('fs').promises;
const xml2js = require('xml2js');

class XMLProcessor extends BaseFileProcessor {
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

      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      });

      const result = await parser.parseStringPromise(fileContent);

      let data = [];
      let headers = [];

      // Try to find array-like structures in the XML
      const rootKeys = Object.keys(result);
      let arrayData = null;

      // Look for the first array-like structure
      for (const key of rootKeys) {
        const value = result[key];
        if (Array.isArray(value)) {
          arrayData = value;
          break;
        } else if (typeof value === 'object' && value !== null) {
          // Check nested objects for arrays
          const nestedKeys = Object.keys(value);
          for (const nestedKey of nestedKeys) {
            if (Array.isArray(value[nestedKey])) {
              arrayData = value[nestedKey];
              break;
            }
          }
          if (arrayData) break;
        }
      }

      if (!arrayData) {
        // If no array found, treat the entire object as a single record
        data = [this.flattenObject(result)];
      } else {
        // Process array data
        data = arrayData.map(item => this.flattenObject(item));
      }

      if (data.length === 0) {
        throw new Error('No data found in XML file');
      }

      // Extract headers from first object
      headers = Object.keys(data[0]).map(key => ({
        name: key,
        type: this.detectDataType(data[0][key])
      }));

      return {
        headers: headers,
        tableName: this.tableName,
        rowsInserted: data.length,
        totalRows: data.length,
        data: data
      };
    } catch (error) {
      throw new Error(`Error processing XML file: ${error.message}`);
    }
  }

  // Helper method to flatten nested objects for tabular representation
  flattenObject(obj, prefix = '') {
    const flattened = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Recursively flatten nested objects
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          // Convert arrays to JSON strings for simplicity
          flattened[newKey] = JSON.stringify(value);
        } else {
          flattened[newKey] = value;
        }
      }
    }

    return flattened;
  }
}

module.exports = XMLProcessor;
