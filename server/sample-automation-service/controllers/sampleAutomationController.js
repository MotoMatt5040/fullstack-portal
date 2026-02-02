const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const FileProcessorFactory = require('../utils/file_processors/FileProcessFactory');
const SampleAutomation = require('../services/SampleAutomationServices');
const CallIDApiClient = require('../services/CallIDApiClient');
const handleAsync = require('./asyncController');

// Use disk storage for large files to avoid memory issues
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(os.tmpdir(), 'sample-automation-uploads');
    fsSync.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit per file
    files: 10,
  },
});

/**
 * Clean up uploaded files
 * @param {Array} files - Array of uploaded files
 */
async function cleanupFiles(files) {
  if (!files || files.length === 0) return;

  const cleanupPromises = files
    .filter((file) => file.path)
    .map((file) =>
      fs
        .unlink(file.path)
        .catch((error) =>
          console.error(`Failed to cleanup file ${file.path}:`, error)
        )
    );

  await Promise.all(cleanupPromises);
  console.log(`Cleaned up ${files.length} temporary file(s)`);
}

const generateSessionId = () => {
  return (
    'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
  );
};

/**
 * Sanitize header name - remove ALL whitespace and convert to uppercase
 */
const sanitizeHeaderName = (headerName) => {
  if (!headerName || typeof headerName !== 'string') {
    return '';
  }
  return headerName.replace(/\s+/g, '').toUpperCase();
};

/**
 * Sanitize array of header names
 */
const sanitizeHeaders = (headers) => {
  return headers.map(h => sanitizeHeaderName(h));
};

/**
 * Validate file extension
 */
const validateFileExtension = (filename) => {
  const fileExtension = path.extname(filename).toLowerCase();

  if (!fileExtension || fileExtension === '.') {
    throw new Error(`File "${filename}" must have a valid extension. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(', ')}`);
  }

  if (!FileProcessorFactory.isSupported(fileExtension)) {
    throw new Error(`Unsupported file type: ${fileExtension}. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(', ')}`);
  }

  return fileExtension;
};

/**
 * Register file IDs for project tracking
 */
const registerFileIds = async (filesToProcess, projectId, requestedFileId, username) => {
  const fileIds = [];

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const originalFilename = file.originalname;

    try {
      const fileIdResult = await SampleAutomation.getNextFileID(
        projectId,
        requestedFileId ? parseInt(requestedFileId) + i : null
      );

      const fileId = fileIdResult.nextFileID;

      await SampleAutomation.registerProjectFile(
        projectId,
        fileId,
        originalFilename,
        null,
        username || 'system'
      );

      fileIds.push(fileId);
      console.log(`Registered FileID ${fileId} for file: ${originalFilename}`);

    } catch (fileIdError) {
      throw new Error(`FileID error for "${originalFilename}": ${fileIdError.message}`);
    }
  }

  return fileIds;
};

/**
 * Process a single file and extract data with headers
 */
const processSingleFile = async (file, fileIndex, customHeaders, excludedColumns, fileId) => {
  const originalFilename = file.originalname;
  const fileExtension = validateFileExtension(originalFilename);
  const fileName = path.basename(originalFilename, fileExtension);

  // Use file path for disk storage, or buffer for memory storage
  let processor;
  if (file.path) {
    processor = FileProcessorFactory.create(file.path, fileName, fileExtension);
  } else {
    processor = FileProcessorFactory.createFromBuffer(
      file.buffer,
      fileName,
      fileExtension
    );
  }
  const processResult = await processor.process();

  // Clean up uploaded file after processing
  if (file.path) {
    await fs.unlink(file.path).catch(() => {});
  }

  processResult.headers = processResult.headers.map(header => ({
    ...header,
    name: sanitizeHeaderName(header.name),
  }));

  console.log(`File ${fileIndex + 1} raw headers:`, processResult.headers.map(h => h.name));

  // Apply column exclusions BEFORE header mapping
  console.log(`File ${fileIndex + 1} excludedColumns object:`, JSON.stringify(excludedColumns));
  console.log(`File ${fileIndex + 1} excludedColumns[${fileIndex}]:`, excludedColumns[fileIndex]);
  const excludedForFile = excludedColumns[fileIndex] || [];
  console.log(`File ${fileIndex + 1} excludedForFile:`, excludedForFile);
  if (excludedForFile.length > 0) {
    const excludedSet = new Set(excludedForFile.map(h => h.toUpperCase()));
    console.log(`File ${fileIndex + 1} excluding columns:`, excludedForFile);

    // Filter out excluded headers
    const includedIndices = [];
    processResult.headers = processResult.headers.filter((header, idx) => {
      const isExcluded = excludedSet.has(header.name.toUpperCase());
      if (!isExcluded) {
        includedIndices.push(idx);
      }
      return !isExcluded;
    });

    // Filter out excluded columns from data
    processResult.data = processResult.data.map(row => {
      const newRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (!excludedSet.has(key.toUpperCase())) {
          newRow[key] = value;
        }
      }
      return newRow;
    });

    console.log(`File ${fileIndex + 1} headers after exclusion:`, processResult.headers.map(h => h.name));
  }

  let finalHeaders = processResult.headers;

  if (customHeaders[fileIndex]) {
    const result = applyCustomHeaders(processResult, customHeaders[fileIndex]);
    finalHeaders = result.finalHeaders;
    processResult.data = result.normalizedData;
  } else {
    finalHeaders = finalHeaders.map((h) => ({
      ...h,
      name: sanitizeHeaderName(h.name),
      originalName: h.name,
    }));
  }

  for (let j = 0; j < processResult.data.length; j++) {
    processResult.data[j].FILE = fileId;
  }

  return {
    data: processResult.data,
    headers: finalHeaders,
    totalRows: processResult.totalRows,
    filename: originalFilename,
  };
};

/**
 * Apply custom header mappings to processed data
 */
