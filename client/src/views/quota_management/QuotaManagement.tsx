import React from 'react';
import Select from 'react-select';
import MyToggle from '../../components/MyToggle';

import './QuotaManagement.css';
import '../styles/Sections.css';
import '../styles/ViewToggles.css';
import '../styles/Containers.css';
import useQuotaManagementLogic from './useQuotaManagementLogic';
import QuotaManagementTable from './QuotaManagementTable';
import Icon from '@mdi/react';
import { mdiFilterMenu } from '@mdi/js';
import ExportExcelButton from '../../components/ExportExcelButton';

type Props = {};

// const options = [
// 	{ value: 13901, label: '13901' },
// 	{ value: 13902, label: '13902' },
// 	{ value: 13903, label: '13903' },
// ];

const headers = ['Total Quotas', 'Landline', 'Cell', 'T2W', 'Panel'];
const subHeaders = ['%', 'Obj', 'Freq', 'To Do'];

const QuotaManagement = (props: Props) => {
	const {
		selectedProject,
		setSelectedProject,
		visibleColumns,
		setVisibleColumns,
		internalUser,
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
	} = useQuotaManagementLogic();

	const columnGroups = [
		{ key: 'total', label: 'Total Quota' },
		{ key: 'landline', label: 'Landline' },
		{ key: 'cell', label: 'Cell' },
		{ key: 't2w', label: 'T2W' },
		{ key: 'panel', label: 'Panel' },
	];

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
								setSelectedProject(selected.value);
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
					>
						<span
							className='view-toggle-span'
							onClick={() => setShowFilter((prev) => !prev)}
						>
							<Icon path={mdiFilterMenu} size={1} title='Options' />
						</span>

						{showFilter && (
							<div className='filter-popup'>
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
				<div className='table-data-container'>
					<ExportExcelButton
						tableId={`${selectedProject}-table`}
						// fileName={`QuotaManagement_${selectedProject}.xlsx`}
					/>
					{selectedProject}
					{quotas && !quotaDataIsFetching && (
						<QuotaManagementTable
							id={`${selectedProject}-table`}
							quotaData={quotas}
							headers={headers}
							subHeaders={subHeaders}
							visibleColumns={visibleColumns}
							internalUser={internalUser}
						/>
					)}
				</div>
			</div>
		</section>
	);
};

export default QuotaManagement;
