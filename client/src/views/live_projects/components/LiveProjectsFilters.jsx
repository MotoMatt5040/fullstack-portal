import React, { useMemo } from 'react';

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
	// Pre-compute Sets of valid project IDs (O(n) once instead of O(n) per button)
	const { validAllProjectIds, validFilteredProjectIds } = useMemo(() => {
		const allIds = new Set(allLiveProjects.data?.map((p) => p.projectid) || []);
		const filteredIds = new Set(filteredLiveProjects.data?.map((p) => p.projectid) || []);
		return { validAllProjectIds: allIds, validFilteredProjectIds: filteredIds };
	}, [allLiveProjects.data, filteredLiveProjects.data]);

	// Pre-compute Sets of valid locations (O(n) once instead of O(n) per button)
	const { validAllLocations, validFilteredLocations } = useMemo(() => {
		const allLocs = new Set(allLiveProjects.data?.map((p) => parseInt(p.recloc, 10)) || []);
		const filteredLocs = new Set(filteredLiveProjects.data?.map((p) => parseInt(p.recloc, 10)) || []);
		return { validAllLocations: allLocs, validFilteredLocations: filteredLocs };
	}, [allLiveProjects.data, filteredLiveProjects.data]);

	const isProjectIdDisabled = (id) => {
		return !validAllProjectIds.has(id) || !validFilteredProjectIds.has(id);
	};

	const isLocationDisabled = (recloc) => {
		const reclocInt = parseInt(recloc, 10);
		return !validAllLocations.has(reclocInt) || !validFilteredLocations.has(reclocInt);
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