const applyCustomHeaders = (processResult, customHeadersForFile) => {
  console.log('Applying mapped headers:', customHeadersForFile);

  const sanitizedCustomHeaders = sanitizeHeaders(customHeadersForFile);

  const headerMapping = {};
  sanitizedCustomHeaders.forEach((mappedName, index) => {
    const originalHeader = processResult.headers[index];
    if (originalHeader) {
      headerMapping[sanitizeHeaderName(originalHeader.name)] = mappedName;
    }
  });

  const normalizedData = [];
  for (let rowIdx = 0; rowIdx < processResult.data.length; rowIdx++) {
    const row = processResult.data[rowIdx];
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

/**
 * Add file tracking columns for multi-file uploads
 */
const addFileTrackingColumns = (data, filename, fileIndex, isMultiFile) => {
  if (!isMultiFile) return data;

  return data.map(row => ({
    ...row,
    _source_file: filename,
    _file_index: fileIndex + 1,
  }));
};

/**
 * Process all uploaded files
 */
const processAllFiles = async (filesToProcess, customHeaders, excludedColumns, fileIds) => {
  let allProcessedData = [];
  const allHeaders = new Map();
  let totalOriginalRows = 0;
  const processedFileNames = [];

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const fileId = fileIds[i];

    try {
      const result = await processSingleFile(file, i, customHeaders, excludedColumns, fileId);

      const trackedData = addFileTrackingColumns(
        result.data,
        result.filename,
        i,
        filesToProcess.length > 1
      );

      allProcessedData = allProcessedData.concat(trackedData);
      totalOriginalRows += result.totalRows;
      processedFileNames.push(result.filename);

      result.headers.forEach((header) => {
        if (!allHeaders.has(header.name)) {
          allHeaders.set(header.name, header);
        }
      });

      console.log(
        `File ${i + 1} processed: ${result.totalRows} rows, ${result.headers.length} columns`
      );

    } catch (fileError) {
      console.error(`Error processing file ${file.originalname}:`, fileError);
      throw new Error(`Error processing file "${file.originalname}": ${fileError.message}`);
    }
  }

  return {
    allProcessedData,
    allHeaders,
    totalOriginalRows,
    processedFileNames,
  };
};

/**
 * Build final headers with tracking columns
 */
const buildFinalHeaders = (allHeaders, isMultiFile) => {
  const finalHeaders = Array.from(allHeaders.values());

  finalHeaders.push({ name: 'FILE', type: 'INTEGER', originalName: 'FILE' });

  if (isMultiFile) {
    finalHeaders.push(
      { name: '_source_file', type: 'TEXT', originalName: '_source_file' },
      { name: '_file_index', type: 'INTEGER', originalName: '_file_index' }
    );
  }

  return finalHeaders;
};

/**
 * Apply variable exclusions - removes excluded variables from headers and data
 * This happens AFTER header mapping, so we're working with final/mapped header names
 * @param {Array} headers - Array of header objects
 * @param {Array} data - Array of data rows
 * @param {Set} excludedVariables - Set of variable names to exclude (uppercase)
 * @param {Map} projectInclusions - Map of variables that should be included for this project (overrides exclusions)
 * @returns {Object} - { filteredHeaders, filteredData, excludedCount }
 */
const applyVariableExclusions = (headers, data, excludedVariables, projectInclusions = new Map()) => {
  // System columns that should never be excluded
  const systemColumns = new Set(['FILE', '_source_file', '_file_index']);

  // Determine which headers to keep
  const headersToKeep = [];
  const headersToExclude = [];

  for (const header of headers) {
    const upperName = header.name.toUpperCase();

    // Always keep system columns
    if (systemColumns.has(header.name)) {
      headersToKeep.push(header);
      continue;
    }

    // Check if this variable is excluded
    if (excludedVariables.has(upperName)) {
      // Check if there's a project-specific inclusion override
      if (projectInclusions.has(upperName)) {
        // Keep it but rename to the mapped name
        const mappedName = projectInclusions.get(upperName);
        headersToKeep.push({
          ...header,
          name: mappedName,
          originalName: header.name,
        });
        console.log(`Variable "${header.name}" is excluded but included for this project as "${mappedName}"`);
      } else {
        // Exclude this header
        headersToExclude.push(header.name);
      }
    } else {
      // Not excluded, keep it
      headersToKeep.push(header);
    }
  }

  if (headersToExclude.length > 0) {
    console.log(`Excluding ${headersToExclude.length} variable(s):`, headersToExclude.slice(0, 10).join(', ') + (headersToExclude.length > 10 ? '...' : ''));
  }

  // Build set of header names to keep for fast lookup
  const keepSet = new Set(headersToKeep.map(h => h.name));
  const headerNameMap = new Map(); // Maps old names to new names for project inclusions

  headersToKeep.forEach(h => {
    if (h.originalName && h.originalName !== h.name) {
      headerNameMap.set(h.originalName, h.name);
    }
  });

  // Filter data to only include kept columns
  const filteredData = data.map(row => {
    const newRow = {};
    for (const [key, value] of Object.entries(row)) {
      // Check if this column should be kept
      if (keepSet.has(key)) {
        newRow[key] = value;
      } else if (headerNameMap.has(key)) {
        // Renamed column (project inclusion override)
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

/**
 * Run post-processing steps on the created table
 */
const runPostProcessing = async (tableName, clientId, vendorId, ageCalculationMode, fileType, tableHeaders) => {
  try {
    console.log('Starting post-processing...');

    console.log('Formatting phone numbers...');
    await SampleAutomation.formatPhoneNumbersInTable(tableName);
    console.log('✅ Phone numbers formatted');

    if (clientId === 102) {
      console.log('Tarrance client detected - routing phones...');
      const routingResult = await SampleAutomation.routeTarrancePhones(tableName);
      console.log(`✅ Tarrance routing: ${routingResult.totalRouted} phones routed`);

      const paddingResult = await SampleAutomation.padTarranceRegion(tableName);
      console.log(`✅ Tarrance REGN padding: ${paddingResult.recordsPadded} records`);
    }

    if (vendorId === 4) {
      try {
        console.log('RNC vendor detected - calculating PARTY...');
        const partyResult = await SampleAutomation.calculatePartyFromRPartyRollup(tableName);

        if (partyResult.success && !partyResult.skipped) {
          console.log(`✅ PARTY calculation: ${partyResult.rowsUpdated} rows updated`);
        }
      } catch (partyError) {
        console.error('⚠️ RNC PARTY calculation failed (non-critical):', partyError.message);
      }
    }

    if (vendorId === 1) {
      try {
        console.log('L2 vendor detected - formatting RDATE...');
        const rdateResult = await SampleAutomation.formatRDateColumn(tableName);

        if (rdateResult.skipped) {
          console.log(`⏭️ RDATE formatting: ${rdateResult.message}`);
        } else {
          console.log(`✅ RDATE formatting: ${rdateResult.rowsUpdated} rows updated`);
        }
      } catch (rdateError) {
        console.error('⚠️ L2 RDATE formatting failed (non-critical):', rdateError.message);
      }
    }

    if (vendorId === 4) {
      try {
        console.log('RNC vendor detected - creating VFREQ columns...');
        const vfreqResult = await SampleAutomation.createVFREQColumns(tableName);
        if (vfreqResult.skipped) {
          console.log(`⏭️ VFREQ columns: ${vfreqResult.message}`);
        } else {
          console.log(`✅ VFREQ columns: ${vfreqResult.rowsUpdated} rows calculated`);
        }
      } catch (vfreqError) {
        console.error('⚠️ RNC VFREQ columns creation failed (non-critical):', vfreqError.message);
      }
    }

    console.log('Updating SOURCE column based on LAND/CELL values...');
    const sourceResult = await SampleAutomation.updateSourceColumn(tableName);
    console.log(`✅ SOURCE column updated`);

    console.log('Applying WDNC scrubbing...');
    const wdncResult = await SampleAutomation.applyWDNCScrubbing(tableName);
    console.log(`✅ WDNC scrubbing: ${wdncResult.rowsRemoved} removed`);

    console.log('Converting AGE to IAGE...');
    const convertAgeResult = await SampleAutomation.convertAgeToIAge(tableName);
    let iageCalculated = false;

    if (convertAgeResult.status === 'SUCCESS' && convertAgeResult.rowsUpdated > 0) {
      console.log(`✅ AGE to IAGE: ${convertAgeResult.rowsUpdated} values converted`);
      iageCalculated = true;
    } else {
      console.log(`⚠️ AGE to IAGE: ${convertAgeResult.message}`);
    }

    console.log('Fixing IAGE values...');
    const iageResult = await SampleAutomation.fixIAGEValues(tableName);
    console.log(`✅ IAGE fix: ${iageResult.rowsUpdated} values changed`);

    if (!iageCalculated) {
      console.log('Calculating age from birth year...');
      const useJanuaryFirst = ageCalculationMode === 'january' || ageCalculationMode === undefined;
      const ageResult = await SampleAutomation.calculateAgeFromBirthYear(tableName, useJanuaryFirst);

      if (ageResult.success && !ageResult.skipped) {
        console.log(`✅ Age from birthyear: ${ageResult.recordsWithValidAge} ages calculated`);
      }
    }

    if (clientId === 102) {
      const ageRangeExists = await SampleAutomation.checkColumnExists(tableName, 'AGERANGE');
      if (ageRangeExists) {
        console.log('⏭️ Skipping AGERANGE population - column already exists for Tarrance client');
      } else {
        console.log('Populating AGERANGE from IAGE...');
        const ageRangeResult = await SampleAutomation.populateAgeRange(tableName);
        console.log(`✅ AGERANGE: ${ageRangeResult.recordsWithAgeRange} records matched`);
      }
    } else {
      console.log('Populating AGERANGE from IAGE...');
      const ageRangeResult = await SampleAutomation.populateAgeRange(tableName);
      console.log(`✅ AGERANGE: ${ageRangeResult.recordsWithAgeRange} records matched`);
    }

    console.log('Padding columns...');
    const paddingResult = await SampleAutomation.padColumns(tableName);
    console.log(`✅ Column padding: ${paddingResult.recordsProcessed} records processed`);

    console.log('✅ All post-processing complete');

  } catch (error) {
    console.error('⚠️ Post-processing error (non-critical):', error);
  }
};

/**
 * Update file tracking records with table name
 */
const updateFileTracking = async (projectId, fileIds, tableName) => {
  try {
    console.log('Updating file tracking records...');

    for (let i = 0; i < fileIds.length; i++) {
      await SampleAutomation.updateProjectFileTableName(
        parseInt(projectId),
        fileIds[i],
        tableName
      );
      console.log(`Updated FileID ${fileIds[i]} with table name`);
    }

  } catch (error) {
    console.error('⚠️ Failed to update file tracking (non-critical):', error);
  }
};

// Main controller function
const processFile = async (req, res) => {
  try {
    console.log('=== Processing Request ===');
    console.log('Files received:', req.files ? req.files.length : 0);

    const customHeaders = req.body.customHeaders ? JSON.parse(req.body.customHeaders) : {};
    const excludedColumns = req.body.excludedColumns ? JSON.parse(req.body.excludedColumns) : {};
    const vendorId = req.body.vendorId ? parseInt(req.body.vendorId) : null;
    const clientId = req.body.clientId ? parseInt(req.body.clientId) : null;
    const { projectId, requestedFileId, ageCalculationMode, fileType } = req.body;

    console.log('Vendor/Client context:', { vendorId, clientId });
    console.log('Custom headers provided:', Object.keys(customHeaders).length > 0);
    console.log('Excluded columns provided:', Object.keys(excludedColumns).length > 0);
    console.log('Excluded columns raw:', JSON.stringify(excludedColumns));
    console.log('req.body.excludedColumns raw:', req.body.excludedColumns);
    console.log('=== SERVER: Full req.body keys ===');
    console.log('req.body keys:', Object.keys(req.body));
    console.log('=== SERVER: excludedColumns details ===');
    console.log('excludedColumns type:', typeof excludedColumns);
    console.log('excludedColumns keys:', Object.keys(excludedColumns));
    for (const [key, value] of Object.entries(excludedColumns)) {
      console.log(`excludedColumns[${key}]:`, value);
    }

    let filesToProcess = [];
    if (req.files && req.files.length > 0) {
      filesToProcess = req.files;
    } else if (req.file) {
      filesToProcess = [req.file];
    } else {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    if (!projectId) {
      await cleanupFiles(filesToProcess);
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
      });
    }

    console.log(`Processing ${filesToProcess.length} file(s) for project ${projectId}...`);

    let fileIds;
    try {
      fileIds = await registerFileIds(
        filesToProcess,
        projectId,
        requestedFileId,
        req.user?.username
      );
    } catch (fileIdError) {
      await cleanupFiles(filesToProcess);
      return res.status(400).json({
        success: false,
        message: fileIdError.message,
      });
    }

    let processedFiles;
    try {
      processedFiles = await processAllFiles(filesToProcess, customHeaders, excludedColumns, fileIds);
    } catch (processingError) {
      await cleanupFiles(filesToProcess);
      return res.status(400).json({
        success: false,
        message: processingError.message,
      });
    }

    const { allProcessedData, allHeaders, totalOriginalRows, processedFileNames } = processedFiles;

    let finalHeaders = buildFinalHeaders(allHeaders, filesToProcess.length > 1);

    await cleanupFiles(filesToProcess);

    // Apply variable exclusions (after header mapping)
    console.log('Checking for variable exclusions...');
    let filteredData = allProcessedData;
    try {
      const excludedVariables = await SampleAutomation.getExcludedVariableSet();
      const projectInclusions = projectId
        ? await SampleAutomation.getProjectInclusionsMap(parseInt(projectId))
        : new Map();

      if (excludedVariables.size > 0) {
        console.log(`Found ${excludedVariables.size} excluded variable(s)`);
        const exclusionResult = applyVariableExclusions(
          finalHeaders,
          allProcessedData,
          excludedVariables,
          projectInclusions
        );

        finalHeaders = exclusionResult.filteredHeaders;
        filteredData = exclusionResult.filteredData;

        if (exclusionResult.excludedCount > 0) {
          console.log(`✅ Excluded ${exclusionResult.excludedCount} variable(s) from data`);
        }
      } else {
        console.log('No variable exclusions configured');
      }
    } catch (exclusionError) {
      console.warn('⚠️ Error applying variable exclusions (continuing without):', exclusionError.message);
    }

    console.log('Processing Summary:');
    console.log(`- Files processed: ${filesToProcess.length}`);
    console.log(`- Total rows: ${filteredData.length}`);
    console.log(`- Columns: ${finalHeaders.length}`);

    const processedData = {
      headers: finalHeaders,
      data: filteredData,
      totalRows: filteredData.length,
      sourceFiles: processedFileNames,
    };

    try {
      console.log('Creating SQL table...');

      const tableResult = await SampleAutomation.createTableFromFileData(
        processedData,
        projectId
      );

      console.log('✅ Table created:', tableResult.tableName);

      await updateFileTracking(projectId, fileIds, tableResult.tableName);

      await runPostProcessing(
        tableResult.tableName,
        clientId,
        vendorId,
        ageCalculationMode,
        fileType,
        tableResult.headers
      );

      const updatedHeaders = await SampleAutomation.getTableHeaders(tableResult.tableName);
      const distinctAgeRangesResult = await SampleAutomation.getDistinctAgeRanges(tableResult.tableName);

      // Handle CallID auto-assignment if projectId is provided
      console.log('========== CALLID ASSIGNMENT DEBUG ==========');
      console.log(`projectId: ${projectId} (type: ${typeof projectId})`);
      console.log(`clientId: ${clientId}`);
      console.log(`tableName: ${tableResult.tableName}`);
      console.log(`req.headers['x-user-authenticated']: ${req.headers['x-user-authenticated']}`);
      console.log(`req.headers['x-user-name']: ${req.headers['x-user-name']}`);
      console.log(`req.headers['x-user-roles']: ${req.headers['x-user-roles']}`);

      let callIdAssignment = null;
      if (projectId) {
        // Build gateway headers for service-to-service communication
        const gatewayHeaders = {
          authenticated: req.headers['x-user-authenticated'] || 'true',
          username: req.headers['x-user-name'] || req.user || '',
          roles: req.headers['x-user-roles'] || JSON.stringify(req.roles || []),
        };
        console.log(`gatewayHeaders:`, gatewayHeaders);

        if (gatewayHeaders.authenticated === 'true') {
          console.log('Handling CallID assignment...');
          try {
            callIdAssignment = await CallIDApiClient.handleCallIDAssignment(
              tableResult.tableName,
              parseInt(projectId, 10),
              clientId,
              gatewayHeaders
            );
            console.log('CallID assignment result:', JSON.stringify(callIdAssignment, null, 2));
          } catch (callIdError) {
            console.error('CallID assignment threw error:', callIdError);
          }

          if (callIdAssignment?.success) {
            console.log(`✅ CallID assignment complete: ${callIdAssignment.assigned?.length || 0} CallIDs`);
          } else if (callIdAssignment) {
            console.log(`⚠️ CallID assignment: ${callIdAssignment.message}`);
          }
        } else {
          console.log('⚠️ User not authenticated for CallID assignment');
        }
      } else {
        console.log('⚠️ No projectId provided, skipping CallID assignment');
      }
      console.log('========== END CALLID ASSIGNMENT DEBUG ==========');

      const sessionId = generateSessionId();
      const responseMessage = filesToProcess.length > 1
        ? `Successfully merged ${filesToProcess.length} files into table ${tableResult.tableName}`
        : `Successfully processed ${processedFileNames[0]} into table ${tableResult.tableName}`;

      res.json({
        success: true,
        sessionId: sessionId,
        headers: updatedHeaders,
        tableName: tableResult.tableName,
        rowsInserted: tableResult.rowsInserted,
        totalRows: tableResult.totalRows,
        filesProcessed: filesToProcess.length,
        sourceFiles: processedFileNames,
        fileIds: fileIds,
        message: responseMessage,
        fileTypes: [...new Set(filesToProcess.map(f => path.extname(f.originalname).toLowerCase()))],
        originalFilenames: processedFileNames,
        projectId: projectId,
        vendorId: vendorId,
        clientId: clientId,
        promarkConstantsAdded: tableResult.promarkConstantsAdded,
        mappedHeadersUsed: Object.keys(customHeaders).length > 0,
        distinctAgeRanges: distinctAgeRangesResult.ageRanges,
        callIdAssignment: callIdAssignment,
      });

    } catch (sqlError) {
      console.error('SQL table creation failed:', sqlError);
      return res.status(500).json({
        success: false,
        message: `Files processed but table creation failed: ${sqlError.message}`,
        filesProcessed: filesToProcess.length,
        totalRowsProcessed: allProcessedData.length,
        error: sqlError.message,
      });
    }

  } catch (error) {
    console.error('Error in file processing:', error);

    if (req.files) {
      await cleanupFiles(req.files);
    } else if (req.file) {
      await cleanupFiles([req.file]);
    }

    handleError(error, res);
  }
};

const getHeaderMappings = handleAsync(async (req, res) => {
  const { vendorId, clientId, originalHeaders } = req.query;

  if (!originalHeaders) {
    return res.status(400).json({
      success: false,
      message: 'originalHeaders parameter is required',
    });
  }

  let headersArray;
  try {
    headersArray =
      typeof originalHeaders === 'string'
        ? JSON.parse(originalHeaders)
        : originalHeaders;
  } catch (parseError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid originalHeaders format - must be valid JSON array',
    });
  }

  if (!Array.isArray(headersArray)) {
    return res.status(400).json({
      success: false,
      message: 'originalHeaders must be an array',
    });
  }

  const mappings = await SampleAutomation.getHeaderMappings(
    vendorId ? parseInt(vendorId) : null,
    clientId ? parseInt(clientId) : null,
    headersArray
  );

  res.json({
    success: true,
    data: mappings,
    message: `Found ${Object.keys(mappings).length} header mappings`,
  });
});

const saveHeaderMappings = handleAsync(async (req, res) => {
  const { vendorId, clientId, mappings } = req.body;

  if (!mappings || !Array.isArray(mappings)) {
    return res.status(400).json({
      success: false,
      message: 'mappings parameter is required and must be an array',
    });
  }

  const invalidMappings = mappings.filter((m) => !m.original || !m.mapped);
  if (invalidMappings.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'All mappings must have original and mapped properties',
    });
  }

  const savedCount = await SampleAutomation.saveHeaderMappings(
    vendorId || null,
    clientId || null,
    mappings
  );

  res.json({
    success: true,
    savedCount: savedCount,
    message: `Successfully saved ${savedCount} header mappings`,
  });
});

/**
 * Get all header mappings (for management page)
 * @route GET /api/sample-automation/header-mappings/all
 */
const getAllHeaderMappings = handleAsync(async (req, res) => {
  const { vendorId, clientId, search } = req.query;

  console.log('Fetching all header mappings with filters:', {
    vendorId: vendorId || 'all',
    clientId: clientId || 'all',
    search: search || 'none',
  });

  const filters = {};
  if (vendorId) filters.vendorId = parseInt(vendorId);
  if (clientId) filters.clientId = parseInt(clientId);
  if (search) filters.search = search;

  const mappings = await SampleAutomation.getAllHeaderMappings(filters);

  console.log(`Found ${mappings.length} header mappings`);

  res.json({
    success: true,
    data: mappings,
    count: mappings.length,
    message: `Found ${mappings.length} header mappings`,
  });
});

/**
 * Delete a header mapping
 * @route DELETE /api/sample-automation/header-mappings
 */
const deleteHeaderMapping = handleAsync(async (req, res) => {
  const { originalHeader, vendorId, clientId } = req.body;

  if (!originalHeader) {
    return res.status(400).json({
      success: false,
      message: 'originalHeader is required',
    });
  }

  console.log('Deleting header mapping:', {
    originalHeader,
    vendorId: vendorId || 'null',
    clientId: clientId || 'null',
  });

  const result = await SampleAutomation.deleteHeaderMapping(
    originalHeader,
    vendorId || null,
    clientId || null
  );

  if (result.deleted) {
    res.json({
      success: true,
      message: `Successfully deleted mapping for "${originalHeader}"`,
    });
  } else {
    res.status(404).json({
      success: false,
      message: `No mapping found for "${originalHeader}" with specified vendor/client`,
    });
  }
});

const getSupportedFileTypes = async (req, res) => {
  try {
    res.json({
      success: true,
      supportedExtensions: FileProcessorFactory.getSupportedExtensions(),
      message: 'List of supported file extensions',
    });
  } catch (error) {
    handleError(error, res);
  }
};

const deleteProcessedFile = async (req, res) => {
  try {
    const { sessionId } = req.params;

    res.json({
      success: true,
      message: `Session ${sessionId} deleted successfully`,
    });
  } catch (error) {
    handleError(error, res);
  }
};

const getProcessingStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    res.json({
      success: true,
      sessionId: sessionId,
      status: 'completed',
      message: 'Processing status retrieved',
    });
  } catch (error) {
    handleError(error, res);
  }
};

const reprocessFile = async (req, res) => {
  try {
    const { sessionId } = req.params;

    res.json({
      success: true,
      message: `File reprocessed for session ${sessionId}`,
    });
  } catch (error) {
    handleError(error, res);
  }
};

const handleError = (error, res) => {
  console.error('Error in SampleAutomationController:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message: message,
  });
};

const handleGetClients = handleAsync(async (req, res) => {
  const clients = await SampleAutomation.getClients();

  if (!clients) {
    return res.status(404).json({ message: 'No clients found' });
  }

  res.status(200).json(clients);
});

const handleGetVendors = handleAsync(async (req, res) => {
  const vendors = await SampleAutomation.getVendors();

  if (!vendors) {
    return res.status(404).json({ message: 'No vendors found' });
  }

  res.status(200).json(vendors);
});

const handleGetClientsAndVendors = handleAsync(async (req, res) => {
  const data = await SampleAutomation.getClientsAndVendors();

  if (!data || (!data.clients && !data.vendors)) {
    return res.status(404).json({ message: 'No data found' });
  }

  res.status(200).json(data);
});

const detectHeaders = handleAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded',
    });
  }

  const file = req.file;
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const fileName = path.basename(file.originalname, fileExtension);

  if (!FileProcessorFactory.isSupported(fileExtension)) {
    // Clean up uploaded file
    if (file.path) {
      await fs.unlink(file.path).catch(() => {});
    }
    return res.status(400).json({
      success: false,
      message: `Unsupported file type: ${fileExtension}`,
    });
  }

  // Use file path for disk storage, or buffer for memory storage
  let processor;
  if (file.path) {
    processor = FileProcessorFactory.create(file.path, fileName, fileExtension);
  } else {
    processor = FileProcessorFactory.createFromBuffer(
      file.buffer,
      fileName,
      fileExtension
    );
  }
  const result = await processor.process();

  // Clean up uploaded file after processing
  if (file.path) {
    await fs.unlink(file.path).catch(() => {});
  }

  const headerNames = result.headers.map((h) => sanitizeHeaderName(h.name));

  // Filter out excluded variables from the header list
  let filteredHeaders = headerNames;
  let excludedHeaders = [];
  try {
    const excludedVariables = await SampleAutomation.getExcludedVariableSet();
    console.log('=== SERVER detectHeaders: excludedVariables check ===');
    console.log('excludedVariables size:', excludedVariables.size);
    if (excludedVariables.size > 0) {
      filteredHeaders = headerNames.filter(h => !excludedVariables.has(h.toUpperCase()));
      excludedHeaders = headerNames.filter(h => excludedVariables.has(h.toUpperCase()));
      console.log(`Header detection: filtered out ${excludedHeaders.length} excluded variable(s)`);
      console.log('excludedHeaders being returned:', excludedHeaders);
    }
  } catch (error) {
    console.warn('Could not apply variable exclusions to header detection:', error.message);
  }

  console.log('=== SERVER detectHeaders: Response ===');
  console.log('filteredHeaders count:', filteredHeaders.length);
  console.log('excludedHeaders count:', excludedHeaders.length);
  console.log('excludedHeaders:', excludedHeaders);

  res.json({
    success: true,
    headers: filteredHeaders,
    excludedHeaders,
    allHeadersInOrder: headerNames, // All headers in original file order
    totalDetected: headerNames.length,
    excludedCount: excludedHeaders.length,
    message: `Detected ${filteredHeaders.length} headers${excludedHeaders.length > 0 ? ` (${excludedHeaders.length} excluded)` : ''}`,
  });
});

