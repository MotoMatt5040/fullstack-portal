import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector  } from 'react-redux';
import { logOut } from '../../features/auth/authSlice';
import { toggleShowGraphs } from '../../features/settingsSlice';
import MyToggle from '../../components/MyToggle';

const settings = () => {
	const dispatch = useDispatch();
	const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
	const showGraphs = useSelector((state) => state.settings.showGraphs);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	}, [theme]);

	const toggleTheme = () => {
		const newTheme = theme === 'dark' ? 'light' : 'dark';
		setTheme(newTheme);
		localStorage.setItem('theme', newTheme);
	};

	const handleLogout = () => {
		dispatch(logOut());
	};

	const handleGraphToggle = () => {
		dispatch(toggleShowGraphs());
	};

	return (
		<section>
			<button onClick={handleLogout}>Log Out</button>
			<br />
			<button className='theme-toggle' onClick={toggleTheme}>
				Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
			</button>
			<MyToggle label='Show Graphs' active={showGraphs} onClick={handleGraphToggle}/>
		</section>
	);
};

export default settings;
