import React from 'react';
import useSummaryReportLogic from './useSummaryReportLogic';
import Icon from '@mdi/react';
import { mdiViewList, mdiViewGrid, mdiChartLine, mdiEye } from '@mdi/js';
import { useNavigate } from 'react-router-dom';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
import MyToggle from '../../components/MyToggle';

import './SummaryReport.css';
import './SummaryReportTable.css';
import { useSelector } from 'react-redux';

const SummaryReport = () => {
  const navigate = useNavigate();
  const showGraphs = useSelector((state) => state.settings.showGraphs);
  const useGpcph = useSelector((state) => state.settings.useGpcph);
  const {
    liveToggle,
    handleLiveToggle,
    data,
    chartData,
    totalData,
    date,
    handleDateChange,
    isInitialLoading,
    isRefreshing,
    isListView,
    handleViewChange,
  } = useSummaryReportLogic();

  // Navigate to project report
  const handleCardClick = (item) => {
    const params = new URLSearchParams({
      projectId: item.projectId,
      recDate: item.recDate || '',
      projName: item.projName || '',
      cms: item.cms || '',
      cph: item.cph || '',
      hrs: item.hrs || '',
      al: item.al || '',
      mph: item.mph || '',
    });
    navigate(`/project-report?${params.toString()}`);
  };

  // Determine card status based on CPH
  const getCardStatus = (item) => {
    if (!item.onCph && !item.offCph) return '';
    const onCph = parseFloat(item.onCph) || 0;
    const offCph = parseFloat(item.offCph) || 0;
    if (onCph > offCph * 2) return 'status-exceeding';
    if (onCph > offCph) return 'status-on-target';
    return 'status-off-target';
  };

  // Get status badge text
  const getStatusBadge = (item) => {
    const status = getCardStatus(item);
    if (status === 'status-exceeding') return { text: 'Exceeding', class: 'badge-exceeding' };
    if (status === 'status-on-target') return { text: 'On Target', class: 'badge-on-target' };
    if (status === 'status-off-target') return { text: 'Off Target', class: 'badge-off-target' };
    return null;
  };

  let columnKeyMap = {
    'Proj ID': 'projectId',
    'Proj Nme': 'projName',
    ...(liveToggle ? {} : { Date: 'abbreviatedDate' }),
    CMS: 'cms',
    HRS: 'hrs',
    CPH: 'cph',
  };

  if (window.innerWidth < 768) {
    columnKeyMap = {
      ...columnKeyMap,
      GPH: 'gpcph',
      MPH: 'mph',
      AL: 'al',
    };
  } else {
    columnKeyMap = {
      ...columnKeyMap,
      GPCPH: 'gpcph',
      MPH: 'mph',
      'Avg. Len': 'al',
      'On CPH': 'onCph',
      'On Var': 'onVar',
      'Off CPH': 'offCph',
      'Zero CMS': 'zcms',
    };
  }

  const summaryColumnKeyMap = {
    Total: 'Total',
    'On CPH': 'ON-CPH',
    'On Var': 'ON-VAR',
    'Off CPH': 'OFF-CPH',
    'Zero CMS': 'ZERO-CMS',
  };

  const cardColumnKeyMap = {
    'Proj Name': 'projName',
    ...(liveToggle ? {} : { Date: 'abbreviatedDate' }),
    CMS: 'cms',
    HRS: 'hrs',
    CPH: 'cph',
    GPCPH: 'gpcph',
    MPH: 'mph',
    'Avg. Len': 'al',
    'On CPH': 'onCph',
    'On Var': 'onVar',
    'Off CPH': 'offCph',
    'Zero CMS': 'zcms',
  };

  // Data is ready once we have any data - don't flicker on refreshes
  const hasData = data && data.length > 0;

  return (
    <div className='summary-report'>
      {/* Header */}
      <div className='summary-header'>
        <div className='summary-header-left'>
          <h1>
            <Icon path={mdiChartLine} size={1} />
            Summary Report
          </h1>
          <p className='summary-subtitle'>Project performance overview</p>
          <p className='summary-cph-note'>
            Using {useGpcph || liveToggle ? 'Gameplan CPH' : 'Actual CPH'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className='summary-controls'>
        <div className='summary-controls-left'>
          {!liveToggle && (
            <MyDateRangePicker
              date={date}
              onChange={handleDateChange}
              isDisabled={liveToggle}
            />
          )}
        </div>
        <div className='summary-controls-right'>
          {liveToggle && (
            <span className='summary-live-indicator'>
              <span className={`live-dot ${isRefreshing ? 'refreshing' : ''}`}></span>
              {isRefreshing ? 'Updating...' : 'Live Data'}
            </span>
          )}
          <MyToggle
            label='Live'
            active={liveToggle}
            onClick={handleLiveToggle}
            blink={liveToggle}
          />
        </div>
      </div>

      {/* Overview Section */}
      <div className='summary-overview'>
        <h2 className='summary-overview-title'>
          <Icon path={mdiEye} size={0.875} />
          Overview
        </h2>
        <div className='summary-overview-content'>
          {showGraphs && (
            <div className='summary-chart-container'>
              <MyPieChart
                data={chartData}
                domainColumn='field'
                valueColumn='value'
                dataIsReady={hasData}
                colorMap={{
                  'ON-CPH': '#4CAF50',
                  'ON-VAR': '#2196F3',
                  'OFF-CPH': '#FF9800',
                  'ZERO-CMS': '#F44336',
                }}
              />
            </div>
          )}
          <div className='summary-stats-container'>
            <MyTable
              className='summary-overview-table'
              data={totalData}
              columnKeyMap={summaryColumnKeyMap}
              isLive={liveToggle}
              dataIsReady={hasData}
            />
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className='summary-data-section'>
        <div className='summary-data-header'>
          <h2 className='summary-data-title'>
            {liveToggle ? 'Live Projects' : 'Project Data'}
          </h2>
          <div className='summary-data-actions'>
            <div className='summary-view-toggle'>
              <button
                className={isListView ? 'active' : ''}
                onClick={isListView ? undefined : handleViewChange}
                title='Table View'
              >
                <Icon path={mdiViewList} size={0.875} />
              </button>
              <button
                className={!isListView ? 'active' : ''}
                onClick={!isListView ? undefined : handleViewChange}
                title='Card View'
              >
                <Icon path={mdiViewGrid} size={0.875} />
              </button>
            </div>
          </div>
        </div>

        {/* Show loading only on initial load, never during refreshes */}
        {isInitialLoading ? (
          <div className='summary-loading'>Loading project data...</div>
        ) : isListView ? (
          <div className='summary-table-scroller'>
            <MyTable
              className='summary-data-table'
              data={data}
              columnKeyMap={columnKeyMap}
              reverseThresholds={['offCph', 'zcms']}
              isLive={liveToggle}
              isClickable={true}
              clickParameters={[
                'projectId',
                'recDate',
                'projName',
                'cms',
                'cph',
                'hrs',
                'al',
                'mph',
              ]}
              linkTo={'/project-report'}
              redirect={true}
              dataIsReady={true}
            />
          </div>
        ) : (
          <div className='summary-card-container'>
            {data.map((item, index) => {
              const status = getCardStatus(item);
              const badge = getStatusBadge(item);
              return (
                <div
                  key={index}
                  className={`summary-card ${status}`}
                  onClick={() => handleCardClick(item)}
                >
                  <div className='summary-card-header'>
                    <div>
                      <h3 className='summary-card-title'>{item.projectId}</h3>
                      <p className='summary-card-subtitle'>{item.projName}</p>
                    </div>
                    {badge && (
                      <span className={`summary-card-status ${badge.class}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                  <div className='summary-card-body'>
                    {!liveToggle && item.abbreviatedDate && (
                      <div className='summary-card-item'>
                        <span className='summary-card-label'>Date</span>
                        <span className='summary-card-value'>{item.abbreviatedDate}</span>
                      </div>
                    )}
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>CMS</span>
                      <span className='summary-card-value'>{item.cms}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>HRS</span>
                      <span className='summary-card-value'>{item.hrs}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>CPH</span>
                      <span className='summary-card-value'>{item.cph}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>GPCPH</span>
                      <span className='summary-card-value'>{item.gpcph}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>MPH</span>
                      <span className='summary-card-value'>{item.mph}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>Avg. Len</span>
                      <span className='summary-card-value'>{item.al}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>On CPH</span>
                      <span className='summary-card-value value-on-cph'>{item.onCph}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>On Var</span>
                      <span className='summary-card-value value-on-var'>{item.onVar}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>Off CPH</span>
                      <span className='summary-card-value value-off-cph'>{item.offCph}</span>
                    </div>
                    <div className='summary-card-item'>
                      <span className='summary-card-label'>Zero CMS</span>
                      <span className='summary-card-value value-zero-cms'>{item.zcms}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isInitialLoading && data.length === 0 && (
          <div className='summary-empty'>
            No project data available for the selected period.
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryReport;
