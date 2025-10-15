import React, { useState, useCallback, useMemo } from 'react';

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
  onSaveHeaders: (
    fileId: string,
    originalHeaders: string[],
    editedMappedHeaders?: string[]
  ) => void;
  onUpdateLocalMapping?: (
    fileId: string,
    index: number,
    newMapped: string
  ) => void;
  onSaveMappingToDB?: (
    fileId: string,
    original: string,
    mapped: string
  ) => void;
  validationSummary: ValidationSummary;
  allowExtraHeaders: boolean;
  onValidationModeChange: (allow: boolean) => void;
}

type FilterMode = 'all' | 'mapped' | 'unmapped' | 'custom';

const FileHeaders: React.FC<FileHeadersProps> = ({
  selectedFiles,
  fileHeaders,
  checkedFiles,
  isProcessing,
  onSaveHeaders,
  onUpdateLocalMapping,
  onSaveMappingToDB,
  validationSummary,
  allowExtraHeaders,
  onValidationModeChange,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [editingHeaders, setEditingHeaders] = useState<
    Record<string, Record<number, string>>
  >({});
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [editedHeaders, setEditedHeaders] = useState<
    Record<string, Set<number>>
  >({});

  // Calculate progress
  const progressStats = useMemo(() => {
    let totalHeaders = 0;
    let mappedHeaders = 0;
    let unmappedHeaders = 0;
    let customHeaders = 0;

    Object.values(fileHeaders).forEach((headerData) => {
      headerData.originalHeaders.forEach((original, index) => {
        totalHeaders++;
        const mapped = headerData.mappedHeaders[index];
        const upperOriginal = original.toUpperCase();
        const dbMapping = headerData.mappings[upperOriginal];

        if (!dbMapping) {
          unmappedHeaders++;
        } else if (dbMapping.mapped === mapped) {
          mappedHeaders++;
        } else {
          customHeaders++;
        }
      });
    });

    return { totalHeaders, mappedHeaders, unmappedHeaders, customHeaders };
  }, [fileHeaders]);

  const toggleFileExpansion = useCallback((fileId: string) => {
    setExpandedFiles((prev) => {
      const updated = new Set(prev);
      if (updated.has(fileId)) {
        updated.delete(fileId);
      } else {
        updated.add(fileId);
      }
      return updated;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedFiles(new Set(selectedFiles.map((f) => f.id)));
  }, [selectedFiles]);

  const collapseAll = useCallback(() => {
    setExpandedFiles(new Set());
  }, []);

  const handleEditHeader = useCallback(
    (fileId: string, index: number, currentValue: string) => {
      setEditingHeaders((prev) => ({
        ...prev,
        [fileId]: {
          ...(prev[fileId] || {}),
          [index]: currentValue,
        },
      }));
    },
    []
  );

  const handleCancelEdit = useCallback((fileId: string, index: number) => {
    setEditingHeaders((prev) => {
      const fileEdits = { ...prev[fileId] };
      delete fileEdits[index];
      return {
        ...prev,
        [fileId]: fileEdits,
      };
    });
  }, []);

  const handleSaveLocal = useCallback(
    (fileId: string, index: number, newMapped: string) => {
      // First clear the editing state
      setEditingHeaders((prev) => {
        const newState = { ...prev };
        if (newState[fileId]) {
          const fileEdits = { ...newState[fileId] };
          delete fileEdits[index];

          if (Object.keys(fileEdits).length === 0) {
            delete newState[fileId];
          } else {
            newState[fileId] = fileEdits;
          }
        }
        return newState;
      });

      // Mark this header as edited
      setEditedHeaders((prev) => {
        const fileEdited = prev[fileId] || new Set();
        return {
          ...prev,
          [fileId]: new Set([...fileEdited, index]),
        };
      });

      // Then update the local mapping
      if (onUpdateLocalMapping) {
        onUpdateLocalMapping(fileId, index, newMapped);
      }
    },
    [onUpdateLocalMapping]
  );

  const handleSaveToDB = useCallback(
    (fileId: string, index: number, original: string, mapped: string) => {
      if (onSaveMappingToDB) {
        onSaveMappingToDB(fileId, original, mapped);

        // Remove from edited headers since it's now in DB
        setEditedHeaders((prev) => {
          const fileEdited = new Set(prev[fileId] || []);
          fileEdited.delete(index);
          return {
            ...prev,
            [fileId]: fileEdited,
          };
        });
      }
    },
    [onSaveMappingToDB]
  );

  const handleHeaderChange = useCallback(
    (fileId: string, index: number, value: string) => {
      setEditingHeaders((prev) => ({
        ...prev,
        [fileId]: {
          ...(prev[fileId] || {}),
          [index]: value,
        },
      }));
    },
    []
  );

  const getMappingStatus = useCallback(
    (
      original: string,
      mapped: string,
      mappings: Record<string, HeaderMapping>,
      fileId: string,
      index: number
    ) => {
      const upperOriginal = original.toUpperCase();
      const mapping = mappings[upperOriginal];
      const wasEdited = editedHeaders[fileId]?.has(index);

      // If manually edited, always show as custom (yellow)
      if (wasEdited) {
        return {
          status: 'custom',
          color: '#f0ad4e',
          tooltip: 'Custom mapping (edited by user)',
        };
      }

      if (!mapping) {
        return {
          status: 'no-mapping',
          color: '#d9534f',
          tooltip: 'No mapping found in database',
        };
      }

      if (mapping.mapped === mapped) {
        return {
          status: 'mapped',
          color: '#5cb85c',
          tooltip: `Mapped from ${mapping.vendorName || 'All'} → ${
            mapping.clientName || 'All'
          }`,
        };
      }

      return {
        status: 'custom',
        color: '#f0ad4e',
        tooltip: 'Custom mapping (edited by user)',
      };
    },
    [editedHeaders]
  );

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
      case 'csv':
        return '📊';
      case 'xlsx':
      case 'xls':
        return '📗';
      case 'json':
        return '📄';
      case 'txt':
        return '📝';
      default:
        return '📄';
    }
  }, []);

  if (!selectedFiles || selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className='file-headers-container'>
      {/* Sticky Progress Bar */}
      <div className='files-summary-sticky'>
        <div className='progress-section'>
          <div className='progress-stats'>
            <span className='stat-item'>
              <strong>{selectedFiles.length}</strong> files
            </span>
            <span className='stat-item success'>
              <strong>{progressStats.mappedHeaders}</strong> mapped
            </span>
            <span className='stat-item warning'>
              <strong>{progressStats.unmappedHeaders}</strong> unmapped
            </span>
            <span className='stat-item custom'>
              <strong>{progressStats.customHeaders}</strong> custom
            </span>
          </div>
          <div className='progress-bar-container'>
            <div className='progress-bar'>
              <div
                className='progress-fill mapped'
                style={{
                  width: `${
                    (progressStats.mappedHeaders / progressStats.totalHeaders) *
                    100
                  }%`,
                }}
              />
              <div
                className='progress-fill custom'
                style={{
                  width: `${
                    (progressStats.customHeaders / progressStats.totalHeaders) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
        <div className='global-controls'>
          <button onClick={expandAll} className='control-btn'>
            Expand All
          </button>
          <button onClick={collapseAll} className='control-btn'>
            Collapse All
          </button>
          <button
            onClick={() => setIsUnlocked(!isUnlocked)}
            className={`lock-toggle-btn-compact ${
              isUnlocked ? 'unlocked' : 'locked'
            }`}
            title={isUnlocked ? 'DB saves enabled' : 'DB saves disabled'}
          >
            {isUnlocked ? '🔓' : '🔒'}
          </button>
        </div>
      </div>

      <div className='file-headers-header'>
        <h3>Review File Headers & Mappings</h3>
        <div className='header-controls'>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
            className='filter-dropdown'
          >
            <option value='all'>All Headers</option>
            <option value='mapped'>Mapped Only</option>
            <option value='unmapped'>Unmapped Only</option>
            <option value='custom'>Custom Only</option>
          </select>
          <label className='validation-toggle'>
            <input
              type='checkbox'
              checked={allowExtraHeaders}
              onChange={(e) => onValidationModeChange(e.target.checked)}
            />
            Allow extra headers
          </label>
        </div>
      </div>

      {validationSummary.nonMatchingHeaders.length > 0 &&
        !allowExtraHeaders && (
          <div className='validation-warning'>
            <h4>⚠️ Header Conflicts Detected</h4>
            <p>The following headers are not present in all files:</p>
            {validationSummary.nonMatchingHeaders.map((conflict, index) => (
              <div key={index} className='conflict-item'>
                <strong>"{conflict.header}"</strong>
                <div className='conflict-details'>
                  <span className='present-in'>
                    ✓ Present in: {conflict.presentInFiles.join(', ')}
                  </span>
                  <span className='missing-from'>
                    ✗ Missing from: {conflict.missingFromFiles.join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      <div className='files-list'>
        {selectedFiles.map((fileWrapper) => {
          const { file, id } = fileWrapper;
          const isChecked = checkedFiles.has(id);
          const headerData = fileHeaders[id];
          const isExpanded = expandedFiles.has(id);
          const fileEditingHeaders = editingHeaders[id] || {};

          return (
            <div key={id} className={`file-item ${isChecked ? 'checked' : ''}`}>
              <div
                className='file-summary'
                onClick={() => toggleFileExpansion(id)}
              >
                <div className='file-info'>
                  <div className='file-name'>
                    <span className='file-icon'>
                      {getSupportedFileIcon(file.name)}
                    </span>
                    {file.name}
                  </div>
                  <div className='file-meta'>
                    {formatFileSize(file.size)}
                    {headerData && (
                      <span className='header-count'>
                        • {headerData.originalHeaders.length} columns
                      </span>
                    )}
                  </div>
                </div>

                <div className='file-actions'>
                  {isChecked && headerData && (
                    <div className='checked-indicator-compact'>✓</div>
                  )}

                  <button
                    className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {isExpanded && headerData && (
                <div className='headers-detail'>
                  <div className='headers-mapping-container'>
                    <div className='mapping-header'>
                      <div className='original-column'>Original</div>
                      <div className='arrow-column'>→</div>
                      <div className='mapped-column'>Mapped</div>
                      <div className='actions-column'>Actions</div>
                    </div>

                    <div className='headers-grid'>
                      {headerData.originalHeaders.map(
                        (originalHeader, index) => {
                          const isEditingThisRow =
                            fileEditingHeaders.hasOwnProperty(index);
                          const currentMappedValue =
                            headerData.mappedHeaders[index];
                          const editingValue = fileEditingHeaders[index];
                          const displayValue = isEditingThisRow
                            ? editingValue
                            : currentMappedValue;

                          const mappingStatus = getMappingStatus(
                            originalHeader,
                            currentMappedValue,
                            headerData.mappings,
                            id, // ADD THIS
                            index // ADD THIS
                          );

                          // Apply filter
                          if (
                            filterMode === 'mapped' &&
                            mappingStatus.status !== 'mapped'
                          )
                            return null;
                          if (
                            filterMode === 'unmapped' &&
                            mappingStatus.status !== 'no-mapping'
                          )
                            return null;
                          if (
                            filterMode === 'custom' &&
                            mappingStatus.status !== 'custom'
                          )
                            return null;

                          return (
                            <div key={index} className='header-row'>
                              <div className='original-header'>
                                <span className='header-text'>
                                  {originalHeader}
                                </span>
                              </div>

                              <div className='arrow'>→</div>

                              <div className='mapped-header'>
                                {isEditingThisRow ? (
                                  <input
                                    type='text'
                                    value={displayValue}
                                    onChange={(e) =>
                                      handleHeaderChange(
                                        id,
                                        index,
                                        e.target.value
                                      )
                                    }
                                    className='header-input-compact'
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveLocal(
                                          id,
                                          index,
                                          displayValue
                                        );
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCancelEdit(id, index);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className='header-display'>
                                    <div
                                      className={`mapping-indicator ${mappingStatus.status}`}
                                      style={{
                                        backgroundColor: mappingStatus.color,
                                      }}
                                      title={mappingStatus.tooltip}
                                    />
                                    <span
                                      className='header-text'
                                      title={mappingStatus.tooltip}
                                    >
                                      {displayValue}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className='row-actions'>
                                {isEditingThisRow ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleSaveLocal(id, index, displayValue)
                                      }
                                      className='action-btn confirm'
                                      title='Save (Enter)'
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleCancelEdit(id, index)
                                      }
                                      className='action-btn cancel'
                                      title='Cancel (Esc)'
                                    >
                                      ✕
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditHeader(
                                          id,
                                          index,
                                          currentMappedValue
                                        )
                                      }
                                      className='action-btn edit'
                                      disabled={isProcessing}
                                      title='Edit mapping'
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleSaveToDB(
                                          id,
                                          index,
                                          originalHeader,
                                          currentMappedValue
                                        )
                                      }
                                      className='action-btn save-db'
                                      disabled={isProcessing || !isUnlocked}
                                      title={
                                        isUnlocked
                                          ? 'Save to database'
                                          : 'Unlock to save'
                                      }
                                    >
                                      💾
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className='mapping-legend-compact'>
                    <span className='legend-item'>
                      <span className='dot mapped'></span>Mapped
                    </span>
                    <span className='legend-item'>
                      <span className='dot custom'></span>Custom
                    </span>
                    <span className='legend-item'>
                      <span className='dot unmapped'></span>Unmapped
                    </span>
                  </div>
                </div>
              )}

              {isExpanded && !headerData && (
                <div className='headers-detail'>
                  <div className='loading-headers'>
                    <div className='spinner'></div>
                    <p>Loading headers...</p>
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
