import React from 'react';
import useProjectReportLogic from './useProjectReportLogic';

import MyPieChart from '../../components/MyPieChart';
import MyTable from '../../components/MyTable';
import MyToggle from '../../components/MyToggle';

import './ProjectReport.css';
import '../styles/TableSelectors.css';
import './ProjectReportTable.css';
import { useSelector } from 'react-redux';
import MyGoBackButton from '../../components/MyGoBackButton';

const ProjectReport = () => {
	const showGraphs = useSelector((state) => state.settings.showGraphs);
	const {
		liveToggle,
		handleLiveToggle,
		data,
		// isSuccess,
		chartData,
		totalData,
		projectReportIsSuccess,
		projectReportIsFetching,
		projectReportIsLoading,
		projectReportData,
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

	return (
		<section className='project-report'>
			<h1 className='project-report-title'>
				{projectReportData && (
					<>
						{projectReportData[0]['projectId']}{' '}
						{projectReportData[0]['projName']}{' '}
					</>
				)}
				Report
			</h1>
			<div className='project-report-header'>
				Overview
				<div className='project-report-charts'>
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
				<div className={`table-data-header`}>
					{/* {liveToggle ? "Live Data" : <MyDateRangePicker date={date} onChange={handleDateChange} isDisabled={liveToggle} />} */}
					<MyToggle
						label='Live'
						active={liveToggle}
						onClick={handleLiveToggle}
					/>
				</div>
				{/* // NOTE: This is a special notation in JS that allows a function to be called only if the previous condition is true. In this case, it will only call the function if isSuccess is true.
						// The syntax is {bool && <Component />} (please include the brackets) */}
				<MyTable
					className='project-table'
					data={data}
					columnKeyMap={columnKeyMap}
					reverseThresholds={['offCph', 'zcms']}
					isLive={liveToggle}
					isClickable={false}
					clickParameters={['projectId', 'recDate']}
					linkTo={'applesauce'}
					dataIsReady={
						projectReportIsSuccess &&
						!projectReportIsLoading &&
						!projectReportIsFetching
					}
				/>
				{/* <p>Status: {projectReportIsSuccess ? 'Success' : 'Failed or Loading'}</p> */}
			</div>
			<MyGoBackButton to='Summary Report' />
		</section>
	);
};

export default ProjectReport;
