import React, { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import { mdiViewList, mdiViewGrid } from '@mdi/js';

type Props = {};

const MyViewChange = () => {
	const [isListView, setIsListView] = useState<boolean>(false);
	const [viewIcon, setViewIcon] = useState(
		isListView ? (
			<Icon path={mdiViewGrid} size={1} />
		) : (
			<Icon path={mdiViewList} size={1} />
		)
	);

	useEffect(() => {
		if (isListView) setViewIcon(<Icon path={mdiViewGrid} size={1} />);
		else setViewIcon(<Icon path={mdiViewList} size={1} />);
	}, [isListView]);

	const handleViewChange = () => {
		setIsListView((prev) => !prev);
	};

	const content = (
		<span className='view-toggle-span' onClick={handleViewChange}>
			{viewIcon}
		</span>
	);

	return content;
};

export default MyViewChange;
