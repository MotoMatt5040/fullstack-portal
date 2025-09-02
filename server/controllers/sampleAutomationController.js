const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const FileProcessorFactory = require('../utils/file_processors/FileProcessFactory');
const { createTableFromFileData } = require('../services/SampleAutomationServices');

// Configure multer for multiple file uploads (200MB limit per file)
const upload = multer({
  dest: 'temp_uploads/', // Temporary directory for uploads
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit per file
    files: 10 // Maximum 10 files
  },
});

// Main processing function for single or multiple files
const processFile = async (req, res) => {
  try {
    console.log('=== Processing Request ===');
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Single file:', req.file ? 'Yes' : 'No');
    
    // Handle both single file (req.file) and multiple files (req.files)
    let filesToProcess = [];
    
    if (req.files && req.files.length > 0) {
      // Multiple files
      filesToProcess = req.files;
      console.log('Processing multiple files:', req.files.length);
    } else if (req.file) {
      // Single file (backward compatibility)
      filesToProcess = [req.file];
      console.log('Processing single file');
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

      console.log(`Processing file ${i + 1}/${filesToProcess.length}: ${originalFilename}`);

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

        // Add source file information to each row (only for multiple files)
        let dataWithSource;
        if (filesToProcess.length > 1) {
          dataWithSource = processResult.data.map(row => ({
            ...row,
            _source_file: originalFilename,
            _file_index: i + 1
          }));
        } else {
          // Single file - no need for source tracking
          dataWithSource = processResult.data;
        }

        allProcessedData.push(...dataWithSource);
        totalOriginalRows += processResult.totalRows;
        processedFileNames.push(originalFilename);

        // Track all unique headers across files
        processResult.headers.forEach(header => {
          if (!allHeaders.has(header.name)) {
            allHeaders.set(header.name, header);
          }
        });

        console.log(`✅ File ${i + 1} processed: ${processResult.totalRows} rows, ${processResult.headers.length} columns`);

      } catch (fileError) {
        console.error(`Error processing file ${originalFilename}:`, fileError);
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
        { name: '_source_file', type: 'TEXT' },
        { name: '_file_index', type: 'INTEGER' }
      );
    }

    // Clean up uploaded files after processing
    await cleanupFiles(filesToProcess);

    console.log(`📊 Processing Summary:`);
    console.log(`- Files processed: ${filesToProcess.length}`);
    console.log(`- Total rows: ${allProcessedData.length}`);
    console.log(`- Unique columns: ${finalHeaders.length}`);

    // Create dataset (merged if multiple files, single if one file)
    const processedData = {
      headers: finalHeaders,
      data: normalizeData(allProcessedData, allHeaders),
      totalRows: allProcessedData.length,
      sourceFiles: processedFileNames
    };

    console.log('🔗 Creating SQL table...');

    try {
      // Create table name based on file count
      const baseTableName = filesToProcess.length > 1 
        ? `merged_${filesToProcess.length}_files` 
        : path.basename(processedFileNames[0], path.extname(processedFileNames[0]));

      // Create SQL table from processed data
      const tableResult = await createTableFromFileData(processedData, baseTableName);
      console.log('✅ Table created successfully:', tableResult.tableName);

      // Generate session ID
      const sessionId = generateSessionId();

      // Send success response
      const responseMessage = filesToProcess.length > 1
        ? `Successfully merged ${filesToProcess.length} files and created table ${tableResult.tableName} with ${tableResult.rowsInserted} total rows`
        : `Successfully processed ${processedFileNames[0]} and created table ${tableResult.tableName} with ${tableResult.rowsInserted} rows`;

      res.json({
        success: true,
        sessionId: sessionId,
        headers: tableResult.headers,
        tableName: tableResult.tableName,
        rowsInserted: tableResult.rowsInserted,
        totalRows: tableResult.totalRows,
        filesProcessed: filesToProcess.length,
        sourceFiles: processedFileNames,
        message: responseMessage,
        fileTypes: [...new Set(filesToProcess.map(f => path.extname(f.originalname).toLowerCase()))],
        originalFilenames: processedFileNames,
        projectId: projectId
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

/**
 * Normalize data across files - fill in missing columns with null
 * @param {Array} allData - All data rows from all files
 * @param {Map} allHeaders - Map of all unique headers
 * @returns {Array} - Normalized data where all rows have all columns
 */
function normalizeData(allData, allHeaders) {
  const headerNames = Array.from(allHeaders.keys());
  
  return allData.map(row => {
    const normalizedRow = {};
    
    // Ensure every row has every column (fill missing with null)
    headerNames.forEach(headerName => {
      normalizedRow[headerName] = row.hasOwnProperty(headerName) ? row[headerName] : null;
    });
    
    // Keep source tracking columns if they exist
    if (row._source_file) {
      normalizedRow._source_file = row._source_file;
    }
    if (row._file_index) {
      normalizedRow._file_index = row._file_index;
    }
    
    return normalizedRow;
  });
}

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
  console.log(`🧹 Cleaned up ${files.length} temporary file(s)`);
}

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

const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

module.exports = {
  processFile,
  getSupportedFileTypes,
  deleteProcessedFile,
  getProcessingStatus,
  reprocessFile,
  upload: upload.array('files', 10), // Accept up to 10 files with field name 'files'
};