import React from 'react';
import './liveProjectsTable.css';

const LiveProjectsDataTable = ({ data }) => {
	const handleCellClick = (eid) => {
		console.log('cell: ', eid);
	};

	const handleRowClick = (eid) => {
		console.log('row: ', eid);
	};

	return (
		<section>
			<table>
				<thead>
					<tr>
						<th>Location</th>
						<th>Project ID</th>
						<th>Project Name</th>
						<th>CPH</th>
						<th>CMS</th>
						<th>MPH</th>
						<th>HRS</th>
						<th>Avg. Len.</th>
					</tr>
				</thead>
				<tbody>
					{data.map((project) => (
							<tr key={project.projectid}>
								<td>{project.recloc === 99 ? "All" : project.recloc}</td>
								<td>{project.projectid}</td>
								<td>{project.projname}</td>
								<td>{project.cph}</td>
								<td>{project.cms}</td>
								<td>{project.mph}</td>
								<td>{project.hrs}</td>
								<td>{project.al}</td>
							</tr>
						)
					)}
				</tbody>
			</table>
		</section>
	);
};

export default LiveProjectsDataTable;
