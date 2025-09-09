// config/promarkConstants.js
/**
 * Promark Internal Variables Configuration
 * These constants are automatically added to all uploaded sample files
 */
const PROMARK_INTERNAL_VARIABLES = {
  VEND: { 
    type: 'INTEGER', 
    defaultValue: 5,
    description: 'Vendor ID - always 5 for Promark'
  },
  TFLAG: { 
    type: 'INTEGER', 
    defaultValue: 0,
    description: 'Terminate flag - always 0 initially'
  },
  // VTYPE: { 
  //   type: 'INTEGER', 
  //   defaultValue: 1,
  //   description: 'Variable type: 1=LL (Landline), 2=CELL'
  // },
  // SOURCE: { 
  //   type: 'INTEGER', 
  //   defaultValue: 1,
  //   description: 'Sample source: 1=LL_ONLY, 2=CELL_ONLY, 3=BOTH'
  // },
  // CALLID1: { 
  //   type: 'TEXT', 
  //   defaultValue: null,
  //   description: 'Call ID 1 - for tracking purposes'
  // },
  // CALLID2: { 
  //   type: 'TEXT', 
  //   defaultValue: null,
  //   description: 'Call ID 2 - for tracking purposes'
  // },
  // CALLID3: { 
  //   type: 'TEXT', 
  //   defaultValue: null,
  //   description: 'Call ID 3 - for tracking purposes'
  // },
  // CALLID4: { 
  //   type: 'TEXT', 
  //   defaultValue: null,
  //   description: 'Call ID 4 - for tracking purposes'
  // }
};

/**
 * Convert constants object to headers array format
 * @returns {Array} Array of header objects for table creation
 */
const getPromarkConstantsAsHeaders = () => {
  return Object.entries(PROMARK_INTERNAL_VARIABLES).map(([name, config]) => ({
    name,
    type: config.type,
    defaultValue: config.defaultValue,
    isPromarkConstant: true
  }));
};

/**
 * Get just the constant names
 * @returns {Array} Array of constant names
 */
const getPromarkConstantNames = () => {
  return Object.keys(PROMARK_INTERNAL_VARIABLES);
};

/**
 * Get default value for a specific constant
 * @param {string} constantName - Name of the constant
 * @returns {any} Default value for the constant
 */
const getPromarkConstantDefault = (constantName) => {
  return PROMARK_INTERNAL_VARIABLES[constantName]?.defaultValue;
};

module.exports = {
  PROMARK_INTERNAL_VARIABLES,
  getPromarkConstantsAsHeaders,
  getPromarkConstantNames,
  getPromarkConstantDefault
};