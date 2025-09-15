import React, { useState, useEffect } from 'react';

interface HeadersModalContentProps {
  file: File | null;
  onSave: (headers: string[]) => void;
  onCancel: () => void;
}

const HeadersModalContent: React.FC<HeadersModalContentProps> = ({
  file,
  onSave,
  onCancel,
}) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (file) {
      loadHeaders();
    }
  }, [file]);

  const loadHeaders = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Read the file to extract headers
      const text = await file.text();
      const lines = text.split('\n');
      
      if (lines.length > 0) {
        // Assume first line contains headers
        const headerLine = lines[0];
        const detectedHeaders = headerLine
          .split(',')
          .map(h => h.trim().replace(/['"]/g, ''));
        
        setHeaders(detectedHeaders);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      // Set default headers if file can't be read
      setHeaders(['Column 1', 'Column 2', 'Column 3']);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
  };

  const handleSave = () => {
    onSave(headers);
  };

  if (loading) {
    return <div>Loading headers...</div>;
  }

  return (
    <div className="headers-modal-content">
      <h2>Edit Headers - {file?.name}</h2>
      
      {/* <div className="headers-list"> */}
        {headers.map((header, index) => (
          <div key={index} className="header-item">
            {/* <div className="header-index">{index + 1}</div> */}
            <input
              type="text"
              value={header}
              onChange={(e) => handleHeaderChange(index, e.target.value)}
              className="header-input form-input"
              placeholder={`Header ${index + 1}`}
            />
          </div>
        ))}
      {/* </div> */}

      <div className="headers-modal-actions">
        <button
          type="button"
          onClick={onCancel}
          className="button button--secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="button button--primary"
        >
          Save Headers
        </button>
      </div>
    </div>
  );
};

export default HeadersModalContent;