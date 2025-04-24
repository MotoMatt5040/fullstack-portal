import React from 'react';
import useProjectReportLogic from './useSummaryReportLogic';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
import MyToggle from '../../components/MyToggle';

import './SummaryReport.css';
import './SummaryReportTable.css';
import '../styles/TableSelectors.css';
import { useSelector } from 'react-redux';
import MyCard from '../../components/MyCard';

const ProjectReport = () => {
	const showGraphs = useSelector((state) => state.settings.showGraphs);
	const {
		liveToggle,
		handleLiveToggle,
		data,
		chartData,
		totalData,
		date,
		handleDateChange,
		summaryReportIsLoading,
		summaryReportIsSuccess,
		summaryReportIsFetching,
	} = useProjectReportLogic();

	let columnKeyMap = {
		'Proj ID': 'projectId',
		'Proj Nme': 'projName',
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

	const cardColumnKeyMap = {
		// 'Proj ID': 'projectId',
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

	return (
		<section className='summary-report'>
			<div className='summary-report-header'>
				Overview
				<div className='summary-report-charts'>
					{showGraphs && (
						<MyPieChart
							data={chartData}
							domainColumn='field'
							valueColumn='value'
							dataIsReady={
								summaryReportIsSuccess &&
								!summaryReportIsLoading &&
								!summaryReportIsFetching
							}
						/>
					)}
					<MyTable
						className='summary-overview-table'
						data={totalData}
						columnKeyMap={summaryColumnKeyMap}
						isLive={liveToggle}
						dataIsReady={
							summaryReportIsSuccess &&
							!summaryReportIsLoading &&
							!summaryReportIsFetching
						}
					/>
				</div>
			</div>
			<div className='table-data-container'>
				<div className={`table-data-header`}>
					{liveToggle ? (
						'Live Data'
					) : (
						<MyDateRangePicker
							date={date}
							onChange={handleDateChange}
							isDisabled={liveToggle}
						/>
					)}
					<MyToggle
						label='Live'
						active={liveToggle}
						onClick={handleLiveToggle}
					/>
				</div>
				{/* NOTE: This is a special notation in JS that allows a function to be called only if the previous condition is true. In this case, it will only call the function if isSuccess is true.
				    The syntax is {bool && <Component />} (please include the brackets) */}
				<MyTable
					className='summary-table'
					data={data}
					columnKeyMap={columnKeyMap}
					reverseThresholds={['offCph', 'zcms']}
					isLive={liveToggle}
					isClickable={true}
					clickParameters={['projectId', 'recDate']}
					linkTo={'/projectreport'}
					redirect={true}
					dataIsReady={
						summaryReportIsSuccess &&
						!summaryReportIsLoading &&
						!summaryReportIsFetching
					}
				/>
			</div>
			<div className='card-container'>
				{summaryReportIsSuccess &&
					!summaryReportIsLoading &&
					!summaryReportIsFetching && (
							data.map((item, index) => (
								<MyCard
									key={index}
									title={item.projectId}
									data={item}
									columnKeyMap={cardColumnKeyMap}
								/>
							))
						
					)}
			</div>
		</section>
	);
};

export default ProjectReport;
