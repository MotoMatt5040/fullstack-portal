import React from 'react';
import { Link } from 'react-router-dom';

import useProductionReportLogic from './useProductionReportLogic';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
import MyMultiSelect from '../../components/MyMultiSelect';
import MyToggle from '../../components/MyToggle';

import { formatDate } from '../../utils/DateFormat';

import './ProductionReport.css';

const ProductionReport = () => {
  const {
    projectId,
    recDate,
    productionReportIsSuccess,
    productionReportIsFetching,
    productionReportIsLoading,
    projectName,
    totalHours,
    totalCms,
    targetMph,
    data,
    incidence,
    expectedLoi,
    expectedCph,
    actualCph,
    dailyLoi,
    amph,
    handleConfirm,
    mphIsUpdated,
    handleMphChange,
    // Calculated values
    todaysCmsGoal,
    todaysCmsDiff,
    expectedCphInverse,
    actualCphPercentage,
    amphPercentage,
    targetMph80Cutoff,
    expectedCph80Cutoff,
    expectedCph60Cutoff,
    top20Count,
    todaysCmsDiffIsPositive,
    actualCphMeetsExpected,
    amphMeetsTarget,
  } = useProductionReportLogic();

  const columnKeyMap = {
    // "Project ID": "projectId",
    EID: 'eid',
    'Ref Name': 'refName',
    'Rec Loc': 'recLoc',
    Tenure: 'tenure', //
    Hrs: 'hrs',
    'Connect Time': 'connectTime',
    'Time Diff': 'timeDifference', // 255 255 0
    'Pause Time': 'pauseTime',
    'Pause Min': 'pauseMinutes', //
    'PT%': 'pauseTimePercent', //
    NPH: 'nph', // 7.5% threshold
    CMS: 'cms',
    'CMS Diff': 'cmsDifference', //
    XCMS: 'xcms', // 204 204 255
    'Prod Impact': 'productionImpact', //
    XCPD: 'xcpd', //
    'Int. AL': 'intal',
    CPH: 'cph', // 198 224 180
    MPH: 'mph',
    'Total Dials': 'totalDials',
    DPC: 'dpc', //
    DPH: 'dph', //
  };

  return (
    <section className='production-report'>
      <div className='table-data-container'>
        <div className='table-data-header production-report'>
          {/* <h1>Production Report</h1> */}
          <div className='production-report-title'>
            <p>
              {projectName}
              <br />
              {formatDate(new Date(recDate))}
            </p>
          </div>

          <div className='table-area'>
            <table className='production-report-target-table'>
              <thead>
                <tr>
                  <td colSpan={20}>REPORT DATA</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} />
                  <td colSpan={2} className='justify-right'>
                    <b>Expected LOI:</b>
                  </td>
                  <td>
                    <b>{expectedLoi}</b>
                  </td>
                  <td />
                  <td>
                    <b>X.CPH</b>
                  </td>
                  <td>
                    <b>{expectedCph.toFixed(2)}</b>
                  </td>
                </tr>

                <tr>
                  <td></td>
                  <th>MPH</th>
                  <th>CPH</th>
                  <td className='total-ints' colSpan={4}></td>
                  <td className='todays-data justify-right'>
                    <b>TODAY'S CMS GOAL:</b>
                  </td>
                  <td>{todaysCmsGoal.toFixed(0)}</td>
                  <td className='justify-right'>Daily Incidence:</td>
                  <td>{incidence.toFixed(2)}%</td>
                  <td colSpan={2} />
                  <td>{expectedCphInverse}</td>
                </tr>

                <tr>
                  <th>Target</th>
                  <td
                    className={`target-mph-td highlight-green ${
                      mphIsUpdated ? 'updated' : 'not-updated'
                    }`}
                  >
                    <input
                      className='target-mph-input'
                      type='float'
                      value={targetMph ?? 0}
                      onChange={handleMphChange}
                      onKeyDown={handleConfirm}
                    ></input>
                  </td>
                  <td className='highlight-green'>{expectedCph.toFixed(2)}</td>
                  <td></td>
                  <td colSpan={2}>Total INTs</td>
                  <td>{data.length}</td>
                  <td className='justify-right'>
                    <b>TODAY'S CMS ACTUAL:</b>
                  </td>
                  <td>{totalCms}</td>
                  <td className='justify-right'>Avg. Daily LOI:</td>
                  <td>{dailyLoi}</td>
                  <td />
                  <td>A.CPH</td>
                  <td
                    className={
                      actualCphMeetsExpected
                        ? 'highlight-green'
                        : 'highlight-red'
                    }
                  >
                    {actualCph}
                  </td>
                  <td>{actualCphPercentage.toFixed(0)}%</td>
                </tr>

                <tr>
                  <th>80% Cutoff</th>
                  <td className='highlight-yellow'>
                    {targetMph80Cutoff.toFixed(2)}
                  </td>
                  <td className='highlight-yellow'>
                    {expectedCph80Cutoff.toFixed(2)}
                  </td>
                  <td></td>
                  <td colSpan={2}># Top 20%</td>
                  <td>{top20Count.toFixed(0)}</td>
                  <td className='justify-right'>
                    <b>TODAY'S CMS DIFF:</b>
                  </td>
                  <td
                    className={
                      todaysCmsDiffIsPositive
                        ? 'highlight-rich-green'
                        : 'highlight-red'
                    }
                  >
                    {todaysCmsDiff.toString()}
                  </td>
                  <td className='justify-right'>Avg. Overall LOI:</td>
                  <td>{expectedLoi}</td>
                  <td />
                  <td>A.MPH</td>
                  <td
                    className={
                      amphMeetsTarget ? 'highlight-green' : 'highlight-red'
                    }
                  >
                    {amph}
                  </td>
                  <td>{amphPercentage.toFixed(0)}%</td>
                </tr>

                <tr>
                  <th>60% Cutoff</th>
                  <td> </td>
                  <td>{expectedCph60Cutoff.toFixed(2)}</td>
                  <td colSpan={4}></td>
                  <td className='justify-right'>
                    <b>TODAY'S HOURS:</b>
                  </td>
                  <td>{totalHours}</td>
                  <td colSpan={5}>X.CPD = Expected CMS based on dials</td>
                </tr>
              </tbody>
            </table>

            {/* <table className='production-report-dispo-table'>
							<tbody>
								<tr>
									<th></th>
									<td>{incidence.toFixed(2)}</td>
								</tr>
								<tr>
									<th></th>
									<td>{}</td>
								</tr>
								<tr>
									<th></th>
									<td>{}</td>
								</tr>
							</tbody>
						</table> */}
          </div>
        </div>
        <div className='table-data-header'>
          <div className='table-scroller'>
            <MyTable
              className='production-report-table'
              data={data}
              columnKeyMap={columnKeyMap}
              isLive={false}
              isClickable={true}
              dataIsReady={
                data &&
                !productionReportIsFetching &&
                !productionReportIsLoading
              }
              percentColumns={['pauseTime', 'nph']}
              gradientColumns={{
                totalDials: { direction: 'asc', ignoreZero: true },
                dpc: { direction: 'asc', ignoreZero: true },
                dph: { direction: 'asc', ignoreZero: true },
                pauseMinutes: { direction: 'asc', ignoreZero: false },
              }}
              highlightColumnWithThreshold={{
                cph: {
                  backgroundColor: 'rgb(198, 224, 180)',
                  threshold: expectedCph,
                  direction: 'asc',
                  textColor: 'black',
                },
                mph: {
                  backgroundColor: 'rgb(198, 224, 180)',
                  threshold: targetMph,
                  direction: 'asc',
                  textColor: 'black',
                },
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductionReport;