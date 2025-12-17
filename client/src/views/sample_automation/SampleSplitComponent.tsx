import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@mdi/react';
import {
  mdiChevronDown,
  mdiChevronRight,
  mdiCog,
  mdiPhone,
  mdiCallSplit,
  mdiCellphone,
  mdiHome,
  mdiPhoneClassic,
  mdiCalculatorVariant,
  mdiPencil,
  mdiClose,
} from '@mdi/js';
import { useRemoveComputedVariableMutation, type ComputedVariableDefinition } from '../../features/sampleAutomationApiSlice';
import { useToast } from '../../context/ToastContext';
import './SampleSplitComponent.css';
import ComputedVariablesModal from './ComputedVariablesModal';

interface CallIdAssignment {
  success: boolean;
  message: string;
  projectId?: number;
  projectName?: string;
  dateRange?: { startDate: string; endDate: string };
  areaCodes?: { AreaCode: string; Count: number }[];
  assigned?: { slot: string; phoneNumberId: number; phoneNumber: string; areaCode: string; stateAbbr: string }[];
  warnings?: string[];
  reused?: boolean;
}

interface SampleSplitComponentProps {
  headers?: any[];
  ageRanges?: any[];
  onConfigChange?: (config: any) => void;
  tableName?: string | null;
  isExtracting?: boolean;
  fileType?: 'landline' | 'cell';
  setFileType?: (type: 'landline' | 'cell') => void;
  clientId?: number | null;
  projectId?: string | null;
  callIdAssignment?: CallIdAssignment | null;
}

