const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const FileProcessorFactory = require('../utils/file_processors/FileProcessFactory');
const SampleAutomation = require('../services/SampleAutomationServices');
const handleAsync = require('./asyncController');

// Configure multer for multiple file uploads (200MB limit per file)
const upload = multer({
  dest: 'temp_uploads/', // Temporary directory for uploads
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit per file
    files: 10 // Maximum 10 files
  },
});

/**
 * Clean up uploaded files
 * @param {Array} files - Array of uploaded files
 */
async function cleanupFiles(files) {
  if (!files || files.length === 0) return;
  
  const cleanupPromises = files.map(file => 
    fs.unlink(file.path).catch(error => 
      console.error(`Failed to cleanup file ${file.path}:`, error)
    )
  );
  
  await Promise.all(cleanupPromises);
  console.log(`Cleaned up ${files.length} temporary file(s)`);
}

const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Main processing function for single or multiple files
const processFile = async (req, res) => {
  try {
    console.log('=== Processing Request ===');
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Single file:', req.file ? 'Yes' : 'No');
    
    // EXTRACT CUSTOM HEADERS FROM REQUEST
    const customHeaders = req.body.customHeaders ? JSON.parse(req.body.customHeaders) : {};
    // console.log('Custom headers received:', customHeaders);
    
    // Handle both single file (req.file) and multiple files (req.files)
    let filesToProcess = [];
    
    if (req.files && req.files.length > 0) {
      // Multiple files
      filesToProcess = req.files;
      // console.log('Processing multiple files:', req.files.length);
    } else if (req.file) {
      // Single file (backward compatibility)
      filesToProcess = [req.file];
      // console.log('Processing single file');
    } else {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { projectId } = req.body;

    if (!projectId) {
      await cleanupFiles(filesToProcess);
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    console.log(`Processing ${filesToProcess.length} file(s) for project ${projectId}...`);

    // Process each file and collect the data
    const allProcessedData = [];
    const allHeaders = new Map(); // Track all unique headers across files
    let totalOriginalRows = 0;
    const processedFileNames = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const originalFilename = file.originalname;
      const uploadedFilePath = file.path;

      // console.log(`Processing file ${i + 1}/${filesToProcess.length}: ${originalFilename}`);

      // Get file extension and validate
      const fileExtension = path.extname(originalFilename).toLowerCase();
      
      if (!fileExtension || fileExtension === '.') {
        await cleanupFiles(filesToProcess);
        return res.status(400).json({
          success: false,
          message: `File "${originalFilename}" must have a valid extension. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(', ')}`
        });
      }
      
      if (!FileProcessorFactory.isSupported(fileExtension)) {
        await cleanupFiles(filesToProcess);
        return res.status(400).json({
          success: false,
          message: `Unsupported file type: ${fileExtension}. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(', ')}`
        });
      }

      try {
        // Create processor and process the file
        const fileName = path.basename(originalFilename, fileExtension);
        const processor = FileProcessorFactory.create(uploadedFilePath, fileName, fileExtension);
        const processResult = await processor.process();

        // APPLY CUSTOM HEADERS - ONLY CHANGE THE SCHEMA, NOT THE DATA
        let finalHeaders = processResult.headers;
        if (customHeaders[i]) {
          // console.log(`Applying custom headers for file ${i + 1}:`, customHeaders[i]);
          
          // Create normalized data with proper column mapping
          const headerMapping = {};
          
          // Map original column names to custom names
          customHeaders[i].forEach((customName, index) => {
            const originalHeader = processResult.headers[index];
            if (originalHeader) {
              headerMapping[originalHeader.name] = customName;
            }
          });
          
          // Create normalized rows for this file
          const normalizedData = processResult.data.map(row => {
            const normalizedRow = {};
            
            // Map data using custom headers
            Object.keys(row).forEach(originalKey => {
              const mappedKey = headerMapping[originalKey] || originalKey;
              normalizedRow[mappedKey] = row[originalKey];
            });
            
            return normalizedRow;
          });
          
          // Update processResult to use normalized data
          processResult.data = normalizedData;
          
          // Create final headers with custom names
          finalHeaders = customHeaders[i].map((customName, headerIndex) => ({
            name: customName,
            type: processResult.headers[headerIndex]?.type || 'TEXT',
            originalName: processResult.headers[headerIndex]?.name
          }));
          
          // Handle extra headers beyond custom ones
          if (processResult.headers.length > customHeaders[i].length) {
            const extraHeaders = processResult.headers.slice(customHeaders[i].length);
            extraHeaders.forEach(header => {
              // Map extra headers in the data as well
              normalizedData.forEach(row => {
                if (row[header.name] !== undefined) {
                  // Keep extra headers with original names
                  row[header.name] = row[header.name];
                }
              });
            });
            
            finalHeaders.push(...extraHeaders.map(h => ({
              ...h,
              originalName: h.name
            })));
          }
        } else {
          // No custom headers - add originalName for consistency
          finalHeaders = finalHeaders.map(h => ({
            ...h,
            originalName: h.name
          }));
        }

        // Add source tracking if multiple files
        let dataWithSource;
        if (filesToProcess.length > 1) {
          dataWithSource = processResult.data.map(row => ({
            ...row,
            _source_file: originalFilename,
            _file_index: i + 1,
          }));
        } else {
          dataWithSource = processResult.data;
        }

        allProcessedData.push(...dataWithSource);
        totalOriginalRows += processResult.totalRows;
        processedFileNames.push(originalFilename);

        // Track all unique headers across files (using custom names)
        finalHeaders.forEach(header => {
          if (!allHeaders.has(header.name)) {
            allHeaders.set(header.name, header);
          }
        });

        // console.log(`File ${i + 1} processed: ${processResult.totalRows} rows, ${finalHeaders.length} columns`);
        if (customHeaders[i]) {
          // console.log(`Custom headers applied: ${customHeaders[i].join(', ')}`);
        }

      } catch (fileError) {
        // console.error(`Error processing file ${originalFilename}:`, fileError);
        await cleanupFiles(filesToProcess);
        return res.status(400).json({
          success: false,
          message: `Error processing file "${originalFilename}": ${fileError.message}`
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
    console.log(`- Custom headers used: ${Object.keys(customHeaders).length > 0 ? 'Yes' : 'No'}`);

    // Create dataset (merged if multiple files, single if one file)
    const processedData = {
      headers: finalHeaders,
      data: allProcessedData,
      totalRows: allProcessedData.length,
      sourceFiles: processedFileNames
    };

    console.log('Creating SQL table with custom headers and Promark internal variables...');

    try {
      // Create table name based on file count
      const baseTableName = filesToProcess.length > 1 
        ? `merged_${filesToProcess.length}_files` 
        : path.basename(processedFileNames[0], path.extname(processedFileNames[0]));

      // Create SQL table from processed data (service will add Promark constants automatically)
      const tableResult = await SampleAutomation.createTableFromFileData(processedData, baseTableName);
      console.log('Table created successfully with custom headers and Promark constants:', tableResult.tableName);

      // Generate session ID
      const sessionId = generateSessionId();

      // Send success response
      const responseMessage = filesToProcess.length > 1
        ? `Successfully merged ${filesToProcess.length} files and created table ${tableResult.tableName} with ${tableResult.rowsInserted} total rows, custom headers, and Promark internal variables`
        : `Successfully processed ${processedFileNames[0]} and created table ${tableResult.tableName} with ${tableResult.rowsInserted} rows, custom headers, and Promark internal variables`;

      res.json({
        success: true,
        sessionId: sessionId,
        headers: tableResult.headers, // Includes custom headers + Promark constants
        tableName: tableResult.tableName,
        rowsInserted: tableResult.rowsInserted,
        totalRows: tableResult.totalRows,
        filesProcessed: filesToProcess.length,
        sourceFiles: processedFileNames,
        message: responseMessage,
        fileTypes: [...new Set(filesToProcess.map(f => path.extname(f.originalname).toLowerCase()))],
        originalFilenames: processedFileNames,
        projectId: projectId,
        promarkConstantsAdded: tableResult.promarkConstantsAdded, // Show which constants were added
        customHeadersUsed: Object.keys(customHeaders).length > 0 // Show if custom headers were used
      });

    } catch (sqlError) {
      console.error('SQL table creation failed:', sqlError);
      
      return res.status(500).json({
        success: false,
        message: `Files processed successfully but SQL table creation failed: ${sqlError.message}`,
        filesProcessed: filesToProcess.length,
        totalRowsProcessed: allProcessedData.length,
        error: sqlError.message
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

const getSupportedFileTypes = async (req, res) => {
  try {
    res.json({
      success: true,
      supportedExtensions: FileProcessorFactory.getSupportedExtensions(),
      message: 'List of supported file extensions'
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
      message: `Session ${sessionId} deleted successfully`
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
      message: 'Processing status retrieved'
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
      message: `File reprocessed for session ${sessionId}`
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
    message: message
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
};