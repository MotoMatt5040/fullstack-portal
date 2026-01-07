import React, { useState } from 'react';
import Select from 'react-select';
import Icon from '@mdi/react';
import {
  mdiFileMultiple,
  mdiChevronDown,
  mdiPlay,
  mdiCheck,
  mdiTableLarge,
  mdiHelpCircleOutline,
} from '@mdi/js';
import { useSampleAutomationLogic } from './useSampleAutomationLogic';
import { useSampleAutomationTour } from './SampleAutomationTour';
import './SampleAutomation.css';
import FileHeaders from './FileHeaders';
import SampleSplitComponent from './SampleSplitComponent';

const SampleAutomation: React.FC = () => {
  const {
    // State
    selectedFiles,
    dragActive,
    selectedProjectId,
    selectedVendorId,
    selectedClientId,
    selectedClientName,

    // Data
    projectListOptions,
    vendors,

    // Processing state
    processStatus,
    processResult,

    // Loading states
    isLoading,
    isProcessing,
    isLoadingClientsAndVendors,
    isLoadingHeaderMappings,
    isSavingHeaderMappings,

    // Error states
    clientsAndVendorsError,
    headerMappingsError,
    saveHeaderMappingsError,

    // File handling
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearSelectedFiles,
    openFileDialog,
    fileInputRef,

    // Project handling
    handleProjectChange,

    // Vendor handling
    handleVendorChange,

    // Actions
    handleProcessFiles,
    clearInputs,

    // Utilities
    formatFileSize,
    totalFileSize,
    handleUpdateLocalMapping,

    // Header functionality
    fileHeaders,
    checkedFiles,
    allFilesChecked,
    hasHeaderConflicts,
    validationSummary,
    allowExtraHeaders,
    setAllowExtraHeaders,
    handleSaveMappingToDB,

    // Table preview
    tablePreview,
    isLoadingPreview,
    previewError,

    // Split config
    distinctAgeRanges,
    handleSplitConfigChange,
    isExtracting,

    // Age calculation
    ageCalculationMode,
    setAgeCalculationMode,

    // File ID
    requestedFileId,
    setRequestedFileId,

    // File type
    fileType,
    setFileType,
  } = useSampleAutomationLogic();

  // Step expansion state
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
    new Set([1])
  );

  // Product tour
  const { startTour } = useSampleAutomationTour({ autoStart: true });

  const toggleStep = (step: number) => {
    setExpandedSteps((prev) => {
      const updated = new Set(prev);
      if (updated.has(step)) {
        updated.delete(step);
      } else {
        updated.add(step);
      }
      return updated;
    });
  };

  // Calculate step statuses
  const isConfigComplete =
    selectedProjectId && selectedVendorId && selectedClientId;
  const hasFiles = selectedFiles && selectedFiles.length > 0;
  const isStep1Complete = isConfigComplete && hasFiles;
  // Step 2 is complete when files are uploaded AND all headers are loaded/checked
  const isStep2Complete = hasFiles && allFilesChecked;
  const isStep3Complete = processResult && processResult.tableName;

  // Processing state check
  const isAnyProcessing =
    isProcessing || isLoadingHeaderMappings || isSavingHeaderMappings;

  // Get step summary text
  const getStep1Summary = () => {
    const parts = [];
    if (selectedProjectId) parts.push(`Project: ${selectedProjectId}`);
    if (selectedFiles?.length)
      parts.push(`${selectedFiles.length} file(s) selected`);
    return parts.length ? parts.join(' | ') : 'Configure project and upload files';
  };

  const getStep2Summary = () => {
    if (!hasFiles) return 'Upload files first';
    const total = Object.values(fileHeaders).reduce(
      (sum, h) => sum + h.originalHeaders.length,
      0
    );
    if (total === 0) return 'Loading headers...';
    return allFilesChecked
      ? `All ${total} headers reviewed`
      : `Review ${total} headers`;
  };

  const getStep3Summary = () => {
    if (!processResult) return 'Process files first';
    return `Table: ${processResult.tableName} | ${processResult.rowsInserted?.toLocaleString()} rows`;
  };

  return (
    <section className='sample-automation'>
      {/* Page Header */}
      <header className='page-header'>
        <div className='header-title'>
          <Icon path={mdiFileMultiple} size={1.25} color='var(--accent-color)' />
          <div>
            <h1>Sample Automation</h1>
            <p className='header-subtitle'>
              Upload, merge, and process sample files
            </p>
          </div>
        </div>
        <button
          className='btn-tour'
          onClick={startTour}
          title='Take a guided tour'
        >
          <Icon path={mdiHelpCircleOutline} size={0.85} />
          <span>Tour</span>
        </button>
      </header>

      {/* Processing Banner */}
      {isAnyProcessing && (
        <div className='processing-banner'>
          <div className='spinner' />
          <span className='processing-text'>
            {isProcessing
              ? `Processing ${selectedFiles?.length || 0} files...`
              : isLoadingHeaderMappings
              ? 'Loading header mappings...'
              : 'Saving header mappings...'}
          </span>
        </div>
      )}

      {/* Error Display */}
      {(clientsAndVendorsError ||
        headerMappingsError ||
        saveHeaderMappingsError) && (
        <div className='error-inline'>
          {clientsAndVendorsError && 'Error loading clients/vendors. '}
          {headerMappingsError && 'Error loading header mappings. '}
          {saveHeaderMappingsError && 'Error saving header mappings. '}
          Please try again.
        </div>
      )}

      {/* Workflow Steps */}
      <div className='workflow-container'>
        {/* Step 1: Configuration & Upload */}
        <div className='workflow-step'>
          <div className='step-header' onClick={() => toggleStep(1)}>
            <div className={`step-number ${isStep1Complete ? 'completed' : ''}`}>
              {isStep1Complete ? <Icon path={mdiCheck} size={0.7} /> : '1'}
            </div>
            <div className='step-info'>
              <h3 className='step-title'>Configuration & Upload</h3>
              <p className='step-summary'>{getStep1Summary()}</p>
            </div>
            <Icon
              path={mdiChevronDown}
              size={0.9}
              className={`step-toggle ${expandedSteps.has(1) ? 'expanded' : ''}`}
            />
          </div>

          {expandedSteps.has(1) && (
            <div className='step-content'>
              <div className='config-grid'>
                {/* Project */}
                <div className='config-item'>
                  <label>Project</label>
                  <Select
                    classNamePrefix='my-select'
                    options={projectListOptions}
                    value={
                      projectListOptions.find(
                        (opt) => opt.value === selectedProjectId
                      ) || null
                    }
                    onChange={handleProjectChange}
                    isDisabled={isAnyProcessing || isLoading}
                    placeholder={isLoading ? 'Loading...' : 'Select project'}
                    isClearable
                    menuPortalTarget={document.body}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </div>

                {/* Vendor */}
                <div className='config-item'>
                  <label>Vendor</label>
                  <Select
                    classNamePrefix='my-select'
                    options={vendors}
                    value={
                      vendors.find((v) => v.value === selectedVendorId) || null
                    }
                    onChange={handleVendorChange}
                    isDisabled={isAnyProcessing || isLoadingClientsAndVendors}
                    placeholder={
                      isLoadingClientsAndVendors ? 'Loading...' : 'Select vendor'
                    }
                    isClearable
                    menuPortalTarget={document.body}
                    styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </div>

                {/* Client (auto-populated from project) */}
                <div className='config-item'>
                  <label>Client</label>
                  <div className='client-display'>
                    {selectedClientName || (
                      <span className='client-placeholder'>
                        {selectedProjectId ? 'No client assigned' : 'Select a project'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Age Base Date */}
                <div className='config-item'>
                  <label>Age Base Date</label>
                  <div className='toggle-group'>
                    <button
                      className={`toggle-btn ${
                        ageCalculationMode === 'january' ? 'active' : ''
                      }`}
                      onClick={() => setAgeCalculationMode('january')}
                    >
                      Jan 1st
                    </button>
                    <button
                      className={`toggle-btn ${
                        ageCalculationMode === 'july' ? 'active' : ''
                      }`}
                      onClick={() => setAgeCalculationMode('july')}
                    >
                      Jul 1st
                    </button>
                  </div>
                </div>

                {/* File ID */}
                <div className='config-item'>
                  <label>File ID (optional)</label>
                  <input
                    type='number'
                    min='1'
                    value={requestedFileId}
                    onChange={(e) => setRequestedFileId(e.target.value)}
                    placeholder='Auto-assigned'
                    className='config-input'
                    disabled={isAnyProcessing}
                  />
                </div>
              </div>

              {/* File Drop Zone */}
              <div
                className={`drop-zone ${dragActive ? 'drag-active' : ''} ${
                  hasFiles ? 'has-files' : ''
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

                {hasFiles ? (
                  <div className='files-summary-bar'>
                    <div className='files-info'>
                      <span className='files-icon'>📊</span>
                      <div className='files-details'>
                        <div className='files-count'>
                          {selectedFiles?.length} file
                          {selectedFiles?.length !== 1 ? 's' : ''} selected
                        </div>
                        <div className='files-meta'>
                          Total: {formatFileSize(totalFileSize)}
                        </div>
                        <div className='files-hint'>
                          Click to add more files
                        </div>
                      </div>
                    </div>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSelectedFiles();
                      }}
                      className='btn-secondary'
                      disabled={isAnyProcessing}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className='drop-zone-empty'>
                    <span className='drop-zone-icon'>📂</span>
                    <div className='drop-zone-text'>
                      <strong>Click to select</strong> or drag files here
                    </div>
                    <div className='drop-zone-subtext'>
                      Supports CSV, XLSX, JSON, TXT
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Header Review */}
        <div className='workflow-step'>
          <div className='step-header' onClick={() => toggleStep(2)}>
            <div
              className={`step-number ${
                isStep2Complete ? 'completed' : !hasFiles ? 'disabled' : ''
              }`}
            >
              {isStep2Complete ? <Icon path={mdiCheck} size={0.7} /> : '2'}
            </div>
            <div className='step-info'>
              <h3 className='step-title'>Review Headers</h3>
              <p className='step-summary'>{getStep2Summary()}</p>
            </div>
            <Icon
              path={mdiChevronDown}
              size={0.9}
              className={`step-toggle ${expandedSteps.has(2) ? 'expanded' : ''}`}
            />
          </div>

          {expandedSteps.has(2) && hasFiles && (
            <div className='step-content'>
              <FileHeaders
                selectedFiles={selectedFiles}
                fileHeaders={fileHeaders}
                checkedFiles={checkedFiles}
                isProcessing={isAnyProcessing}
                validationSummary={validationSummary}
                allowExtraHeaders={allowExtraHeaders}
                onValidationModeChange={setAllowExtraHeaders}
                onSaveMappingToDB={handleSaveMappingToDB}
                onUpdateLocalMapping={handleUpdateLocalMapping}
              />

              {/* Process Actions */}
              <div className='process-actions'>
                <button
                  onClick={handleProcessFiles}
                  disabled={
                    !selectedProjectId ||
                    !hasFiles ||
                    !allFilesChecked ||
                    (!allowExtraHeaders && hasHeaderConflicts) ||
                    isAnyProcessing
                  }
                  className='btn-primary'
                >
                  <Icon path={mdiPlay} size={0.75} />
                  {isProcessing
                    ? 'Processing...'
                    : hasHeaderConflicts && !allowExtraHeaders
                    ? 'Resolve Conflicts'
                    : !allFilesChecked
                    ? 'Review Headers First'
                    : `Process ${selectedFiles?.length} File${
                        selectedFiles?.length !== 1 ? 's' : ''
                      }`}
                </button>
                <button
                  onClick={clearInputs}
                  disabled={isAnyProcessing}
                  className='btn-secondary'
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Results & Export */}
        <div className='workflow-step'>
          <div className='step-header' onClick={() => toggleStep(3)}>
            <div
              className={`step-number ${
                isStep3Complete ? 'completed' : !isStep2Complete ? 'disabled' : ''
              }`}
            >
              {isStep3Complete ? <Icon path={mdiCheck} size={0.7} /> : '3'}
            </div>
            <div className='step-info'>
              <h3 className='step-title'>Results & Export</h3>
              <p className='step-summary'>{getStep3Summary()}</p>
            </div>
            <Icon
              path={mdiChevronDown}
              size={0.9}
              className={`step-toggle ${expandedSteps.has(3) ? 'expanded' : ''}`}
            />
          </div>

          {expandedSteps.has(3) && processResult && (
            <div className='step-content'>
              {/* Results Grid */}
              <div className='results-section'>
                <div className='results-grid'>
                  <div className='result-card'>
                    <div className='result-label'>Table Created</div>
                    <div className='result-value'>{processResult.tableName}</div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>Files Processed</div>
                    <div className='result-value'>
                      {selectedFiles?.length || 0}
                    </div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>Total Rows</div>
                    <div className='result-value'>
                      {processResult.totalRows?.toLocaleString()}
                    </div>
                  </div>
                  <div className='result-card'>
                    <div className='result-label'>Rows Inserted</div>
                    <div className='result-value success'>
                      {processResult.rowsInserted?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Table Preview */}
                {tablePreview && (
                  <div className='preview-section'>
                    <div className='preview-header'>
                      <h4 className='preview-title'>
                        <Icon
                          path={mdiTableLarge}
                          size={0.7}
                          style={{ marginRight: '0.5rem' }}
                        />
                        Data Preview
                      </h4>
                      <span className='preview-subtitle'>
                        Showing {tablePreview.rowCount} of{' '}
                        {processResult?.totalRows || 0} rows
                      </span>
                    </div>

                    {isLoadingPreview ? (
                      <div className='loading-state'>
                        <div className='spinner' />
                        <span>Loading preview...</span>
                      </div>
                    ) : previewError ? (
                      <div className='error-state'>Failed to load preview</div>
                    ) : (
                      <div className='preview-table-wrapper'>
                        <table className='preview-table'>
                          <thead>
                            <tr>
                              <th className='row-num'>#</th>
                              {tablePreview.columns.map((col, idx) => (
                                <th key={idx}>
                                  {col.name}
                                  <span className='col-type'>{col.type}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tablePreview.data.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                <td className='row-num'>{rowIdx + 1}</td>
                                {tablePreview.columns.map((col, colIdx) => (
                                  <td key={colIdx}>
                                    {row[col.name] != null
                                      ? String(row[col.name])
                                      : '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Sample Configuration */}
              {processResult.tableName && (
                <SampleSplitComponent
                  headers={processResult.headers || []}
                  ageRanges={distinctAgeRanges}
                  tableName={processResult.tableName}
                  onConfigChange={handleSplitConfigChange}
                  isExtracting={isExtracting}
                  fileType={fileType}
                  setFileType={setFileType}
                  clientId={selectedClientId}
                  projectId={selectedProjectId}
                  callIdAssignment={processResult.callIdAssignment}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
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
    </section>
  );
};

export default SampleAutomation;
