import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../../features/auth/authSlice';
import { useLogoutMutation } from '../../features/auth/authApiSlice';
import { toggleShowGraphs, toggleUseGpcph } from '../../features/settingsSlice';
import MyToggle from '../../components/MyToggle';
import MyRadioButton from '../../components/MyRadioButton';

const Settings = () => {
	const dispatch = useDispatch();
	const [logoutRequest] = useLogoutMutation();
	const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
	const showGraphs = useSelector((state) => state.settings.showGraphs);
	const useGpcph = useSelector((state) => state.settings.useGpcph);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	}, [theme]);

	const handleLogout = async () => {
		try {
			await logoutRequest(); 
			dispatch(logOut()); 
			localStorage.removeItem('token'); 
		} catch (err) {
			console.error('Logout failed:', err);
		}
	};

	const handleGraphToggle = () => {
		dispatch(toggleShowGraphs());
	};

	const handleGpcphToggle = () => {
		dispatch(toggleUseGpcph());
	};

	const handleThemeChange = (val) => {
		setTheme(val);
		localStorage.setItem('theme', val);
	};

	return (
		<section>
			<button onClick={handleLogout}>Log Out</button>
			<br />
			<MyRadioButton
				groupName='theme'
				labels={['Light Theme', 'Dark Theme', 'Super Dark Theme']}
				values={['light', 'dark', 'superdark']}
				selectedValue={theme}
				onChange={handleThemeChange}
			/>
			<MyToggle
				label='Show Graphs'
				active={showGraphs}
				onClick={handleGraphToggle}
			/>
			<MyToggle
				label='Use GPCPH'
				active={useGpcph}
				onClick={handleGpcphToggle}
			/>
		</section>
	);
};

export default Settings;
