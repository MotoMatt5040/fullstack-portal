import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Settings from '../views/settings/Settings';
import Icon from '@mdi/react';
import { mdiMenu } from '@mdi/js';
import './css/NavBar.css';

const NavBar = ({ onToggleNav }) => {
	const [isNavVisible, setIsNavVisible] = useState(false);
	const navRef = useRef(null); 
	const clickableRef = useRef(null); 

	const toggleNav = () => {
		setIsNavVisible((prev) => !prev);
	};

	useEffect(() => {
		const handleClickOutside = (event) => {
			// Ensure the click is outside both navbar and the hamburger button
			if (
				navRef.current &&
				!navRef.current.contains(event.target) &&
				clickableRef.current &&
				!clickableRef.current.contains(event.target)
			) {
				setIsNavVisible(false);
				onToggleNav(false);
			}
		};

		if (isNavVisible) {
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			document.removeEventListener('mousedown', handleClickOutside);
		}

		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isNavVisible, onToggleNav]);

	return (
		<aside className='navbar-container'>
			{/* <div className='navbar-content'> */}
			<div
				ref={clickableRef}
				className={`navbar-clickable-area ${isNavVisible ? 'open' : ''}`}
				onClick={toggleNav}
			>
				<Icon path={mdiMenu} size={1.5} className='hamburger-icon' />
			</div>

			<nav
				ref={navRef}
				className={`navbar ${isNavVisible ? 'visible' : 'hidden'}`}
			>
				<ul>
					<Link to='/'>
						<li>Home</li>
					</Link>
					<Link to='/about'>
						<li>About</li>
					</Link>
					<Link to='/contact'>
						<li>Contact</li>
					</Link>
				</ul>
				<Settings />
			</nav>
			{/* </div> */}
		</aside>
	);
};

export default NavBar;
