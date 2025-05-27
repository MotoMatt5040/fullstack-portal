import React, { useState } from 'react';
import HoverableLabelCell from '../../components/MyHoverableCell';

type RowData = {
	Objective: number | string;
	'Obj%': number | string;
	Frequency: number | string;
	'Freq%': number | string;
	'G%': number | string;
	'%': number | string;
	'S%': number | string;
	'CG%': number | string;
	'C%': number | string;
	'To Do': number | string;
	Label: string;
	StratumId: number;
	TotalObjective: number | string;
};

type QuotaData = {
	[key: string]: {
		[category: string]: RowData;
	};
};

interface Props {
	id?: string;
	quotaData: QuotaData;
	headers: string[];
	subHeaders: string[];
	visibleColumns: Record<
		string,
		{
			active: boolean;
			subColumns: Record<string, boolean>;
		}
	>;
	internalUser?: boolean;
}

const QuotaManagementTable: React.FC<Props> = ({
	id,
	quotaData,
	headers,
	subHeaders,
	visibleColumns,
	internalUser = true,
}) => {
	const groupKeys = Object.keys(quotaData);
	const headerKeyMap: Record<string, string> = {
		'Total Quotas': 'total', //remove
		Landline: 'landline',
		Cell: 'cell',
		T2W: 't2w',
		Panel: 'panel',
	};

	const dataKeyMap: Record<string, keyof RowData> = {
		Obj: 'Objective',
		'Obj%': 'Obj%',
		Freq: 'Frequency',
		'Freq%': 'Freq%',
		'G%': 'G%',
		'%': '%',
		'S%': 'S%',
		'CG%': 'CG%',
		'To Do': 'To Do',
		TotalObjective: 'TotalObjective', // Special case for Total Quotas
	};

	const skipRowsByCriterion = [
		'TZONE',
		'VTYPE',
		'TFLAG',
		'PREL',
		// '$a>4',
		'SOURCE',
		// '$Q>0',
		'STYPE',
		'LNREL',
		'CNREL',
		'>'
	];
	const skipRowsByLabel = ['Sample']; //['Refuse'];

	const [hovered, setHovered] = useState<{
		groupKey: string;
		headerKey: string;
		subKey: string;
	} | null>(null);

	const [hoverUpdated, setHoverUpdated] = useState(false);

	// A lot of very complex stuff is happening in this file. Please read the comment carefully to understand.

	// Build an array of visible column groups with their active sub-columns
	const visibleColumnGroups = headers
		.map((header) => {
			const key = headerKeyMap[header];
			if (!visibleColumns[key]?.active) return null;

			const activeSubCols = subHeaders.filter(
				(sub) => visibleColumns[key]?.subColumns[sub]
			);

			if (activeSubCols.length === 0) return null;

			return {
				key,
				subCols: activeSubCols,
			};
		})
		.filter(Boolean) as { key: string; subCols: string[] }[];

	return (
		<table id={id} className='quota-management-table'>
			{/* Define column widths and styling for each visible sub-column */}
			<colgroup>
				<col className='col-label' />

				{visibleColumnGroups.map(({ key, subCols }) =>
					// Map over the sub-columns to create col elements with specific classes
					// The last column in each group gets a special class
					subCols.map((_, i) => (
						<col
							key={`${key}-col-${i}`}
							className={`col-${key} ${
								i === subCols.length - 1 ? 'last-col' : ''
							}`}
						/>
					))
				)}
			</colgroup>
			<thead>
				<tr>
					<th />
					{/* Render top-level headers with colSpan based on active sub-columns. Don't delete the blank th above. It's used as a spacer for Label*/}
					{headers.map((header) => {
						const key = headerKeyMap[header];
						// Check if the column is active and has sub-columns
						// If not, return null
						if (!visibleColumns[key]?.active) return null;

						const activeSubColsCount = subHeaders.filter(
							// Filter sub-columns based on visibility
							// Check if the sub-column is active in the visibleColumns object
							(sub) => visibleColumns[key]?.subColumns[sub]
						).length;

						if (activeSubColsCount === 0) return null;

						return (
							<th key={header} colSpan={activeSubColsCount}>
								{header}
							</th>
						);
					})}
				</tr>
				<tr>
					<th>Label</th>
					{/* Render sub-column headers under each top-level header */}
					{headers.flatMap((header) => {
						const key = headerKeyMap[header];
						if (!visibleColumns[key]?.active) return [];

						return (
							subHeaders
								// Filter sub-columns based on visibility
								.filter((sub) => visibleColumns[key]?.subColumns[sub])
								// Map over the filtered sub-columns to create table header cells
								.map((sub) => <th key={`${header}-${sub}`}>{sub}</th>)
						);
					})}
				</tr>
			</thead>
			<tbody>
				{/* Render a row for each group, skipping hidden rows based on criteria */}
				{groupKeys.map((group) => {
					{
						/* Skip rows based on criteria or labels if internalUser is false */
					}

					const criterionMatched = skipRowsByCriterion.some((word) =>
						group.includes(word)
					);
					// Check if any of the labels in the group match the skipRowsByLabel criteria
					// This is a bit tricky because quotaData[group] is an object with keys as sub-columns
					const labelMatched = Object.values(quotaData[group] || {}).some(
						(item) => skipRowsByLabel.some((word) => item.Label?.includes(word))
					);

					// If internalUser is false, skip rows that match the criteria or labels
					if (!internalUser && (criterionMatched || labelMatched)) {
						// console.log(quotaData[group]);
						return null;
					}

					return (
						<tr key={group}>
							{/* First cell is a hoverable label from the first found label in the group */}
							<HoverableLabelCell
								label={
									// Find the first label that is not undefined
									headers
										.map((h) => headerKeyMap[h])
										.map((key) => quotaData[group]?.[key]?.Label)
										.find((label) => label !== undefined) || group
								}
								popupText={group}
							/>
							{/* Render data cells for each active sub-column under visible headers */}
							{headers.flatMap((header) => {
								const key = headerKeyMap[header];
								// Check if the column is active and has sub-columns
								// If not, return an empty array
								if (!visibleColumns[key]?.active) return [];

								// Get the data for the current group and key
								const categoryData = quotaData[group]?.[key];

								return (
									subHeaders
										// Filter sub-columns based on visibility
										.filter(
											(subColumn) => visibleColumns[key]?.subColumns[subColumn]
										)
										// Map over the filtered sub-columns to create table cells
										// Use the dataKeyMap to get the actual data key for each sub-column
										.map((subColumn) => {
											const firstGroup = groupKeys[0]; // Get the first group key from all groups (used for special highlight on first group)

											// Check if the currently hovered group matches this cell's group (row)
											const isSameGroup = hovered?.groupKey === group;
											// Check if the currently hovered header matches this cell's header (column)
											const isSameHeader = hovered?.headerKey === header;

											// Hovered subKey checks
											const isHoveringObjP = hovered?.subKey === 'Obj%';
											const isHoveringFreqP = hovered?.subKey === 'Freq%';
											const isHoveringP = hovered?.subKey === '%';
											const isHoveringG = hovered?.subKey === 'G%';
											const isHoveringS = hovered?.subKey === 'S%';
											const isHoveringCG = hovered?.subKey === 'CG%';

											const totalHeader = 'Total Quotas'; // The header name of the 'Total' column

											// Tooltip text for the cell

											// Highlight 'Freq' if:
											// - in same group and header
											// - and hovering %, G%, or S%
											// - and this cell is the Freq row
											const highlightFreq =
												// Normal highlight logic (same group & header)
												((isSameGroup &&
													isSameHeader &&
													(isHoveringP ||
														isHoveringS ||
														isHoveringG ||
														isHoveringCG ||
														isHoveringFreqP ||
													isHoveringObjP)) ||
													(hovered?.groupKey === firstGroup &&
														group === firstGroup &&
														header === totalHeader &&
														isHoveringFreqP) ||
													// hovering CG% on Total → highlight Freq
													(isSameGroup &&
														header === totalHeader &&
														isHoveringCG) ||
													(group === firstGroup &&
														isSameHeader &&
														isHoveringFreqP)) &&
												subColumn === 'Freq';

											// Highlight 'Obj' if:
											// - (1) same group, header is 'Total Quotas', and hovering 'G%'
											// - (2) first group and same header and hovering 'S%'
											// - (3) same group and header, and hovering '%'
											const highlightObj =
												((isSameGroup &&
													header === totalHeader &&
													isHoveringG) ||
													(group === firstGroup &&
														isSameHeader &&
														isHoveringS) ||
													(group === firstGroup &&
														isSameHeader &&
														isHoveringObjP) ||
													(isSameGroup && isSameHeader && isHoveringP) 
													// ||
													// (isSameGroup && isSameHeader && isHoveringObjP)
												) &&
												subColumn === 'Obj';

											// Final highlight decision
											const highlight = highlightFreq || highlightObj;
											const theme = localStorage.getItem('theme');
											const highlightBg =
												theme === 'light' ? '#b3e5fc' : '#1565c0';

											let dataColumn = subColumn;
											if ((header === 'Total Quotas' || group === 'total') && subColumn === 'Obj') {
												dataColumn = 'TotalObjective';
											}

											const cellData =
												categoryData &&
												categoryData[dataKeyMap[dataColumn]] !== undefined &&
												categoryData[dataKeyMap[dataColumn]] !== 0
													? categoryData[dataKeyMap[dataColumn]]
													: '-';

											let tooltipText: string = '';
											if (isHoveringP)
												tooltipText = `${group} ${header} Frequency by ${group} ${header} Objective`;
											else if (isHoveringS)
												tooltipText = `${group} ${header} Frequency by ${header} Objective`;
											else if (isHoveringG)
												tooltipText = `${group} ${header} Frequency by Total ${group} Objective`;
											else if (isHoveringCG)
												tooltipText = `${group} ${header} Frequency by ${group} Total Frequency`;
											else tooltipText = `${subColumn} - ${header} (${group})`;
											let fColor: string = '';
											if (cellData < 0) {
												fColor = 'red';
											}
											const content = (
												<td
													key={`${group}-${header}-${subColumn}`} // Unique key for React rendering
													onMouseEnter={() => {
														// Set hover context for group/header/sub on mouse enter
														setHovered({
															groupKey: group,
															headerKey: header,
															subKey: subColumn,
														});
													}}
													onMouseLeave={() => setHovered(null)} // Clear hover on leave
													style={{
														cursor: 'pointer',
														backgroundColor: highlight ? highlightBg : '',
														// color: highlight ? '#3CB371' : undefined,
														fontWeight: highlight ? 'bold' : undefined,
													}}
												>
													<span title={tooltipText} style={{ color: fColor }}>
														{cellData}
													</span>
												</td>
											);

											return content;
										})
								);
							})}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};

export default QuotaManagementTable;
