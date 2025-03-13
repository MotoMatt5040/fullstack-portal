import React, { useState, useEffect } from 'react';
import LiveProjectsTable from './LiveProjectsTable';
import { setProjectData } from './liveProjectsSlice';
import {
	useGetLiveProjectDataQuery,
	useGetLiveProjectsQuery,
} from './liveProjectsApiSlice';
import { useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { isValidProjectID } from '../../utils/validators';

const LiveProjects = () => {
	const [searchParams] = useSearchParams();

	const projectidFromUrl = searchParams.get('projectid');
	const locationFromUrl = searchParams.get('location');

	const dispatch = useDispatch();

	const [projectid, setProjectid] = useState(projectidFromUrl || '');
	const [location, setLocation] = useState(locationFromUrl || '');
	const [isSuccess, setIsSuccess] = useState(false);

	const [locations, setLocations] = useState([]);
	const [projectids, setProjectids] = useState([]);

	const projectIDRegex = /^\d{5}C?$/;

	const {
		data: liveProjectData,
		isLoading: isProjectDataLoading,
		isError: isProjectDataError,
		error: projectDataError,
		refetch: refetchProjectData,
	} = useGetLiveProjectDataQuery({ projectid, location });

	const {
		data: liveProjects,
		isLoading: isProjectsLoading,
		isError: isProjectsError,
		error: projectssError,
		refetch: refetchProjects,
	} = useGetLiveProjectsQuery({ projectid, location });

	useEffect(() => {
		if (liveProjects) {
			const locationMap = liveProjects.reduce((acc, project) => {
				acc[project.recloc] = project.locationname;
				return acc;
			}, {});

			setLocations(locationMap);
			const distinctProjectIds = liveProjects.reduce((acc, project) => {
				if (!acc.includes(project.projectid)) {
					acc.push(project.projectid);
				}
				return acc;
			}, []);
			setProjectids(distinctProjectIds);
		}
	}, [liveProjects]);

	useEffect(() => {
		refetchProjects({ projectid, location });
    refetchProjectData({ projectid, location });
	}, [projectid, location]);

	let content = (
		<section>
			{/* <form onSubmit={handleSubmit}> */}
			<select value={projectid} onChange={(e) => setProjectid(e.target.value)}>
				<option value=''>Select a Project ID</option>
				{projectids.map((id) => (
					<option key={id} value={id}>
						{id}
					</option>
				))}
			</select>
			<select value={location} onChange={(e) => setLocation(e.target.value)}>
				<option value=''>Select a location</option>
				{Object.entries(locations).map(([recloc, locationname]) => (
					<option key={recloc} value={recloc}>
						{locationname}
					</option>
				))}
			</select>
			{/* <button type='submit'>Fetch Data</button> */}
			{/* </form> */}
			<button
				type='button'
				onClick={() => {
					setLocation('');
					setProjectid('');
				}}
			>
				Clear Filters
			</button>
			<br />
			<Link to='/welcome'>Back to Welcome</Link>
			{liveProjectData && <LiveProjectsTable data={liveProjectData} />}
		</section>
	);
	return content;
};

export default LiveProjects;