const getTablePreview = handleAsync(async (req, res) => {
  const { tableName } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: 'Table name is required',
    });
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be a number between 1 and 100',
    });
  }

  const preview = await SampleAutomation.getTablePreview(tableName, limit);
  res.json(preview);
});

const createDNCScrubbed = handleAsync(async (req, res) => {
  const { tableName } = req.body;

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: 'Table name is required',
    });
  }

  const result = await SampleAutomation.createDNCScrubbed(tableName);
  res.json(result);
});

const getDistinctAgeRanges = async (req, res) => {
  try {
    const { tableName } = req.params;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: 'Table name is required',
      });
    }

    const result = await SampleAutomation.getDistinctAgeRanges(tableName);

    res.json({
      success: true,
      ageRanges: result.ageRanges,
      count: result.count,
      tableName: tableName,
    });
  } catch (error) {
    console.error('Error in getDistinctAgeRanges controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch distinct age ranges',
      error: error.message,
    });
  }
};

const extractFiles = handleAsync(async (req, res) => {
  const {
    tableName,
    selectedHeaders,
    splitMode,
    selectedAgeRange,
    householdingEnabled,
    fileType,
    fileNames,
    clientId,
  } = req.body;

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: 'Table name is required',
    });
  }

  if (!selectedHeaders || !Array.isArray(selectedHeaders) || selectedHeaders.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Selected headers are required',
    });
  }

  const userId = req.user;

  const result = await SampleAutomation.extractFilesFromTable({
    tableName,
    selectedHeaders,
    splitMode,
    selectedAgeRange,
    householdingEnabled,
    fileType,
    fileNames,
    clientId,
    userId,
  });

  res.json(result);
});

