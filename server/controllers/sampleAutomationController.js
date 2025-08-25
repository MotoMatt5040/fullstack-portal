const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const FileProcessorFactory = require('../utils/file_processors/FileProcessFactory');

// Configure multer for file uploads (200MB limit)
const upload = multer({
  dest: 'temp_uploads/', // Temporary directory for uploads
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit
  },
});

// Main processing function
const processFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { projectId } = req.body;

    if (!projectId) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const uploadedFilePath = req.file.path;
    const originalFilename = req.file.originalname;

    // Debug logging
    console.log('Original filename:', originalFilename);
    console.log('File mimetype:', req.file.mimetype);

    // Get file extension and check if supported
    const fileExtension = path.extname(originalFilename).toLowerCase();
    
    console.log('Detected file extension:', fileExtension);

    // Handle files with no extension
    if (!fileExtension || fileExtension === '.') {
      // Clean up uploaded file
      await fs.unlink(uploadedFilePath).catch(console.error);
      return res.status(400).json({
        success: false,
        message: `File must have a valid extension. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(', ')}`
      });
    }
    
    if (!FileProcessorFactory.isSupported(fileExtension)) {
      // Clean up uploaded file
      await fs.unlink(uploadedFilePath).catch(console.error);
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${fileExtension}. Supported types: ${FileProcessorFactory.getSupportedExtensions().join(', ')}`
      });
    }

    // Create appropriate processor using factory
    const fileName = path.basename(originalFilename, fileExtension);
    console.log('fileName for factory:', fileName);
    console.log('uploadedFilePath for factory:', uploadedFilePath);
    console.log('fileExtension for factory:', fileExtension);
    console.log('About to call FileProcessorFactory.create...');
    
    // Pass the file extension explicitly to the factory
    const processor = FileProcessorFactory.create(uploadedFilePath, fileName, fileExtension);

    // Process the file
    const processResult = await processor.process();

    // Generate session ID
    const sessionId = generateSessionId();

    // Clean up uploaded file after processing
    await fs.unlink(uploadedFilePath).catch(console.error);

    res.json({
      success: true,
      sessionId: sessionId,
      headers: processResult.headers,
      tableName: processResult.tableName,
      rowsInserted: processResult.rowsInserted,
      totalRows: processResult.totalRows,
      message: `Successfully processed ${fileExtension} file: ${originalFilename} for project ${projectId}`,
      fileType: fileExtension,
      originalFilename: originalFilename,
      projectId: projectId
    });

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(console.error);
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
  upload, // Export the upload middleware
};