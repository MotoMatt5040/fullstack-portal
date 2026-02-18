import React from 'react';
import Icon from '@mdi/react';
import { mdiFileUploadOutline } from '@mdi/js';

import '../DataProcessingView.css';
import { useExtractionTaskAutomationLogic } from './useExtractionTaskAutomationLogic';

const ExtractionTaskAutomation = () => {
  const {
    selectedFile,
    dragActive,
    isLoading,
    fileInputRef,
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearSelectedFile,
    openFileDialog,
    handleSubmit,
    suffix,
    setSuffix,
  } = useExtractionTaskAutomationLogic();

  return (
    <div
      className='dpv-container'
      style={{ '--dpv-accent': '#3b82f6' } as React.CSSProperties}
    >
      <header className='dpv-header'>
        <div className='dpv-header-icon'>
          <Icon path={mdiFileUploadOutline} size={2} />
        </div>
        <div className='dpv-header-text'>
          <h1 className='dpv-title'>Extraction Task Automation</h1>
          <p className='dpv-subtitle'>
            Upload a formatted .xlsx file to create extraction tasks
          </p>
        </div>
      </header>

      <section className='dpv-panel'>
        <div className='dpv-field-row'>
          <label className='dpv-label' htmlFor='suffix-select'>
            Voxco Project Suffix
          </label>
          <select
            id='suffix-select'
            className='dpv-select'
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
          >
            <option value='COM'>COM</option>
            <option value='W'>W</option>
            <option value='C'>C</option>
            <option value=''>None</option>
          </select>
        </div>
      </section>

      <section className='dpv-panel'>
        <div
          className={`dpv-drop-zone${dragActive ? ' dpv-drop-zone--active' : ''}${selectedFile ? ' dpv-drop-zone--has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type='file'
            accept='.xlsx'
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {selectedFile ?
            <div className='dpv-drop-zone__file'>
              <span className='dpv-drop-zone__icon'>📊</span>
              <div className='dpv-drop-zone__file-info'>
                <span className='dpv-drop-zone__filename'>
                  {selectedFile.name}
                </span>
                <span className='dpv-drop-zone__filesize'>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type='button'
                className='dpv-drop-zone__clear'
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
                disabled={isLoading}
              >
                ✕
              </button>
            </div>
          : <div className='dpv-drop-zone__empty'>
              <span className='dpv-drop-zone__icon'>📂</span>
              <span className='dpv-drop-zone__label'>
                <strong>Click to select</strong> or drag file here
              </span>
              <span className='dpv-drop-zone__hint'>Accepts .xlsx</span>
            </div>
          }
        </div>

        <button
          type='button'
          className='dpv-submit-btn'
          onClick={handleSubmit}
          disabled={!selectedFile || isLoading}
        >
          {isLoading ? 'Uploading…' : 'Submit'}
        </button>
      </section>
    </div>
  );
};

export default ExtractionTaskAutomation;
