import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Select from 'react-select';
import Icon from '@mdi/react';
import { mdiChartBox, mdiHelpCircleOutline, mdiChevronDown, mdiChartDonut, mdiTune } from '@mdi/js';

import './QuotaManagement.css';
import useQuotaManagementLogic from './useQuotaManagementLogic';
import QuotaManagementTable from './QuotaManagementTable';
import ExportExcelButton from '../../components/ExportExcelButton';

// Available columns for filtering
const COLUMN_OPTIONS = [
  { value: 'Status', label: 'S', fullLabel: 'Status' },
  { value: 'Obj', label: 'Obj', fullLabel: 'Objective' },
  { value: 'Obj%', label: 'Obj%', fullLabel: 'Objective %' },
  { value: 'Freq', label: 'Freq', fullLabel: 'Frequency' },
  { value: 'Freq%', label: 'Freq%', fullLabel: 'Frequency %' },
  { value: 'To Do', label: 'To Do', fullLabel: 'To Do' },
];

// Mode types for filtering
const MODE_OPTIONS = [
  { value: 'Phone', label: 'Phone' },
  { value: 'Web', label: 'Web' },
];

// Default visible columns and modes
const DEFAULT_VISIBLE_COLUMNS = ['Status', 'Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'];
const DEFAULT_VISIBLE_MODES = ['Phone', 'Web'];

// Status thresholds
const getStatusFromPercent = (percent: number): string => {
  if (percent >= 110) return 'over';      // Purple - exceeded target
  if (percent >= 100) return 'complete';  // Red - met objective
  return 'behind';                        // Green - not yet met
};

// Summary Dashboard Component
interface QuotaSummaryProps {
  quotas: Record<string, any>;
}

const QuotaSummary: React.FC<QuotaSummaryProps> = React.memo(({ quotas }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const summaryData = useMemo(() => {
    if (!quotas || Object.keys(quotas).length === 0) {
      return null;
    }

    // Get the "Project" or first row's Total data for overall stats
    const firstRowKey = Object.keys(quotas)[0];
    const totalData = quotas[firstRowKey]?.Total?.Total || quotas[firstRowKey]?.Total || {};

    const objective = parseInt(totalData.TotalObjective) || 0;
    const frequency = parseInt(totalData.Frequency) || 0;
    const percent = objective > 0 ? Math.round((frequency / objective) * 100) : 0;
    const toDo = parseInt(totalData['To Do']) || Math.max(0, objective - frequency);

    // Count rows by status
    let completeCount = 0;
    let behindCount = 0;
    let overCount = 0;

    Object.values(quotas).forEach((row: any) => {
      const rowTotal = row?.Total?.Total || row?.Total || {};
      const rowObj = parseInt(rowTotal.TotalObjective) || 0;
      const rowFreq = parseInt(rowTotal.Frequency) || 0;
      if (rowObj > 0) {
        const rowPercent = (rowFreq / rowObj) * 100;
        const status = getStatusFromPercent(rowPercent);
        if (status === 'over') overCount++;
        else if (status === 'complete') completeCount++;
        else behindCount++;
      }
    });

    return {
      objective,
      frequency,
      percent,
      toDo,
      status: getStatusFromPercent(percent),
      completeCount,
      behindCount,
      overCount,
      totalRows: Object.keys(quotas).length,
    };
  }, [quotas]);

  // Memoize toggle handler
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  if (!summaryData) return null;

  return (
    <div className="quota-summary">
      <div
        className="quota-summary-header"
        onClick={handleToggleCollapse}
      >
        <div className="quota-summary-header-left">
          <Icon path={mdiChartDonut} size={0.875} />
          Project Summary
        </div>
        <div className={`quota-summary-toggle ${isCollapsed ? 'collapsed' : ''}`}>
          <Icon path={mdiChevronDown} size={0.875} />
        </div>
      </div>
      <div className={`quota-summary-content ${isCollapsed ? 'collapsed' : ''}`}>
        <div className={`quota-summary-card status-${summaryData.status}`}>
          <div className="quota-summary-card-label">Overall Progress</div>
          <div className="quota-summary-card-value">{summaryData.percent}%</div>
          <div className="quota-progress-bar">
            <div className="quota-progress-bar-track">
              <div
                className="quota-progress-bar-fill"
                style={{ width: `${Math.min(summaryData.percent, 100)}%` }}
              />
            </div>
          </div>
          <div className="quota-summary-card-details" style={{ marginTop: '0.5rem' }}>
            {summaryData.frequency.toLocaleString()} / {summaryData.objective.toLocaleString()}
          </div>
        </div>

        <div className="quota-summary-card">
          <div className="quota-summary-card-label">To Do</div>
          <div className="quota-summary-card-value">{summaryData.toDo.toLocaleString()}</div>
          <div className="quota-summary-card-details">
            Remaining to reach objective
          </div>
        </div>

        <div className="quota-summary-card">
          <div className="quota-summary-card-label">Quota Status</div>
          <div className="quota-summary-card-value" style={{ fontSize: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {summaryData.behindCount > 0 && (
              <span className="status-behind">{summaryData.behindCount} Not Met</span>
            )}
            {summaryData.completeCount > 0 && (
              <span className="status-complete">{summaryData.completeCount} Met</span>
            )}
            {summaryData.overCount > 0 && (
              <span className="status-over">{summaryData.overCount} Over</span>
            )}
          </div>
          <div className="quota-summary-card-details">
            {summaryData.totalRows} total quota rows
          </div>
        </div>
      </div>
    </div>
  );
});

const QuotaManagement = () => {
  const {
    selectedProject,
    handleProjectChange,
    quotas,
    isLoading,
    isRefetching,
    projectListOptions,
    visibleStypes,
    error,
  } = useQuotaManagementLogic();

  const [showVisualIndicators, setShowVisualIndicators] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [visibleModes, setVisibleModes] = useState<string[]>(DEFAULT_VISIBLE_MODES);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Close filter panel when clicking outside
  useEffect(() => {
    if (!showFilterPanel) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterPanel]);

  // Toggle column visibility (memoized)
  const toggleColumn = useCallback((columnValue: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnValue)) {
        // Don't allow removing all columns
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== columnValue);
      }
      return [...prev, columnValue];
    });
  }, []);

  // Toggle mode visibility (memoized)
  const toggleMode = useCallback((modeValue: string) => {
    setVisibleModes(prev => {
      if (prev.includes(modeValue)) {
        // Allow removing all modes (will just show totals)
        return prev.filter(m => m !== modeValue);
      }
      return [...prev, modeValue];
    });
  }, []);

  // Check if any filters are active (memoized)
  const hasActiveFilters = useMemo(() =>
    visibleColumns.length < DEFAULT_VISIBLE_COLUMNS.length ||
    visibleModes.length < DEFAULT_VISIBLE_MODES.length,
    [visibleColumns.length, visibleModes.length]
  );

  if (isLoading) {
    return (
      <div className='quota-management'>
        <div className='quota-header'>
          <h1>
            <Icon path={mdiChartBox} size={1} />
            Quota Management
          </h1>
        </div>
        <div className='quota-loading'>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='quota-management'>
        <div className='quota-header'>
          <h1>
            <Icon path={mdiChartBox} size={1} />
            Quota Management
          </h1>
        </div>
        <div className='quota-error'>
          Error loading data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className='quota-management'>
      <div className='quota-header'>
        <div className='quota-header-left'>
          <h1>
            <Icon path={mdiChartBox} size={1} />
            Quota Management
          </h1>
          <p className='quota-subtitle'>View and monitor project quotas</p>
        </div>
        <div className='quota-header-right'>
          <button
            className='quota-help-btn'
            onClick={() => window.open('/docs/quota-setup', '_blank')}
            title='Quota Setup Guide'
          >
            <Icon path={mdiHelpCircleOutline} size={0.9} />
            Setup Guide
          </button>
          {selectedProject && Object.keys(quotas).length > 0 && (
            <ExportExcelButton tableId={`${selectedProject}-quotas`} />
          )}
        </div>
      </div>

      <div className='quota-controls'>
        <Select
          classNamePrefix='my-select'
          className='quota-select'
          options={projectListOptions}
          value={
            projectListOptions.find((opt) => opt.value === selectedProject) ||
            null
          }
          onChange={handleProjectChange}
          isDisabled={false}
          placeholder='Select a project...'
          isClearable
          closeMenuOnSelect={true}
        />

        {selectedProject && Object.keys(quotas).length > 0 && (
          <>
            <div className='quota-filter-wrapper' ref={filterPanelRef}>
              <button
                className={`quota-filter-btn ${hasActiveFilters ? 'has-filters' : ''} ${showFilterPanel ? 'active' : ''}`}
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Icon path={mdiTune} size={0.75} />
                Filters
                {hasActiveFilters && <span className='quota-filter-badge' />}
              </button>

              {showFilterPanel && (
                <div className='quota-filter-panel'>
                  <div className='quota-filter-section'>
                    <div className='quota-filter-section-title'>Mode</div>
                    <div className='quota-filter-options'>
                      {MODE_OPTIONS.map(opt => (
                        <label key={opt.value} className='quota-filter-checkbox'>
                          <input
                            type='checkbox'
                            checked={visibleModes.includes(opt.value)}
                            onChange={() => toggleMode(opt.value)}
                          />
                          <span className='quota-filter-checkmark' />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className='quota-filter-section'>
                    <div className='quota-filter-section-title'>Columns</div>
                    <div className='quota-filter-options'>
                      {COLUMN_OPTIONS.map(opt => (
                        <label key={opt.value} className='quota-filter-checkbox'>
                          <input
                            type='checkbox'
                            checked={visibleColumns.includes(opt.value)}
                            onChange={() => toggleColumn(opt.value)}
                          />
                          <span className='quota-filter-checkmark' />
                          <span>{opt.fullLabel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <label className='quota-toggle'>
              <input
                type='checkbox'
                checked={showVisualIndicators}
                onChange={(e) => setShowVisualIndicators(e.target.checked)}
              />
              <span className='quota-toggle-slider'></span>
              <span className='quota-toggle-label'>Show Visual Indicators</span>
            </label>
          </>
        )}
      </div>

      {selectedProject && Object.keys(quotas).length > 0 ? (
        <>
          {showVisualIndicators && <QuotaSummary quotas={quotas} />}
          <QuotaManagementTable
            id={`${selectedProject}-quotas`}
            quotaData={quotas}
            visibleStypes={visibleStypes}
            showVisualIndicators={showVisualIndicators}
            visibleColumns={visibleColumns}
            visibleModes={visibleModes}
          />
        </>
      ) : (
        <div className='quota-empty'>
          <p>Select a project to view quota data.</p>
        </div>
      )}
    </div>
  );
};

export default QuotaManagement;
