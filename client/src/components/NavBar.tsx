import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../features/auth/authSlice';
import { jwtDecode } from 'jwt-decode';
import Settings from '../views/settings/Settings';
import Icon from '@mdi/react';
import {
  mdiMenu,
  mdiHome,
  mdiChartLine,
  mdiFileDocumentOutline,
  mdiAccountGroup,
  mdiRobot,
  mdiPhone,
  mdiNumeric,
  mdiCog,
  mdiGithub,
} from '@mdi/js';
import './css/NavBar.css';

type Props = {
  onToggleNav: (visible: boolean) => void;
};

const EXTERNAL_ROLE_ID = 4;

const NavBar: React.FC<Props> = ({ onToggleNav }) => {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const token = useSelector(selectCurrentToken);

  const userInfo = useMemo(() => {
    if (!token) return { isInternalUser: true };
    try {
      const decoded = jwtDecode<{ UserInfo?: { roles?: number[] } }>(token);
      const roles = decoded?.UserInfo?.roles ?? [];
      return { isInternalUser: !roles.includes(EXTERNAL_ROLE_ID) };
    } catch {
      return { isInternalUser: true };
    }
  }, [token]);

  const navItems = [
    { to: '/', icon: mdiHome, label: 'Home', visible: true },
    { to: '/quota-management', icon: mdiChartLine, label: 'Quota Report', visible: true },
    { to: '/summary-report', icon: mdiFileDocumentOutline, label: 'Summary Report', visible: userInfo.isInternalUser },
    { to: '/disposition-report', icon: mdiFileDocumentOutline, label: 'Disposition Report', visible: true },
    { to: '/sample-automation', icon: mdiCog, label: 'Sample Automation', visible: userInfo.isInternalUser },
    { to: '/call-id', icon: mdiPhone, label: 'Call ID Management', visible: userInfo.isInternalUser },
    { to: '/project-numbering', icon: mdiNumeric, label: 'Project Numbering', visible: userInfo.isInternalUser },
    { to: '/ai-prompting', icon: mdiRobot, label: 'AI Prompting', visible: userInfo.isInternalUser },
    { to: '/user-management', icon: mdiAccountGroup, label: 'User Management', visible: userInfo.isInternalUser },
    { to: '/github', icon: mdiGithub, label: 'Feedback', visible: true },
  ];

  const visibleItems = navItems.filter(item => item.visible);

  const toggleNav = () => {
    const newVisibility = !isNavVisible;
    setIsNavVisible(newVisibility);
    onToggleNav(newVisibility);
  };

  const closeNav = () => {
    setIsNavVisible(false);
    onToggleNav(false);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        navRef.current &&
        !navRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeNav();
      }
    };

    if (isNavVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNavVisible, onToggleNav]);

  // Hover handlers for desktop
  const handleMouseEnter = () => {
    if (window.innerWidth >= 769) {
      setIsNavVisible(true);
      onToggleNav(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 769) {
      setIsNavVisible(false);
      onToggleNav(false);
    }
  };

  return (
    <>
      <aside
        ref={containerRef}
        className='navbar-container'
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`navbar-clickable-area ${isNavVisible ? 'open' : ''}`}
          onClick={toggleNav}
          aria-label="Toggle navigation menu"
          role="button"
          tabIndex={0}
        >
          <Icon path={mdiMenu} size={1.5} className='hamburger-icon' />
        </div>
      </aside>

      {/* Overlay */}
      <div
        className={`navbar-overlay ${isNavVisible ? 'visible' : ''}`}
        onMouseDown={closeNav}
      />

      {/* Slide-out Navigation */}
      <nav
        ref={navRef}
        className={`navbar ${isNavVisible ? 'visible' : 'hidden'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <ul role="menubar" aria-label="Main navigation">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to} role="none">
                <Link
                  to={item.to}
                  onClick={closeNav}
                  className={isActive ? 'active' : ''}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon path={item.icon} size={0.9} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Settings />
      </nav>
    </>
  );
};

export default NavBar;
