import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../../features/auth/authSlice';
import {
	useLazyGetQuotasQuery,
	useGetProjectListQuery,
} from '../../features/quotasApiSlice';

const useQuotaManagementLogic = () => {
	const [getQuotas, { data: quotaData, isFetching: quotaDataIsFetching }] =
		useLazyGetQuotasQuery();
	const { data: projectList, isFetching: projectListIsFetching } =
		useGetProjectListQuery('');
	const [projectListOptions, setProjectListOptions] = useState([]);
	const [selectedProject, setSelectedProject] = useState<string>('');
	const [userRoles, setUserRoles] = useState<[]>([]);
	const [internalUser, setInternalUser] = useState(false);
	const token = useSelector(selectCurrentToken);
	const [showFilter, setShowFilter] = useState(false);
	const [showMainColumnGroups, setShowMainColumnGroups] = useState(false);
	const [showSubColumnGroups, setShowSubColumnGroups] = useState(false);
	const [quotas, setQuotas] = useState([]);
	const filterRef = useRef<HTMLDivElement>(null);
	// const [emptyStructures, setEmptyStructures] = useState([]);

	const columnGroups = [
		{ key: 'total', label: 'Total Quota' },
		{ key: 'landline', label: 'Landline' },
		{ key: 'cell', label: 'Cell' },
		{ key: 't2w', label: 'T2W' },
		{ key: 'panel', label: 'Panel' },
	];
	const [visibleColumns, setVisibleColumns] = useState(
		Object.fromEntries(
			columnGroups.map((group) => [
				group.key,
				{
					active: true,
					subColumns: {
						Obj: true,
						Freq: true,
						'G%': false,
						'%': false,
						'S%': false,
						'To Do': false,
					},
				},
			])
		)
	);

	useEffect(() => {
		if (!showFilter) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				filterRef.current &&
				!filterRef.current.contains(event.target as Node)
			) {
				setShowFilter(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showFilter]);

	useEffect(() => {
		// fetchData('13094');
		if (token) {
			try {
				const decoded: any = jwtDecode(token);
				const roles = decoded?.UserInfo?.roles ?? [];
				setUserRoles(roles);

				if (roles.includes(4)) {
					setInternalUser(false);
					// console.log('User is not internal');
				} else {
					setInternalUser(true);
					// console.log('User is internal');
				}
			} catch (err) {
				console.error('Invalid token', err);
			}
		}
	}, []);

	useEffect(() => {
		if (projectListIsFetching) return;
		// console.log(projectList)
		if (projectList && projectList.length > 0) {
			const options = projectList.map((item: any) => ({
				value: item.projectId,
				label: item.projectName,
			}));
			setProjectListOptions(options);
		} else {
			setProjectListOptions([]);
		}
	}, [projectList]);

	useEffect(() => {
		if (!quotaData) return;

		// console.log('Quotas data:', quotaData);
		// console.log(typeof quotaData);

		setQuotas(quotaData.mergedRows);
		// setEmptyStructures(quotaData.emptyStructures);

		const newVisibleColumns = Object.fromEntries(
			columnGroups.map((group) => [
				group.key,
				{
					...visibleColumns[group.key],
					active: !quotaData.emptyStructures[group.key], // active only if NOT empty
					// subColumns: {
					// 	Obj: true,
					// 	Freq: true,
					// 	'G%': false,
					// 	'%': false,
					// 	'S%': false,
					// 	'To Do': false,
					// },
				},
			])
		);

		setVisibleColumns(newVisibleColumns);

		// quotaData.map((item) => {
		// 	console.log('Item:', item);
		// });
	}, [quotaData]);

	useEffect(() => {
		if (selectedProject) {
			fetchData(selectedProject);
		} else {
			setQuotas([]);
		}
	}, [selectedProject]);

	const toggleSubColumn = (key: string, subKey: string) => {
	setVisibleColumns((prev) => {
		const updatedSubColumns = {
			...prev[key].subColumns,
			[subKey]: !prev[key].subColumns[subKey],
		};

		const anySubColumnActive = Object.values(updatedSubColumns).some(Boolean);

		return {
			...prev,
			[key]: {
				...prev[key],
				active: anySubColumnActive ? true : prev[key].active,
				subColumns: updatedSubColumns,
			},
		};
	});
};


	const fetchData = async (projectId: string) => {
		try {
			const res = await getQuotas({ projectId }).unwrap();
		} catch (error) {
			console.error('Error fetching quotas:', error);
		}
	};

	return {
		selectedProject,
		setSelectedProject,
		visibleColumns,
		setVisibleColumns,
		userRoles,
		internalUser,
		quotas,
		quotaDataIsFetching,
		showFilter,
		setShowFilter,
		toggleSubColumn,
		projectListOptions,
		showMainColumnGroups,
		setShowMainColumnGroups,
		showSubColumnGroups,
		setShowSubColumnGroups,
		filterRef,
	};
};

export default useQuotaManagementLogic;
