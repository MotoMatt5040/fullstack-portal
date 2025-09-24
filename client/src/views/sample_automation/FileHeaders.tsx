import React, { useState, useEffect } from 'react';

interface FileHeadersProps {
  selectedFiles: Array<{
    id: string;
    file: File;
  }>;
  fileHeaders: Record<string, string[]>;
  checkedFiles: Set<string>;
  isProcessing: boolean;
  onSaveHeaders: (fileId: string, headers: string[]) => void;
  validationSummary: {
    matched: number;
    total: number;
    nonMatchingHeaders: Array<{
      header: string;
      missingFromFiles: string[];
      presentInFiles?: string[];
    }>;
  };
  allowExtraHeaders: boolean;
  onValidationModeChange: (allowExtra: boolean) => void;
}

const FileHeaders: React.FC<FileHeadersProps> = ({
  selectedFiles,
  fileHeaders,
  checkedFiles,
  isProcessing,
  onSaveHeaders,
  validationSummary,
  allowExtraHeaders,        
  onValidationModeChange,   
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [editingHeaders, setEditingHeaders] = useState<
    Record<string, string[]>
  >({});

  // Auto-detect headers when files are loaded
  useEffect(() => {
    selectedFiles.forEach((file) => {
      if (!fileHeaders[file.id] && !editingHeaders[file.id]) {
        detectFileHeaders(file);
      }
    });
  }, [selectedFiles]);

  const detectFileHeaders = async (fileItem: { id: string; file: File }) => {
    try {
      const text = await fileItem.file.text();
      const lines = text.split('\n');
      if (lines.length > 0) {
        const headerLine = lines[0];
        const detectedHeaders = headerLine
          .split(',')
          .map((h) => h.trim().replace(/['"]/g, ''));

        setEditingHeaders((prev) => ({
          ...prev,
          [fileItem.id]: detectedHeaders,
        }));
      }
    } catch (error) {
      console.error('Error detecting headers:', error);
      setEditingHeaders((prev) => ({
        ...prev,
        [fileItem.id]: ['Column 1', 'Column 2', 'Column 3'],
      }));
    }
  };

  const toggleFileExpansion = (fileId: string) => {
    setExpandedFiles((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(fileId)) {
        newExpanded.delete(fileId);
      } else {
        newExpanded.add(fileId);
      }
      return newExpanded;
    });
  };

  const handleHeaderChange = (fileId: string, index: number, value: string) => {
    setEditingHeaders((prev) => {
      const currentHeaders = prev[fileId] || [];
      const newHeaders = [...currentHeaders];
      newHeaders[index] = value;
      return {
        ...prev,
        [fileId]: newHeaders,
      };
    });
  };

  const saveFileHeaders = (fileId: string) => {
    const headers = editingHeaders[fileId];
    if (headers) {
      onSaveHeaders(fileId, headers);
      setExpandedFiles((prev) => {
        const newExpanded = new Set(prev);
        newExpanded.delete(fileId);
        return newExpanded;
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Determine if we should show validation (all files checked and multiple files)
  const shouldShowValidation =
    selectedFiles.every((file) => checkedFiles.has(file.id)) &&
    selectedFiles.length > 1 &&
    validationSummary.total > 0;

  return (
    <div className='file-headers-container'>
      {/* Individual File Header Editing */}
      <div className='files-list'>
        <h3>Files & Headers ({selectedFiles.length})</h3>
        {selectedFiles.map((item) => {
          const isExpanded = expandedFiles.has(item.id);
          const isChecked = checkedFiles.has(item.id);
          const currentHeaders =
            editingHeaders[item.id] || fileHeaders[item.id] || [];

          return (
            <div
              key={item.id}
              className={`file-header-item ${isChecked ? 'checked' : ''}`}
            >
              {/* File Summary */}
              <div
                className='file-summary'
                onClick={() => toggleFileExpansion(item.id)}
              >
                <div className='file-info'>
                  <div className='file-name'>
                    {item.file.name}
                    {isChecked && <span className='check-indicator'>✓</span>}
                  </div>
                  <div className='file-meta'>
                    {formatFileSize(item.file.size)} • {currentHeaders.length}{' '}
                    columns
                  </div>
                </div>
                <div className='file-actions'>
                  <button className='expand-btn'>
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expandable Headers Section */}
              {isExpanded && (
                <div className='headers-edit-section'>
                  <div className='headers-grid'>
                    {currentHeaders.map((header, index) => (
                      <div key={index} className='header-input-group'>
                        <span className='header-index'>{index + 1}</span>
                        <input
                          type='text'
                          value={header}
                          onChange={(e) =>
                            handleHeaderChange(item.id, index, e.target.value)
                          }
                          className='header-input'
                          placeholder={`Header ${index + 1}`}
                          disabled={isProcessing}
                        />
                      </div>
                    ))}
                  </div>
                  <div className='header-actions'>
                    <button
                      onClick={() => saveFileHeaders(item.id)}
                      className='save-headers-btn'
                      disabled={isProcessing}
                    >
                      Save Headers
                    </button>
                    <button
                      onClick={() => toggleFileExpansion(item.id)}
                      className='cancel-headers-btn'
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* NEW: Validation Summary & Problem Headers Only */}
      {shouldShowValidation && (
        <div className='header-validation'>
          <h3>Header Validation</h3>

          <div className='validation-options'>
  <label className='validation-option'>
    <input
      type='checkbox'
      checked={allowExtraHeaders}
      onChange={(e) => onValidationModeChange(e.target.checked)}
      disabled={isProcessing}
    />
    <span className='validation-option-text'>
      Allow files with extra headers
    </span>
  </label>
</div>

          {/* Summary */}
          <div className='validation-summary'>
            <span
              className={
                validationSummary.matched === validationSummary.total
                  ? 'success'
                  : 'warning'
              }
            >
              {validationSummary.matched}/{validationSummary.total} headers
              matched across all files
            </span>
          </div>

          {/* Only show non-matching headers */}
          {validationSummary.nonMatchingHeaders.length > 0 && (
            <div className='validation-results'>
              <h4>Headers that don't match across all files:</h4>
              {validationSummary.nonMatchingHeaders.map((result, index) => (
                <div key={index} className='validation-item warning'>
                  <div className='validation-header'>
                    <span className='status-icon error'>❌</span>
                    <span className='header-name'>"{result.header}"</span>
                  </div>
                  <div className='missing-details'>
                    <div className='missing-from'>
                      Missing from: {result.missingFromFiles.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Success message when all match */}
          {validationSummary.nonMatchingHeaders.length === 0 &&
            validationSummary.total > 0 && (
              <div className='validation-success'>
                ✅ All headers match perfectly across all files!
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default FileHeaders;
