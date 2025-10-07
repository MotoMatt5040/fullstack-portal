import React, { useState, useCallback } from 'react';

interface FileWrapper {
  file: File;
  id: string;
}

interface HeaderMapping {
  original: string;
  mapped: string;
  vendorName?: string;
  clientName?: string;
  priority?: number;
}

interface FileHeaderData {
  originalHeaders: string[];
  mappedHeaders: string[];
  mappings: Record<string, HeaderMapping>;
}

interface ValidationSummary {
  matched: number;
  total: number;
  nonMatchingHeaders: Array<{
    header: string;
    missingFromFiles: string[];
    presentInFiles: string[];
  }>;
}

interface FileHeadersProps {
  selectedFiles: FileWrapper[];
  fileHeaders: Record<string, FileHeaderData>;
  checkedFiles: Set<string>;
  isProcessing: boolean;
  onUpdateLocalMapping?: (fileId: string, index: number, newMapped: string) => void;
  onSaveMappingToDB?: (fileId: string, original: string, mapped: string) => void;
  validationSummary: ValidationSummary;
  allowExtraHeaders: boolean;
  onValidationModeChange: (allow: boolean) => void;
}

const FileHeaders: React.FC<FileHeadersProps> = ({
  selectedFiles,
  fileHeaders,
  checkedFiles,
  isProcessing,
  onUpdateLocalMapping,
  onSaveMappingToDB,
  validationSummary,
  allowExtraHeaders,
  onValidationModeChange,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [editingHeaders, setEditingHeaders] = useState<Record<string, Record<number, string>>>({});
  const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const toggleFileExpansion = useCallback((fileId: string) => {
    setExpandedFiles(prev => {
      const updated = new Set(prev);
      if (updated.has(fileId)) {
        updated.delete(fileId);
      } else {
        updated.add(fileId);
      }
      return updated;
    });
  }, []);

  const handleEditHeader = useCallback((fileId: string, index: number, currentValue: string) => {
    setEditingHeaders(prev => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || {}),
        [index]: currentValue
      }
    }));
  }, []);

  const handleCancelEdit = useCallback((fileId: string, index: number) => {
    setEditingHeaders(prev => {
      const fileEdits = { ...prev[fileId] };
      delete fileEdits[index];
      return {
        ...prev,
        [fileId]: fileEdits
      };
    });
  }, []);

  const handleConfirmEdit = useCallback((fileId: string, index: number, newMapped: string) => {
    if (onUpdateLocalMapping) {
    onUpdateLocalMapping(fileId, index, newMapped);
  }
    
    // Clear editing state for this row
    setEditingHeaders(prev => {
      const fileEdits = { ...prev[fileId] };
      delete fileEdits[index];
      return {
        ...prev,
        [fileId]: fileEdits
      };
    });
  }, [onUpdateLocalMapping]);

  const handleSaveToDB = useCallback((fileId: string, index: number, original: string, mapped: string) => {
    if (onSaveMappingToDB) {
      onSaveMappingToDB(fileId, original, mapped);
    }
  }, [onSaveMappingToDB]);

  const handleHeaderChange = useCallback((fileId: string, index: number, value: string) => {
    setEditingHeaders(prev => ({
      ...prev,
      [fileId]: {
        ...(prev[fileId] || {}),
        [index]: value
      }
    }));
  }, []);

  const getMappingStatus = useCallback((original: string, mapped: string, mappings: Record<string, HeaderMapping>) => {
    const upperOriginal = original.toUpperCase();
    const mapping = mappings[upperOriginal];
    
    if (!mapping) {
      return {
        status: 'no-mapping',
        color: '#dc3545',
        tooltip: 'No mapping found in database'
      };
    }
    
    if (mapping.mapped === mapped) {
      return {
        status: 'mapped',
        color: '#28a745',
        tooltip: `Mapped from ${mapping.vendorName || 'All'} → ${mapping.clientName || 'All'}`
      };
    }
    
    return {
      status: 'custom',
      color: '#ffc107',
      tooltip: 'Custom mapping (edited by user)'
    };
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const getSupportedFileIcon = useCallback((filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'csv': return '📊';
      case 'xlsx':
      case 'xls': return '📗';
      case 'json': return '📄';
      case 'txt': return '📝';
      default: return '📄';
    }
  }, []);

  if (!selectedFiles || selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className="file-headers-container">
      <div className="file-headers-header">
        <h3>Review File Headers & Mappings</h3>
        <div className="validation-controls">
          <label className="validation-toggle">
            <input
              type="checkbox"
              checked={allowExtraHeaders}
              onChange={(e) => onValidationModeChange(e.target.checked)}
            />
            Allow extra headers (ignore missing columns in some files)
          </label>
        </div>
      </div>

      {validationSummary.nonMatchingHeaders.length > 0 && !allowExtraHeaders && (
        <div className="validation-warning">
          <h4>Header Conflicts Detected</h4>
          <p>The following headers are not present in all files:</p>
          {validationSummary.nonMatchingHeaders.map((conflict, index) => (
            <div key={index} className="conflict-item">
              <strong>"{conflict.header}"</strong>
              <div className="conflict-details">
                <span className="present-in">
                  Present in: {conflict.presentInFiles.join(', ')}
                </span>
                <span className="missing-from">
                  Missing from: {conflict.missingFromFiles.join(', ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="validation-summary">
        <span className={`summary-text ${validationSummary.nonMatchingHeaders.length === 0 ? 'success' : 'warning'}`}>
          {allowExtraHeaders ? 
            `${validationSummary.matched} headers ready for processing` :
            `${validationSummary.matched}/${validationSummary.total} headers match across all files`
          }
        </span>
      </div>

      <div className="files-list">
        {selectedFiles.map((fileWrapper) => {
          const { file, id } = fileWrapper;
          const isChecked = checkedFiles.has(id);
          const headerData = fileHeaders[id];
          const isExpanded = expandedFiles.has(id);
          const fileEditingHeaders = editingHeaders[id] || {};

          return (
            <div key={id} className={`file-item ${isChecked ? 'checked' : ''}`}>
              <div className="file-summary" onClick={() => toggleFileExpansion(id)}>
                <div className="file-info">
                  <div className="file-name">
                    <span className="file-icon">{getSupportedFileIcon(file.name)}</span>
                    {file.name}
                  </div>
                  <div className="file-meta">
                    {formatFileSize(file.size)}
                    {headerData ? (
                      <span className="header-count">
                        • {headerData.originalHeaders.length} columns
                        {headerData.mappedHeaders.some((mapped, idx) => 
                          mapped !== headerData.originalHeaders[idx]) && (
                          <span className="mapped-indicator"> (mapped)</span>
                        )}
                      </span>
                    ) : (
                      <span className="header-count">• Processing headers...</span>
                    )}
                  </div>
                </div>
                
                <div className="file-actions">
                  {isChecked && headerData && (
                    <div className="checked-indicator">
                      <span className="check-mark">✓</span>
                      Headers Mapped
                    </div>
                  )}
                  
                  <button 
                    className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {isExpanded && headerData && (
                <div className="headers-detail">
                  <div className="headers-actions">
                    <div className="view-toggle-group">
                      <button
                        onClick={() => setShowOnlyUnmapped(!showOnlyUnmapped)}
                        className={`view-toggle-btn ${showOnlyUnmapped ? 'active' : ''}`}
                        title={showOnlyUnmapped ? "Showing only unmapped headers" : "Showing all headers"}
                      >
                        {showOnlyUnmapped ? '🔍 Show All Headers' : '✓ Show Only Unmapped'}
                      </button>
                    </div>

                    <div className="lock-toggle-group">
                      <button
                        onClick={() => setIsUnlocked(!isUnlocked)}
                        className={`lock-toggle-btn ${isUnlocked ? 'unlocked' : 'locked'}`}
                        title={isUnlocked ? "Database saves enabled - Click to lock" : "Database saves disabled - Click to unlock"}
                      >
                        {isUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                      </button>
                      <span className="lock-hint">
                        {isUnlocked ? 'Save to DB enabled' : 'Save to DB disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="headers-mapping-container">
                    <div className="mapping-header">
                      <div className="original-column">Original Headers</div>
                      <div className="arrow-column">→</div>
                      <div className="mapped-column">Mapped Headers</div>
                      <div className="actions-column">Actions</div>
                    </div>

                    <div className="headers-grid">
                      {headerData.originalHeaders.map((originalHeader, index) => {
                        const isEditingThisRow = fileEditingHeaders[index] !== undefined;
                        const mappedHeader = isEditingThisRow 
                          ? fileEditingHeaders[index]
                          : headerData.mappedHeaders[index];
                        
                        const mappingStatus = getMappingStatus(
                          originalHeader, 
                          headerData.mappedHeaders[index], 
                          headerData.mappings
                        );

                        if (showOnlyUnmapped && mappingStatus.status === 'mapped') {
                          return null;
                        }

                        return (
                          <div key={index} className="header-row">
                            <div className="original-header">
                              <span className="header-text">{originalHeader}</span>
                            </div>
                            
                            <div className="arrow">→</div>
                            
                            <div className="mapped-header">
                              {isEditingThisRow ? (
                                <input
                                  type="text"
                                  value={mappedHeader}
                                  onChange={(e) => handleHeaderChange(id, index, e.target.value)}
                                  className="header-input"
                                  autoFocus
                                />
                              ) : (
                                <div className="header-display">
                                  <span 
                                    className="header-text"
                                    style={{ color: mappingStatus.color }}
                                    title={mappingStatus.tooltip}
                                  >
                                    {mappedHeader}
                                  </span>
                                  <div 
                                    className={`mapping-indicator ${mappingStatus.status}`}
                                    style={{ backgroundColor: mappingStatus.color }}
                                    title={mappingStatus.tooltip}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="row-actions">
                              {isEditingThisRow ? (
                                <>
                                  <button
                                    onClick={() => handleConfirmEdit(id, index, mappedHeader)}
                                    className="confirm-row-btn"
                                    disabled={isProcessing}
                                    title="Confirm this change (session only)"
                                  >
                                    ✓ Confirm
                                  </button>
                                  <button
                                    onClick={() => handleCancelEdit(id, index)}
                                    className="cancel-row-btn"
                                    title="Cancel editing"
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditHeader(id, index, mappedHeader)}
                                    className="edit-row-btn"
                                    disabled={isProcessing}
                                    title="Edit this mapping"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => handleSaveToDB(id, index, originalHeader, mappedHeader)}
                                    className="save-db-btn"
                                    disabled={isProcessing || !isUnlocked}
                                    title={isUnlocked ? "Save this mapping to database" : "Unlock to save to database"}
                                  >
                                    💾 Save to DB
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mapping-legend">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#28a745' }}></div>
                      <span>Database mapping found</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
                      <span>Custom mapping (edited)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#dc3545' }}></div>
                      <span>No mapping found</span>
                    </div>
                  </div>
                </div>
              )}

              {isExpanded && !headerData && (
                <div className="headers-detail">
                  <div className="loading-headers">
                    <div className="loading-message">
                      <div className="spinner"></div>
                      <p>Processing file headers and fetching database mappings...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileHeaders;