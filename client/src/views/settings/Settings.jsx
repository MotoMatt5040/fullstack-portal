import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { logOut } from '../../features/auth/authSlice';

const settings = () => {
  
  const dispatch = useDispatch();
	const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  

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
}

	return (
		<section>
      <button onClick={handleLogout}>Log Out</button>
			<br />
			<button className='theme-toggle' onClick={toggleTheme}>
				Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
			</button>
		</section>
	);
};

export default settings;
