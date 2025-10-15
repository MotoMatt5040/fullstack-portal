import React from 'react';
import Select from 'react-select';
import { useSampleAutomationLogic } from './useSampleAutomationLogic';
import './SampleAutomation.css';
import FileHeaders from './FileHeaders';

const SampleAutomation: React.FC = () => {
  const {
    // State
    selectedFiles,
    dragActive,
    selectedProjectId,
    selectedVendorId,
    selectedClientId,

    // Data
    projectListOptions,
    vendors,
    clients,
    userInfo,

    // Processing state
    processStatus,
    processResult,

    // Loading states - UPDATED to include header mapping loading
    isLoading,
    isProcessing,
    isLoadingClientsAndVendors,
    isLoadingHeaderMappings,
    isSavingHeaderMappings,

    // Error states - UPDATED to include header mapping errors
    clientsAndVendorsError,
    headerMappingsError,
    saveHeaderMappingsError,

    // File handling
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

    // Vendor/Client handling
    handleVendorChange,
    handleClientChange,

    // Actions
    handleProcessFiles,
    clearInputs,

    // Utilities
    formatFileSize,
    totalFileSize,
    handleUpdateLocalMapping,

    // Updated header functionality
    fileHeaders,
    checkedFiles,
    allFilesChecked,
    hasHeaderConflicts,
    canMerge,
    validationSummary,
    allowExtraHeaders,
    setAllowExtraHeaders,
    handleSaveMappingToDB,

    // Table preview
    tablePreview,
    isLoadingPreview,
    previewError,

    // DNC Scrub
    handleCreateDNCScrubbed,
    isCreatingDNC,
    dncScrubResult,
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

          {(isProcessing ||
            isLoadingHeaderMappings ||
            isSavingHeaderMappings) && (
            <div className='processing-indicator'>
              <span>
                {isProcessing
                  ? `Processing ${selectedFiles?.length || 0} files...`
                  : isLoadingHeaderMappings
                  ? 'Loading header mappings...'
                  : isSavingHeaderMappings
                  ? 'Saving header mappings...'
                  : 'Processing...'}
              </span>
            </div>
          )}
        </div>

        {!isLoading && projectListOptions.length === 0 && (
          <div className='error-text'>No projects available</div>
        )}

        {/* Vendor and Client Selection */}
        <div className='vendor-client-selection'>
          <div className='selection-row'>
            <div className='selection-item'>
              <label htmlFor='vendor-select'>Vendor</label>
              <Select
                id='vendor-select'
                classNamePrefix='my-select'
                className='vendor-client-select'
                options={vendors}
                value={
                  vendors.find((vendor) => vendor.value === selectedVendorId) ||
                  null
                }
                onChange={handleVendorChange}
                isDisabled={
                  isProcessing ||
                  isLoadingClientsAndVendors ||
                  isLoadingHeaderMappings
                }
                placeholder={
                  isLoadingClientsAndVendors
                    ? 'Loading vendors...'
                    : 'Select vendor...'
                }
                isClearable
                closeMenuOnSelect={true}
              />
            </div>
            <div className='selection-item'>
              <label htmlFor='client-select'>Client</label>
              <Select
                id='client-select'
                classNamePrefix='my-select'
                className='vendor-client-select'
                options={clients}
                value={
                  clients.find((client) => client.value === selectedClientId) ||
                  null
                }
                onChange={handleClientChange}
                isDisabled={
                  isProcessing ||
                  isLoadingClientsAndVendors ||
                  isLoadingHeaderMappings
                }
                placeholder={
                  isLoadingClientsAndVendors
                    ? 'Loading clients...'
                    : 'Select client...'
                }
                isClearable
                closeMenuOnSelect={true}
              />
            </div>
          </div>

          {/* Error handling for clients/vendors/headers */}
          {(clientsAndVendorsError ||
            headerMappingsError ||
            saveHeaderMappingsError) && (
            <div
              className='error-text'
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(220, 53, 69, 0.1)',
                border: '1px solid rgba(220, 53, 69, 0.3)',
                borderRadius: '6px',
                color: '#dc3545',
              }}
            >
              {clientsAndVendorsError && 'Error loading clients and vendors. '}
              {headerMappingsError && 'Error loading header mappings. '}
              {saveHeaderMappingsError && 'Error saving header mappings. '}
              Please try again.
            </div>
          )}

          <div className='selection-status'>
            <span className='selection-indicator'>
              {selectedVendorId && selectedClientId ? (
                <>
                  Header mappings will be applied for{' '}
                  <strong>
                    {vendors.find((v) => v.value === selectedVendorId)?.label}
                  </strong>
                  {' → '}
                  <strong>
                    {clients.find((c) => c.value === selectedClientId)?.label}
                  </strong>
                </>
              ) : selectedVendorId ? (
                <>
                  Header mappings will be applied for vendor:{' '}
                  <strong>
                    {vendors.find((v) => v.value === selectedVendorId)?.label}
                  </strong>
                  {' (no client selected)'}
                </>
              ) : selectedClientId ? (
                <>
                  Header mappings will be applied for client:{' '}
                  <strong>
                    {clients.find((c) => c.value === selectedClientId)?.label}
                  </strong>
                  {' (no vendor selected)'}
                </>
              ) : (
                <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                  No vendor or client selected - using fallback mappings where
                  available
                </span>
              )}
            </span>
          </div>
        </div>

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
                  disabled={isProcessing || isLoadingHeaderMappings}
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

        {/* File Headers Component with Header Mapping Support */}
        {selectedFiles && selectedFiles.length > 0 && (
          <FileHeaders
            selectedFiles={selectedFiles}
            fileHeaders={fileHeaders}
            checkedFiles={checkedFiles}
            isProcessing={
              isProcessing || isLoadingHeaderMappings || isSavingHeaderMappings
            }
            validationSummary={validationSummary}
            allowExtraHeaders={allowExtraHeaders}
            onValidationModeChange={setAllowExtraHeaders}
            onSaveMappingToDB={handleSaveMappingToDB}
            onUpdateLocalMapping={handleUpdateLocalMapping}
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
              combined into one table using mapped headers
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
              (!allowExtraHeaders && hasHeaderConflicts) ||
              isProcessing ||
              isLoadingHeaderMappings ||
              isSavingHeaderMappings
            }
            className='upload-btn'
          >
            {isProcessing
              ? `Processing ${selectedFiles?.length || 0} files...`
              : isLoadingHeaderMappings
              ? 'Loading header mappings...'
              : isSavingHeaderMappings
              ? 'Saving header mappings...'
              : hasHeaderConflicts && !allowExtraHeaders
              ? 'Resolve Header Conflicts'
              : !allFilesChecked && selectedFiles && selectedFiles.length > 0
              ? 'Review Headers First'
              : `Merge & Process ${selectedFiles?.length || 0} File${
                  selectedFiles?.length !== 1 ? 's' : ''
                }`}
          </button>

          <button
            onClick={clearInputs}
            disabled={
              isProcessing || isLoadingHeaderMappings || isSavingHeaderMappings
            }
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

        {/* Table Preview Section */}
        {tablePreview && (
          <div className='table-preview-section'>
            <h3>
              Table Preview: {tablePreview.tableName}
              <span className='preview-info'>
                (Showing {tablePreview.rowCount} of{' '}
                {processResult?.totalRows || 0} rows)
              </span>
            </h3>

            {isLoadingPreview ? (
              <div className='loading-preview'>
                <span>Loading preview...</span>
              </div>
            ) : previewError ? (
              <div className='error-preview'>
                <span>❌ Failed to load preview</span>
              </div>
            ) : (
              <div className='table-wrapper'>
                <table className='preview-table'>
                  <thead>
                    <tr>
                      <th className='row-number-header'>#</th>
                      {tablePreview.columns.map((column, idx) => (
                        <th key={idx} title={`Type: ${column.type}`}>
                          {column.name}
                          <span className='column-type'>{column.type}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tablePreview.data.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className='row-number'>{rowIdx + 1}</td>
                        {tablePreview.columns.map((column, colIdx) => (
                          <td key={colIdx}>
                            {row[column.name] !== null &&
                            row[column.name] !== undefined
                              ? String(row[column.name])
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className='preview-actions'>
              <button
                onClick={() => {
                  console.log('View full table:', tablePreview.tableName);
                }}
                className='view-full-btn'
              >
                View Full Table ({processResult?.totalRows || 0} rows)
              </button>
            </div>
          </div>
        )}

        {/* DNC Scrub Section */}
        {processResult && tablePreview && (
          <div className='dnc-scrub-section'>
            <h3>DNC Scrub</h3>
            <p>
              Create a clean copy of the table with DNC numbers removed.
              {tablePreview.columns.some(
                (col) => col.name.toUpperCase() === 'SOURCE'
              ) ? (
                <span className='source-column-found'>
                  {' '}
                  ✓ SOURCE column detected:{' '}
                  {tablePreview.columns
                    .filter((col) => col.name.toUpperCase() === 'SOURCE')
                    .map((col) => col.name)
                    .join(', ')}
                </span>
              ) : (
                <span className='no-source-column'>
                  {' '}
                  ⚠️ No SOURCE column detected
                </span>
              )}
            </p>

            <button
              onClick={handleCreateDNCScrubbed}
              disabled={
                isCreatingDNC ||
                !tablePreview.columns.some(
                  (col) => col.name.toUpperCase() === 'SOURCE'
                )
              }
              className='dnc-scrub-btn'
            >
              {isCreatingDNC
                ? 'Creating DNC-Scrubbed Table...'
                : 'Create DNC-Scrubbed Table'}
            </button>

            {dncScrubResult && (
              <div className='dnc-scrub-results'>
                <h4>DNC Scrub Results</h4>
                <div className='results-grid'>
                  <div className='result-card'>
                    <div className='result-label'>Original Table</div>
                    <div className='result-value'>
                      {dncScrubResult.sourceTableName}
                    </div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>New Clean Table</div>
                    <div className='result-value success'>
                      {dncScrubResult.newTableName}
                    </div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>Original Rows</div>
                    <div className='result-value'>
                      {dncScrubResult.rowsOriginal?.toLocaleString()}
                    </div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>Clean Rows</div>
                    <div className='result-value success'>
                      {dncScrubResult.rowsClean?.toLocaleString()}
                    </div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>DNC Records Removed</div>
                    <div className='result-value error'>
                      {dncScrubResult.rowsRemoved?.toLocaleString()}
                    </div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>Columns Checked</div>
                    <div className='result-value'>
                      {dncScrubResult.phoneColumnsChecked?.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleAutomation;
