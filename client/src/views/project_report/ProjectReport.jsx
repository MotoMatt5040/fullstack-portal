import React from 'react';
import useProjectReportLogic from './useProjectReportLogic';
import Icon from '@mdi/react';
import { mdiViewList, mdiViewGrid, mdiChartLine, mdiEye, mdiArrowLeft } from '@mdi/js';
import { Link } from 'react-router-dom';

import ProductionReport from '../production_report/ProductionReport';

import MyPieChart from '../../components/MyPieChart';
import MyTable from '../../components/MyTable';
import MyToggle from '../../components/MyToggle';
import MyDataCard from '../../components/MyDataCard';
import MySvgCard from '../../components/MySvgCard';

import './ProjectReport.css';
import './ProjectReportTable.css';
import { useSelector } from 'react-redux';

const ProjectReport = () => {
  const showGraphs = useSelector((state) => state.settings.showGraphs);
  const useGpcph = useSelector((state) => state.settings.useGpcph);
  const summaryStartDate = useSelector(
    (state) => state.summary.summaryStartDate
  );
  const summaryEndDate = useSelector((state) => state.summary.summaryEndDate);
  const summaryIsLive = useSelector((state) => state.summary.summaryIsLive);

  const {
    liveToggle,
    handleLiveToggle,
    data,
    chartData,
    totalData,
    projectReportIsSuccess,
    projectReportIsFetching,
    projectReportIsLoading,
    projectReportData,
    isListView,
    handleViewChange,
  } = useProjectReportLogic();

  const dataIsReady = projectReportIsSuccess && !projectReportIsLoading && !projectReportIsFetching;

  let columnKeyMap = {
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
      TL: 'al',
    };
  } else {
    columnKeyMap = {
      ...columnKeyMap,
      GPCPH: 'gpcph',
      MPH: 'mph',
      'True Len': 'al',
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
    'True Len': 'al',
    'On CPH': 'onCph',
    'On Var': 'onVar',
    'Off CPH': 'offCph',
    'Zero CMS': 'zcms',
  };

  const backUrl = summaryStartDate && summaryEndDate
    ? `/summary-report?live=${summaryIsLive}&startDate=${summaryStartDate}&endDate=${summaryEndDate}`
    : '/summary-report';

  const projectTitle = projectReportData
    ? `${projectReportData[0]['projectId']} ${projectReportData[0]['projName']}`
    : 'Project';

  return (
    <div className='project-report'>
      {/* Header */}
      <div className='project-report-header'>
        <div className='project-report-header-left'>
          <h1>
            <Icon path={mdiChartLine} size={1} />
            {projectTitle} Report
          </h1>
          <p className='project-report-subtitle'>Project performance details</p>
          <p className='project-report-cph-note'>
            Using {useGpcph || liveToggle ? 'Gameplan CPH' : 'Actual CPH'}
          </p>
        </div>
        <div className='project-report-header-right'>
          <Link to={backUrl} className='project-report-back'>
            <Icon path={mdiArrowLeft} size={0.75} />
            Back to Summary
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className='project-report-controls'>
        <div className='project-report-controls-left'>
          {liveToggle && (
            <span className='project-report-live-indicator'>
              <span className='live-dot'></span>
              Live Data
            </span>
          )}
        </div>
        <div className='project-report-controls-right'>
          <MyToggle
            label='Live'
            active={liveToggle}
            onClick={handleLiveToggle}
            blink={liveToggle}
          />
        </div>
      </div>

      {/* Overview Section */}
      <div className='project-report-overview'>
        <h2 className='project-report-overview-title'>
          <Icon path={mdiEye} size={0.875} />
          Overview
        </h2>
        <div className='project-report-overview-content'>
          {showGraphs && (
            <div className='project-report-chart-container'>
              <MyPieChart
                data={chartData}
                domainColumn='field'
                valueColumn='value'
                dataIsReady={dataIsReady}
                colorMap={{
                  'ON-CPH': '#10b981',
                  'ON-VAR': '#3b82f6',
                  'OFF-CPH': '#f59e0b',
                  'ZERO-CMS': '#dc2626',
                }}
              />
            </div>
          )}
          <div className='project-report-stats-container'>
            <MyTable
              className='project-overview-table'
              data={totalData}
              columnKeyMap={summaryColumnKeyMap}
              isLive={liveToggle}
              dataIsReady={dataIsReady}
            />
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className='project-report-data-section'>
        <div className='project-report-data-header'>
          <h2 className='project-report-data-title'>
            {liveToggle ? 'Live Data' : 'Historical Data'}
          </h2>
          <div className='project-report-data-actions'>
            <div className='project-report-view-toggle'>
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

        {!dataIsReady ? (
          <div className='project-report-loading'>Loading project data...</div>
        ) : isListView ? (
          <div className='project-report-table-scroller'>
            <MyTable
              className='project-report-table'
              data={data}
              columnKeyMap={columnKeyMap}
              reverseThresholds={['offCph', 'zcms']}
              isLive={liveToggle}
              isClickable={true}
              redirect={true}
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
              linkTo={''}
              dataIsReady={dataIsReady}
            />
          </div>
        ) : (
          <div className='project-report-card-container'>
            {data.map((item, index) => (
              <MyDataCard
                key={index}
                title={item.projectId}
                data={item}
                columnKeyMap={cardColumnKeyMap}
              />
            ))}
          </div>
        )}

        {dataIsReady && data.length === 0 && (
          <div className='project-report-empty'>
            No data available for this project.
          </div>
        )}
      </div>

      {/* Production Report Section */}
      <ProductionReport />

      {/* Graph Cards */}
      {showGraphs && dataIsReady && data.length > 0 && (
        <div className='project-report-graphs'>
          {data.map((item, index) => (
            <MySvgCard
              key={index}
              centerTitle={item.abbreviatedDate}
              svg={
                <MyPieChart
                  width={300}
                  data={[
                    { field: 'On CPH', value: item.onCph },
                    { field: 'On Var', value: item.onVar },
                    { field: 'Off CPH', value: item.offCph },
                    { field: 'Zero CMS', value: item.zcms },
                  ]}
                  domainColumn='field'
                  valueColumn='value'
                  dataIsReady={true}
                  colorMap={{
                    'ON-CPH': '#10b981',
                    'ON-VAR': '#3b82f6',
                    'OFF-CPH': '#f59e0b',
                    'ZERO-CMS': '#dc2626',
                  }}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectReport;
