const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const FileProcessorFactory = require('../utils/file_processors/FileProcessFactory');
const SampleAutomation = require('../services/SampleAutomationServices');
const handleAsync = require('./asyncController');
// const { formatPhoneNumber } = require('../utils/FormatPhoneNumber.js');

// Configure multer for multiple file uploads (200MB limit per file)
// const upload = multer({
//   dest: 'temp_uploads/', // Temporary directory for uploads
//   limits: {
//     fileSize: 200 * 1024 * 1024, // 200MB limit per file
//     files: 10, // Maximum 10 files
//   },
// });

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

// Main processing function for single or multiple files
const processFile = async (req, res) => {
  try {
    console.log('=== Processing Request ===');
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Single file:', req.file ? 'Yes' : 'No');

    // EXTRACT CUSTOM HEADERS FROM REQUEST
    const customHeaders = req.body.customHeaders
      ? JSON.parse(req.body.customHeaders)
      : {};
    const vendorId = req.body.vendorId ? parseInt(req.body.vendorId) : null;
    const clientId = req.body.clientId ? parseInt(req.body.clientId) : null;

    console.log(
      'Custom headers received:',
      Object.keys(customHeaders).length > 0 ? 'Yes' : 'No'
    );
    console.log('Vendor/Client context:', { vendorId, clientId });

    // Handle both single file (req.file) and multiple files (req.files)
    let filesToProcess = [];

    if (req.files && req.files.length > 0) {
      // Multiple files
      filesToProcess = req.files;
    } else if (req.file) {
      // Single file (backward compatibility)
      filesToProcess = [req.file];
    } else {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const { projectId } = req.body;

    if (!projectId) {
      await cleanupFiles(filesToProcess);
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
      });
    }

    console.log(
      `Processing ${filesToProcess.length} file(s) for project ${projectId}...`
    );

    // Process each file and collect the data
    let allProcessedData = [];
    const allHeaders = new Map(); // Track all unique headers across files
    let totalOriginalRows = 0;
    const processedFileNames = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const originalFilename = file.originalname;
      const uploadedFilePath = file.path;

      // Get file extension and validate
      const fileExtension = path.extname(originalFilename).toLowerCase();

      if (!fileExtension || fileExtension === '.') {
        await cleanupFiles(filesToProcess);
        return res.status(400).json({
          success: false,
          message: `File "${originalFilename}" must have a valid extension. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(
            ', '
          )}`,
        });
      }

      if (!FileProcessorFactory.isSupported(fileExtension)) {
        await cleanupFiles(filesToProcess);
        return res.status(400).json({
          success: false,
          message: `Unsupported file type: ${fileExtension}. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(
            ', '
          )}`,
        });
      }

      try {
        // Create processor and process the file
        const fileName = path.basename(originalFilename, fileExtension);
        // const processor = FileProcessorFactory.create(
        //   uploadedFilePath,
        //   fileName,
        //   fileExtension
        // );
        // Instead of reading from file.path
        const processor = FileProcessorFactory.createFromBuffer(
          file.buffer, // Direct buffer access
          fileName,
          fileExtension
        );
        const processResult = await processor.process();

        // APPLY CUSTOM HEADERS (now mapped headers from database)
        let finalHeaders = processResult.headers;
        if (customHeaders[i]) {
          console.log(
            `Applying mapped headers for file ${i + 1}:`,
            customHeaders[i]
          );
          // Create normalized data with proper column mapping AND phone formatting in ONE PASS
          const headerMapping = {};

          // Map original column names to mapped names
          customHeaders[i].forEach((mappedName, index) => {
            const originalHeader = processResult.headers[index];
            if (originalHeader) {
              headerMapping[originalHeader.name.toUpperCase()] =
                mappedName.toUpperCase();
            }
          });

          // ADD THIS - Map data without phone formatting (will be done by stored procedure)
          const normalizedData = [];

          for (let rowIdx = 0; rowIdx < processResult.data.length; rowIdx++) {
            const row = processResult.data[rowIdx];
            const normalizedRow = {};

            for (const originalKey in row) {
              const mappedKey =
                headerMapping[originalKey.toUpperCase()] ||
                originalKey.toUpperCase();
              normalizedRow[mappedKey] = row[originalKey];
            }

            normalizedData.push(normalizedRow);
          }

          // Update processResult to use normalized data
          processResult.data = normalizedData;

          // Create final headers with mapped names
          finalHeaders = customHeaders[i].map((mappedName, headerIndex) => ({
            name: mappedName.toUpperCase(),
            type: processResult.headers[headerIndex]?.type || 'TEXT',
            originalName: processResult.headers[headerIndex]?.name,
          }));

          // Handle extra headers beyond custom ones
          if (processResult.headers.length > customHeaders[i].length) {
            const extraHeaders = processResult.headers.slice(
              customHeaders[i].length
            );
            extraHeaders.forEach((header) => {
              // Map extra headers in the data as well
              normalizedData.forEach((row) => {
                if (row[header.name] !== undefined) {
                  // Keep extra headers with original names
                  row[header.name] = row[header.name];
                }
              });
            });

            finalHeaders.push(
              ...extraHeaders.map((h) => ({
                ...h,
                originalName: h.name,
              }))
            );
          }
        } else {
          // No custom headers - add originalName for consistency
          finalHeaders = finalHeaders.map((h) => ({
            ...h,
            originalName: h.name,
          }));
        }

        // Add source tracking if multiple files
        if (filesToProcess.length > 1) {
          for (let j = 0; j < processResult.data.length; j++) {
            processResult.data[j]._source_file = originalFilename;
            processResult.data[j]._file_index = i + 1;
          }
        }

        // ✅ Memory-efficient: Direct concatenation
        allProcessedData = allProcessedData.concat(processResult.data);

        totalOriginalRows += processResult.totalRows;
        processedFileNames.push(originalFilename);

        // Track all unique headers across files (using mapped names)
        finalHeaders.forEach((header) => {
          if (!allHeaders.has(header.name)) {
            allHeaders.set(header.name, header);
          }
        });

        console.log(
          `File ${i + 1} processed: ${processResult.totalRows} rows, ${
            finalHeaders.length
          } columns`
        );
        if (customHeaders[i]) {
          console.log(`Mapped headers applied: ${customHeaders[i].join(', ')}`);
        }
      } catch (fileError) {
        console.error(`Error processing file ${originalFilename}:`, fileError);
        await cleanupFiles(filesToProcess);
        return res.status(400).json({
          success: false,
          message: `Error processing file "${originalFilename}": ${fileError.message}`,
        });
      }
    }

    // Add source tracking columns to headers if multiple files
    const finalHeaders = Array.from(allHeaders.values());
    if (filesToProcess.length > 1) {
      finalHeaders.push(
        { name: '_source_file', type: 'TEXT', originalName: '_source_file' },
        { name: '_file_index', type: 'INTEGER', originalName: '_file_index' }
      );
    }

    // Clean up uploaded files after processing
    await cleanupFiles(filesToProcess);

    console.log(`Processing Summary:`);
    console.log(`- Files processed: ${filesToProcess.length}`);
    console.log(`- Total rows: ${allProcessedData.length}`);
    console.log(`- File columns: ${finalHeaders.length}`);
    console.log(
      `- Mapped headers used: ${
        Object.keys(customHeaders).length > 0 ? 'Yes' : 'No'
      }`
    );
    console.log(
      `- Vendor/Client context: ${vendorId || 'None'}/${clientId || 'None'}`
    );

    // Create dataset (merged if multiple files, single if one file)
    const processedData = {
      headers: finalHeaders,
      data: allProcessedData,
      totalRows: allProcessedData.length,
      sourceFiles: processedFileNames,
    };

    console.log(
      'Creating SQL table with mapped headers and Promark internal variables...'
    );

    try {
      // Create table name based on file count
      const baseTableName =
        filesToProcess.length > 1
          ? `merged_${filesToProcess.length}_files`
          : path.basename(
              processedFileNames[0],
              path.extname(processedFileNames[0])
            );

      // Create SQL table from processed data (service will add Promark constants automatically)
      const tableResult = await SampleAutomation.createTableFromFileData(
        processedData,
        baseTableName
      );
      console.log(
        'Table created successfully with mapped headers and Promark constants:',
        tableResult.tableName
      );

      try {
        console.log(
          'Formatting phone numbers in table using stored procedure...'
        );
        await SampleAutomation.formatPhoneNumbersInTable(tableResult.tableName);
        console.log('✅ Phone numbers formatted successfully');

        // ⭐ Route Tarrance phones BEFORE updating SOURCE (ClientID 102)
        if (clientId === 102) {
          console.log(
            'Tarrance client detected (ID: 102) - routing PHONE to LAND/CELL based on WPHONE...'
          );
          try {
            const routingResult = await SampleAutomation.routeTarrancePhones(
              tableResult.tableName
            );
            console.log(
              `✅ Tarrance phone routing complete: ${routingResult.totalRouted} phones routed (${routingResult.landlineCount} landlines, ${routingResult.cellCount} cells)`
            );

            console.log('Padding Tarrance REGN column to width 2...');
            const paddingResult = await SampleAutomation.padTarranceRegion(
              tableResult.tableName
            );
            console.log(
              `✅ Tarrance REGN padding complete: ${paddingResult.recordsPadded} records padded`
            );
          } catch (tarranceError) {
            console.error(
              '⚠️ Tarrance-specific processing failed:',
              tarranceError
            );
          }
        }

        console.log('Updating SOURCE column based on LAND and CELL values...');
        await SampleAutomation.updateSourceColumn(tableResult.tableName);
        console.log('✅ SOURCE column updated successfully');

        const hasAgeRangeColumn = tableResult.headers.some(
          (header) => header.name.toUpperCase() === 'AGERANGE'
        );

        if (!hasAgeRangeColumn) {
          console.log(
            'AGERANGE column not found in uploaded data - populating from IAGE...'
          );
          try {
            const ageRangeResult = await SampleAutomation.populateAgeRange(
              tableResult.tableName
            );
            console.log(
              `✅ AGERANGE populated: ${ageRangeResult.recordsWithAgeRange} records matched`
            );
            if (ageRangeResult.recordsWithoutAgeRange > 0) {
              console.log(
                `⚠️ ${ageRangeResult.recordsWithoutAgeRange} records with IAGE did not match any age range`
              );
            }
          } catch (ageRangeError) {
            console.error(
              '⚠️ Age range population failed (non-critical):',
              ageRangeError
            );
          }
        } else {
          console.log(
            '✓ AGERANGE column already exists in uploaded data - skipping population'
          );
        }

        console.log('Creating stratified batches...');
        try {
          // Define desired stratify columns (may not all exist)
          let stratifyColumns = 'IAGE,GEND,PARTY,ETHNICITY,IZIP'; // List all desired columns

          const stratifyResult = await SampleAutomation.createStratifiedBatches(
            tableResult.tableName,
            stratifyColumns,
            20
          );

          if (stratifyResult.success) {
            console.log(
              `✅ Stratified batches created: ${stratifyResult.batchCount} batches`
            );
            console.log(
              `   Columns used: ${stratifyResult.columnsUsed.join(', ')}`
            );
            if (stratifyResult.columnsSkipped.length > 0) {
              console.log(
                `   Columns skipped (not in table): ${stratifyResult.columnsSkipped.join(
                  ', '
                )}`
              );
            }
          } else {
            console.log('⚠️ Stratification skipped - no valid columns found');
          }
        } catch (stratifyError) {
          console.error(
            '⚠️ Stratified batch creation failed (non-critical):',
            stratifyError
          );
        }
      } catch (phoneFormatError) {
        console.error(
          '⚠️ Post-processing failed (non-critical):',
          phoneFormatError
        );
      }

      // Generate session ID
      const sessionId = generateSessionId();

      // Send success response
      const responseMessage =
        filesToProcess.length > 1
          ? `Successfully merged ${filesToProcess.length} files and created table ${tableResult.tableName} with ${tableResult.rowsInserted} total rows using mapped headers and Promark internal variables`
          : `Successfully processed ${processedFileNames[0]} and created table ${tableResult.tableName} with ${tableResult.rowsInserted} rows using mapped headers and Promark internal variables`;

      res.json({
        success: true,
        sessionId: sessionId,
        headers: tableResult.headers, // Includes mapped headers + Promark constants
        tableName: tableResult.tableName,
        rowsInserted: tableResult.rowsInserted,
        totalRows: tableResult.totalRows,
        filesProcessed: filesToProcess.length,
        sourceFiles: processedFileNames,
        message: responseMessage,
        fileTypes: [
          ...new Set(
            filesToProcess.map((f) =>
              path.extname(f.originalname).toLowerCase()
            )
          ),
        ],
        originalFilenames: processedFileNames,
        projectId: projectId,
        vendorId: vendorId,
        clientId: clientId,
        promarkConstantsAdded: tableResult.promarkConstantsAdded,
        mappedHeadersUsed: Object.keys(customHeaders).length > 0,
      });
    } catch (sqlError) {
      console.error('SQL table creation failed:', sqlError);

      return res.status(500).json({
        success: false,
        message: `Files processed successfully but SQL table creation failed: ${sqlError.message}`,
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

// Add this method to your sampleAutomationController.js
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
      // await fs.unlink(file.path).catch(console.error);
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${fileExtension}`,
      });
    }

    // const processor = FileProcessorFactory.create(
    //   file.path,
    //   fileName,
    //   fileExtension
    // );
    const processor = FileProcessorFactory.createFromBuffer(
      file.buffer,
      fileName,
      fileExtension
    );
    const result = await processor.process();
    const headerNames = result.headers.map((h) => h.name);

    // await fs.unlink(file.path).catch(console.error);

    res.json({
      success: true,
      headers: headerNames,
      message: `Detected ${headerNames.length} headers`,
    });
  } catch (error) {
    // if (req.file) {
    //   await fs.unlink(req.file.path).catch(console.error);
    // }
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
};
