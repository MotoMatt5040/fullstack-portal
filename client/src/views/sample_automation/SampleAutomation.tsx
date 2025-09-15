import React from 'react';
import Select from 'react-select';
import { useSampleAutomationLogic } from './useSampleAutomationLogic';
import './SampleAutomation.css';
import FileHeaders from './FileHeaders';

const SampleAutomation: React.FC = () => {
  const {
    // State - UPDATED for multiple files
    selectedFiles,
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

    // File handling - UPDATED
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearSelectedFiles,
    removeFile,
    openFileDialog,
    fileInputRef,

    // Project handling
    handleProjectChange,

    // Actions - UPDATED
    handleProcessFiles,
    clearInputs,

    // Utilities
    formatFileSize,
    totalFileSize,

    // Updated header functionality
    fileHeaders,
    checkedFiles,
    allFilesChecked,
    hasHeaderConflicts,
    canMerge,
    handleSaveHeaders,
    handleValidationComplete,
  } = useSampleAutomationLogic();

  return (
    <div className='sample-automation-container'>
      <header className='sample-automation-header'>
        <h1>Sample Automation - Multi-File Upload</h1>
        <p>
          Upload multiple files to merge and create database tables with dynamic
          schemas
        </p>
      </header>

      {/* File Input Section */}
      <div className='upload-section'>
        <h2>Process Project Files</h2>

        {/* Project Selection */}
        <div className='sample-automation-header header'>
          <Select
            classNamePrefix='my-select'
            className='sample-automation-select'
            options={projectListOptions}
            value={
              projectListOptions.find(
                (opt) => opt.value === selectedProjectId
              ) || null
            }
            onChange={handleProjectChange}
            isDisabled={isProcessing || isLoading}
            placeholder={
              isLoading ? 'Loading projects...' : 'Select a project...'
            }
            isClearable
            closeMenuOnSelect={true}
          />

          {isProcessing && (
            <div className='processing-indicator'>
              <span>Processing {selectedFiles?.length || 0} files...</span>
            </div>
          )}
        </div>

        {!isLoading && projectListOptions.length === 0 && (
          <div className='error-text'>No projects available</div>
        )}

        {/* File Drop Zone */}
        <div
          className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${
            selectedFiles && selectedFiles.length > 0 ? 'has-files' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type='file'
            accept='*'
            multiple
            onChange={handleFileInputChange}
            className='file-input-hidden'
          />

          {selectedFiles && selectedFiles.length > 0 ? (
            <div className='selected-files-info'>
              <div className='files-summary'>
                <div className='file-icon'>📊</div>
                <div className='files-details'>
                  <div className='files-count'>
                    {selectedFiles?.length || 0} file
                    {selectedFiles?.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className='files-size'>
                    Total size: {formatFileSize(totalFileSize)}
                  </div>
                  <div className='files-action'>
                    Click to add more files or drag additional files here
                  </div>
                </div>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedFiles();
                  }}
                  className='clear-all-btn'
                  disabled={isProcessing}
                >
                  Clear All
                </button>
              </div>
            </div>
          ) : (
            <div className='drop-zone-content'>
              <div className='upload-icon'>📊</div>
              <div className='upload-text'>
                <strong>Click to select</strong> or drag and drop multiple files
                here
              </div>
              <div className='upload-subtext'>
                Files will be merged together - supports any file type
              </div>
            </div>
          )}
        </div>

        {/* New File Headers Component - Replaces old file list */}
        {selectedFiles && selectedFiles.length > 0 && (
          <FileHeaders
            selectedFiles={selectedFiles}
            fileHeaders={fileHeaders}
            checkedFiles={checkedFiles}
            isProcessing={isProcessing}
            onSaveHeaders={handleSaveHeaders}
            onValidationComplete={handleValidationComplete}
          />
        )}

        {/* File Path Preview */}
        {selectedProjectId && selectedFiles && selectedFiles.length > 0 && (
          <div className='path-preview'>
            <strong>Will merge and upload:</strong> {selectedFiles.length} file
            {selectedFiles.length !== 1 ? 's' : ''} to project{' '}
            {selectedProjectId}
            <br />
            <small>
              Total size: {formatFileSize(totalFileSize || 0)} | Files will be
              combined into one table
            </small>
          </div>
        )}

        {/* Action Buttons */}
        <div className='upload-actions'>
          <button
            onClick={handleProcessFiles}
            disabled={
              !selectedProjectId ||
              !selectedFiles ||
              selectedFiles.length === 0 ||
              !allFilesChecked ||
              hasHeaderConflicts ||
              isProcessing
            }
            className='upload-btn'
          >
            {isProcessing
              ? `Processing ${selectedFiles?.length || 0} files...`
              : hasHeaderConflicts
              ? 'Resolve Header Conflicts'
              : !allFilesChecked && selectedFiles && selectedFiles.length > 0
              ? 'Review Headers First'
              : `Merge & Process ${selectedFiles?.length || 0} File${
                  selectedFiles?.length !== 1 ? 's' : ''
                }`}
          </button>

          <button
            onClick={clearInputs}
            disabled={isProcessing}
            className='clear-btn'
            style={{ marginLeft: '10px' }}
          >
            Clear All
          </button>
        </div>

        {/* Status Display */}
        {processStatus && (
          <div
            className={`status-message ${
              processStatus.startsWith('❌')
                ? 'error'
                : processStatus.startsWith('✅')
                ? 'success'
                : ''
            }`}
          >
            {processStatus}
          </div>
        )}

        {/* Results Display */}
        {processResult && (
          <div className='upload-results-section'>
            <h2>Processing Results</h2>
            <div className='results-grid'>
              <div className='result-item'>
                <div className='result-label'>Table Created</div>
                <div className='result-value'>{processResult.tableName}</div>
              </div>
              <div className='result-item'>
                <div className='result-label'>Files Processed</div>
                <div className='result-value'>{selectedFiles?.length || 0}</div>
              </div>
              <div className='result-item'>
                <div className='result-label'>Total Rows</div>
                <div className='result-value'>{processResult.totalRows}</div>
              </div>
              <div className='result-item'>
                <div className='result-label'>Rows Inserted</div>
                <div className='result-value'>{processResult.rowsInserted}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleAutomation;