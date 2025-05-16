import React from 'react';
import useProjectReportLogic from './useSummaryReportLogic';
import Icon from '@mdi/react';
import { mdiViewList, mdiViewGrid } from '@mdi/js';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
import MyToggle from '../../components/MyToggle';

// import './SummaryReport.css';
import './SummaryReportTable.css';
import '../styles/Tables.css';
import '../styles/Headers.css';
import '../styles/Sections.css';
import '../styles/Charts.css';
import '../styles/Scrollers.css';
import '../styles/ViewToggles.css'
import { useSelector } from 'react-redux';
import MyDataCard from '../../components/MyDataCard';

const ProjectReport = () => {
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
		summaryReportIsLoading,
		summaryReportIsSuccess,
		summaryReportIsFetching,
		isListView,
		handleViewChange,
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
		<section className='summary report section'>
			<div className='summary header'>
				<h1>
					Calculations currently use {useGpcph || liveToggle ? 'Gameplan CPH' : 'Actual CPH'}
				</h1>
			</div>
			<span className='report-container'>
				<div className='report-header'>
					Overview
					<div className='report-charts'>
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
					<div className='view-toggle-div'>
						<span className='view-toggle-span' onClick={handleViewChange}>
							{isListView ? (
								<Icon path={mdiViewGrid} size={1} title='Card View' />
							) : (
								<Icon path={mdiViewList} size={1} title='Table View' />
							)}
						</span>
					</div>
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
							blink={liveToggle}
						/>
					</div>
					{/* NOTE: This is a special notation in JS that allows a function to be called only if the previous condition is true. In this case, it will only call the function if isSuccess is true.
				    The syntax is {bool && <Component />} (please include the brackets) */}
					{isListView ? (
						<div className='table-scroller'>
							<MyTable
								// className='summary-table'
								data={data}
								columnKeyMap={columnKeyMap}
								reverseThresholds={['offCph', 'zcms']}
								isLive={liveToggle}
								isClickable={true}
								clickParameters={['projectId', 'recDate', 'projName', 'cms', 'cph', 'hrs', 'al', 'mph']}
								linkTo={'/projectreport'}
								redirect={true}
								dataIsReady={
									summaryReportIsSuccess &&
									!summaryReportIsLoading &&
									!summaryReportIsFetching
								}
							/>
						</div>
					) : (
						<div className='card-container'>
							{summaryReportIsSuccess &&
								!summaryReportIsLoading &&
								!summaryReportIsFetching &&
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
			</span>
		</section>
	);
};

export default ProjectReport;
