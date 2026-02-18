import React from 'react';
import Icon from '@mdi/react';
import { mdiTableEdit, mdiCheckCircleOutline } from '@mdi/js';

import '../DataProcessingView.css';

type Props = {};

const FEATURES = [
  'Parse raw or semi-structured data into clean table layouts',
  'Customize column headers, types, and display order',
  'Apply transformation rules and conditional formatting',
  'Merge data from multiple sources into a single table',
  'Export tables to CSV, Excel, or JSON',
];

const TableGenerator = (props: Props) => {
  return (
    <div
      className='dpv-container'
      style={{ '--dpv-accent': '#f59e0b' } as React.CSSProperties}
    >
      <header className='dpv-header'>
        <div className='dpv-header-icon'>
          <Icon path={mdiTableEdit} size={2} />
        </div>
        <div className='dpv-header-text'>
          <h1 className='dpv-title'>Table Generator</h1>
          <p className='dpv-subtitle'>Create structured tables from raw data</p>
        </div>
        <span className='dpv-badge dpv-badge--confirmed'>Coming Soon</span>
      </header>

      <section className='dpv-panel'>
        <p>
          This tool will transform templated excel files into clean formatted
          tables inside of a docx file. It will allow users to define rules for
          how the table should be structured and styled. Input: *.xlsx file with
          necessary structure, Output: *.docx file with formatted table.
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

export default TableGenerator;
