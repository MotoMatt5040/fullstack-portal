import React, { useEffect } from 'react';
import useProjectReportLogic from './useProjectReportLogic';
import Icon from '@mdi/react';
import { mdiViewList, mdiViewGrid } from '@mdi/js';

import ProductionReport from '../production_report/ProductionReport';

import MyPieChart from '../../components/MyPieChart';
import MyTable from '../../components/MyTable';
import MyToggle from '../../components/MyToggle';
import MyDataCard from '../../components/MyDataCard';
import MySvgCard from '../../components/MySvgCard';

import './ProjectReport.css';
import './ProjectReportTable.css';
import '../styles/Tables.css';
import '../styles/Headers.css';
import '../styles/Sections.css';
import '../styles/Charts.css';
import '../styles/Containers.css';
import { useSelector } from 'react-redux';
import MyGoBackButton from '../../components/MyGoBackButton';

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

  let columnKeyMap = {
    ...(liveToggle ? {} : { Date: 'abbreviatedDate' }),
    CMS: 'cms',
    HRS: 'hrs',
    CPH: 'cph',
  };

  if (window.innerWidth < 768) {
    // Mobile view
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
    // 'Proj ID': 'projectId',
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
  return (
    //soft refusal
    //naam
    //respondant terminates
    <section className='report section'>
      <div className='project header'>
        <MyGoBackButton
          to='Summary Report'
          url={
            summaryStartDate && summaryEndDate
              ? `/summary-report?live=${summaryIsLive}&startDate=${summaryStartDate}&endDate=${summaryEndDate}`
              : '/summary-report'
          }
        />
        <h1>
          Calculations currently use{' '}
          {useGpcph || liveToggle ? 'Gameplan CPH' : 'Actual CPH'}
        </h1>
      </div>
      <div className='master-report-container'>
        <div className='report-container'>
          <div className='report-header'>
            <h1 className='project-report-title'>
              {projectReportData && (
                <>
                  {projectReportData[0]['projectId']}{' '}
                  {projectReportData[0]['projName']}{' '}
                </>
              )}
              Report
            </h1>
            <h3>Overview</h3>
            <div className='report-charts'>
              {showGraphs && (
                <MyPieChart
                  data={chartData}
                  domainColumn='field'
                  valueColumn='value'
                  dataIsReady={
                    projectReportIsSuccess &&
                    !projectReportIsLoading &&
                    !projectReportIsFetching
                  }
                />
              )}
              <MyTable
                className='project-overview-table'
                data={totalData}
                columnKeyMap={summaryColumnKeyMap}
                isLive={liveToggle}
                dataIsReady={
                  projectReportIsSuccess &&
                  !projectReportIsLoading &&
                  !projectReportIsFetching
                }
              />
            </div>
          </div>
          <div className='table-data-container'>
            <div className='view-toggle-div'>
              <span className='view-toggle-span' onClick={handleViewChange}>
                {isListView ? (
                  <Icon path={mdiViewGrid} size={1} title='Card View' />
                ) : (
                  <Icon path={mdiViewList} size={1} title='Table View' />
                )}
              </span>
            </div>
            <div className='table-data-header'>
              {/* {liveToggle ? "Live Data" : <MyDateRangePicker date={date} onChange={handleDateChange} isDisabled={liveToggle} />} */}
              <MyToggle
                label='Live'
                active={liveToggle}
                onClick={handleLiveToggle}
              />
            </div>
            {/* // NOTE: This is a special notation in JS that allows a function to be called only if the previous condition is true. In this case, it will only call the function if isSuccess is true.
						// The syntax is {bool && <Component />} (please include the brackets) */}
            {isListView ? (
              <div className='table-scroller'>
                <MyTable
                  // className='project-table'
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
                  dataIsReady={
                    projectReportIsSuccess &&
                    !projectReportIsLoading &&
                    !projectReportIsFetching
                  }
                />
              </div>
            ) : (
              <div className='card-container'>
                {projectReportIsSuccess &&
                  !projectReportIsLoading &&
                  !projectReportIsFetching &&
                  data.map((item, index) => (
                    <MyDataCard
                      key={index}
                      title={item.projectId}
                      data={item}
                      columnKeyMap={cardColumnKeyMap}
                    />
                  ))}
              </div>
            )}
          </div>
          <ProductionReport />
        </div>
        {showGraphs && (
          <article className='card-container graphs'>
            {projectReportIsSuccess &&
              !projectReportIsLoading &&
              !projectReportIsFetching &&
              data.map((item, index) => (
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
                    />
                  }
                />
              ))}
          </article>
        )}
      </div>
    </section>
  );
};

export default ProjectReport;
