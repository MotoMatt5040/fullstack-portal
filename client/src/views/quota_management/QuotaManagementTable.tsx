import React from 'react';
import HoverableLabelCell from '../../components/MyHoverableCell';

type RowData = {
	
	Objective: number | string;
	Frequency: number | string;
	'%': number | string;
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
		'M%': 'M%',
		'To Do': 'To Do',
	};

	const skipRows = ['TZONE', 'VTYPE', 'TFLAG', 'PREL', '$a>4', 'SOURCE'];

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
			<colgroup>
				<col className='col-label' />

				{visibleColumnGroups.map(({ key, subCols }) =>
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
					<th></th>
					{headers.map((header) => {
						const key = headerKeyMap[header];
						if (!visibleColumns[key]?.active) return null;

						const activeSubColsCount = subHeaders.filter(
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
					{headers.flatMap((header) => {
						const key = headerKeyMap[header];
						if (!visibleColumns[key]?.active) return [];

						return subHeaders
							.filter((sub) => visibleColumns[key]?.subColumns[sub])
							.map((sub) => <th key={`${header}-${sub}`}>{sub}</th>);
					})}
				</tr>
			</thead>
			<tbody>
				{groupKeys.map((group) => {
					if (!internalUser && skipRows.some((word) => group.includes(word))) {
						return null;
					}

					return (
						<tr key={group}>
							<HoverableLabelCell
								label={
									headers
										.map((h) => headerKeyMap[h])
										.map((key) => quotaData[group]?.[key]?.Label)
										.find((label) => label !== undefined) || group
								}
								popupText={group}
							/>
							{headers.flatMap((header) => {
								const key = headerKeyMap[header];
								if (!visibleColumns[key]?.active) return [];

								const categoryData = quotaData[group]?.[key];

								return subHeaders
									.filter((sub) => visibleColumns[key]?.subColumns[sub])
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
									});
							})}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};

export default QuotaManagementTable;