const SampleSplitComponent = ({
  headers = [],
  ageRanges = [],
  onConfigChange = () => {},
  tableName = null,
  isExtracting = false,
  fileType = 'landline',
  setFileType = () => {},
  clientId = null,
  projectId = null,
  callIdAssignment = null
}: SampleSplitComponentProps) => {
  const toast = useToast();
  const isTarranceClient = clientId === 102;
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedHeaders, setSelectedHeaders] = useState([]);
  const [splitMode, setSplitMode] = useState('all'); // 'all' or 'split'
  const [selectedAgeRange, setSelectedAgeRange] = useState('');
  const [availableAgeRanges, setAvailableAgeRanges] = useState([]);
  const [householdingEnabled, setHouseholdingEnabled] = useState(false);

  // Computed Variables state
  const [isComputedVarModalOpen, setIsComputedVarModalOpen] = useState(false);
  const [addedVariables, setAddedVariables] = useState<ComputedVariableDefinition[]>([]);
  const [editingVariable, setEditingVariable] = useState<ComputedVariableDefinition | null>(null);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);

  // API mutations
  const [removeComputedVariable] = useRemoveComputedVariableMutation();

  // Initialize available age ranges
  useEffect(() => {
    if (ageRanges && ageRanges.length > 0) {
      setAvailableAgeRanges(ageRanges);
      if (!selectedAgeRange && ageRanges.length > 0) {
        setSelectedAgeRange(ageRanges[0]);
      }
    }
  }, [ageRanges]);

  // Disable householding for Tarrance (TTG) clients
  useEffect(() => {
    if (isTarranceClient && householdingEnabled) {
      setHouseholdingEnabled(false);
    }
  }, [isTarranceClient]);

  // Initialize selected headers with all headers
  useEffect(() => {
    if (headers && headers.length > 0) {
      setSelectedHeaders(headers.map(h => h.name || h));
    }
  }, [headers]);

  // Update available variables for computed variables modal
  useEffect(() => {
    if (headers && headers.length > 0) {
      const headerNames = headers.map(h => h.name || h);
      // Include any added computed variables
      const addedVarNames = addedVariables.map(v => v.name);
      setAvailableVariables([...headerNames, ...addedVarNames]);
    }
  }, [headers, addedVariables]);

  // Handle when a computed variable is added or updated
  const handleVariableAdded = useCallback((variableName: string, definition: ComputedVariableDefinition) => {
    setAddedVariables(prev => {
      // Check if we're updating an existing variable
      const existingIndex = prev.findIndex(v => v.id === definition.id);
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = definition;
        return updated;
      }
      // Add new
      return [...prev, definition];
    });
    // Auto-select the new variable in the header selection (only if new)
    setSelectedHeaders(prev => {
      if (!prev.includes(variableName)) {
        return [...prev, variableName];
      }
      return prev;
    });
    setEditingVariable(null);
  }, []);

  // Handle removing a computed variable
  const handleRemoveVariable = useCallback(async (variableId: string) => {
    const variable = addedVariables.find(v => v.id === variableId);
    if (!variable || !tableName) return;

    try {
      // Drop the column from the database
      await removeComputedVariable({
        tableName,
        columnName: variable.name,
      }).unwrap();

      // Remove from local state
      setAddedVariables(prev => prev.filter(v => v.id !== variableId));
      // Remove from selected headers
      setSelectedHeaders(prev => prev.filter(h => h !== variable.name));

      toast.success(`Variable "${variable.name}" removed`, 'Variable Removed');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to remove variable', 'Error');
    }
  }, [addedVariables, tableName, removeComputedVariable, toast]);

  // Handle editing a variable
  const handleEditVariable = useCallback((variable: ComputedVariableDefinition) => {
    setEditingVariable(variable);
    setIsComputedVarModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsComputedVarModalOpen(false);
    setEditingVariable(null);
  }, []);

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
      {/* Computed Variables Section - Before the collapsible */}
      <div className="computed-variables-section">
        <div className="computed-variables-header">
          <h4>
            <Icon path={mdiCalculatorVariant} size={0.65} />
            Custom Variables
          </h4>
          <button
            onClick={() => setIsComputedVarModalOpen(true)}
            disabled={!tableName}
            className="add-variable-btn"
          >
            <Icon path={mdiCalculatorVariant} size={0.55} />
            Add Variable
          </button>
        </div>
        {addedVariables.length > 0 && (
          <div className="added-variables-list">
            <span className="added-variables-label">Added:</span>
            {addedVariables.map((v) => (
              <span key={v.id} className="added-variable-tag">
                <Icon path={mdiCalculatorVariant} size={0.45} />
                {v.name}
                <button
                  className="variable-action-btn edit"
                  onClick={(e) => { e.stopPropagation(); handleEditVariable(v); }}
                  title="Edit variable"
                >
                  <Icon path={mdiPencil} size={0.4} />
                </button>
                <button
                  className="variable-action-btn remove"
                  onClick={(e) => { e.stopPropagation(); handleRemoveVariable(v.id); }}
                  title="Remove variable"
                >
                  <Icon path={mdiClose} size={0.4} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

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
          {selectedHeaders.length} of {headers.length + addedVariables.length} variables selected
          {addedVariables.length > 0 && ` • ${addedVariables.length} custom`}
          {splitMode === 'all' && ` • ${fileType === 'landline' ? 'Landline' : 'Cell'} file`}
          {splitMode === 'split' && (isTarranceClient ? ' • Split by WPHONE' : ` • Split by age ${selectedAgeRange}`)}
          {!isTarranceClient && householdingEnabled && ` • Householding enabled`}
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

          {/* Householding Option - Available for all modes except Tarrance (TTG) */}
          {!isTarranceClient && (
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
              </div>
            </div>
          )}

          {/* Variable Selection */}
          <div className="header-selection-section">
            <div className="section-header">
              <label className="section-label">Select Variables to Include:</label>
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
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div onClick
                      onClick={(e) => e.stopPropagation()} // Prevent double-toggle
                      className="header-checkbox"
                    />
                    <span className="header-label">
                      {headerName}
                    </span>
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
              <li>Variables: {selectedHeaders.length} selected</li>
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
              {!isTarranceClient && <li>Householding: {householdingEnabled ? 'Enabled' : 'Disabled'}</li>}
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
                      {!isTarranceClient && householdingEnabled && fileType === 'landline' && ' - Householded'}
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
                          <>Landline records (WPHONE=N)</>
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
                    <span className="validation-error">Select at least one variable</span>
                  )}
                  {splitMode === 'split' && !isTarranceClient && !selectedAgeRange && (
                    <span className="validation-error">Select an age range threshold</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CallID Auto-Assignment Section - Shows results from automatic assignment during processing */}
          {callIdAssignment && (
            <div className="callid-section">
              <div className="callid-header">
                <h4>
                  <Icon path={mdiPhoneClassic} size={0.75} />
                  CallID Assignment
                </h4>
              </div>

              {callIdAssignment.success ? (
                <div className="callid-result">
                  <div className="callid-result-header">
                    <span className="callid-success">
                      {callIdAssignment.reused ? 'Using Existing CallIDs' : 'CallIDs Assigned Successfully'}
                    </span>
                  </div>

                  {callIdAssignment.areaCodes && callIdAssignment.areaCodes.length > 0 && (
                    <div className="callid-area-codes">
                      <strong>Top Area Codes:</strong>{' '}
                      {callIdAssignment.areaCodes.slice(0, 5).map((ac, idx) => (
                        <span key={ac.AreaCode} className="area-code-badge">
                          {ac.AreaCode} ({ac.Count})
                          {idx < Math.min(4, (callIdAssignment.areaCodes?.length || 0) - 1) && ', '}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="callid-assignments">
                    {callIdAssignment.assigned && callIdAssignment.assigned.map((assignment) => (
                      <div key={assignment.slot} className="callid-assignment-item">
                        <span className="slot-name">{assignment.slot.replace('CallID', '')}:</span>
                        <span className="phone-number">{assignment.phoneNumber}</span>
                        <span className="area-info">({assignment.areaCode} - {assignment.stateAbbr})</span>
                      </div>
                    ))}
                  </div>

                  {callIdAssignment.warnings && callIdAssignment.warnings.length > 0 && (
                    <div className="callid-warnings">
                      {callIdAssignment.warnings.map((warning, idx) => (
                        <span key={idx} className="callid-warning">{warning}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="callid-error">
                  {callIdAssignment.message || 'CallID assignment was not successful'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Computed Variables Modal */}
      <ComputedVariablesModal
        isOpen={isComputedVarModalOpen}
        onClose={handleModalClose}
        tableName={tableName || ''}
        availableVariables={availableVariables}
        onVariableAdded={handleVariableAdded}
        editingVariable={editingVariable}
      />
    </div>
  );
};

export default SampleSplitComponent;