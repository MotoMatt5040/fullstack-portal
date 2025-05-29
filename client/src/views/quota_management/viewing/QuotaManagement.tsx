import React from 'react';
import Select from 'react-select';
import MyToggle from '../../../components/MyToggle';

import './QuotaManagement.css';
import '../../styles/Sections.css';
import '../../styles/ViewToggles.css';
import '../../styles/Containers.css';
import useQuotaManagementLogic from './useQuotaManagementLogic';
import QuotaManagementTable from './QuotaManagementTable';
import Icon from '@mdi/react';
import { mdiFilterMenu } from '@mdi/js';
import ExportExcelButton from '../../../components/ExportExcelButton';

type Props = {};

let headers = ['Total Quotas', 'Landline', 'Cell', 'T2W', 'Panel'];
let subHeaders: string[] = ['Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'];

const QuotaManagement = (props: Props) => {
	const {
		selectedProject,
		setSelectedProject,
		visibleColumns,
		setVisibleColumns,
		isInternalUser,
		quotas,
		quotaDataIsFetching,
		showFilter,
		setShowFilter,
		toggleSubColumn,
		showMainColumnGroups,
		setShowMainColumnGroups,
		showSubColumnGroups,
		setShowSubColumnGroups,
		projectListOptions,
		filterRef,
	} = useQuotaManagementLogic();

	if (isInternalUser) {
		subHeaders.push('Fresh', 'G%', '%', 'S%', 'CG%');
	}

	const columnGroups = [
		{ key: 'total', label: 'Total Quota' },
		{ key: 'landline', label: 'Landline' },
		{ key: 'cell', label: 'Cell' },
		{ key: 't2w', label: 'T2W' },
		{ key: 'panel', label: 'Panel' },
	];

	const allColumnsActive = Object.values(visibleColumns).every(
		(col) =>
			col.active && Object.values(col.subColumns).every((subVal) => subVal)
	);

	return (
		<section className='quota-management section'>
			<h1>Quota Management Module</h1>
			<div className='quota-management-container'>
				<div className='quota-management-header header'>
					<div className='multi-select'>
						<Select
							className='quota-management-select'
							options={projectListOptions}
							value={
								projectListOptions.find(
									(opt) => opt.value === selectedProject
								) || null
							}
							onChange={(selected: any) => {
								setSelectedProject(selected ? selected.value : null);
							}}
							isDisabled={false}
							placeholder='Select...'
							isClearable
							closeMenuOnSelect={true}
						/>
					</div>

					<div
						className='filter-toggle-wrapper'
						style={{ position: 'relative' }}
						ref={filterRef}
					>
						<span
							className='view-toggle-span'
							onClick={() => setShowFilter((prev) => !prev)}
						>
							<Icon path={mdiFilterMenu} size={1} title='Options' />
						</span>

						{showFilter && (
							<div className='filter-popup'>
								<div className='filter-popup-group'>
									<strong>Toggle Everything</strong>
									<MyToggle
										label='All Columns'
										active={allColumnsActive}
										onClick={() => {
											setVisibleColumns((prev) => {
												const newState = {};
												for (const key in prev) {
													newState[key] = {
														active: !allColumnsActive,
														subColumns: {},
													};
													for (const subKey in prev[key].subColumns) {
														newState[key].subColumns[subKey] =
															!allColumnsActive;
													}
												}
												return newState;
											});
										}}
									/>
								</div>
								<div className='filter-popup-group all-subcolumns-toggle'>
									<strong>Toggle All Sub Columns</strong>
									<div className='filter-popup-subgroup'>
										{subHeaders.map((subKey) => (
											<MyToggle
												key={subKey}
												label={subKey}
												// Check if all are active for this subKey to toggle on/off all at once
												active={Object.values(visibleColumns).every(
													(col) => col.subColumns[subKey]
												)}
												onClick={() => {
													// Determine if we need to activate or deactivate this subKey for all
													const allActive = Object.values(visibleColumns).every(
														(col) => col.subColumns[subKey]
													);

													setVisibleColumns((prev) => {
														const newState = {};
														for (const key in prev) {
															newState[key] = {
																...prev[key],
																subColumns: {
																	...prev[key].subColumns,
																	[subKey]: !allActive, // toggle opposite of current allActive state
																},
															};
														}
														return newState;
													});
												}}
											/>
										))}
									</div>
								</div>
								<div
									className='filter-popup-arrow'
									onClick={() => setShowMainColumnGroups((prev) => !prev)}
								>
									<div className='filter-popup-arrow-line' />
									<div className='show-sub-groups-arrow'>
										{showMainColumnGroups ? '▼' : 'Main Groups ►'}
									</div>
								</div>

								{showMainColumnGroups &&
									columnGroups.map(({ key, label }) => (
										<div key={key} className='filter-popup-group'>
											<MyToggle
												label={label}
												active={visibleColumns[key].active}
												onClick={() =>
													setVisibleColumns((prev) => ({
														...prev,
														[key]: {
															...prev[key],
															active: !prev[key].active,
														},
													}))
												}
											/>
										</div>
									))}

								<div
									className='filter-popup-arrow'
									onClick={() => setShowSubColumnGroups((prev) => !prev)}
								>
									<div className='filter-popup-arrow-line' />
									<div className='show-sub-groups-arrow'>
										{showSubColumnGroups ? '▼' : 'Sub Groups ►'}
									</div>
								</div>

								{showSubColumnGroups &&
									columnGroups.map(({ key, label }) => (
										<div key={key} className='filter-popup-group'>
											<div>
												<strong>{label}</strong>
											</div>
											<div className='filter-popup-subgroup'>
												{subHeaders.map((subKey) => (
													<MyToggle
														key={subKey}
														label={subKey}
														active={visibleColumns[key].subColumns[subKey]}
														onClick={() => toggleSubColumn(key, subKey)}
													/>
												))}
											</div>
										</div>
									))}
							</div>
						)}
					</div>
				</div>
				<div className='quota-table-data-container'>
					<div className='quota-table-header'>
						<ExportExcelButton tableId={`${selectedProject}-quotas`} />
						{/* <table className='quota-table-legend'>
							<tbody>
								<tr>
									<td></td>
								</tr>
							</tbody>
						</table> */}
					</div>

					{quotas && !quotaDataIsFetching && (
						<QuotaManagementTable
							id={`${selectedProject}-quotas`}
							quotaData={quotas}
							headers={headers}
							subHeaders={subHeaders}
							visibleColumns={visibleColumns}
							isInternalUser={isInternalUser}
						/>
					)}
				</div>
			</div>
		</section>
	);
};

export default QuotaManagement;
