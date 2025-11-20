const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const FileProcessorFactory = require('../utils/file_processors/FileProcessFactory');
const SampleAutomation = require('../services/SampleAutomationServices');
const handleAsync = require('./asyncController');

const upload = multer({
  storage: multer.memoryStorage(), // ⭐ Keep in memory instead of disk
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit per file
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
    .filter((file) => file.path) // ⭐ ADDED: Only cleanup files with paths (disk storage)
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
    'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize header name - remove ALL whitespace and convert to uppercase
 */
const sanitizeHeaderName = (headerName) => {
  if (!headerName || typeof headerName !== 'string') {
    return '';
  }
  // Remove ALL whitespace (leading, trailing, AND internal) and uppercase
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
      // Get next FileID or use requested one
      const fileIdResult = await SampleAutomation.getNextFileID(
        projectId,
        requestedFileId ? parseInt(requestedFileId) + i : null
      );
      
      const fileId = fileIdResult.nextFileID;
      
      // Register the file
      await SampleAutomation.registerProjectFile(
        projectId,
        fileId,
        originalFilename,
        null, // Will update with table name later
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
const processSingleFile = async (file, fileIndex, customHeaders, fileId) => {
  const originalFilename = file.originalname;
  const fileExtension = validateFileExtension(originalFilename);
  const fileName = path.basename(originalFilename, fileExtension);

  // Create processor and process the file
  const processor = FileProcessorFactory.createFromBuffer(
    file.buffer,
    fileName,
    fileExtension
  );
  const processResult = await processor.process();

  // ⭐ SANITIZE HEADERS - Remove whitespace from detected headers
  processResult.headers = processResult.headers.map(header => ({
    ...header,
    name: sanitizeHeaderName(header.name),
  }));

  console.log(`File ${fileIndex + 1} raw headers:`, processResult.headers.map(h => h.name));

  // Apply custom header mappings if provided
  let finalHeaders = processResult.headers;
  
  if (customHeaders[fileIndex]) {
    const result = applyCustomHeaders(processResult, customHeaders[fileIndex]);
    finalHeaders = result.finalHeaders;
    processResult.data = result.normalizedData;
  } else {
    // No custom headers - sanitize and uppercase
    finalHeaders = finalHeaders.map((h) => ({
      ...h,
      name: sanitizeHeaderName(h.name),
      originalName: h.name,
    }));
  }

  // ⭐ Add FILE column to each row
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
  
  // ⭐ Sanitize custom headers
  const sanitizedCustomHeaders = sanitizeHeaders(customHeadersForFile);
  
  // Create header mapping
  const headerMapping = {};
  sanitizedCustomHeaders.forEach((mappedName, index) => {
    const originalHeader = processResult.headers[index];
    if (originalHeader) {
      headerMapping[sanitizeHeaderName(originalHeader.name)] = mappedName;
    }
  });

  // Normalize data with mapped headers
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

  // Create final headers with mapped names
  let finalHeaders = sanitizedCustomHeaders.map((mappedName, headerIndex) => ({
    name: mappedName,
    type: processResult.headers[headerIndex]?.type || 'TEXT',
    originalName: processResult.headers[headerIndex]?.name,
  }));

  // Handle extra headers beyond custom ones
  if (processResult.headers.length > sanitizedCustomHeaders.length) {
    const extraHeaders = processResult.headers.slice(sanitizedCustomHeaders.length);
    
    extraHeaders.forEach((header) => {
      // Map extra headers in the data as well
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
const processAllFiles = async (filesToProcess, customHeaders, fileIds) => {
  let allProcessedData = [];
  const allHeaders = new Map();
  let totalOriginalRows = 0;
  const processedFileNames = [];

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const fileId = fileIds[i];

    try {
      const result = await processSingleFile(file, i, customHeaders, fileId);
      
      // Add file tracking if multiple files
      const trackedData = addFileTrackingColumns(
        result.data,
        result.filename,
        i,
        filesToProcess.length > 1
      );

      allProcessedData = allProcessedData.concat(trackedData);
      totalOriginalRows += result.totalRows;
      processedFileNames.push(result.filename);

      // Track all unique headers across files
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
  
  // ⭐ Add FILE column to headers
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
 * Run post-processing steps on the created table
 */
const runPostProcessing = async (tableName, clientId, vendorId, ageCalculationMode, fileType, tableHeaders) => {
  try {
    console.log('Starting post-processing...');
    
    // Format phone numbers
    console.log('Formatting phone numbers...');
    await SampleAutomation.formatPhoneNumbersInTable(tableName);
    console.log('✅ Phone numbers formatted');

    // Tarrance-specific processing (ClientID 102)
    if (clientId === 102) {
      console.log('Tarrance client detected - routing phones...');
      const routingResult = await SampleAutomation.routeTarrancePhones(tableName);
      console.log(`✅ Tarrance routing: ${routingResult.totalRouted} phones routed`);

      const paddingResult = await SampleAutomation.padTarranceRegion(tableName);
      console.log(`✅ Tarrance REGN padding: ${paddingResult.recordsPadded} records`);
    }

    // RNC vendor-specific processing (VendorID 4)
    if (vendorId === 4) {
      try {
        console.log('RNC vendor detected - calculating PARTY...');
        const partyResult = await SampleAutomation.calculatePartyFromRPartyRollup(tableName);

        if (partyResult.success && !partyResult.skipped) {
          console.log(`✅ PARTY calculation: ${partyResult.rowsUpdated} rows updated`);
        }
      } catch (partyError) {
        console.error('⚠️ RNC PARTY calculation failed (non-critical):', partyError.message);
        // Continue with rest of post-processing
      }
    }

    // L2 vendor-specific processing (VendorID 1)
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
        // Continue with rest of post-processing
      }
    }

    // Create VFREQ columns
    console.log('Creating VFREQ columns...');
    const vfreqResult = await SampleAutomation.createVFREQColumns(tableName);
    if (vfreqResult.skipped) {
      console.log(`⏭️ VFREQ columns: ${vfreqResult.message}`);
    } else {
      console.log(`✅ VFREQ columns: ${vfreqResult.rowsUpdated} rows calculated`);
    }

    // Update SOURCE column
    console.log('Updating SOURCE column...');
    await SampleAutomation.updateSourceColumn(tableName);
    console.log('✅ SOURCE column updated');

    // Apply WDNC scrubbing
    console.log('Applying WDNC scrubbing...');
    const wdncResult = await SampleAutomation.applyWDNCScrubbing(tableName);
    console.log(`✅ WDNC scrubbing: ${wdncResult.rowsRemoved} removed, ${wdncResult.landlinesCleared} cleared`);

    // Convert AGE to IAGE if AGE column exists
    console.log('Converting AGE to IAGE...');
    const convertAgeResult = await SampleAutomation.convertAgeToIAge(tableName);
    let iageCalculated = false;

    if (convertAgeResult.status === 'SUCCESS' && convertAgeResult.rowsUpdated > 0) {
      console.log(`✅ AGE to IAGE: ${convertAgeResult.rowsUpdated} values converted`);
      iageCalculated = true;
    } else {
      console.log(`⚠️ AGE to IAGE: ${convertAgeResult.message}`);
    }

    // Fix IAGE values
    console.log('Fixing IAGE values...');
    const iageResult = await SampleAutomation.fixIAGEValues(tableName);
    console.log(`✅ IAGE fix: ${iageResult.rowsUpdated} values changed`);

    // Only calculate from birthyear if we didn't get IAGE from AGE
    if (!iageCalculated) {
      console.log('Calculating age from birth year...');
      const useJanuaryFirst = ageCalculationMode === 'january' || ageCalculationMode === undefined;
      const ageResult = await SampleAutomation.calculateAgeFromBirthYear(tableName, useJanuaryFirst);

      if (ageResult.success && !ageResult.skipped) {
        console.log(`✅ Age from birthyear: ${ageResult.recordsWithValidAge} ages calculated`);
      }
    } else {
      console.log('⏭️ Skipping birthyear calculation - IAGE already populated from AGE column');
    }

    // Always populate AGERANGE from IAGE (even if AGERANGENEW exists)
    console.log('Populating AGERANGE from IAGE...');
    const ageRangeResult = await SampleAutomation.populateAgeRange(tableName);
    console.log(`✅ AGERANGE: ${ageRangeResult.recordsWithAgeRange} records matched`);


    // Pad columns
    console.log('Padding columns...');
    const paddingResult = await SampleAutomation.padColumns(tableName);
    console.log(`✅ Column padding: ${paddingResult.recordsProcessed} records processed`);

    console.log('✅ All post-processing complete');
    
  } catch (error) {
    console.error('⚠️ Post-processing error (non-critical):', error);
    // Don't throw - post-processing failures shouldn't kill the whole request
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
    // Don't throw - tracking failures shouldn't kill the request
  }
};

// ============================================================================
// MAIN CONTROLLER FUNCTION
// ============================================================================

const processFile = async (req, res) => {
  try {
    console.log('=== Processing Request ===');
    console.log('Files received:', req.files ? req.files.length : 0);

    // Extract request parameters
    const customHeaders = req.body.customHeaders ? JSON.parse(req.body.customHeaders) : {};
    const vendorId = req.body.vendorId ? parseInt(req.body.vendorId) : null;
    const clientId = req.body.clientId ? parseInt(req.body.clientId) : null;
    const { projectId, requestedFileId, ageCalculationMode, fileType } = req.body;

    console.log('Vendor/Client context:', { vendorId, clientId });
    console.log('Custom headers provided:', Object.keys(customHeaders).length > 0);
    console.log('File type:', fileType);

    // Validate files
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

    // Register file IDs
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

    // Process all files
    let processedFiles;
    try {
      processedFiles = await processAllFiles(filesToProcess, customHeaders, fileIds);
    } catch (processingError) {
      await cleanupFiles(filesToProcess);
      return res.status(400).json({
        success: false,
        message: processingError.message,
      });
    }

    const { allProcessedData, allHeaders, totalOriginalRows, processedFileNames } = processedFiles;

    // Build final headers
    const finalHeaders = buildFinalHeaders(allHeaders, filesToProcess.length > 1);

    // Clean up uploaded files
    await cleanupFiles(filesToProcess);

    // Log summary
    console.log('Processing Summary:');
    console.log(`- Files processed: ${filesToProcess.length}`);
    console.log(`- Total rows: ${allProcessedData.length}`);
    console.log(`- Columns: ${finalHeaders.length}`);
    console.log(`- Mapped headers used: ${Object.keys(customHeaders).length > 0}`);

    // Create dataset
    const processedData = {
      headers: finalHeaders,
      data: allProcessedData,
      totalRows: allProcessedData.length,
      sourceFiles: processedFileNames,
    };

    // Create SQL table
    try {
      console.log('Creating SQL table...');
      
      const baseTableName = filesToProcess.length > 1
        ? `merged_${filesToProcess.length}_files`
        : path.basename(processedFileNames[0], path.extname(processedFileNames[0]));

      const tableResult = await SampleAutomation.createTableFromFileData(
        processedData,
        baseTableName
      );
      
      console.log('✅ Table created:', tableResult.tableName);

      // Update file tracking
      await updateFileTracking(projectId, fileIds, tableResult.tableName);

      // Run post-processing
      await runPostProcessing(
        tableResult.tableName,
        clientId,
        vendorId,
        ageCalculationMode,
        fileType,
        tableResult.headers
      );

      // Refresh headers after post-processing (AGERANGE may have been added)
      const updatedHeaders = await SampleAutomation.getTableHeaders(tableResult.tableName);

      // Fetch distinct age ranges after post-processing completes
      const distinctAgeRangesResult = await SampleAutomation.getDistinctAgeRanges(tableResult.tableName);

      // Generate response
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

    // Clean up uploaded files on error
    if (req.files) {
      await cleanupFiles(req.files);
    } else if (req.file) {
      await cleanupFiles([req.file]);
    }

    handleError(error, res);
  }
};

/**
 * Get header mappings for vendor/client combination
 * @route GET /api/sample-automation/header-mappings
 */
const getHeaderMappings = handleAsync(async (req, res) => {
  try {
    const { vendorId, clientId, originalHeaders } = req.query;

    // Validate required parameters
    if (!originalHeaders) {
      return res.status(400).json({
        success: false,
        message: 'originalHeaders parameter is required',
      });
    }

    // Parse originalHeaders if it's a string
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

    console.log('Fetching header mappings:', {
      vendorId: vendorId || 'null',
      clientId: clientId || 'null',
      headerCount: headersArray.length,
    });

    // Call the service method
    const mappings = await SampleAutomation.getHeaderMappings(
      vendorId ? parseInt(vendorId) : null,
      clientId ? parseInt(clientId) : null,
      headersArray
    );

    console.log(`Found ${Object.keys(mappings).length} header mappings`);

    res.json({
      success: true,
      data: mappings,
      message: `Found ${Object.keys(mappings).length} header mappings`,
    });
  } catch (error) {
    console.error('Error in getHeaderMappings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch header mappings',
    });
  }
});

/**
 * Save header mappings to database
 * @route POST /api/sample-automation/header-mappings
 */
const saveHeaderMappings = handleAsync(async (req, res) => {
  try {
    const { vendorId, clientId, mappings } = req.body;

    // Validate required parameters
    if (!mappings || !Array.isArray(mappings)) {
      return res.status(400).json({
        success: false,
        message: 'mappings parameter is required and must be an array',
      });
    }

    // Validate mapping objects
    const invalidMappings = mappings.filter((m) => !m.original || !m.mapped);
    if (invalidMappings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All mappings must have original and mapped properties',
      });
    }

    console.log('Saving header mappings:', {
      vendorId: vendorId || 'null',
      clientId: clientId || 'null',
      mappingCount: mappings.length,
    });

    // Call the service method
    const savedCount = await SampleAutomation.saveHeaderMappings(
      vendorId || null,
      clientId || null,
      mappings
    );

    console.log(`Successfully saved ${savedCount} header mappings`);

    res.json({
      success: true,
      savedCount: savedCount,
      message: `Successfully saved ${savedCount} header mappings`,
    });
  } catch (error) {
    console.error('Error in saveHeaderMappings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save header mappings',
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
    // Implementation for deleting processed files

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
    // Implementation for checking processing status

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
    const { options } = req.body;

    // Implementation for reprocessing with different options
    res.json({
      success: true,
      message: `File reprocessed for session ${sessionId}`,
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Helper functions
const validateFileExists = async (fullPath) => {
  try {
    await fs.access(fullPath);
  } catch (error) {
    const err = new Error(`File not found: ${fullPath}`);
    err.statusCode = 404;
    throw err;
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

/**
 * Handle GET request for vendors
 * GET /api/sample-automation/vendors
 */
const handleGetVendors = handleAsync(async (req, res) => {
  const vendors = await SampleAutomation.getVendors();

  if (!vendors) {
    return res.status(404).json({ message: 'No vendors found' });
  }

  res.status(200).json(vendors);
});

/**
 * Handle GET request for both clients and vendors
 * GET /api/sample-automation/clients-and-vendors
 */
const handleGetClientsAndVendors = handleAsync(async (req, res) => {
  const data = await SampleAutomation.getClientsAndVendors();

  if (!data || (!data.clients && !data.vendors)) {
    return res.status(404).json({ message: 'No data found' });
  }

  res.status(200).json(data);
});

const detectHeaders = handleAsync(async (req, res) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${fileExtension}`,
      });
    }

    const processor = FileProcessorFactory.createFromBuffer(
      file.buffer,
      fileName,
      fileExtension
    );
    const result = await processor.process();
    
    // ⭐ SANITIZE HEADERS - Remove whitespace and uppercase
    const headerNames = result.headers.map((h) => sanitizeHeaderName(h.name));

    res.json({
      success: true,
      headers: headerNames,
      message: `Detected ${headerNames.length} headers`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to detect headers',
    });
  }
});

/**
 * Get table preview (top N rows)
 * @route GET /api/sample-automation/table-preview/:tableName
 */
const getTablePreview = handleAsync(async (req, res) => {
  try {
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

    console.log(`Fetching preview for table: ${tableName}, limit: ${limit}`);

    const preview = await SampleAutomation.getTablePreview(tableName, limit);

    res.json(preview);
  } catch (error) {
    console.error('Error in getTablePreview controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch table preview',
    });
  }
});

/**
 * Create DNC-scrubbed table
 * @route POST /api/sample-automation/create-dnc-scrubbed
 */
const createDNCScrubbed = handleAsync(async (req, res) => {
  try {
    const { tableName } = req.body;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: 'Table name is required',
      });
    }

    console.log(`Creating DNC-scrubbed table from: ${tableName}`);

    const result = await SampleAutomation.createDNCScrubbed(tableName);

    res.json(result);
  } catch (error) {
    console.error('Error in createDNCScrubbed controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create DNC-scrubbed table',
    });
  }
});

/**
 * Get distinct age ranges from a table
 * @route GET /api/sample-automation/distinct-age-ranges/:tableName
 */
const getDistinctAgeRanges = async (req, res) => {
  try {
    const { tableName } = req.params;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: 'Table name is required',
      });
    }

    console.log(
      `Controller: Fetching distinct age ranges for table: ${tableName}`
    );

    // Call the service
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

/**
 * Extract files from table with optional split configuration
 * @route POST /api/sample-automation/extract-files
 */
const extractFiles = handleAsync(async (req, res) => {
  try {
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

    // Validate required parameters
    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: 'Table name is required',
      });
    }

    if (
      !selectedHeaders ||
      !Array.isArray(selectedHeaders) ||
      selectedHeaders.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Selected headers are required',
      });
    }

    console.log(`Extracting files from table: ${tableName}`);
    console.log(`Split mode: ${splitMode}`);
    console.log(`Selected headers: ${selectedHeaders.length}`);
    console.log(`Householding enabled: ${householdingEnabled}`);
    if (clientId) {
      console.log(`Client ID: ${clientId}`);
    }

    // Get userId from authenticated user
    const userId = req.user;
    console.log(`User ID: ${userId}`);

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

    console.log(`📤 Sending response to frontend:`);
    console.log(`  - result.files keys:`, Object.keys(result.files || {}));
    console.log(`  - result.householdingDuplicateFiles:`, result.householdingDuplicateFiles);

    res.json(result);
  } catch (error) {
    console.error('Error in extractFiles controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract files',
    });
  }
});

/**
 * Calculate age from birth year for a table
 * POST /api/sample-automation/calculate-age-from-birthyear
 */
const calculateAgeFromBirthYear = async (req, res) => {
  try {
    const { tableName, useJanuaryFirst = true } = req.body;

    // Validate required parameters
    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: 'Table name is required',
      });
    }

    // Validate useJanuaryFirst parameter
    if (typeof useJanuaryFirst !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'useJanuaryFirst must be a boolean value',
      });
    }

    console.log(`Calculating age from birth year for table: ${tableName}`);
    console.log(
      `Calculation base: ${useJanuaryFirst ? 'January 1st' : 'July 1st'}`
    );

    // Call the service to calculate age
    const result = await SampleAutomation.calculateAgeFromBirthYear(
      tableName,
      useJanuaryFirst
    );

    if (result.success) {
      if (result.skipped) {
        return res.status(200).json({
          success: true,
          message: result.message,
          data: {
            status: result.status,
            tableName: result.tableName,
            skipped: true,
          },
        });
      } else {
        return res.status(200).json({
          success: true,
          message: `Age calculation completed: ${result.recordsWithValidAge} records processed`,
          data: {
            status: result.status,
            tableName: result.tableName,
            recordsProcessed: result.recordsProcessed,
            recordsWithValidAge: result.recordsWithValidAge,
            recordsWithNullBirthYear: result.recordsWithNullBirthYear,
            recordsWithInvalidBirthYear: result.recordsWithInvalidBirthYear,
            birthYearColumnUsed: result.birthYearColumnUsed,
            calculationBase: result.calculationBase,
            calculationBaseDate: result.calculationBaseDate,
          },
        });
      }
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
      message: 'Internal server error while calculating age from birth year',
      error: error.message,
    });
  }
};

// Add this to your sampleAutomationController.js

const cleanupTempFile = handleAsync(async (req, res) => {
  const { filename } = req.params;

  try {
    const tempDir = path.join(__dirname, '../temp');
    const filePath = path.join(tempDir, filename);

    // Security check: verify file is in temp directory
    if (!filePath.startsWith(tempDir)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file path',
      });
    }

    // Check if file exists before trying to delete
    await fs.access(filePath);
    await fs.unlink(filePath);

    console.log('✅ Manual cleanup completed:', filename);

    res.json({
      success: true,
      message: `File ${filename} deleted successfully`,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - that's fine, consider it cleaned up
      console.log('📁 File already deleted or does not exist:', filename);
      res.json({
        success: true,
        message: 'File cleanup completed (file not found)',
      });
    } else {
      console.error('❌ Cleanup error:', error.message);
      res.status(500).json({
        success: false,
        message: `Failed to cleanup file: ${error.message}`,
      });
    }
  }
});

module.exports = {
  processFile,
  getSupportedFileTypes,
  deleteProcessedFile,
  getProcessingStatus,
  reprocessFile,
  upload: upload.array('files', 10), // Accept up to 10 files with field name 'files'
  handleGetClients,
  handleGetVendors,
  handleGetClientsAndVendors,
  getHeaderMappings,
  saveHeaderMappings,
  detectHeaders,
  uploadSingle: upload.single('file'),
  getTablePreview,
  createDNCScrubbed,
  getDistinctAgeRanges,
  extractFiles,
  calculateAgeFromBirthYear,
  cleanupTempFile,
};
