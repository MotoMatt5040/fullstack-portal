import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

interface HeaderMapping {
  original: string;
  mapped: string;
  vendorName?: string;
  clientName?: string;
  priority?: number;
}

interface HeadersModalContentProps {
  file: File | null;
  fileId?: string;
  existingHeaderData?: {
    originalHeaders: string[];
    mappedHeaders: string[];
    mappings: Record<string, HeaderMapping>;
  };
  onSave: (originalHeaders: string[], mappedHeaders?: string[]) => void;
  onCancel: () => void;
  isEditing?: boolean; // true if editing existing mappings, false if reading headers for first time
}

const HeadersModalContent: React.FC<HeadersModalContentProps> = ({
  file,
  fileId,
  existingHeaderData,
  onSave,
  onCancel,
  isEditing = false,
}) => {
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, HeaderMapping>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && existingHeaderData) {
      // Editing mode: load existing data
      setOriginalHeaders(existingHeaderData.originalHeaders);
      setMappedHeaders([...existingHeaderData.mappedHeaders]);
      setMappings(existingHeaderData.mappings);
    } else if (file && !isEditing) {
      // First time: read headers from file
      loadHeadersFromFile();
    }
  }, [file, existingHeaderData, isEditing]);

  const loadHeadersFromFile = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const headers = await readFileHeaders(file);
      setOriginalHeaders(headers);
      setMappedHeaders([...headers]); // Start with original headers as mapped
    } catch (err) {
      console.error('Error reading file headers:', err);
      setError('Could not read file headers. Please check the file format.');
      // Set some default headers
      const defaultHeaders = ['Column 1', 'Column 2', 'Column 3'];
      setOriginalHeaders(defaultHeaders);
      setMappedHeaders([...defaultHeaders]);
    } finally {
      setLoading(false);
    }
  };

  const readFileHeaders = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        preview: 1,
        complete: (results: any) => {
          if (
            results.data &&
            results.data[0] &&
            Array.isArray(results.data[0])
          ) {
            const headers = results.data[0]
              .map((h: any) => String(h).trim().replace(/['"]/g, ''))
              .filter((h: string) => h.length > 0);

            if (headers.length === 0) {
              reject(new Error('No valid headers found in file'));
            } else {
              resolve(headers);
            }
          } else {
            reject(new Error('Could not parse file headers'));
          }
        },
        error: (error: any) => {
          reject(new Error(`Parse error: ${error.message}`));
        },
      });
    });
  };

  const handleMappedHeaderChange = (index: number, value: string) => {
    const newMappedHeaders = [...mappedHeaders];
    newMappedHeaders[index] = value;
    setMappedHeaders(newMappedHeaders);
  };

  const handleSave = () => {
    if (isEditing) {
      // Save edited mapped headers
      onSave(originalHeaders, mappedHeaders);
    } else {
      // Save original headers (first time reading)
      onSave(originalHeaders);
    }
  };

  // Determine mapping status for visual indicators
  const getMappingStatus = (original: string, mapped: string) => {
    const upperOriginal = original.toUpperCase();
    const mapping = mappings[upperOriginal];

    if (!mapping) {
      return {
        status: 'no-mapping',
        color: '#dc3545',
        tooltip: 'No mapping found in database',
      };
    }

    if (mapping.mapped === mapped) {
      return {
        status: 'mapped',
        color: '#28a745',
        tooltip: `Mapped from ${mapping.vendorName || 'All'} → ${
          mapping.clientName || 'All'
        }`,
      };
    }

    return {
      status: 'custom',
      color: '#ffc107',
      tooltip: 'Custom mapping (edited by user)',
    };
  };

  if (loading) {
    return (
      <div className='headers-modal-content'>
        <h2>Loading Headers...</h2>
        <div className='loading-indicator'>
          <div className='spinner'></div>
          <p>Reading file headers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='headers-modal-content'>
        <h2>Error Reading Headers</h2>
        <div className='error-message'>
          <p>{error}</p>
        </div>
        <div className='headers-modal-actions'>
          <button
            type='button'
            onClick={onCancel}
            className='button button--secondary'
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='headers-modal-content'>
      <h2>
        {isEditing ? 'Edit Header Mappings' : 'Review Headers'} - {file?.name}
      </h2>

      {isEditing && (
        <div className='mapping-explanation'>
          <p>
            Original headers are from your file. Mapped headers are what will be
            used in the database. Edit the mapped headers to customize the final
            column names.
          </p>
        </div>
      )}

      <div className='headers-container'>
        {isEditing ? (
          // Editing mode: show original → mapped
          <div className='headers-mapping-view'>
            <div className='mapping-header'>
              <div className='original-column'>Original Headers</div>
              <div className='arrow-column'>→</div>
              <div className='mapped-column'>Mapped Headers</div>
            </div>

            <div className='headers-grid'>
              {originalHeaders.map((originalHeader, index) => {
                const mappedHeader = mappedHeaders[index] || originalHeader;
                const mappingStatus = getMappingStatus(
                  originalHeader,
                  mappedHeader
                );

                return (
                  <div key={index} className='header-mapping-row'>
                    <div className='original-header'>
                      <span className='header-text'>{originalHeader}</span>
                    </div>

                    <div className='arrow'>→</div>

                    <div className='mapped-header'>
                      <div className='mapped-input-container'>
                        <input
                          type='text'
                          value={mappedHeader}
                          onChange={(e) =>
                            handleMappedHeaderChange(index, e.target.value)
                          }
                          className='header-input form-input'
                          placeholder={`Mapped header ${index + 1}`}
                        />
                        <div
                          className={`mapping-indicator ${mappingStatus.status}`}
                          style={{ backgroundColor: mappingStatus.color }}
                          title={mappingStatus.tooltip}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className='mapping-legend'>
              <div className='legend-item'>
                <div
                  className='legend-color'
                  style={{ backgroundColor: '#28a745' }}
                ></div>
                <span>Database mapping found</span>
              </div>
              <div className='legend-item'>
                <div
                  className='legend-color'
                  style={{ backgroundColor: '#ffc107' }}
                ></div>
                <span>Custom mapping (edited)</span>
              </div>
              <div className='legend-item'>
                <div
                  className='legend-color'
                  style={{ backgroundColor: '#dc3545' }}
                ></div>
                <span>No mapping found</span>
              </div>
            </div>
          </div>
        ) : (
          // First time mode: just show headers for review
          <div className='headers-list-view'>
            <p>
              The following headers were detected in your file. Click "Save
              Headers" to continue.
            </p>
            <div className='headers-list'>
              {originalHeaders.map((header, index) => (
                <div key={index} className='header-item'>
                  <div className='header-index'>{index + 1}</div>
                  <div className='header-text'>{header}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='headers-modal-actions'>
        <button
          type='button'
          onClick={onCancel}
          className='button button--secondary'
        >
          Cancel
        </button>
        <button
          type='button'
          onClick={handleSave}
          className='button button--primary'
          disabled={originalHeaders.length === 0}
        >
          {isEditing ? 'Save Changes' : 'Save Headers'}
        </button>
      </div>
    </div>
  );
};

export default HeadersModalContent;
