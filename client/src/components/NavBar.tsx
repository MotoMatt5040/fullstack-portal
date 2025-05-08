import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Settings from '../views/settings/Settings';
import Icon from '@mdi/react';
import { mdiMenu } from '@mdi/js';
import './css/NavBar.css';

type Props = {
  onToggleNav: (visible: boolean) => void;
};

const NavBar: React.FC<Props> = ({ onToggleNav }) => {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const clickableRef = useRef<HTMLDivElement>(null);

  const toggleNav = () => {
    const newVisibility = !isNavVisible;
    setIsNavVisible(newVisibility);
    onToggleNav(newVisibility);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navRef.current &&
        !navRef.current.contains(event.target as Node) &&
        clickableRef.current &&
        !clickableRef.current.contains(event.target as Node)
      ) {
        setIsNavVisible(false);
        onToggleNav(false);
      }
    };

    if (isNavVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNavVisible, onToggleNav]);

  return (
    <aside className='navbar-container'>
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
          <li><Link to='/'>Home</Link></li>
          <li><Link to='/about'>About</Link></li>
          <li><Link to='/contact'>Contact</Link></li>
        </ul>
        <Settings />
      </nav>
    </aside>
  );
};

export default NavBar;
