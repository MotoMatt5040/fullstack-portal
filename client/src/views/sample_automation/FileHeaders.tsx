import React, { useState, useCallback, useMemo } from 'react';
import Icon from '@mdi/react';
import { mdiChevronDown, mdiPencil, mdiContentSave, mdiClose, mdiLock, mdiLockOpen, mdiEyeOff, mdiPlus, mdiMinus } from '@mdi/js';

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
  excludedHeaders?: string[];
  includedFromExclusions?: string[];
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
  onSaveHeaders?: (
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
  onIncludeExcludedHeader?: (fileId: string, headerName: string) => void;
  onExcludeIncludedHeader?: (fileId: string, headerName: string) => void;
}

type FilterMode = 'all' | 'mapped' | 'unmapped' | 'custom';

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
  onIncludeExcludedHeader,
  onExcludeIncludedHeader,
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
  const [expandedExcluded, setExpandedExcluded] = useState<Set<string>>(new Set());

  // Calculate progress stats
  const progressStats = useMemo(() => {
    let totalHeaders = 0;
    let mappedHeaders = 0;
    let unmappedHeaders = 0;
    let customHeaders = 0;
    let excludedHeaders = 0;

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

      // Count excluded headers
      if (headerData.excludedHeaders) {
        excludedHeaders += headerData.excludedHeaders.length;
      }
    });

    return { totalHeaders, mappedHeaders, unmappedHeaders, customHeaders, excludedHeaders };
  }, [fileHeaders]);

  const toggleExcludedExpansion = useCallback((fileId: string) => {
    setExpandedExcluded((prev) => {
      const updated = new Set(prev);
      if (updated.has(fileId)) {
        updated.delete(fileId);
      } else {
        updated.add(fileId);
      }
      return updated;
    });
  }, []);

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

      setEditedHeaders((prev) => {
        const fileEdited = prev[fileId] || new Set();
        return {
          ...prev,
          [fileId]: new Set([...fileEdited, index]),
        };
      });

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

      if (wasEdited) {
        return { status: 'custom', color: '#f59e0b', tooltip: 'Custom mapping' };
      }

      if (!mapping) {
        return { status: 'no-mapping', color: '#ef4444', tooltip: 'No mapping found' };
      }

      if (mapping.mapped === mapped) {
        return { status: 'mapped', color: '#10b981', tooltip: 'Database mapped' };
      }

      return { status: 'custom', color: '#f59e0b', tooltip: 'Custom mapping' };
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

  const getFileIcon = useCallback((filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
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
    <div className='headers-section' data-tour='headers-section'>
      {/* Toolbar */}
      <div className='headers-toolbar' data-tour='headers-toolbar'>
        <div className='headers-stats' data-tour='headers-stats'>
          <span>{selectedFiles.length} files</span>
          <span className='mapped'>{progressStats.mappedHeaders} mapped</span>
          <span className='unmapped'>{progressStats.unmappedHeaders} unmapped</span>
          <span className='custom'>{progressStats.customHeaders} custom</span>
          {progressStats.excludedHeaders > 0 && (
            <span className='excluded'>{progressStats.excludedHeaders} excluded</span>
          )}
        </div>
        <div className='headers-controls' data-tour='headers-controls'>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
            className='header-filter'
          >
            <option value='all'>All</option>
            <option value='mapped'>Mapped</option>
            <option value='unmapped'>Unmapped</option>
            <option value='custom'>Custom</option>
          </select>
          <button onClick={expandAll} className='control-btn-sm'>Expand</button>
          <button onClick={collapseAll} className='control-btn-sm'>Collapse</button>
          <button
            onClick={() => setIsUnlocked(!isUnlocked)}
            className={`lock-btn ${isUnlocked ? 'unlocked' : 'locked'}`}
            title={isUnlocked ? 'DB saves enabled' : 'DB saves locked'}
            data-tour='lock-button'
          >
            <Icon path={isUnlocked ? mdiLockOpen : mdiLock} size={0.65} />
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}>
            <input
              type='checkbox'
              checked={allowExtraHeaders}
              onChange={(e) => onValidationModeChange(e.target.checked)}
            />
            Allow extra headers
          </label>
        </div>
      </div>

      {/* Validation Warning */}
      {validationSummary.nonMatchingHeaders.length > 0 && !allowExtraHeaders && (
        <div className='validation-alert'>
          <div className='validation-alert-content'>
            <h4>Header Conflicts Detected</h4>
            <p>The following headers are not present in all files:</p>
            <ul className='conflict-list'>
              {validationSummary.nonMatchingHeaders.slice(0, 5).map((conflict, idx) => (
                <li key={idx}>
                  <strong>{conflict.header}</strong> - missing from{' '}
                  {conflict.missingFromFiles.join(', ')}
                </li>
              ))}
              {validationSummary.nonMatchingHeaders.length > 5 && (
                <li>...and {validationSummary.nonMatchingHeaders.length - 5} more</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* File List */}
      <div className='file-list' data-tour='file-list'>
        {selectedFiles.map((fileWrapper) => {
          const { file, id } = fileWrapper;
          const isChecked = checkedFiles.has(id);
          const headerData = fileHeaders[id];
          const isExpanded = expandedFiles.has(id);
          const fileEditingHeaders = editingHeaders[id] || {};

          return (
            <div key={id} className={`file-item ${isChecked ? 'checked' : ''}`}>
              <div className='file-item-header' onClick={() => toggleFileExpansion(id)}>
                <div className='file-item-info'>
                  <span className='file-item-icon'>{getFileIcon(file.name)}</span>
                  <div className='file-item-details'>
                    <div className='file-item-name'>{file.name}</div>
                    <div className='file-item-meta'>
                      {formatFileSize(file.size)}
                      {headerData && ` • ${headerData.originalHeaders.length} columns`}
                    </div>
                  </div>
                </div>
                <div className='file-item-actions'>
                  {isChecked && <span className='check-badge'>✓</span>}
                  <Icon
                    path={mdiChevronDown}
                    size={0.8}
                    className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                  />
                </div>
              </div>

              {isExpanded && headerData && (
                <div className='headers-content'>
                  <div className='headers-grid-header'>
                    <span>Original</span>
                    <span></span>
                    <span>Mapped</span>
                    <span>Actions</span>
                  </div>

                  {headerData.originalHeaders.map((originalHeader, index) => {
                    const isEditing = fileEditingHeaders.hasOwnProperty(index);
                    const currentMapped = headerData.mappedHeaders[index];
                    const editingValue = fileEditingHeaders[index];
                    const displayValue = isEditing ? editingValue : currentMapped;
                    const mappingStatus = getMappingStatus(
                      originalHeader,
                      currentMapped,
                      headerData.mappings,
                      id,
                      index
                    );

                    // Apply filter
                    if (filterMode === 'mapped' && mappingStatus.status !== 'mapped') return null;
                    if (filterMode === 'unmapped' && mappingStatus.status !== 'no-mapping') return null;
                    if (filterMode === 'custom' && mappingStatus.status !== 'custom') return null;

                    return (
                      <div key={index} className='headers-grid-row'>
                        <span className='header-cell original'>{originalHeader}</span>
                        <span className='header-arrow'>→</span>
                        <div className='header-mapped'>
                          <span
                            className={`mapping-dot ${mappingStatus.status === 'mapped' ? 'mapped' : mappingStatus.status === 'no-mapping' ? 'unmapped' : 'custom'}`}
                            title={mappingStatus.tooltip}
                          />
                          {isEditing ? (
                            <input
                              type='text'
                              value={displayValue}
                              onChange={(e) => handleHeaderChange(id, index, e.target.value)}
                              className='header-input-inline'
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveLocal(id, index, displayValue);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCancelEdit(id, index);
                                }
                              }}
                            />
                          ) : (
                            <span className='header-cell' title={mappingStatus.tooltip}>
                              {displayValue}
                            </span>
                          )}
                        </div>
                        <div className='header-actions'>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveLocal(id, index, displayValue)}
                                className='action-btn-xs save'
                                title='Save (Enter)'
                              >
                                <Icon path={mdiContentSave} size={0.55} />
                              </button>
                              <button
                                onClick={() => handleCancelEdit(id, index)}
                                className='action-btn-xs cancel'
                                title='Cancel (Esc)'
                              >
                                <Icon path={mdiClose} size={0.55} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditHeader(id, index, currentMapped)}
                                className='action-btn-xs edit'
                                disabled={isProcessing}
                                title='Edit'
                              >
                                <Icon path={mdiPencil} size={0.55} />
                              </button>
                              <button
                                onClick={() => handleSaveToDB(id, index, originalHeader, currentMapped)}
                                className='action-btn-xs save'
                                disabled={isProcessing || !isUnlocked}
                                title={isUnlocked ? 'Save to DB' : 'Unlock to save'}
                              >
                                <Icon path={mdiContentSave} size={0.55} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Legend */}
                  <div className='mapping-legend'>
                    <span className='legend-item'>
                      <span className='mapping-dot mapped' />
                      Mapped
                    </span>
                    <span className='legend-item'>
                      <span className='mapping-dot custom' />
                      Custom
                    </span>
                    <span className='legend-item'>
                      <span className='mapping-dot unmapped' />
                      Unmapped
                    </span>
                  </div>

                  {/* Included from Exclusions Section - show headers user chose to include */}
                  {headerData.includedFromExclusions && headerData.includedFromExclusions.length > 0 && (
                    <div className='included-from-exclusions-section'>
                      <div className='included-section-header'>
                        <span className='included-section-label'>Included from exclusions (click to remove):</span>
                      </div>
                      <div className='included-from-exclusions-list'>
                        {headerData.includedFromExclusions.map((includedHeader, idx) => (
                          <button
                            key={idx}
                            className='included-header-item'
                            onClick={() => onExcludeIncludedHeader?.(id, includedHeader)}
                            title={`Click to exclude "${includedHeader}"`}
                          >
                            <Icon path={mdiMinus} size={0.5} className='include-action-icon' />
                            <span className='included-header-name'>{includedHeader}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Excluded Headers Section */}
                  {headerData.excludedHeaders && headerData.excludedHeaders.length > 0 && (
                    <div className='excluded-headers-section' data-tour='excluded-headers-section'>
                      <button
                        className='excluded-headers-toggle'
                        onClick={() => toggleExcludedExpansion(id)}
                        data-tour='excluded-headers-toggle'
                      >
                        <Icon path={mdiEyeOff} size={0.65} />
                        <span>
                          {headerData.excludedHeaders.length} Excluded Variable{headerData.excludedHeaders.length !== 1 ? 's' : ''}
                        </span>
                        <Icon
                          path={mdiChevronDown}
                          size={0.7}
                          className={`excluded-toggle-icon ${expandedExcluded.has(id) ? 'expanded' : ''}`}
                        />
                      </button>

                      {expandedExcluded.has(id) && (
                        <div className='excluded-headers-list' data-tour='excluded-headers-list'>
                          <div className='excluded-hint'>Click to include a variable</div>
                          {headerData.excludedHeaders.map((excludedHeader, idx) => (
                            <button
                              key={idx}
                              className='excluded-header-item clickable'
                              onClick={() => onIncludeExcludedHeader?.(id, excludedHeader)}
                              title={`Click to include "${excludedHeader}"`}
                            >
                              <Icon path={mdiPlus} size={0.5} className='include-action-icon' />
                              <span className='excluded-header-name'>{excludedHeader}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isExpanded && !headerData && (
                <div className='headers-content'>
                  <div className='loading-state'>
                    <div className='spinner' />
                    <span>Loading headers...</span>
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
