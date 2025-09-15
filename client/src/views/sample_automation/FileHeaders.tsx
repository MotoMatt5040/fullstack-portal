import React, { useState, useEffect } from 'react';

interface HeaderValidation {
  headerName: string;
  status: 'present' | 'missing' | 'conflict';
  files: Array<{
    fileName: string;
    position: number | null;
    hasHeader: boolean;
  }>;
}

interface FileHeadersProps {
  selectedFiles: Array<{
    id: string;
    file: File;
  }>;
  fileHeaders: Record<string, string[]>;
  checkedFiles: Set<string>;
  isProcessing: boolean;
  onSaveHeaders: (fileId: string, headers: string[]) => void;
  onValidationComplete: (hasConflicts: boolean) => void;
}

const FileHeaders: React.FC<FileHeadersProps> = ({
  selectedFiles,
  fileHeaders,
  checkedFiles,
  isProcessing,
  onSaveHeaders,
  onValidationComplete
}) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [editingHeaders, setEditingHeaders] = useState<Record<string, string[]>>({});
  const [headerValidation, setHeaderValidation] = useState<HeaderValidation[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Auto-detect headers when files are loaded
  useEffect(() => {
    selectedFiles.forEach(file => {
      if (!fileHeaders[file.id] && !editingHeaders[file.id]) {
        detectFileHeaders(file);
      }
    });
  }, [selectedFiles]);

  // Validate headers when all files are checked
  useEffect(() => {
    const allFilesChecked = selectedFiles.every(file => checkedFiles.has(file.id));
    if (allFilesChecked && selectedFiles.length > 1) {
      validateHeaders();
      setShowValidation(true);
    } else {
      setShowValidation(false);
    }
  }, [checkedFiles, selectedFiles, fileHeaders]);

  const detectFileHeaders = async (fileItem: { id: string; file: File }) => {
    try {
      const text = await fileItem.file.text();
      const lines = text.split('\n');
      if (lines.length > 0) {
        const headerLine = lines[0];
        const detectedHeaders = headerLine
          .split(',')
          .map(h => h.trim().replace(/['"]/g, ''));
        
        setEditingHeaders(prev => ({
          ...prev,
          [fileItem.id]: detectedHeaders
        }));
      }
    } catch (error) {
      console.error('Error detecting headers:', error);
      setEditingHeaders(prev => ({
        ...prev,
        [fileItem.id]: ['Column 1', 'Column 2', 'Column 3']
      }));
    }
  };

  const toggleFileExpansion = (fileId: string) => {
    setExpandedFiles(prev => {
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
    setEditingHeaders(prev => {
      const currentHeaders = prev[fileId] || [];
      const newHeaders = [...currentHeaders];
      newHeaders[index] = value;
      return {
        ...prev,
        [fileId]: newHeaders
      };
    });
  };

  const saveFileHeaders = (fileId: string) => {
    const headers = editingHeaders[fileId];
    if (headers) {
      onSaveHeaders(fileId, headers);
      setExpandedFiles(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(fileId);
        return newExpanded;
      });
    }
  };

  const validateHeaders = () => {
    const allHeaders = new Map<string, Array<{fileName: string, position: number}>>();
    
    // Collect all headers from all files
    selectedFiles.forEach(file => {
      const headers = fileHeaders[file.id] || [];
      headers.forEach((header, index) => {
        if (!allHeaders.has(header)) {
          allHeaders.set(header, []);
        }
        allHeaders.get(header)!.push({
          fileName: file.file.name,
          position: index
        });
      });
    });

    // Generate validation report
    const validationResults: HeaderValidation[] = [];
    
    allHeaders.forEach((filesList, headerName) => {
      const status = filesList.length === selectedFiles.length ? 'present' : 'missing';
      
      const files = selectedFiles.map(file => {
        const headerPosition = filesList.find(f => f.fileName === file.file.name);
        return {
          fileName: file.file.name,
          position: headerPosition?.position ?? null,
          hasHeader: !!headerPosition
        };
      });

      validationResults.push({
        headerName,
        status,
        files
      });
    });

    setHeaderValidation(validationResults);
    
    // Notify parent about conflicts
    const hasConflicts = validationResults.some(result => result.status === 'missing');
    onValidationComplete(hasConflicts);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-headers-container">
      {/* Individual File Header Editing */}
      <div className="files-list">
        <h3>Files & Headers ({selectedFiles.length})</h3>
        {selectedFiles.map((item) => {
          const isExpanded = expandedFiles.has(item.id);
          const isChecked = checkedFiles.has(item.id);
          const currentHeaders = editingHeaders[item.id] || fileHeaders[item.id] || [];
          
          return (
            <div key={item.id} className={`file-header-item ${isChecked ? 'checked' : ''}`}>
              {/* File Summary */}
              <div className="file-summary" onClick={() => toggleFileExpansion(item.id)}>
                <div className="file-info">
                  <div className="file-name">
                    {item.file.name}
                    {isChecked && <span className="check-indicator">✓</span>}
                  </div>
                  <div className="file-meta">
                    {formatFileSize(item.file.size)} • {currentHeaders.length} columns
                  </div>
                </div>
                <div className="file-actions">
                  <button className="expand-btn">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expandable Headers Section */}
              {isExpanded && (
                <div className="headers-edit-section">
                  <div className="headers-grid">
                    {currentHeaders.map((header, index) => (
                      <div key={index} className="header-input-group">
                        <span className="header-index">{index + 1}</span>
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => handleHeaderChange(item.id, index, e.target.value)}
                          className="header-input"
                          placeholder={`Header ${index + 1}`}
                          disabled={isProcessing}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="header-actions">
                    <button
                      onClick={() => saveFileHeaders(item.id)}
                      className="save-headers-btn"
                      disabled={isProcessing}
                    >
                      Save Headers
                    </button>
                    <button
                      onClick={() => toggleFileExpansion(item.id)}
                      className="cancel-headers-btn"
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

      {/* Header Validation Results */}
      {showValidation && headerValidation.length > 0 && (
        <div className="header-validation">
          <h3>Header Validation</h3>
          <div className="validation-results">
            {headerValidation.map((result, index) => (
              <div 
                key={index} 
                className={`validation-item ${result.status === 'missing' ? 'warning' : 'success'}`}
              >
                <div className="validation-header">
                  <span className={`status-icon ${result.status === 'missing' ? 'error' : 'success'}`}>
                    {result.status === 'missing' ? '❌' : '✅'}
                  </span>
                  <span className="header-name">"{result.headerName}"</span>
                </div>
                
                {result.status === 'missing' && (
                  <div className="missing-details">
                    <div className="present-in">
                      Present in: {result.files
                        .filter(f => f.hasHeader)
                        .map(f => `${f.fileName} (pos ${f.position! + 1})`)
                        .join(', ')}
                    </div>
                    <div className="missing-from">
                      Missing from: {result.files
                        .filter(f => !f.hasHeader)
                        .map(f => f.fileName)
                        .join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileHeaders;