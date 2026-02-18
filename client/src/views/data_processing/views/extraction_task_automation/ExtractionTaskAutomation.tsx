import React from 'react';
import Icon from '@mdi/react';
import { mdiFileUploadOutline, mdiCheckCircleOutline } from '@mdi/js';

import '../DataProcessingView.css';

type Props = {};

const FEATURES = [
  'Upload raw data files for automated processing',
  'Define extraction rules and field mappings',
  'Preview extracted results before finalizing',
  'Schedule and manage recurring extraction tasks',
  'Export processed data in multiple formats',
];

const ExtractionTaskAutomation = (props: Props) => {
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
            Upload files and set up extraction rules
          </p>
        </div>
        <span className='dpv-badge dpv-badge--confirmed'>Coming Soon</span>
      </header>

      <section className='dpv-panel'>
        <p>
          This tool will streamline the process of creating extraction tasks in
          Voxco. Users will be able to upload a formatted *.xlxs file containing
          the necessary information for the extraction task. The tool will parse
          the file, extract the relevant data, and automatically create the
          extraction task using the Voxco API.
        </p>
      </section>

      <section className='dpv-panel'>
        <h2 className='dpv-features-heading'>Planned Features</h2>
        <ul className='dpv-feature-list'>
          {FEATURES.map((f) => (
            <li key={f} className='dpv-feature-item'>
              <Icon
                path={mdiCheckCircleOutline}
                size={0.85}
                className='dpv-feature-icon'
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ExtractionTaskAutomation;
