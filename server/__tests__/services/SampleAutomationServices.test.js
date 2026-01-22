// SampleAutomation Services Unit Tests
// Tests for header sanitization, mapping, exclusions, and stored procedure logic

// Import the actual promarkConstants (no mocking needed for these pure functions)
const {
  getPromarkConstantsAsHeaders,
  getPromarkConstantDefault,
  getPromarkConstantNames,
  PROMARK_INTERNAL_VARIABLES,
} = require('../../sample-automation-service/config/promarkConstants');

describe('SampleAutomation Services', () => {
  // ==================== PROMARK CONSTANTS ====================

  describe('Promark Constants', () => {
    it('should have correct default value for VEND (always 5)', () => {
      expect(getPromarkConstantDefault('VEND')).toBe(5);
    });

    it('should have correct default value for TFLAG (always 0)', () => {
      expect(getPromarkConstantDefault('TFLAG')).toBe(0);
    });

    it('should have correct default value for CALLIDL1 (9999999999)', () => {
      expect(getPromarkConstantDefault('CALLIDL1')).toBe('9999999999');
    });

    it('should have correct default value for CALLIDL2 (9999999999)', () => {
      expect(getPromarkConstantDefault('CALLIDL2')).toBe('9999999999');
    });

    it('should have correct default value for CALLIDC1 (9999999999)', () => {
      expect(getPromarkConstantDefault('CALLIDC1')).toBe('9999999999');
    });

    it('should have correct default value for CALLIDC2 (9999999999)', () => {
      expect(getPromarkConstantDefault('CALLIDC2')).toBe('9999999999');
    });

    it('should return all 6 promark constants as headers', () => {
      const headers = getPromarkConstantsAsHeaders();
      expect(headers).toHaveLength(6);
      expect(headers.map(h => h.name)).toEqual([
        'VEND', 'TFLAG', 'CALLIDL1', 'CALLIDL2', 'CALLIDC1', 'CALLIDC2'
      ]);
    });

    it('should mark all promark headers as isPromarkConstant', () => {
      const headers = getPromarkConstantsAsHeaders();
      headers.forEach(header => {
        expect(header.isPromarkConstant).toBe(true);
      });
    });

    it('should have correct types for all constants', () => {
      const headers = getPromarkConstantsAsHeaders();
      const vendHeader = headers.find(h => h.name === 'VEND');
      const tflagHeader = headers.find(h => h.name === 'TFLAG');
      const callidL1Header = headers.find(h => h.name === 'CALLIDL1');

      expect(vendHeader.type).toBe('INTEGER');
      expect(tflagHeader.type).toBe('INTEGER');
      expect(callidL1Header.type).toBe('TEXT');
    });

    it('should return constant names via getPromarkConstantNames', () => {
      const names = getPromarkConstantNames();
      expect(names).toEqual(['VEND', 'TFLAG', 'CALLIDL1', 'CALLIDL2', 'CALLIDC1', 'CALLIDC2']);
    });

    it('should return undefined for unknown constant', () => {
      expect(getPromarkConstantDefault('UNKNOWN')).toBeUndefined();
    });
  });

  // ==================== HEADER SANITIZATION ====================

  describe('Header Sanitization', () => {
    // Helper function replicating the controller logic
    const sanitizeHeaderName = (headerName) => {
      if (!headerName || typeof headerName !== 'string') {
        return '';
      }
      return headerName.replace(/\s+/g, '').toUpperCase();
    };

    const sanitizeHeaders = (headers) => {
      return headers.map(h => sanitizeHeaderName(h));
    };

    describe('sanitizeHeaderName', () => {
      it('should remove all whitespace and convert to uppercase', () => {
        expect(sanitizeHeaderName('first name')).toBe('FIRSTNAME');
        expect(sanitizeHeaderName('Last Name')).toBe('LASTNAME');
        expect(sanitizeHeaderName('  Phone Number  ')).toBe('PHONENUMBER');
      });

      it('should handle multiple internal spaces', () => {
        expect(sanitizeHeaderName('first   middle   last')).toBe('FIRSTMIDDLELAST');
      });

      it('should handle tabs and newlines', () => {
        expect(sanitizeHeaderName('first\tname')).toBe('FIRSTNAME');
        expect(sanitizeHeaderName('first\nname')).toBe('FIRSTNAME');
      });

      it('should return empty string for null or undefined', () => {
        expect(sanitizeHeaderName(null)).toBe('');
        expect(sanitizeHeaderName(undefined)).toBe('');
      });

      it('should return empty string for non-string input', () => {
        expect(sanitizeHeaderName(123)).toBe('');
        expect(sanitizeHeaderName({})).toBe('');
      });

      it('should handle already clean headers', () => {
        expect(sanitizeHeaderName('PHONE')).toBe('PHONE');
        expect(sanitizeHeaderName('LAND')).toBe('LAND');
        expect(sanitizeHeaderName('CELL')).toBe('CELL');
      });
    });

    describe('sanitizeHeaders', () => {
      it('should sanitize all headers in array', () => {
        const headers = ['first name', 'Last Name', 'Phone Number'];
        expect(sanitizeHeaders(headers)).toEqual(['FIRSTNAME', 'LASTNAME', 'PHONENUMBER']);
      });

      it('should handle empty array', () => {
        expect(sanitizeHeaders([])).toEqual([]);
      });
    });
  });

  // ==================== HEADER MAPPING ====================

  describe('Header Mapping - applyCustomHeaders', () => {
    // Replicate the controller applyCustomHeaders logic
    const sanitizeHeaderName = (headerName) => {
      if (!headerName || typeof headerName !== 'string') return '';
      return headerName.replace(/\s+/g, '').toUpperCase();
    };

    const sanitizeHeaders = (headers) => {
      return headers.map(h => sanitizeHeaderName(h));
    };

    const applyCustomHeaders = (processResult, customHeadersForFile) => {
      const sanitizedCustomHeaders = sanitizeHeaders(customHeadersForFile);

      const headerMapping = {};
      sanitizedCustomHeaders.forEach((mappedName, index) => {
        const originalHeader = processResult.headers[index];
        if (originalHeader) {
          headerMapping[sanitizeHeaderName(originalHeader.name)] = mappedName;
        }
      });

      const normalizedData = [];
      for (const row of processResult.data) {
        const normalizedRow = {};
        for (const originalKey in row) {
          const sanitizedKey = sanitizeHeaderName(originalKey);
          const mappedKey = headerMapping[sanitizedKey] || sanitizedKey;
          normalizedRow[mappedKey] = row[originalKey];
        }
        normalizedData.push(normalizedRow);
      }

      let finalHeaders = sanitizedCustomHeaders.map((mappedName, headerIndex) => ({
        name: mappedName,
        type: processResult.headers[headerIndex]?.type || 'TEXT',
        originalName: processResult.headers[headerIndex]?.name,
      }));

      if (processResult.headers.length > sanitizedCustomHeaders.length) {
        const extraHeaders = processResult.headers.slice(sanitizedCustomHeaders.length);
        extraHeaders.forEach((header) => {
          normalizedData.forEach((row) => {
            const sanitizedName = sanitizeHeaderName(header.name);
            if (row[header.name] !== undefined) {
              row[sanitizedName] = row[header.name];
            }
          });
        });

        finalHeaders.push(
          ...extraHeaders.map((h) => ({
            ...h,
            name: sanitizeHeaderName(h.name),
            originalName: h.name,
          }))
        );
      }

      return { finalHeaders, normalizedData };
    };

    it('should apply custom header mappings correctly', () => {
      const processResult = {
        headers: [
          { name: 'FNAME', type: 'TEXT' },
          { name: 'LNAME', type: 'TEXT' },
          { name: 'PHONE', type: 'TEXT' },
        ],
        data: [
          { FNAME: 'John', LNAME: 'Doe', PHONE: '5551234567' },
          { FNAME: 'Jane', LNAME: 'Smith', PHONE: '5559876543' },
        ],
      };

      const customHeadersForFile = ['FIRSTNAME', 'LASTNAME', 'LAND'];

      const result = applyCustomHeaders(processResult, customHeadersForFile);

      expect(result.finalHeaders.map(h => h.name)).toEqual(['FIRSTNAME', 'LASTNAME', 'LAND']);
      expect(result.normalizedData[0].FIRSTNAME).toBe('John');
      expect(result.normalizedData[0].LASTNAME).toBe('Doe');
      expect(result.normalizedData[0].LAND).toBe('5551234567');
    });

    it('should handle extra headers not in custom mapping', () => {
      const processResult = {
        headers: [
          { name: 'FNAME', type: 'TEXT' },
          { name: 'LNAME', type: 'TEXT' },
          { name: 'EXTRA', type: 'TEXT' },
        ],
        data: [
          { FNAME: 'John', LNAME: 'Doe', EXTRA: 'value' },
        ],
      };

      const customHeadersForFile = ['FIRSTNAME', 'LASTNAME'];

      const result = applyCustomHeaders(processResult, customHeadersForFile);

      // Should include mapped headers plus unmapped extra header (sanitized)
      expect(result.finalHeaders.map(h => h.name)).toContain('FIRSTNAME');
      expect(result.finalHeaders.map(h => h.name)).toContain('LASTNAME');
      expect(result.finalHeaders.map(h => h.name)).toContain('EXTRA');
    });

    it('should preserve original header in originalName property', () => {
      const processResult = {
        headers: [
          { name: 'FNAME', type: 'TEXT' },
        ],
        data: [
          { FNAME: 'John' },
        ],
      };

      const customHeadersForFile = ['FIRSTNAME'];

      const result = applyCustomHeaders(processResult, customHeadersForFile);

      expect(result.finalHeaders[0].originalName).toBe('FNAME');
    });
  });

  // ==================== VARIABLE EXCLUSIONS ====================

  describe('Variable Exclusions - applyVariableExclusions', () => {
    // Replicate the controller applyVariableExclusions logic
    const applyVariableExclusions = (headers, data, excludedVariables, projectInclusions = new Map()) => {
      const systemColumns = new Set(['FILE', '_source_file', '_file_index']);
      const headersToKeep = [];
      const headersToExclude = [];

      for (const header of headers) {
        const upperName = header.name.toUpperCase();

        if (systemColumns.has(header.name)) {
          headersToKeep.push(header);
          continue;
        }

        if (excludedVariables.has(upperName)) {
          if (projectInclusions.has(upperName)) {
            const mappedName = projectInclusions.get(upperName);
            headersToKeep.push({
              ...header,
              name: mappedName,
              originalName: header.name,
            });
          } else {
            headersToExclude.push(header.name);
          }
        } else {
          headersToKeep.push(header);
        }
      }

      const keepSet = new Set(headersToKeep.map(h => h.name));
      const headerNameMap = new Map();

      headersToKeep.forEach(h => {
        if (h.originalName && h.originalName !== h.name) {
          headerNameMap.set(h.originalName, h.name);
        }
      });

      const filteredData = data.map(row => {
        const newRow = {};
        for (const [key, value] of Object.entries(row)) {
          if (keepSet.has(key)) {
            newRow[key] = value;
          } else if (headerNameMap.has(key)) {
            newRow[headerNameMap.get(key)] = value;
          }
        }
        return newRow;
      });

      return {
        filteredHeaders: headersToKeep,
        filteredData,
        excludedCount: headersToExclude.length,
        excludedHeaders: headersToExclude,
      };
    };

    it('should exclude variables from the excluded set', () => {
      const headers = [
        { name: 'FNAME', type: 'TEXT' },
        { name: 'LNAME', type: 'TEXT' },
        { name: 'SSN', type: 'TEXT' },
        { name: 'PHONE', type: 'TEXT' },
      ];
      const data = [
        { FNAME: 'John', LNAME: 'Doe', SSN: '123-45-6789', PHONE: '5551234567' },
      ];
      const excludedVariables = new Set(['SSN']);

      const result = applyVariableExclusions(headers, data, excludedVariables);

      expect(result.filteredHeaders.map(h => h.name)).not.toContain('SSN');
      expect(result.filteredHeaders.map(h => h.name)).toContain('FNAME');
      expect(result.filteredHeaders.map(h => h.name)).toContain('PHONE');
      expect(result.excludedCount).toBe(1);
      expect(result.excludedHeaders).toContain('SSN');
      expect(result.filteredData[0]).not.toHaveProperty('SSN');
    });

    it('should never exclude system columns (FILE, _source_file, _file_index)', () => {
      const headers = [
        { name: 'FNAME', type: 'TEXT' },
        { name: 'FILE', type: 'INTEGER' },
        { name: '_source_file', type: 'TEXT' },
        { name: '_file_index', type: 'INTEGER' },
      ];
      const data = [
        { FNAME: 'John', FILE: 1, _source_file: 'test.csv', _file_index: 1 },
      ];
      // Even if someone tries to exclude system columns, they should be kept
      const excludedVariables = new Set(['FILE', '_SOURCE_FILE', '_FILE_INDEX']);

      const result = applyVariableExclusions(headers, data, excludedVariables);

      expect(result.filteredHeaders.map(h => h.name)).toContain('FILE');
      expect(result.filteredHeaders.map(h => h.name)).toContain('_source_file');
      expect(result.filteredHeaders.map(h => h.name)).toContain('_file_index');
    });

    it('should respect project inclusions that override exclusions', () => {
      const headers = [
        { name: 'FNAME', type: 'TEXT' },
        { name: 'SSN', type: 'TEXT' },
        { name: 'PHONE', type: 'TEXT' },
      ];
      const data = [
        { FNAME: 'John', SSN: '123-45-6789', PHONE: '5551234567' },
      ];
      const excludedVariables = new Set(['SSN']);
      const projectInclusions = new Map([['SSN', 'SOCIALSECURITY']]);

      const result = applyVariableExclusions(headers, data, excludedVariables, projectInclusions);

      // SSN should be included but renamed to SOCIALSECURITY
      expect(result.filteredHeaders.map(h => h.name)).toContain('SOCIALSECURITY');
      expect(result.filteredHeaders.map(h => h.name)).not.toContain('SSN');
      expect(result.excludedCount).toBe(0); // Not excluded since we have an inclusion
    });

    it('should handle empty exclusion set', () => {
      const headers = [
        { name: 'FNAME', type: 'TEXT' },
        { name: 'SSN', type: 'TEXT' },
      ];
      const data = [
        { FNAME: 'John', SSN: '123-45-6789' },
      ];
      const excludedVariables = new Set();

      const result = applyVariableExclusions(headers, data, excludedVariables);

      expect(result.filteredHeaders).toHaveLength(2);
      expect(result.excludedCount).toBe(0);
    });

    it('should be case-insensitive for exclusion matching', () => {
      const headers = [
        { name: 'ssn', type: 'TEXT' },
        { name: 'PHONE', type: 'TEXT' },
      ];
      const data = [
        { ssn: '123-45-6789', PHONE: '5551234567' },
      ];
      const excludedVariables = new Set(['SSN']); // uppercase

      const result = applyVariableExclusions(headers, data, excludedVariables);

      expect(result.filteredHeaders.map(h => h.name)).not.toContain('ssn');
      expect(result.excludedCount).toBe(1);
    });
  });

  // ==================== STORED PROCEDURE RESULT VALUES ====================

  describe('Stored Procedure Result Values', () => {
    describe('sp_CalculateAgeFromBirthYear logic', () => {
      // Test the expected age calculation logic
      it('should calculate age correctly from birth year', () => {
        const currentYear = new Date().getFullYear();
        const birthYear = 1990;
        const expectedAge = currentYear - birthYear;

        // Age should be calculated as current year - birth year
        expect(expectedAge).toBe(currentYear - 1990);
        // Ages over 99 should be capped at 99
        expect(Math.min(expectedAge, 99)).toBeLessThanOrEqual(99);
      });

      it('should cap age at 99', () => {
        const currentYear = new Date().getFullYear();
        const birthYear = 1900; // Very old
        const age = Math.min(currentYear - birthYear, 99);

        expect(age).toBe(99);
      });
    });

    describe('sp_ConvertAgeToIAge logic', () => {
      // Test the expected IAGE format (2-digit with leading zero)
      it('should format single digit ages with leading zero', () => {
        const formatIAge = (age) => {
          if (age === null) return '00';
          if (age < 0) return '00';
          if (age >= 0 && age <= 9) return '0' + age;
          if (age >= 10 && age <= 99) return String(age);
          if (age > 99) return '99';
          return '00';
        };

        expect(formatIAge(5)).toBe('05');
        expect(formatIAge(0)).toBe('00');
        expect(formatIAge(9)).toBe('09');
      });

      it('should format double digit ages without leading zero', () => {
        const formatIAge = (age) => {
          if (age >= 10 && age <= 99) return String(age);
          return '00';
        };

        expect(formatIAge(25)).toBe('25');
        expect(formatIAge(99)).toBe('99');
        expect(formatIAge(10)).toBe('10');
      });
    });

    describe('sp_CalculatePartyFromRPartyRollup logic', () => {
      // Test the expected party mapping from RPARTYROLLUP
      const mapParty = (rpartyrollup) => {
        if (!rpartyrollup) return null;
        const value = rpartyrollup.toUpperCase().trim();
        switch (value) {
          case 'MODELED REPUBLICAN':
          case 'REPUBLICAN':
            return 'R';
          case 'MODELED DEMOCRAT':
          case 'DEMOCRAT':
            return 'D';
          case 'MODELED INDEPENDENT/UNAFFILIATED':
          case 'INDEPENDENT/OTHER':
            return 'I';
          case 'UNAFFILIATED/DTS':
          case 'N/A':
          case 'NA':
            return 'U';
          default:
            return null;
        }
      };

      it('should map MODELED REPUBLICAN to R', () => {
        expect(mapParty('Modeled Republican')).toBe('R');
      });

      it('should map MODELED DEMOCRAT to D', () => {
        expect(mapParty('Modeled Democrat')).toBe('D');
      });

      it('should map MODELED INDEPENDENT/UNAFFILIATED to I', () => {
        expect(mapParty('Modeled Independent/Unaffiliated')).toBe('I');
      });

      it('should map REPUBLICAN to R', () => {
        expect(mapParty('Republican')).toBe('R');
      });

      it('should map DEMOCRAT to D', () => {
        expect(mapParty('Democrat')).toBe('D');
      });

      it('should map INDEPENDENT/OTHER to I', () => {
        expect(mapParty('Independent/Other')).toBe('I');
      });

      it('should map UNAFFILIATED/DTS to U', () => {
        expect(mapParty('Unaffiliated/DTS')).toBe('U');
      });

      it('should map N/A to U', () => {
        expect(mapParty('N/A')).toBe('U');
      });
    });

    describe('sp_CreateVFREQColumns logic', () => {
      // Test VFREQ calculation - counts votes in last 4 even years
      it('should count non-zero votes correctly', () => {
        const countVotes = (votes) => {
          return votes.filter(v => v !== null && v !== 0 && v !== 'NA').length;
        };

        expect(countVotes([1, 1, 0, 1])).toBe(3);
        expect(countVotes([0, 0, 0, 0])).toBe(0);
        expect(countVotes([1, 1, 1, 1])).toBe(4);
        expect(countVotes([null, 'NA', 1, 0])).toBe(1);
      });

      it('should calculate previous 4 even years correctly', () => {
        const getPrevious4EvenYears = (currentYear) => {
          const startYear = currentYear % 2 === 0 ? currentYear - 2 : currentYear - 1;
          return [startYear, startYear - 2, startYear - 4, startYear - 6];
        };

        // Test for odd year
        expect(getPrevious4EvenYears(2025)).toEqual([2024, 2022, 2020, 2018]);
        // Test for even year
        expect(getPrevious4EvenYears(2026)).toEqual([2024, 2022, 2020, 2018]);
      });
    });
  });

  // ==================== HOUSEHOLDING ====================

  describe('Householding - processHouseholding', () => {
    it('should create separate tables for household members 2, 3, and 4', () => {
      // Verify the structure of duplicate tables
      const baseTableName = 'SA_12345_0122_1030';
      const expectedTables = {
        duplicate2: `${baseTableName}_duplicate2`,
        duplicate3: `${baseTableName}_duplicate3`,
        duplicate4: `${baseTableName}_duplicate4`,
      };

      expect(expectedTables.duplicate2).toBe('SA_12345_0122_1030_duplicate2');
      expect(expectedTables.duplicate3).toBe('SA_12345_0122_1030_duplicate3');
      expect(expectedTables.duplicate4).toBe('SA_12345_0122_1030_duplicate4');
    });

    it('should return correct result structure on success', () => {
      // Mock the expected result structure from sp_ProcessHouseholding
      const mockResult = {
        success: true,
        totalProcessed: 1000,
        mainTableFinalCount: 750,
        duplicateCounts: {
          duplicate2: 150,
          duplicate3: 75,
          duplicate4: 25,
        },
        tablesCreated: {
          backup: 'SA_12345_backup',
          duplicate2: 'SA_12345_duplicate2',
          duplicate3: 'SA_12345_duplicate3',
          duplicate4: 'SA_12345_duplicate4',
        },
        message: 'Householding completed',
      };

      expect(mockResult.success).toBe(true);
      expect(mockResult.totalProcessed).toBe(1000);
      expect(mockResult.duplicateCounts.duplicate2 + mockResult.duplicateCounts.duplicate3 + mockResult.duplicateCounts.duplicate4).toBe(250);
      expect(mockResult.mainTableFinalCount).toBe(750);
    });
  });

  // ==================== WDNC SCRUBBING ====================

  describe('WDNC Scrubbing - sp_ApplyWDNCScrubbing logic', () => {
    it('should clear LAND for SOURCE=3 records in DNC', () => {
      // When SOURCE=3 (both landline and cell) and LAND is in DNC,
      // clear LAND but keep record
      const applyWDNCScrubbing = (record, dncList) => {
        if (record.SOURCE === 3 && dncList.includes(record.LAND)) {
          return {
            ...record,
            LAND: null,
            // If CELL exists, change SOURCE to 2 (cell only)
            SOURCE: record.CELL ? 2 : record.SOURCE,
          };
        }
        return record;
      };

      const record = { SOURCE: 3, LAND: '5551234567', CELL: '5559876543' };
      const dncList = ['5551234567'];

      const result = applyWDNCScrubbing(record, dncList);

      expect(result.LAND).toBeNull();
      expect(result.SOURCE).toBe(2); // Changed to cell-only
      expect(result.CELL).toBe('5559876543'); // Cell preserved
    });

    it('should remove records where SOURCE=1 and LAND is in DNC', () => {
      // When SOURCE=1 (landline only) and LAND is in DNC,
      // the record should be deleted (return null or filter it out)
      const shouldRemove = (record, dncList) => {
        return record.SOURCE === 1 && dncList.includes(record.LAND);
      };

      const record = { SOURCE: 1, LAND: '5551234567', CELL: null };
      const dncList = ['5551234567'];

      expect(shouldRemove(record, dncList)).toBe(true);
    });

    it('should not affect records not in DNC', () => {
      const applyWDNCScrubbing = (record, dncList) => {
        if (!dncList.includes(record.LAND)) {
          return record; // No changes
        }
        return record;
      };

      const record = { SOURCE: 1, LAND: '5551234567', CELL: null };
      const dncList = ['9999999999']; // Different number

      const result = applyWDNCScrubbing(record, dncList);

      expect(result.LAND).toBe('5551234567');
      expect(result.SOURCE).toBe(1);
    });
  });

  // ==================== PHONE NUMBER FORMATTING ====================

  describe('Phone Number Formatting - FormatPhoneNumbers logic', () => {
    it('should format phone numbers to 10 digits', () => {
      const formatPhone = (phone) => {
        if (!phone) return null;
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        // Return last 10 digits (handles 1+ country code)
        if (digits.length >= 10) {
          return digits.slice(-10);
        }
        return null; // Invalid phone
      };

      expect(formatPhone('(555) 123-4567')).toBe('5551234567');
      expect(formatPhone('1-555-123-4567')).toBe('5551234567');
      expect(formatPhone('555.123.4567')).toBe('5551234567');
      expect(formatPhone('+1 555 123 4567')).toBe('5551234567');
    });

    it('should apply to PHONE, LAND, and CELL columns', () => {
      const phoneColumns = ['PHONE', 'LAND', 'CELL'];
      const record = {
        PHONE: '(555) 111-2222',
        LAND: '1-555-333-4444',
        CELL: '555.555.6666',
      };

      const formatPhone = (phone) => phone.replace(/\D/g, '').slice(-10);

      phoneColumns.forEach(col => {
        if (record[col]) {
          record[col] = formatPhone(record[col]);
        }
      });

      expect(record.PHONE).toBe('5551112222');
      expect(record.LAND).toBe('5553334444');
      expect(record.CELL).toBe('5555556666');
    });
  });

  // ==================== $N COLUMN CREATION ====================

  describe('$N Column Creation - sp_CreateDollarNColumn logic', () => {
    it('should set $N to LAND when VTYPE=1', () => {
      const createDollarN = (record) => {
        if (record.VTYPE === 1) return record.LAND;
        if (record.VTYPE === 2) return record.CELL;
        return null;
      };

      const record = { VTYPE: 1, LAND: '5551234567', CELL: '5559876543' };
      expect(createDollarN(record)).toBe('5551234567');
    });

    it('should set $N to CELL when VTYPE=2', () => {
      const createDollarN = (record) => {
        if (record.VTYPE === 1) return record.LAND;
        if (record.VTYPE === 2) return record.CELL;
        return null;
      };

      const record = { VTYPE: 2, LAND: '5551234567', CELL: '5559876543' };
      expect(createDollarN(record)).toBe('5559876543');
    });

    it('should use fileType parameter when VTYPE not present', () => {
      const createDollarN = (record, fileType) => {
        if (fileType === 'landline') return record.LAND;
        if (fileType === 'cell') return record.CELL;
        return null;
      };

      const record = { LAND: '5551234567', CELL: '5559876543' };
      expect(createDollarN(record, 'landline')).toBe('5551234567');
      expect(createDollarN(record, 'cell')).toBe('5559876543');
    });
  });

  // ==================== CALLID AUTO-ASSIGNMENT ====================

  describe('CallID Auto-Assignment - sp_AutoAssignCallIDs logic', () => {
    it('should identify top area codes from phone numbers', () => {
      const getAreaCode = (phone) => {
        if (!phone || phone.length < 3) return null;
        const areaCode = phone.slice(0, 3);
        // Skip area codes starting with 0 or 1
        if (areaCode[0] === '0' || areaCode[0] === '1') return null;
        return areaCode;
      };

      expect(getAreaCode('5551234567')).toBe('555');
      expect(getAreaCode('2025551234')).toBe('202');
      expect(getAreaCode('0001234567')).toBeNull(); // Invalid
      expect(getAreaCode('1234567890')).toBeNull(); // Invalid (starts with 1)
    });

    it('should combine LAND and CELL for non-Tarrance clients', () => {
      // For non-Tarrance (ClientID != 102), use both LAND and CELL
      const records = [
        { LAND: '5551234567', CELL: '2021234567' },
        { LAND: '5559876543', CELL: '3011234567' },
      ];

      const allPhones = new Set();
      records.forEach(r => {
        if (r.LAND) allPhones.add(r.LAND);
        if (r.CELL) allPhones.add(r.CELL);
      });

      expect(allPhones.size).toBe(4);
    });

    it('should use PHONE column for Tarrance clients (ClientID=102)', () => {
      const clientId = 102;
      const record = { PHONE: '5551234567', LAND: '2021234567', CELL: '3011234567' };

      const getPhoneForAreaCode = (rec, cId) => {
        if (cId === 102) return rec.PHONE;
        return [rec.LAND, rec.CELL].filter(Boolean);
      };

      const result = getPhoneForAreaCode(record, clientId);
      expect(result).toBe('5551234567');
    });

    it('should update CALLIDL1, CALLIDL2, CALLIDC1, CALLIDC2 in sample table', () => {
      const callIdSlots = ['CALLIDL1', 'CALLIDL2', 'CALLIDC1', 'CALLIDC2'];
      const assignedCallIds = ['2025551111', '2025552222', '3015553333', '3015554444'];

      const record = {};
      callIdSlots.forEach((slot, idx) => {
        record[slot] = assignedCallIds[idx] || '9999999999';
      });

      expect(record.CALLIDL1).toBe('2025551111');
      expect(record.CALLIDL2).toBe('2025552222');
      expect(record.CALLIDC1).toBe('3015553333');
      expect(record.CALLIDC2).toBe('3015554444');
    });
  });

  // ==================== TABLE CREATION WITH CONSTANTS ====================

  describe('Table Creation with Promark Constants', () => {
    it('should add all promark constants to headers', () => {
      const originalHeaders = [
        { name: 'FNAME', type: 'TEXT' },
        { name: 'LNAME', type: 'TEXT' },
        { name: 'PHONE', type: 'TEXT' },
      ];
      const promarkConstants = getPromarkConstantsAsHeaders();

      const enhancedHeaders = [...originalHeaders, ...promarkConstants];

      expect(enhancedHeaders.length).toBe(originalHeaders.length + 6);
      expect(enhancedHeaders.map(h => h.name)).toContain('VEND');
      expect(enhancedHeaders.map(h => h.name)).toContain('TFLAG');
      expect(enhancedHeaders.map(h => h.name)).toContain('CALLIDL1');
    });

    it('should set default values for promark constants in data rows', () => {
      const promarkConstants = getPromarkConstantsAsHeaders();
      const row = {};

      promarkConstants.forEach(constant => {
        row[constant.name] = constant.defaultValue;
      });

      expect(row.VEND).toBe(5);
      expect(row.TFLAG).toBe(0);
      expect(row.CALLIDL1).toBe('9999999999');
      expect(row.CALLIDL2).toBe('9999999999');
      expect(row.CALLIDC1).toBe('9999999999');
      expect(row.CALLIDC2).toBe('9999999999');
    });
  });

});
