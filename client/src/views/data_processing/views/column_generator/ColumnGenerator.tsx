import React from 'react';
import Icon from '@mdi/react';
import { mdiTableColumn, mdiAlertCircleOutline } from '@mdi/js';

import '../DataProcessingView.css';

type Props = {};

const ColumnGenerator = (props: Props) => {
  return (
    <div
      className='dpv-container'
      style={{ '--dpv-accent': '#ec4899' } as React.CSSProperties}
    >
      <header className='dpv-header'>
        <div className='dpv-header-icon'>
          <Icon path={mdiTableColumn} size={2} />
        </div>
        <div className='dpv-header-text'>
          <h1 className='dpv-title'>Column Generator</h1>
          <p className='dpv-subtitle'>Generate new columns from existing data</p>
        </div>
        <span className='dpv-badge dpv-badge--proposed'>Proposed</span>
      </header>

      <div className='dpv-notice'>
        <Icon path={mdiAlertCircleOutline} size={1.1} className='dpv-notice-icon' />
        <div className='dpv-notice-body'>
          <h2 className='dpv-notice-title'>This feature has not been confirmed</h2>
          <p className='dpv-notice-text'>
            The Column Generator is a theoretically proposed feature and may or may not be implemented
            in a future release. Its scope, design, and timeline are still under consideration and
            should not be relied upon.
          </p>
        </div>
      </div>

      <section className='dpv-panel'>
        <p>
          If implemented, this tool would provide a formula-based interface for deriving new data
          columns from existing fields — similar to computed columns in a spreadsheet. Users could
          define expressions, apply conditional logic, and preview results before committing changes
          to the dataset.
        </p>
      </section>
    </div>
  );
};

export default ColumnGenerator;
