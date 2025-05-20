import React from 'react';
import HoverableLabelCell from '../../components/MyHoverableCell';

type RowData = {
	Objective: number | string;
	Frequency: number | string;
	'%': number | string;
	'Stype%': number | string;
	'M%': number | string;
	'To Do': number | string;
	Label: string;
	StratumId: number;
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
		Freq: 'Frequency',
		'%': '%',
		'Stype%': 'Stype%',
		'M%': 'M%',
		'To Do': 'To Do',
	};

	const skipRowsByCriterion = [
		'TZONE',
		'VTYPE',
		'TFLAG',
		'PREL',
		'$a>4',
		'SOURCE',
		'$Q>0',
		'STYPE',
	];
	const skipRowsByLabel = ['Refuse'];

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
										.filter((sub) => visibleColumns[key]?.subColumns[sub])
										// Map over the filtered sub-columns to create table cells
										// Use the dataKeyMap to get the actual data key for each sub-column
										.map((sub) => {
											const actualDataKey = dataKeyMap[sub];
											return (
												<td key={`${group}-${header}-${sub}`}>
													{categoryData &&
													categoryData[actualDataKey] !== undefined &&
													categoryData[actualDataKey] !== 0
														? categoryData[actualDataKey]
														: '-'}
												</td>
											);
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

