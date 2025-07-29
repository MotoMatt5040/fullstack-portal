import React from 'react';
import Select from 'react-select';
import MyPieChart from '../../components/MyPieChart';
import useDispositionReportLogic from './useDispositionReportLogic';
import Icon from '@mdi/react';
import { mdiRefresh, mdiChartPie, mdiPhone, mdiWeb, mdiCompare } from '@mdi/js';
import './DispositionReport.css';
import { FaInfoCircle } from 'react-icons/fa';

const DispositionReport: React.FC = () => {
  const {
    selectedProject,
    projectListOptions,
    dataAvailability,
    webDispositionData,
    phoneDispositionData,
    webChartData,
    phoneChartData,
    combinedChartData,
    activeChartData,
    displayTitle,
    summaryStats,
    webDropoutChartData,
    isLoading,
    isRefetching,
    error,
    handleProjectChange,
    refreshData,
  } = useDispositionReportLogic();

  if (isLoading) {
    return (
      <section className='disposition-report section'>
        <h1>Disposition Report</h1>
        <div className='loading-container'>
          <div className='spinner'></div>
          <p>Loading disposition data...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className='disposition-report section'>
        <h1>Disposition Report</h1>
        <div className='error-container'>
          <p className='error-message'>Error loading data. Please try again.</p>
          <button onClick={refreshData} className='retry-button'>
            <Icon path={mdiRefresh} size={0.8} />
            Retry
          </button>
        </div>
      </section>
    );
  }

  const renderDispositionInfo = (data: any, type: 'web' | 'phone') => {
    if (!data || Object.keys(data).length === 0) return null;

    const icon = type === 'web' ? mdiWeb : mdiPhone;
    const iconColor = type === 'web' ? '#2196F3' : '#4CAF50';

    return (
      <div className={`disposition-info-card ${type}`}>
        <div className='disposition-header'>
          <Icon path={icon} size={1} color={iconColor} />
          <h3>{type === 'web' ? 'Web' : 'Phone'} Disposition</h3>
        </div>

        <div className='disposition-stats'>
          <div className='stat-row primary'>
            <span className='stat-label'>Total Responses:</span>
            <span className='stat-value'>
              {data.Responses?.toLocaleString() || 0}
            </span>
          </div>

          <div className='stat-row'>
            <span className='stat-label'>Avg Completion Time:</span>
            <span className='stat-value'>
              {data.AvgCompletionTime?.startsWith('00:')
                ? data.AvgCompletionTime.substring(3)
                : data.AvgCompletionTime || 'N/A'}
            </span>
          </div>

          {data.CompletionRate && (
            <div className='stat-row'>
              <span className='stat-label'>Completion Rate:</span>
              <span className='stat-value highlight'>
                {data.CompletionRate}
              </span>
            </div>
          )}

          {data.Sample && (
            <div className='stat-row'>
              <span className='stat-label'>Sample Size:</span>
              <span className='stat-value'>{data.Sample.toLocaleString()}</span>
            </div>
          )}

          {data.Objective && (
            <div className='stat-row'>
              <span className='stat-label'>Objective:</span>
              <span className='stat-value'>
                {data.Objective.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render data availability indicator
  const renderDataAvailabilityIndicator = () => {
    if (dataAvailability === 'none') return null;

    const indicators = [];

    if (dataAvailability === 'web-only' || dataAvailability === 'both') {
      indicators.push(
        <div key='web' className='data-indicator web-available'>
          <Icon path={mdiWeb} size={0.8} />
          <span>Web Data Available</span>
        </div>
      );
    }

    if (dataAvailability === 'phone-only' || dataAvailability === 'both') {
      indicators.push(
        <div key='phone' className='data-indicator phone-available'>
          <Icon path={mdiPhone} size={0.8} />
          <span>Phone Data Available</span>
        </div>
      );
    }

    if (dataAvailability === 'both') {
      indicators.push(
        <div key='combined' className='data-indicator combined-available'>
          <Icon path={mdiCompare} size={0.8} />
          <span>Combined View</span>
        </div>
      );
    }

    return <div className='data-availability-indicators'>{indicators}</div>;
  };

  return (
    <section className='disposition-report section'>
      <div className='development-notice'>
        <FaInfoCircle /> This page is currently under active development. Web Disposition and Dropout data are now available.
      </div>
      <br />
      <div className='section-header'>
        <h1>Disposition Report</h1>
        <button
          onClick={refreshData}
          className='refresh-button'
          disabled={isRefetching}
        >
          <Icon path={mdiRefresh} size={0.8} spin={isRefetching} />
          {isRefetching ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      <div className='disposition-report-container'>
        <div className='controls-panel'>
          <div className='project-selector'>
            <label>Select Project:</label>
            <Select
              classNamePrefix='my-select'
              className='project-select'
              options={projectListOptions}
              value={
                projectListOptions.find(
                  (opt) => opt.value === selectedProject
                ) || null
              }
              onChange={handleProjectChange}
              placeholder='Choose a project...'
              isClearable
              closeMenuOnSelect={true}
            />
          </div>

          {/* Show what data is available */}
          {renderDataAvailabilityIndicator()}
        </div>

        {selectedProject ? (
          <>
            {dataAvailability !== 'none' ? (
              <>
                {/* Disposition Info Cards */}
                <div className='disposition-info-container'>
                  {(dataAvailability === 'web-only' ||
                    dataAvailability === 'both') &&
                    renderDispositionInfo(webDispositionData, 'web')}
                  {(dataAvailability === 'phone-only' ||
                    dataAvailability === 'both') &&
                    renderDispositionInfo(phoneDispositionData, 'phone')}
                </div>

                {/* Summary Statistics for Combined View */}
                {dataAvailability === 'both' && (
                  <div className='summary-stats-container'>
                    <h3>Combined Summary</h3>
                    <div className='summary-grid'>
                      <div className='summary-item'>
                        <span className='summary-label'>
                          Total Interactions:
                        </span>
                        <span className='summary-value'>
                          {summaryStats.combinedTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className='summary-item'>
                        <span className='summary-label'>Web Proportion:</span>
                        <span className='summary-value'>
                          {summaryStats.combinedTotal > 0
                            ? `${(
                                (summaryStats.webTotal /
                                  summaryStats.combinedTotal) *
                                100
                              ).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className='summary-item'>
                        <span className='summary-label'>Phone Proportion:</span>
                        <span className='summary-value'>
                          {summaryStats.combinedTotal > 0
                            ? `${(
                                (summaryStats.phoneTotal /
                                  summaryStats.combinedTotal) *
                                100
                              ).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chart Display */}
                <div className='disposition-chart-container'>
                  {/* Web Data Charts - Show both disposition and dropout charts side by side */}
                  {(dataAvailability === 'web-only' || dataAvailability === 'both') && (
                    <div className='web-charts-section'>
                      <h3 className='charts-section-title'>Web Data Analysis</h3>
                      
                      <div className='charts-grid'>
                        {/* Web Disposition Chart */}
                        {webChartData.length > 0 && (
                          <div className='chart-item'>
                            <h4 className='chart-title'>Web Disposition Overview</h4>
                            <div className='chart-wrapper'>
                              <MyPieChart
                                data={webChartData}
                                dataIsReady={true}
                                height={500}
                                width={900}
                                domainColumn='field'
                                valueColumn='value'
                                textOutside={true}
                                colorMap={{
                                  Completed: '#4CAF50',
                                  Closed: '#2196F3',
                                  DropOut: '#FF9800',
                                  Interrupted: '#F44336',
                                  ScreenedOut: '#9E9E9E',
                                  NoAnswer: '#795548',
                                  Busy: '#FFC107',
                                  Callback: '#00BCD4',
                                  Voicemail: '#9C27B0',
                                  Disconnected: '#E91E63',
                                  WrongNumber: '#FF5722',
                                  DoNotCall: '#F44336',
                                  LanguageBarrier: '#3F51B5',
                                  Refused: '#FF6B6B',
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Web Dropout Counts Chart */}
                        {webDropoutChartData.length > 0 && (
                          <div className='chart-item'>
                            <h4 className='chart-title'>Web Dropout</h4>
                            <div className='chart-wrapper'>
                              <MyPieChart
                                data={webDropoutChartData}
                                dataIsReady={true}
                                height={500}
                                width={900}
                                domainColumn='field'
                                valueColumn='value'
                                textOutside={true}
                                colorScheme="random"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Phone Data Chart - Only show if phone-only or both */}
                  {(dataAvailability === 'phone-only' || dataAvailability === 'both') && phoneChartData.length > 0 && (
                    <div className='phone-charts-section'>
                      <h3 className='charts-section-title'>Phone Data Analysis</h3>
                      
                      <div className='charts-grid single-chart'>
                        <div className='chart-item'>
                          <h4 className='chart-title'>Phone Disposition Overview</h4>
                          <div className='chart-wrapper'>
                            <MyPieChart
                              data={phoneChartData}
                              dataIsReady={true}
                              height={400}
                              width={450}
                              domainColumn='field'
                              valueColumn='value'
                              textOutside={true}
                              colorMap={{
                                Completed: '#4CAF50',
                                NoAnswer: '#795548',
                                Busy: '#FFC107',
                                Callback: '#00BCD4',
                                Voicemail: '#9C27B0',
                                Disconnected: '#E91E63',
                                WrongNumber: '#FF5722',
                                DoNotCall: '#F44336',
                                LanguageBarrier: '#3F51B5',
                                Refused: '#FF6B6B',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Combined Chart - Only show if both data types are available */}
                  {dataAvailability === 'both' && combinedChartData.length > 0 && (
                    <div className='combined-charts-section'>
                      <h3 className='charts-section-title'>Combined Analysis</h3>
                      
                      <div className='charts-grid single-chart'>
                        <div className='chart-item'>
                          <h4 className='chart-title'>Combined Disposition Overview</h4>
                          <div className='chart-wrapper'>
                            <MyPieChart
                              data={combinedChartData}
                              dataIsReady={true}
                              height={500}
                              width={900}
                              domainColumn='field'
                              valueColumn='value'
                              textOutside={true}
                              colorMap={{
                                Completed: '#4CAF50',
                                Closed: '#2196F3',
                                DropOut: '#FF9800',
                                Interrupted: '#F44336',
                                ScreenedOut: '#9E9E9E',
                                NoAnswer: '#795548',
                                Busy: '#FFC107',
                                Callback: '#00BCD4',
                                Voicemail: '#9C27B0',
                                Disconnected: '#E91E63',
                                WrongNumber: '#FF5722',
                                DoNotCall: '#F44336',
                                LanguageBarrier: '#3F51B5',
                                Refused: '#FF6B6B',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comparison Table for Both View */}
                  {dataAvailability === 'both' &&
                    combinedChartData.some(
                      (item: any) => item.webValue !== undefined
                    ) && (
                      <div className='comparison-table-container'>
                        <h3>Detailed Comparison</h3>
                        <table className='comparison-table'>
                          <thead>
                            <tr>
                              <th>Disposition Type</th>
                              <th className='web-column'>Web</th>
                              <th className='phone-column'>Phone</th>
                              <th className='total-column'>Total</th>
                              <th className='percentage-column'>
                                % of Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {combinedChartData.map((item: any) => {
                              const percentage =
                                summaryStats.combinedTotal > 0
                                  ? (
                                      (item.value /
                                        summaryStats.combinedTotal) *
                                      100
                                    ).toFixed(1)
                                  : '0';

                              return (
                                <tr key={item.field}>
                                  <td className='disposition-name'>
                                    {item.field}
                                  </td>
                                  <td className='web-column'>
                                    {(item.webValue || 0).toLocaleString()}
                                  </td>
                                  <td className='phone-column'>
                                    {(
                                      item.phoneValue || 0
                                    ).toLocaleString()}
                                  </td>
                                  <td className='total-column'>
                                    <strong>
                                      {item.value.toLocaleString()}
                                    </strong>
                                  </td>
                                  <td className='percentage-column'>
                                    <div className='percentage-bar-container'>
                                      <div
                                        className='percentage-bar'
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                      <span className='percentage-text'>
                                        {percentage}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className='total-row'>
                              <td>Total</td>
                              <td className='web-column'>
                                <strong>
                                  {summaryStats.webTotal.toLocaleString()}
                                </strong>
                              </td>
                              <td className='phone-column'>
                                <strong>
                                  {summaryStats.phoneTotal.toLocaleString()}
                                </strong>
                              </td>
                              <td className='total-column'>
                                <strong>
                                  {summaryStats.combinedTotal.toLocaleString()}
                                </strong>
                              </td>
                              <td className='percentage-column'>
                                <strong>100%</strong>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                </div>
              </>
            ) : (
              <div className='no-data-message'>
                <Icon path={mdiChartPie} size={2} color='#ccc' />
                <p>No disposition data available for the selected project.</p>
                <small>
                  The system attempted to fetch both web and phone data but
                  neither was available.
                </small>
              </div>
            )}
          </>
        ) : (
          <div className='no-selection-message'>
            <Icon path={mdiChartPie} size={2} color='#ccc' />
            <p>Please select a project to view disposition data.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DispositionReport;