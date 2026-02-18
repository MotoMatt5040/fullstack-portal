import React from 'react';
import Icon from '@mdi/react';
import { mdiFileExportOutline, mdiAlertCircleOutline } from '@mdi/js';

import '../DataProcessingView.css';

type Props = {};

const WeightingTool = (props: Props) => {
  return (
    <div
      className='dpv-container'
      style={{ '--dpv-accent': '#8b5cf6' } as React.CSSProperties}
    >
      <header className='dpv-header'>
        <div className='dpv-header-icon'>
          <Icon path={mdiFileExportOutline} size={2} />
        </div>
        <div className='dpv-header-text'>
          <h1 className='dpv-title'>Weighting Tool</h1>
          <p className='dpv-subtitle'>Add weights to your data for analysis</p>
        </div>
        <span className='dpv-badge dpv-badge--proposed'>Proposed</span>
      </header>

      <div className='dpv-notice'>
        <Icon
          path={mdiAlertCircleOutline}
          size={1.1}
          className='dpv-notice-icon'
        />
        <div className='dpv-notice-body'>
          <h2 className='dpv-notice-title'>
            This feature has not been confirmed
          </h2>
          <p className='dpv-notice-text'>
            The Weighting Tool is a theoretically proposed feature and may or
            may not be implemented in a future release. Its scope, design, and
            timeline are still under consideration and should not be relied
            upon.
          </p>
        </div>
      </div>

      <section className='dpv-panel'>
        <p>
          TODO: Once the feature is confirmed and scoped, this section will
          include details on how the Weighting Tool works, its capabilities, and
          how to use it effectively. It will also outline any limitations or
          considerations to keep in mind when adding weights to your data for
          analysis.
        </p>
      </section>
    </div>
  );
};

export default WeightingTool;
