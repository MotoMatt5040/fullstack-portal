import React from 'react';
import useProjectReportLogic from './useSummaryReportLogic';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
import MyToggle from '../../components/MyToggle';

import './SummaryReport.css';
import '../styles/TableSelectors.css';
import { useSelector  } from 'react-redux';

const ProjectReport = () => {
	const showGraphs = useSelector((state) => state.settings.showGraphs);
	const {
		liveToggle,
		handleLiveToggle,
		data,
		isSuccess,
		chartData,
		totalData,
		date,
		handleDateChange
	} = useProjectReportLogic();

	let columnKeyMap = {
		'Project ID': 'projectId',
		'Proj Name': 'projName',
		...(liveToggle ? {} : {Date: 'abbreviatedDate'}),
		CMS: 'cms',
		HRS: 'hrs',
		CPH: 'cph',
	};

	if (window.innerWidth < 768) { // Mobile view
		columnKeyMap = {
			...columnKeyMap,
			GPH: 'gpcph',
			MPH: 'mph',
			AL: 'al'
		};

	}
	else {
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
		<section className='summary-report'>
			<div className='summary-report-header'>
				{showGraphs && <MyPieChart data={chartData} domainColumn='field' valueColumn='value' />}
				<MyTable data={totalData} columnKeyMap={summaryColumnKeyMap} isLive={liveToggle}/>
			</div>
			<div className='table-data'>
				<div className={`table-data-header`}>
					{liveToggle ? "Live Data" : <MyDateRangePicker date={date} onChange={handleDateChange} isDisabled={liveToggle} />}
					<MyToggle label='Live' active={liveToggle} onClick={handleLiveToggle} />
				</div>
				{isSuccess && ( // NOTE: This is a special notation in JS that allows a function to be called only if the previous condition is true. In this case, it will only call the function if isSuccess is true.
					<MyTable      // The syntax is {bool && <Component />} (please include the brackets)
						className='project-table'
						data={data}
						columnKeyMap={columnKeyMap}
						reverseThresholds={['offCph', 'zcms']}
						isLive={liveToggle}
						isClickable={true}
						clickParameters={['projectId', 'recDate']}
						linkTo={'/projectreport'}
						redirect={true}
					/>
				)}
			</div>
		</section>
	);
};

export default ProjectReport;
