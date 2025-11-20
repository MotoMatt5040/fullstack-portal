import React, { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import { 
  mdiChevronDown, 
  mdiChevronRight, 
  mdiCog, 
  mdiPhone, 
  mdiCallSplit,
  mdiCellphone,
  mdiHome
} from '@mdi/js';
import './SampleSplitComponent.css';

const SampleSplitComponent = ({
  headers = [],
  ageRanges = [],
  onConfigChange = () => {},
  tableName = null,
  isExtracting = false,
  fileType = 'landline',
  setFileType = () => {},
  clientId = null
}) => {
  const isTarranceClient = clientId === 102;
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedHeaders, setSelectedHeaders] = useState([]);
  const [splitMode, setSplitMode] = useState('all'); // 'all' or 'split'
  const [selectedAgeRange, setSelectedAgeRange] = useState('');
  const [availableAgeRanges, setAvailableAgeRanges] = useState([]);
  const [householdingEnabled, setHouseholdingEnabled] = useState(false);

  // Initialize available age ranges
  useEffect(() => {
    if (ageRanges && ageRanges.length > 0) {
      setAvailableAgeRanges(ageRanges);
      if (!selectedAgeRange && ageRanges.length > 0) {
        setSelectedAgeRange(ageRanges[0]);
      }
    }
  }, [ageRanges]);

  // Initialize selected headers with all headers
  useEffect(() => {
    if (headers && headers.length > 0) {
      setSelectedHeaders(headers.map(h => h.name || h));
    }
  }, [headers]);

  // Notify parent of configuration changes
  useEffect(() => {
    const config = {
      selectedHeaders,
      splitMode,
      selectedAgeRange,
      householdingEnabled, // Add this line
      splitLogic: {
        landline: {
          conditions: [
            'SOURCE = 1',
            `SOURCE = 3 AND AGERANGE >= ${selectedAgeRange}`
          ]
        },
        cell: {
          conditions: [
            'SOURCE = 2',
            `SOURCE = 3 AND AGERANGE < ${selectedAgeRange}`
          ]
        }
      }
    };
    onConfigChange(config);
  }, [selectedHeaders, splitMode, selectedAgeRange, householdingEnabled, onConfigChange]); // Add householdingEnabled to dependencies

  const handleHeaderToggle = (headerName) => {
    setSelectedHeaders(prev => {
      if (prev.includes(headerName)) {
        return prev.filter(h => h !== headerName);
      } else {
        return [...prev, headerName];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedHeaders.length === headers.length) {
      setSelectedHeaders([]);
    } else {
      setSelectedHeaders(headers.map(h => h.name || h));
    }
  };

  const renderSplitLogic = () => {
    if (splitMode !== 'split') return null;

    return (
      <div className="split-logic-container">
        <div className="split-logic-header">
          <Icon path={mdiCallSplit} size={0.7} className="split-icon" />
          <span>Split Configuration</span>
        </div>

        {isTarranceClient && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(0, 123, 255, 0.08)',
            border: '2px solid rgba(0, 123, 255, 0.2)',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            color: 'var(--text-color)'
          }}>
            <strong>Tarrance Client:</strong> Split will be based on WPHONE column (Y = Cell, N = Landline) instead of age ranges.
          </div>
        )}

        {!isTarranceClient && (
          <div className="age-range-selector">
            <label htmlFor="ageRangeSelect" className="form-label">
              Age Range Threshold:
            </label>
            <select
              id="ageRangeSelect"
              value={selectedAgeRange}
              onChange={(e) => setSelectedAgeRange(e.target.value)}
              className="form-select"
              disabled={availableAgeRanges.length === 0}
            >
              {availableAgeRanges.length === 0 ? (
                <option value="">No age ranges available</option>
              ) : (
                availableAgeRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div className="split-preview">
          <div className="split-group landline-group">
            <div className="split-group-header">
              <Icon path={mdiPhone} size={0.6} />
              <span>Landline Files</span>
            </div>
            <div className="split-conditions">
              {isTarranceClient ? (
                <div className="condition">WPHONE = N</div>
              ) : (
                <>
                  <div className="condition">SOURCE = 1</div>
                  <div className="condition-separator">OR</div>
                  <div className="condition">
                    SOURCE = 3 AND AGERANGE ≥ {selectedAgeRange || 'N/A'}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="split-group cell-group">
            <div className="split-group-header">
              <Icon path={mdiCellphone} size={0.6} />
              <span>Cell Files</span>
            </div>
            <div className="split-conditions">
              {isTarranceClient ? (
                <div className="condition">WPHONE = Y</div>
              ) : (
                <>
                  <div className="condition">SOURCE = 2</div>
                  <div className="condition-separator">OR</div>
                  <div className="condition">
                    SOURCE = 3 AND AGERANGE &lt; {selectedAgeRange || 'N/A'}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const canExtract = () => {
    if (selectedHeaders.length === 0) return false;
    // For Tarrance client, age range is not required (uses WPHONE instead)
    if (splitMode === 'split' && !isTarranceClient && !selectedAgeRange) return false;
    return true;
  };

  const handleExtract = () => {
    if (!canExtract()) return;

    const extractConfig = {
      selectedHeaders,
      splitMode,
      selectedAgeRange,
      householdingEnabled,
      fileType, // NEW: Include fileType
      tableName,
      fileNames: splitMode === 'split'
        ? {
            landline: `LSAM_${tableName}`,
            cell: `CSAM_${tableName}`
          }
        : {
            single: fileType === 'landline'
              ? `LSAM_${tableName}`
              : `CSAM_${tableName}` // NEW: Use fileType to determine prefix
          }
    };

    onConfigChange({ ...extractConfig, action: 'extract' });
  };

  return (
    <div className="sample-split-container">
      <div 
        className="sample-split-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-left">
          <Icon 
            path={isExpanded ? mdiChevronDown : mdiChevronRight} 
            size={0.8} 
          />
          <Icon path={mdiCog} size={0.8} />
          <span>Sample Configuration</span>
        </div>
        <div className="header-summary">
          {selectedHeaders.length} of {headers.length} headers selected
          {splitMode === 'all' && ` • ${fileType === 'landline' ? 'Landline' : 'Cell'} file`}
          {splitMode === 'split' && (isTarranceClient ? ' • Split by WPHONE' : ` • Split by age ${selectedAgeRange}`)}
          {householdingEnabled && ` • Householding enabled`}
        </div>
      </div>

      {isExpanded && (
        <div className="sample-split-content">
          {/* Split Mode Toggle */}
          <div className="split-mode-section">
            <label className="section-label">Output Mode:</label>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${splitMode === 'all' ? 'active' : ''}`}
                onClick={() => setSplitMode('all')}
              >
                All Records
              </button>
              <button
                className={`toggle-btn ${splitMode === 'split' ? 'active' : ''}`}
                onClick={() => setSplitMode('split')}
              >
                Landline & Cell Split
              </button>
            </div>
          </div>

          {/* File Type Selection - Only shown when splitMode is 'all' */}
          {splitMode === 'all' && (
            <div className="split-mode-section">
              <label className="section-label">File Type (for $N column & filename):</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${fileType === 'landline' ? 'active' : ''}`}
                  onClick={() => setFileType('landline')}
                >
                  <Icon path={mdiPhone} size={0.6} style={{ marginRight: '6px' }} />
                  Landline (LSAM_*.csv)
                </button>
                <button
                  className={`toggle-btn ${fileType === 'cell' ? 'active' : ''}`}
                  onClick={() => setFileType('cell')}
                >
                  <Icon path={mdiCellphone} size={0.6} style={{ marginRight: '6px' }} />
                  Cell (CSAM_*.csv)
                </button>
              </div>
              <small style={{ display: 'block', marginTop: '8px', color: '#666', fontSize: '0.85em' }}>
                Select file type to determine which phone column (LAND or CELL) will be copied to $N column and output filename prefix
              </small>
            </div>
          )}

          {/* Householding Option - Available for all modes */}
          <div className="householding-section">
            <div className="section-header">
              <div className="householding-toggle">
                <input
                  type="checkbox"
                  id="householding-checkbox"
                  checked={householdingEnabled}
                  onChange={(e) => setHouseholdingEnabled(e.target.checked)}
                  className="householding-checkbox"
                />
                <label htmlFor="householding-checkbox" className="householding-label">
                  <Icon path={mdiHome} size={0.6} className="householding-icon" />
                  Enable Householding for Landline Records
                </label>
              </div>
              
              {/* {householdingEnabled && (
                <div className="householding-info">
                  <div className="householding-description">
                    <p>Householding will process records where SOURCE=1 OR (SOURCE=3 and AGERANGE≥{selectedAgeRange || 'selected threshold'}):</p>
                    <ul>
                      <li>Rank by IAGE ASC (youngest to oldest)</li>
                      <li>Keep first record per phone number</li>
                      <li>Add FNAME2, LNAME2, FNAME3, LNAME3, FNAME4, LNAME4 columns to first record</li>
                      <li>Move 2nd, 3rd, 4th ranked records to separate duplicate tables</li>
                      <li>Only keeps first 4 records per phone number</li>
                    </ul>
                  </div>
                </div>
              )} */}
            </div>
          </div>

          {/* Header Selection */}
          <div className="header-selection-section">
            <div className="section-header">
              <label className="section-label">Select Headers to Include:</label>
              <button 
                className="select-all-btn"
                onClick={handleSelectAll}
              >
                {selectedHeaders.length === headers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="headers-grid">
              {headers.map((header, index) => {
                const headerName = header.name || header;
                const isSelected = selectedHeaders.includes(headerName);

                return (
                  <div
                    key={index}
                    className={`header-checkbox-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleHeaderToggle(headerName)}
                  >
                    <input
                      type="checkbox"
                      id={`header-${index}`}
                      checked={isSelected}
                      onChange={() => handleHeaderToggle(headerName)}
                      className="header-checkbox"
                    />
                    <label
                      htmlFor={`header-${index}`}
                      className="header-label"
                    >
                      {headerName}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Logic Preview */}
          {renderSplitLogic()}

          {/* Summary */}
          <div className="configuration-summary">
            <h4>Configuration Summary:</h4>
            <ul>
              <li>Headers: {selectedHeaders.length} selected</li>
              <li>Mode: {splitMode === 'all' ? 'Single output file' : 'Split into Landline and Cell files'}</li>
              {splitMode === 'all' && (
                <li>File type: {fileType === 'landline' ? 'Landline' : 'Cell'}</li>
              )}
              {splitMode === 'split' && !isTarranceClient && (
                <li>Age threshold: {selectedAgeRange || 'Not selected'}</li>
              )}
              {splitMode === 'split' && isTarranceClient && (
                <li>Split method: WPHONE column (Y=Cell, N=Landline)</li>
              )}
              <li>Householding: {householdingEnabled ? 'Enabled' : 'Disabled'}</li>
            </ul>
          </div>

          {/* Extract Section */}
          <div className="extract-section">
            <div className="extract-header">
              <h4>Extract Files</h4>
              <p className="extract-description">
                Generate CSV files based on your configuration
              </p>
            </div>
            
            <div className="extract-preview">
              {splitMode === 'all' ? (
                <div className="file-preview">
                  <div className="file-icon">{fileType === 'landline' ? '📞' : '📱'}</div>
                  <div className="file-info">
                    <div className="file-name">{fileType === 'landline' ? 'LSAM' : 'CSAM'}_{tableName}.csv</div>
                    <div className="file-description">
                      All records with {selectedHeaders.length} selected columns ({fileType === 'landline' ? 'Landline' : 'Cell'} file)
                      {householdingEnabled && fileType === 'landline' && ' - Householded'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="split-files-preview">
                  <div className="file-preview landline-file">
                    <div className="file-icon">📞</div>
                    <div className="file-info">
                      <div className="file-name">LSAM_{tableName}.csv</div>
                      <div className="file-description">
                        {isTarranceClient ? (
                          <>Landline records (WPHONE=N){householdingEnabled && ' - Householded'}</>
                        ) : (
                          <>Landline records (SOURCE=1 OR SOURCE=3 & AGERANGE≥{selectedAgeRange}){householdingEnabled && ' - Householded'}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="file-preview cell-file">
                    <div className="file-icon">📱</div>
                    <div className="file-info">
                      <div className="file-name">CSAM_{tableName}.csv</div>
                      <div className="file-description">
                        {isTarranceClient ? (
                          <>Cell records (WPHONE=Y)</>
                        ) : (
                          <>Cell records (SOURCE=2 OR SOURCE=3 & AGERANGE&lt;{selectedAgeRange})</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="extract-actions">
              <button
                onClick={handleExtract}
                disabled={!canExtract() || isExtracting}
                className="extract-btn"
              >
                {isExtracting ? 'Extracting...' : 'Extract Files'}
              </button>
              
              {!canExtract() && (
                <div className="extract-validation">
                  {selectedHeaders.length === 0 && (
                    <span className="validation-error">Select at least one header</span>
                  )}
                  {splitMode === 'split' && !isTarranceClient && !selectedAgeRange && (
                    <span className="validation-error">Select an age range threshold</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleSplitComponent;