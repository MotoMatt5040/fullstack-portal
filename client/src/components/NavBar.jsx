import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Settings from '../views/settings/Settings';
import './css/NavBar.css';

const NavBar = ({ onToggleNav }) => {
  const [isNavVisible, setIsNavVisible] = useState(false);

  const toggleNav = () => {
    const newState = !isNavVisible;
    setIsNavVisible(newState);
    onToggleNav(newState); // Notify parent Layout about visibility change
  };

  return (
    <section>
      {/* Hamburger Menu Button */}
      <button className="hamburger" onClick={toggleNav}>
        &#9776; {/* Hamburger icon */}
      </button>

      {/* Navbar, conditionally rendered */}
      <nav className={`navbar ${isNavVisible ? 'visible' : 'hidden'}`}>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
        <Settings />
      </nav>
    </section>
  );
};

export default NavBar;