const calculateAgeFromBirthYear = async (req, res) => {
  try {
    const { tableName, useJanuaryFirst = true } = req.body;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: 'Table name is required',
      });
    }

    const result = await SampleAutomation.calculateAgeFromBirthYear(tableName, useJanuaryFirst);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.skipped ? result.message : `Age calculation completed`,
        data: result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to calculate age from birth year',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error in calculateAgeFromBirthYear controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

const downloadTempFile = handleAsync(async (req, res) => {
  const userId = req.user;
  const filename = req.params[0];

  try {
    const sanitizedUserId = userId.replace(/[@.]/g, '_');
    const userTempDir = path.join(__dirname, '../temp', sanitizedUserId);
    const filePath = path.join(userTempDir, filename);

    if (!filePath.startsWith(userTempDir)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file path',
      });
    }

    await fs.access(filePath);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);

    res.sendFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
    });
  }
});

const cleanupTempFile = handleAsync(async (req, res) => {
  const { filename } = req.params;

  try {
    const tempDir = path.join(__dirname, '../temp');
    const filePath = path.join(tempDir, filename);

    if (!filePath.startsWith(tempDir)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file path',
      });
    }

    await fs.access(filePath);
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: `File ${filename} deleted successfully`,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({
        success: true,
        message: 'File cleanup completed (file not found)',
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to cleanup file: ${error.message}`,
      });
    }
  }
});

// Computed Variables
const previewComputedVariable = handleAsync(async (req, res) => {
  const { tableName, variableDefinition } = req.body;

  if (!tableName || !variableDefinition) {
    return res.status(400).json({
      success: false,
      message: 'tableName and variableDefinition are required',
    });
  }

  if (!variableDefinition.name || !variableDefinition.outputType) {
    return res.status(400).json({
      success: false,
      message: 'Variable name and output type are required',
    });
  }

  const nameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;
  if (!nameRegex.test(variableDefinition.name)) {
    return res.status(400).json({
      success: false,
      message: 'Variable name must start with a letter and contain only letters, numbers, and underscores',
    });
  }

  const result = await SampleAutomation.previewComputedVariable(tableName, variableDefinition);
  res.json(result);
});

const addComputedVariable = handleAsync(async (req, res) => {
  const { tableName, variableDefinition } = req.body;

  if (!tableName || !variableDefinition) {
    return res.status(400).json({
      success: false,
      message: 'tableName and variableDefinition are required',
    });
  }

  if (!variableDefinition.name || !variableDefinition.outputType) {
    return res.status(400).json({
      success: false,
      message: 'Variable name and output type are required',
    });
  }

  const nameRegex = /^[A-Za-z][A-Za-z0-9_]*$/;
  if (!nameRegex.test(variableDefinition.name)) {
    return res.status(400).json({
      success: false,
      message: 'Variable name must start with a letter and contain only letters, numbers, and underscores',
    });
  }

  const result = await SampleAutomation.addComputedVariable(tableName, variableDefinition);
  res.json(result);
});

const removeComputedVariable = handleAsync(async (req, res) => {
  const { tableName, columnName } = req.body;

  if (!tableName || !columnName) {
    return res.status(400).json({
      success: false,
      message: 'tableName and columnName are required',
    });
  }

  const result = await SampleAutomation.removeComputedVariable(tableName, columnName);
  res.json(result);
});

// =====================================================
// Extraction Defaults Handlers
// =====================================================

/**
 * Get resolved extraction variables using hierarchy
 */
const getExtractionVariables = handleAsync(async (req, res) => {
  const { projectId, clientId, vendorId } = req.query;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'clientId is required',
    });
  }

  const variables = await SampleAutomation.getExtractionVariables(
    projectId ? parseInt(projectId) : null,
    parseInt(clientId),
    vendorId ? parseInt(vendorId) : null
  );

  res.json({
    success: true,
    variables,
  });
});

/**
 * Get master extraction defaults (global defaults for all files)
 */
const getMasterExtractionDefaults = handleAsync(async (req, res) => {
  const defaults = await SampleAutomation.getMasterExtractionDefaults();

  res.json({
    success: true,
    defaults,
  });
});

/**
 * Save master extraction defaults
 */
const saveMasterExtractionDefaults = handleAsync(async (req, res) => {
  const { variables } = req.body;

  if (!Array.isArray(variables)) {
    return res.status(400).json({
      success: false,
      message: 'variables array is required',
    });
  }

  const result = await SampleAutomation.saveMasterExtractionDefaults(variables);

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get client-level extraction defaults
 */
const getClientExtractionDefaults = handleAsync(async (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'clientId is required',
    });
  }

  const defaults = await SampleAutomation.getClientExtractionDefaults(parseInt(clientId));

  res.json({
    success: true,
    defaults,
  });
});

/**
 * Get vendor+client extraction defaults
 */
const getVendorClientExtractionDefaults = handleAsync(async (req, res) => {
  const { vendorId, clientId } = req.params;

  if (!vendorId || !clientId) {
    return res.status(400).json({
      success: false,
      message: 'vendorId and clientId are required',
    });
  }

  const defaults = await SampleAutomation.getVendorClientExtractionDefaults(
    parseInt(vendorId),
    parseInt(clientId)
  );

  res.json({
    success: true,
    defaults,
  });
});

/**
 * Get project-level extraction overrides
 */
const getProjectExtractionOverrides = handleAsync(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: 'projectId is required',
    });
  }

  const overrides = await SampleAutomation.getProjectExtractionOverrides(parseInt(projectId));

  res.json({
    success: true,
    overrides,
  });
});

/**
 * Save client-level extraction defaults
 */
const saveClientExtractionDefaults = handleAsync(async (req, res) => {
  const { clientId } = req.params;
  const { variables } = req.body;

  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'clientId is required',
    });
  }

  if (!Array.isArray(variables)) {
    return res.status(400).json({
      success: false,
      message: 'variables must be an array',
    });
  }

  const result = await SampleAutomation.saveClientExtractionDefaults(
    parseInt(clientId),
    variables
  );

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Save vendor+client extraction defaults
 */
const saveVendorClientExtractionDefaults = handleAsync(async (req, res) => {
  const { vendorId, clientId } = req.params;
  const { variables } = req.body;

  if (!vendorId || !clientId) {
    return res.status(400).json({
      success: false,
      message: 'vendorId and clientId are required',
    });
  }

  if (!Array.isArray(variables)) {
    return res.status(400).json({
      success: false,
      message: 'variables must be an array',
    });
  }

  const result = await SampleAutomation.saveVendorClientExtractionDefaults(
    parseInt(vendorId),
    parseInt(clientId),
    variables
  );

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Save project-level extraction overrides
 */
const saveProjectExtractionOverrides = handleAsync(async (req, res) => {
  const { projectId } = req.params;
  const { clientId, vendorId, variables } = req.body;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: 'projectId is required',
    });
  }

  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'clientId is required in body',
    });
  }

  if (!Array.isArray(variables)) {
    return res.status(400).json({
      success: false,
      message: 'variables must be an array',
    });
  }

  const result = await SampleAutomation.saveProjectExtractionOverrides(
    parseInt(projectId),
    parseInt(clientId),
    vendorId ? parseInt(vendorId) : null,
    variables
  );

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Delete a single extraction default/override
 */
const deleteExtractionDefault = handleAsync(async (req, res) => {
  const { type, id } = req.params;

  if (!type || !id) {
    return res.status(400).json({
      success: false,
      message: 'type and id are required',
    });
  }

  const validTypes = ['client', 'vendorClient', 'project'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `type must be one of: ${validTypes.join(', ')}`,
    });
  }

  const success = await SampleAutomation.deleteExtractionDefault(type, parseInt(id));

  res.json({
    success,
    message: success ? 'Deleted successfully' : 'Record not found',
  });
});

// ============================================
// Sample Tracking Controllers
// ============================================

/**
 * Get all sample tables with their relationships
 */
const getSampleTables = handleAsync(async (req, res) => {
  const { projectId, limit } = req.query;

  const options = {};
  if (projectId) options.projectId = projectId;
  if (limit) options.limit = parseInt(limit, 10);

  const tables = await SampleAutomation.getSampleTables(options);

  res.json({
    success: true,
    data: tables,
    count: tables.length,
  });
});

/**
 * Get detailed information about a specific sample table
 */
const getSampleTableDetails = handleAsync(async (req, res) => {
  const { tableName } = req.params;

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: 'Table name is required',
    });
  }

  const details = await SampleAutomation.getSampleTableDetails(tableName);

  res.json({
    success: true,
    data: details,
  });
});

/**
 * Delete a sample table and optionally its derivatives
 */
const deleteSampleTable = handleAsync(async (req, res) => {
  const { tableName } = req.params;
  const { includeDerivatives = true } = req.body;

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: 'Table name is required',
    });
  }

  const result = await SampleAutomation.deleteSampleTable(tableName, includeDerivatives);

  res.json(result);
});

// ============================================================================
// Variable Exclusions Controllers
// ============================================================================

/**
 * Get all variable exclusions
 */
const getVariableExclusions = handleAsync(async (req, res) => {
  const { search } = req.query;

  const exclusions = await SampleAutomation.getVariableExclusions({ search });

  res.json({
    success: true,
    data: exclusions,
  });
});

/**
 * Add a new variable exclusion
 */
const addVariableExclusion = handleAsync(async (req, res) => {
  const { variableName, description } = req.body;
  const createdBy = req.user?.email || req.user?.username || 'system';

  if (!variableName) {
    return res.status(400).json({
      success: false,
      message: 'Variable name is required',
    });
  }

  const exclusion = await SampleAutomation.addVariableExclusion(variableName, description, createdBy);

  res.json({
    success: true,
    data: exclusion,
  });
});

/**
 * Update a variable exclusion
 */
const updateVariableExclusion = handleAsync(async (req, res) => {
  const { exclusionId } = req.params;
  const { description } = req.body;

  if (!exclusionId) {
    return res.status(400).json({
      success: false,
      message: 'Exclusion ID is required',
    });
  }

  const exclusion = await SampleAutomation.updateVariableExclusion(parseInt(exclusionId), description);

  res.json({
    success: true,
    data: exclusion,
  });
});

/**
 * Delete a variable exclusion
 */
const deleteVariableExclusion = handleAsync(async (req, res) => {
  const { exclusionId } = req.params;

  if (!exclusionId) {
    return res.status(400).json({
      success: false,
      message: 'Exclusion ID is required',
    });
  }

  const result = await SampleAutomation.deleteVariableExclusion(parseInt(exclusionId));

  res.json({
    success: true,
    ...result,
  });
});

/**
 * Get project variable inclusions
 */
const getProjectVariableInclusions = handleAsync(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: 'Project ID is required',
    });
  }

  const inclusions = await SampleAutomation.getProjectVariableInclusions(parseInt(projectId));

  res.json({
    success: true,
    data: inclusions,
  });
});

/**
 * Add a project variable inclusion
 */
const addProjectVariableInclusion = handleAsync(async (req, res) => {
  const { projectId } = req.params;
  const { originalVariableName, mappedVariableName } = req.body;
  const createdBy = req.user?.email || req.user?.username || 'system';

  if (!projectId || !originalVariableName || !mappedVariableName) {
    return res.status(400).json({
      success: false,
      message: 'Project ID, original variable name, and mapped variable name are required',
    });
  }

  const inclusion = await SampleAutomation.addProjectVariableInclusion(
    parseInt(projectId),
    originalVariableName,
    mappedVariableName,
    createdBy
  );

  res.json({
    success: true,
    data: inclusion,
  });
});

/**
 * Update a project variable inclusion
 */
const updateProjectVariableInclusion = handleAsync(async (req, res) => {
  const { inclusionId } = req.params;
  const { mappedVariableName } = req.body;

  if (!inclusionId || !mappedVariableName) {
    return res.status(400).json({
      success: false,
      message: 'Inclusion ID and mapped variable name are required',
    });
  }

  const inclusion = await SampleAutomation.updateProjectVariableInclusion(parseInt(inclusionId), mappedVariableName);

  res.json({
    success: true,
    data: inclusion,
  });
});

/**
 * Delete a project variable inclusion
 */
const deleteProjectVariableInclusion = handleAsync(async (req, res) => {
  const { inclusionId } = req.params;

  if (!inclusionId) {
    return res.status(400).json({
      success: false,
      message: 'Inclusion ID is required',
    });
  }

  const result = await SampleAutomation.deleteProjectVariableInclusion(parseInt(inclusionId));

  res.json({
    success: true,
    ...result,
  });
});

module.exports = {
  processFile,
  getSupportedFileTypes,
  deleteProcessedFile,
  getProcessingStatus,
  reprocessFile,
  upload: upload.array('files', 10),
  handleGetClients,
  handleGetVendors,
  handleGetClientsAndVendors,
  getHeaderMappings,
  getAllHeaderMappings,
  saveHeaderMappings,
  deleteHeaderMapping,
  detectHeaders,
  uploadSingle: upload.single('file'),
  getTablePreview,
  createDNCScrubbed,
  getDistinctAgeRanges,
  extractFiles,
  calculateAgeFromBirthYear,
  downloadTempFile,
  cleanupTempFile,
  previewComputedVariable,
  addComputedVariable,
  removeComputedVariable,
  // Extraction Defaults
  getExtractionVariables,
  getMasterExtractionDefaults,
  getClientExtractionDefaults,
  getVendorClientExtractionDefaults,
  getProjectExtractionOverrides,
  saveMasterExtractionDefaults,
  saveClientExtractionDefaults,
  saveVendorClientExtractionDefaults,
  saveProjectExtractionOverrides,
  deleteExtractionDefault,
  // Sample Tracking
  getSampleTables,
  getSampleTableDetails,
  deleteSampleTable,
  // Variable Exclusions
  getVariableExclusions,
  addVariableExclusion,
  updateVariableExclusion,
  deleteVariableExclusion,
  getProjectVariableInclusions,
  addProjectVariableInclusion,
  updateProjectVariableInclusion,
  deleteProjectVariableInclusion,
};
