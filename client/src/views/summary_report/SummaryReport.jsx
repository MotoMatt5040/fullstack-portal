import React from 'react';
// import { Link } from 'react-router-dom';

import useProjectReportLogic from './useSummaryReportLogic';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
// import MyMultiSelect from '../../components/MyMultiSelect';
import MyToggle from '../../components/MyToggle';
import './SummaryReport.css';

const ProjectReport = () => {
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

	let columnKeyMap;

	if (window.innerWidth < 768) {
		columnKeyMap = {
			'Project ID': 'projectId',
			'Proj Name': 'projName',
			CMS: 'cms',
			HRS: 'hrs',
			CPH: 'cph',
			GPCPH: 'gpcph',
			MPH: 'mph'
		};

	}
	else {
		columnKeyMap = {
			'Project ID': 'projectId',
			'Project Name': 'projName',
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
			<div className='project-report-header'>
				<MyPieChart data={chartData} domainColumn='field' valueColumn='value' />
				<MyTable data={totalData} columnKeyMap={summaryColumnKeyMap} />
			</div>
			<div className='table-data'>
				<div className={`table-data-header`}>
					<MyDateRangePicker date={date} onChange={handleDateChange} isDisabled={liveToggle} />
					<MyToggle label='Live' active={liveToggle} onClick={handleLiveToggle} />
				</div>
				{isSuccess && (
					<MyTable
						className='project-table'
						data={data}
						columnKeyMap={columnKeyMap}
						reverseThresholds={['offCph', 'zcms']}
					/>
				)}
			</div>
		</section>
	);
};

export default ProjectReport;
