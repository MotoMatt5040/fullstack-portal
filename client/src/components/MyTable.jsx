import React from 'react';
import './css/MyTable.css';

const MyTable = ({className = 'MyTable', data, columnKeyMap}) => {

	const columnHeaders = Object.keys(columnKeyMap);

	return (
		<section>
			<table className={className}>
				<thead>
        <tr>
            {columnHeaders.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
				</thead>
				<tbody>
					{data.map((row, index) => (
						<tr key={index}>
							{columnHeaders.map((header) => {
								const key = columnKeyMap[header]; 
								return (
									<td key={header}>{row?.[key] ?? 'N/A'}</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</section>
	);
};

export default MyTable;
