import React, { useState, useEffect } from 'react';
import LiveProjectsTable from './components/LiveProjectsTable';
import {
	useGetLiveProjectDataQuery,
	useGetAllLiveProjectsQuery,
	useGetFilteredLiveProjectsQuery,
} from './liveProjectsApiSlice';
import { useSearchParams, Link } from 'react-router-dom';
import LiveProjectsFilters from './components/LiveProjectsFilters';
import LiveProjectsSummaryTable from './components/LiveProjectsSummaryTable';

const LiveProjects = () => {
	// This helper is used to mitigate having to repeat the same logic for each query
	// Update the helper if you need to add more queries
	const queryHelper = (queryHook, params) => {
		const { data, refetch } = queryHook(params);
		return { data, refetch };
	};

	const [searchParams] = useSearchParams();

	const projectidFromUrl = searchParams.get('projectid');
	const locationFromUrl = searchParams.get('location');

	const [projectid, setProjectid] = useState(projectidFromUrl || '');
	const [location, setLocation] = useState(locationFromUrl || '');

	const [locations, setLocations] = useState([]);
	const [projectids, setProjectids] = useState([]);

	const [summaryData, setSummaryData] = useState([]);
	const [detailData, setDetailData] = useState([]);

	// These queries use the helper function to reduce the amount of code needed
	// to be written for each query
	const liveProjectData = queryHelper(useGetLiveProjectDataQuery, {
		projectid,
		location,
	});

	const filteredLiveProjects = queryHelper(useGetFilteredLiveProjectsQuery, {
		projectid,
		location,
	});

	const allLiveProjects = queryHelper(useGetAllLiveProjectsQuery);

	useEffect(() => {
		if (filteredLiveProjects.data && allLiveProjects.data) {
			const locationMap = allLiveProjects.data.reduce((acc, project) => {
				acc[project.recloc] = project.locationname;
				return acc;
			}, {});

			setLocations(locationMap);
			const distinctProjectIds = allLiveProjects.data.reduce((acc, project) => {
				if (!acc.includes(project.projectid)) {
					acc.push(project.projectid);
				}
				return acc;
			}, []);
			setProjectids(distinctProjectIds);
		}
	}, [filteredLiveProjects.data]);

	// useEffect(() => {
	// 	// console.log(allLiveProjects.data)

	// 	const filteredSummaryData = liveProjectData.data.filter(
	// 		(project) => project.recloc === 99
	// 	);
	// 	// console.log(filteredSummaryData)
	// 	setSummaryData(filteredSummaryData);

	// 	const filteredDetailData = liveProjectData.data.filter(
	// 		(project) => project.recloc !== 99
	// 	);
	// 	setDetailData(filteredDetailData);
	// }, [liveProjectData]);

	useEffect(() => {
		allLiveProjects.refetch();
		filteredLiveProjects.refetch();
		liveProjectData.refetch();
		const filteredSummaryData = liveProjectData.data.filter(
			(project) => project.recloc === 99
		);
		// console.log(filteredSummaryData)
		setSummaryData(filteredSummaryData);

		const filteredDetailData = liveProjectData.data.filter(
			(project) => project.recloc !== 99
		);
		setDetailData(filteredDetailData);
	}, [projectid, location]);

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
