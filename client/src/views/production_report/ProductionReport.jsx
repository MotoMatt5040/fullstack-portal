import React from 'react';
import { Link } from 'react-router-dom';

import useProductionReportLogic from './useProductionReportLogic';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
import MyMultiSelect from '../../components/MyMultiSelect';
import MyToggle from '../../components/MyToggle';

const ProductionReport = () => {
	const {
		projectId,
		recDate,
		productionReportIsSuccess,
		productionReportIsFetching,
		productionReportIsLoading,
		data,
	} = useProductionReportLogic();

	const columnKeyMap = {
		// "Project ID": "projectId",
		EID: 'eid',
		'Ref Name': 'refName',
		'Rec Loc': 'recLoc',
		Hrs: 'hrs',
		'Connect Time': 'connectTime',
		'Pause Time': 'pauseTime',
		CPH: 'cph',
		CMS: 'cms',
		'Int. AL': 'intal',
		MPH: 'mph',
		'Total Dials': 'totalDials',
	};

	return (
		<section className='production-report'>
			<div className='table-data-container'>
        <div className='table-data-header center'>
          <h1>Production Report</h1>
          </div>
				<div className='table-data-header'>
					<div className='table-scroller'>
						<MyTable
							className='production-report-table'
							data={data}
							columnKeyMap={columnKeyMap}
							isLive={false}
							isClickable={false}
							dataIsReady={
								data &&
								!productionReportIsFetching &&
								!productionReportIsLoading
							}
						/>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ProductionReport;
