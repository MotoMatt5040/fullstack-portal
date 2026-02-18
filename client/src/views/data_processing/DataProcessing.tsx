import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@mdi/react';
import {
  mdiDatabaseCogOutline,
  mdiFileUploadOutline,
  mdiTableEdit,
  mdiFileExportOutline,
  mdiTableColumn,
} from '@mdi/js';

import './DataProcessing.css';

type Tool = {
  to: string;
  icon: string;
  label: string;
  description: string;
  color: string;
};

const DataProcessing = () => {
  const tools: Tool[] = useMemo(
    () => [
      {
        to: '/data-processing/extraction-task-automation',
        icon: mdiFileUploadOutline,
        label: 'Create Extraction Task',
        description: 'Upload files and set up extraction rules',
        color: '#3b82f6',
      },
      {
        to: '/data-processing/table-generator',
        icon: mdiTableEdit,
        label: 'Table Generator',
        description: 'Create structured tables from raw data',
        color: '#f59e0b',
      },
      {
        to: '/data-processing/weighting-tool',
        icon: mdiFileExportOutline,
        label: 'Weighting Tool',
        description: 'Add weights to your data for analysis',
        color: '#8b5cf6',
      },
      {
        to: '/data-processing/column-generator',
        icon: mdiTableColumn,
        label: 'Column Generator',
        description: 'Generate new columns from existing data',
        color: '#ec4899',
      },
    ],
    [],
  );

  return (
    <section className='dp-container'>
      <header className='dp-header'>
        <div className='dp-header-icon'>
          <Icon path={mdiDatabaseCogOutline} size={2.25} />
        </div>
        <div className='dp-header-text'>
          <h1 className='dp-title'>Data Processing</h1>
          <p className='dp-subtitle'>Select a tool to get started</p>
        </div>
      </header>

      <nav className='dp-grid'>
        {tools.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className='dp-tile'
            style={{ '--tile-color': tool.color } as React.CSSProperties}
          >
            <div className='dp-tile-icon'>
              <Icon path={tool.icon} size={1.75} />
            </div>
            <div className='dp-tile-body'>
              <span className='dp-tile-label'>{tool.label}</span>
              <span className='dp-tile-desc'>{tool.description}</span>
            </div>
          </Link>
        ))}
      </nav>
    </section>
  );
};

export default DataProcessing;
