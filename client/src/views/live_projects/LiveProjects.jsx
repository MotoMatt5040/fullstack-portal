import React, { useState, useMemo } from 'react';
import LiveProjectsTable from './components/LiveProjectsTable';
import {
	useGetLiveProjectDataQuery,
	useGetAllLiveProjectsQuery,
	useGetFilteredLiveProjectsQuery,
} from './liveProjectsApiSlice';
import { useSearchParams, Link } from 'react-router-dom';
import LiveProjectsFilters from './components/LiveProjectsFilters';
import LiveProjectsSummaryTable from './components/LiveProjectsSummaryTable';
import MyPieChart from '../../components/MyPieChart';

const LiveProjects = () => {
	const [searchParams] = useSearchParams();

	const projectidFromUrl = searchParams.get('projectid');
	const locationFromUrl = searchParams.get('location');

	const [projectid, setProjectid] = useState(projectidFromUrl || '');
	const [location, setLocation] = useState(locationFromUrl || '');

	// RTK Query hooks - auto-refetch when params change (no manual refetch needed)
	const liveProjectData = useGetLiveProjectDataQuery({ projectid, location });
	const filteredLiveProjects = useGetFilteredLiveProjectsQuery({ projectid, location });
	// allLiveProjects only needs to be fetched once (no filter params)
	const allLiveProjects = useGetAllLiveProjectsQuery();

	// Derive locations and projectids from allLiveProjects data (O(n) once, not on every render)
	const { locations, projectids } = useMemo(() => {
		if (!allLiveProjects.data) {
			return { locations: {}, projectids: [] };
		}
		const locationMap = {};
		const projectIdSet = new Set();
		for (const project of allLiveProjects.data) {
			locationMap[project.recloc] = project.locationname;
			projectIdSet.add(project.projectid);
		}
		return {
			locations: locationMap,
			projectids: Array.from(projectIdSet),
		};
	}, [allLiveProjects.data]);

	// Derive summary and detail data from liveProjectData (avoids useEffect + setState)
	const { summaryData, detailData } = useMemo(() => {
		if (!liveProjectData.data) {
			return { summaryData: [], detailData: [] };
		}
		return {
			summaryData: liveProjectData.data.filter((p) => p.recloc === 99),
			detailData: liveProjectData.data.filter((p) => p.recloc !== 99),
		};
	}, [liveProjectData.data]);


	let content = (
		<section>
			<LiveProjectsFilters
				projectid={projectid}
				setProjectid={setProjectid}
				location={location}
				setLocation={setLocation}
				projectids={projectids}
				locations={locations}
				allLiveProjects={allLiveProjects}
				filteredLiveProjects={filteredLiveProjects}
			/>
			<br />
			<Link to='/welcome'>Back to Welcome</Link>
			{summaryData && (
				<LiveProjectsSummaryTable data={summaryData} />
			)}
			{detailData && (
				<LiveProjectsTable data={detailData} />
			)}
		</section>
	);
	return content;
};

export default LiveProjects;
