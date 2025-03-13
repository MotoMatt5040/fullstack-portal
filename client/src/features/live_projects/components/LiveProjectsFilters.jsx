import React from 'react';

const LiveProjectsFilters = ({
	projectid,
	setProjectid,
	location,
	setLocation,
	projectids,
	locations,
	allLiveProjects,
	filteredLiveProjects,
}) => {
	const isProjectIdDisabled = (id) => {
		return (
			!allLiveProjects.data.some((project) => project.projectid === id) ||
			!filteredLiveProjects.data.some((project) => project.projectid === id)
		);
	};

	const isLocationDisabled = (recloc) => {
		const reclocInt = parseInt(recloc, 10);
		return (
			!allLiveProjects.data.some(
				(project) => parseInt(project.recloc, 10) === reclocInt
			) ||
			!filteredLiveProjects.data.some(
				(project) => parseInt(project.recloc, 10) === reclocInt
			)
		);
	};

	const handleProjectIdClick = (id) => {
		// If the same project ID is clicked, unselect it, otherwise select it
		setProjectid(projectid === id ? '' : id);
	};

	const handleLocationClick = (recloc) => {
		// If the same location is clicked, unselect it, otherwise select it
		setLocation(location === recloc ? '' : recloc);
	};

	return (
		<section>
			<div className='projectid-button-container'>
				{projectids.map((id) => (
					<button
						key={id}
						onClick={() => handleProjectIdClick(id)}
						className={`${projectid === id ? 'selected' : ''} ${
							isProjectIdDisabled(id) ? 'disabled' : ''
						}`}
						disabled={isProjectIdDisabled(id)}
					>
						{id}
					</button>
				))}
			</div>

			<div className='location-button-container'>
				{Object.entries(locations).map(([recloc, locationname]) => (
					<button
						key={recloc}
						onClick={() => handleLocationClick(recloc)}
						className={`${location === recloc ? 'selected' : ''} ${
							isLocationDisabled(recloc) ? 'disabled' : ''
						}`}
						disabled={isLocationDisabled(recloc)}
					>
						{locationname}
					</button>
				))}
			</div>
			<div className='clear-filters-container'>
				<button
					type='button'
					className='clear-filters'
					onClick={() => {
						setLocation('');
						setProjectid('');
					}}
				>
					Clear Filters
				</button>
			</div>
		</section>
	);
};

export default LiveProjectsFilters;
