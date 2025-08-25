import React from 'react';
import Select from 'react-select';
import { useSampleAutomationLogic } from './useSampleAutomationLogic';
import './SampleAutomation.css';

const SampleAutomation: React.FC = () => {
  const {
    // State
    selectedFile,
    dragActive,
    selectedProjectId,
    
    // Data
    projectListOptions,
    userInfo,
    
    // Processing state
    processStatus,
    processResult,
    
    // Loading states
    isLoading,
    isProcessing,
    
    // File handling
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearSelectedFile,
    openFileDialog,
    fileInputRef,
    
    // Project handling
    handleProjectChange,
    
    // Actions
    handleProcessFile,
    clearInputs,
    
    // Utilities
    formatFileSize,
  } = useSampleAutomationLogic();

  return (
    <div className="sample-automation-container">
      <header className="sample-automation-header">
        <h1>Sample Automation - File Upload</h1>
        <p>Upload files to automatically create database tables with dynamic schemas</p>
      </header>

      {/* File Input Section */}
      <div className="upload-section">
        <h2>Process Project File</h2>
        
        {/* Project Selection */}
        <div className="sample-automation-header header">
          <Select
            classNamePrefix='my-select'
            className='sample-automation-select'
            options={projectListOptions}
            value={
              projectListOptions.find((opt) => opt.value === selectedProjectId) ||
              null
            }
            onChange={handleProjectChange}
            isDisabled={isProcessing || isLoading}
            placeholder={isLoading ? 'Loading projects...' : 'Select a project...'}
            isClearable
            closeMenuOnSelect={true}
          />

          {isProcessing && (
            <div className='processing-indicator'>
              <span>Processing...</span>
            </div>
          )}
        </div>
        
        {!isLoading && projectListOptions.length === 0 && (
          <div className="error-text">No projects available</div>
        )}
        
        {/* File Drop Zone */}
        <div
          className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="*"
            onChange={handleFileInputChange}
            className="file-input-hidden"
          />
          
          {selectedFile ? (
            <div className="selected-file-info">
              <div className="file-icon">📊</div>
              <div className="file-details">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                <div className="file-type">File</div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
                className="clear-file-btn"
                disabled={isProcessing}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="drop-zone-content">
              <div className="upload-icon">📊</div>
              <div className="upload-text">
                <strong>Click to select</strong> or drag and drop your file here
              </div>
              <div className="upload-subtext">
                Supports any file type
              </div>
            </div>
          )}
        </div>

        {/* File Path Preview */}
        {selectedProjectId && selectedFile && (
          <div className="path-preview">
            <strong>Will upload:</strong> {selectedFile.name} to project {selectedProjectId}
            <br />
            <small>File size: {formatFileSize(selectedFile.size)}</small>
          </div>
        )}

        {/* Action Buttons */}
        <div className="upload-actions">
          <button
            onClick={handleProcessFile}
            disabled={!selectedProjectId || !selectedFile || isProcessing}
            className="upload-btn"
          >
            {isProcessing ? 'Processing...' : 'Process File'}
          </button>
          
          <button
            onClick={clearInputs}
            disabled={isProcessing}
            className="clear-btn"
            style={{ marginLeft: '10px' }}
          >
            Clear
          </button>
        </div>

        {/* Status Display */}
        {processStatus && (
          <div className={`status-message ${processStatus.startsWith('❌') ? 'error' : 'success'}`}>
            {processStatus}
          </div>
        )}

        {/* Result Display */}
        {processResult && (
          <div className="status-message success">
            <strong>Processing Results:</strong><br/>
            Table: {processResult.tableName} | 
            Rows: {processResult.rowsInserted}/{processResult.totalRows} | 
            Session: {processResult.sessionId}
            {processResult.headers && (
              <div style={{marginTop: '10px', fontSize: '0.9em'}}>
                Columns: {processResult.headers.map((h: any) => `${h.name} (${h.type})`).join(', ')}
              </div>
            )}
          </div>
        )}

        {!selectedProjectId && (
          <div className='no-selection-message'>
            <p>Please select a project to process files.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleAutomation;