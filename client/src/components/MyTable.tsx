import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/MyTable.css';

type GradientColumn = {
  [key: string]: {
    direction: 'asc' | 'desc';
    ignoreZero: boolean;
  };
};

type HighlightColumnWithThreshold = {
	[key: string]: {
		backgroundColor: string;
		threshold: number;
		direction: 'asc' | 'desc';
		textColor: string;
	};
};

interface MyTableProps {
	data: Array<Record<string, any>>;
	columnKeyMap: Record<string, string>;

	includeHeader?: boolean;
	className?: string;
	clickParameters: string[];
	redirect?: boolean;
	linkTo?: string;
	reverseThresholds?: string[];
	isLive?: boolean;
	isClickable?: boolean;
	dataIsReady?: boolean;
	isEditable?: boolean;
	editableColumns?: string[];
	percentColumns?: string[];
	pc?: string[];
	gradientColumns?: GradientColumn;
	gc?: GradientColumn;

	singleColumnColor?: Record<string, string>; // key: column name, value: color
	scc?: Record<string, string>; // same as singleColumnColor if threshold is omitted

	highlightColumnWithThreshold?: HighlightColumnWithThreshold; // key: column name, value: { backgroundColor, threshold, direction, textColor }
	hcwt?: HighlightColumnWithThreshold; // same as highlightColumnWithThreshold if threshold is omitted
}

const MyTable: React.FC<MyTableProps> = ({
	data,
	columnKeyMap,
	clickParameters,
	redirect,
	linkTo,
	editableColumns,

	className = 'MyTable',
	includeHeader = true,
	reverseThresholds = [],
	isLive = false,
	isClickable = false,
	dataIsReady = false,
	isEditable = false,
	percentColumns = [],
	pc = [],
	gradientColumns = [],
	gc = [],
	singleColumnColor = [],
	scc = [],
	highlightColumnWithThreshold = [],
	hcwt = [],
}) => {
	const navigate = useNavigate();
	const columnHeaders = Object.keys(columnKeyMap);
	const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

	// This is just to allow abbreviate parameters in the props
	const _pc = percentColumns ?? pc ?? [];
	const _gc = gradientColumns ?? gc ?? [];
	const _scc = singleColumnColor ?? scc ?? [];
	const _hcwt = highlightColumnWithThreshold ?? hcwt ?? [];

	const [sortConfig, setSortConfig] = useState<
		{ key: string; direction: 'asc' | 'desc' }[]
	>([]);

	const handleSort = (header: string) => {
		const key = columnKeyMap[header];
		setSortConfig((prev) => {
			const existing = prev.find((s) => s.key === key);
			if (existing) {
				if (existing.direction === 'asc') {
					return prev.map((s) =>
						s.key === key ? { key, direction: 'desc' } : s
					);
				} else if (existing.direction === 'desc') {
					return prev.filter((s) => s.key !== key);
				}
			} else {
				return [...prev, { key, direction: 'asc' }];
			}
			return prev;
		});
	};

	const sortedData = [...data].sort((a, b) => {
		for (let { key, direction } of sortConfig) {
			const valA = a[key];
			const valB = b[key];
			if (valA !== valB) {
				if (typeof valA === 'number' && typeof valB === 'number') {
					return direction === 'asc' ? valA - valB : valB - valA;
				} else {
					return direction === 'asc'
						? String(valA).localeCompare(String(valB))
						: String(valB).localeCompare(String(valA));
				}
			}
		}
		return 0;
	});

	const getGradientStyle = (value: number, min: number, max: number, ignoreZero: boolean) => {
		if (value === 0 && ignoreZero) return;
		const percentage = ((value - min) / (max - min)) * 100;

		const interpolateColor = (
			start: [number, number, number],
			end: [number, number, number],
			factor: number
		) => {
			return start.map((startVal, i) =>
				Math.round(startVal + (end[i] - startVal) * factor)
			);
		};

		let color: [number, number, number];

		if (percentage <= 50) {
			// green → yellow
			const factor = percentage / 50;
			color = interpolateColor([99, 190, 123], [255, 235, 132], factor) as [
				number,
				number,
				number
			];
		} else {
			// yellow → red
			const factor = (percentage - 50) / 50;
			color = interpolateColor([255, 235, 132], [248, 105, 107], factor) as [
				number,
				number,
				number
			];
		}

		return {
			background: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
			color: 'black',
		};
	};

	const highlightCellColor = (
		cellValue: any,
		threshold: number,
		columnName: string
	) => {
		const isReversed = reverseThresholds.includes(columnName);

		if (isReversed) {
			if (cellValue > threshold * 1.1) {
				return 'highlight-red';
			} else if (cellValue > threshold * 0.95) {
				return 'highlight-yellow';
			} else if (cellValue < threshold * 0.9) {
				return 'highlight-green';
			}
		} else {
			if (cellValue < threshold * 0.9) {
				return 'highlight-red';
			} else if (cellValue < threshold * 0.95) {
				return 'highlight-yellow';
			} else if (cellValue > threshold * 1.1) {
				return 'highlight-green';
			}
		}
		return '';
	};

	const customHighlightCellColor = (
		cellValue: number,
		threshold: number,
		backgroundColor: string,
		direction: 'asc' | 'desc',
		textColor: string
	) => {
		if (direction === 'asc') {
			if (cellValue >= threshold) {
				return {background: backgroundColor, color: textColor}
			}
		} else if (direction === 'desc') {
			if (cellValue <= threshold) {
				return {background: backgroundColor, color: textColor}
			}
		}
		return '';
	};

	const handleRowClick = (row: any, index: number) => {
		// console.log(_gc);
		setActiveRowIndex(index);
		if (clickParameters && Array.isArray(clickParameters)) {
			const queryParams = clickParameters.reduce((acc, param) => {
				if (row[param]) {
					acc[param] = row[param];
				}
				return acc;
			}, {} as Record<string, string>);

			const queryString = new URLSearchParams(queryParams).toString();

			// Navigate to the provided link, appending the query string
			if (redirect) navigate(`${linkTo}?${queryString}`);
		}
	};

	return (
		<table className={className}>
			{includeHeader && (
				<thead>
					<tr>
						{columnHeaders.map((header) => (
							<th
								key={header}
								onClick={() => handleSort(header)}
								style={{ cursor: 'pointer' }}
							>
								{header}
								{(() => {
									const sortEntry = sortConfig.find(
										(sc) => sc.key === columnKeyMap[header]
									);
									if (!sortEntry) return null;
									return sortEntry.direction === 'asc' ? ' ▲' : ' ▼';
								})()}
							</th>
						))}
					</tr>
				</thead>
			)}
			<tbody>
				{!dataIsReady ? (
					<tr>
						<td colSpan={columnHeaders.length}>
							<div className='spinner-container'>
								<div className='spinner' />
							</div>
						</td>
					</tr>
				) : (
					sortedData.map((row, index) => (
						<tr
							key={index}
							className={index === activeRowIndex ? 'active' : ''}
							onClick={
								isClickable ? () => handleRowClick(row, index) : undefined
							}
							style={{ cursor: isClickable ? 'pointer' : 'default' }}
						>
							{columnHeaders.map((header) => {
								const key = columnKeyMap[header];
								const cellValue = row?.[key] ?? 'N/A';
								const thresholdKey = `${key}Threshold`;
								const threshold = row?.[thresholdKey];
								const cellClass = threshold
									? highlightCellColor(cellValue, threshold, key)
									: '';
								const blinkingClass = isLive ? 'blinking' : '';

								let style: React.CSSProperties = {};

								if (key in _gc) {
									const columnData = data.map((r) => r[key]);
									
									const min = Math.min(...columnData.filter((val) => val >= 0));
									const max = Math.max(...columnData);
									const ignoreZero = _gc[key]?.ignoreZero ?? false;
									style = {
										...style,
										...getGradientStyle(cellValue, min, max, ignoreZero),
									};
								}

								if (key in _hcwt) {
									style = {
										...style,
										...customHighlightCellColor(
											cellValue,
											_hcwt[key].threshold,
											_hcwt[key].backgroundColor,
											_hcwt[key].direction,
											_hcwt[key].textColor
										),
									}
								}

								return (
									<td
										// this is for automatic styling based on the parameters sent
										className={`${header} ${cellClass}  ${blinkingClass}} 
										`}
										key={header}
										style={style}
									>
										{cellValue}
										{_pc && _pc.includes(key) ? '%' : ''}
									</td>
								);
							})}
						</tr>
					))
				)}
			</tbody>
		</table>
	);
};

export default MyTable;
