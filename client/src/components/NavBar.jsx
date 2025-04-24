import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Settings from '../views/settings/Settings';
import './css/NavBar.css';

const NavBar = ({ onToggleNav }) => {
	const [isNavVisible, setIsNavVisible] = useState(false);
	const navRef = useRef(null); // Ref for navbar
	const buttonRef = useRef(null); // Ref for the hamburger button

	const toggleNav = () => {
		setIsNavVisible((prev) => !prev);
	};

	useEffect(() => {
		const handleClickOutside = (event) => {
			// Ensure the click is outside both navbar and the hamburger button
			if (
				navRef.current &&
				!navRef.current.contains(event.target) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target)
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
		<div>
			{/* Hamburger Menu Button */}
			<span className='navbar-span'>
				<button ref={buttonRef} className='hamburger' onClick={toggleNav}>
					&#9776; {/* Hamburger icon */}
				</button>

				{/* Navbar */}
				<nav
					ref={navRef}
					className={`navbar ${isNavVisible ? 'visible' : 'hidden'}`}
				>
					<ul>
						<li>
							<Link to='/'>Home</Link>
						</li>
						<li>
							<Link to='/about'>About</Link>
						</li>
						<li>
							<Link to='/contact'>Contact</Link>
						</li>
					</ul>
					<Settings />
				</nav>
			</span>
		</div>
	);
};

export default NavBar;
