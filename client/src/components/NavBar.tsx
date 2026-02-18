import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../features/auth/authSlice';
import { selectRoles } from '../features/roles/rolesSlice';
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
  mdiSwapHorizontal,
  mdiDatabaseCogOutline,
} from '@mdi/js';
import './css/NavBar.css';

type Props = {
  onToggleNav: (visible: boolean) => void;
};

const NavBar: React.FC<Props> = ({ onToggleNav }) => {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const token = useSelector(selectCurrentToken);
  const roles = useSelector(selectRoles) as Record<string, number>;

  const userRoles = useMemo(() => {
    if (!token) return [];
    try {
      const decoded = jwtDecode<{ UserInfo?: { roles?: number[] } }>(token);
      return decoded?.UserInfo?.roles ?? [];
    } catch {
      return [];
    }
  }, [token]);

  const hasRole = (allowedRoles: number[]) => {
    return allowedRoles.some((role) => userRoles.includes(role));
  };

  const navItems = useMemo(
    () => [
      { to: '/', icon: mdiHome, label: 'Home', visible: true },
      {
        to: '/quota-management',
        icon: mdiChartLine,
        label: 'Quota Report',
        visible: true,
      },
      {
        to: '/summary-report',
        icon: mdiFileDocumentOutline,
        label: 'Summary Report',
        visible: hasRole([
          roles.Admin,
          roles.Executive,
          roles.Manager,
          roles.Programmer,
        ]),
      },
      {
        to: '/disposition-report',
        icon: mdiFileDocumentOutline,
        label: 'Disposition Report',
        visible: true,
      },
      {
        to: '/sample-automation',
        icon: mdiCog,
        label: 'Sample Automation',
        visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
      },
      {
        to: '/sample-tracking',
        icon: mdiCog,
        label: 'Sample Tracking',
        visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
      },
      {
        to: '/extraction-defaults',
        icon: mdiCog,
        label: 'Extraction Defaults',
        visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
      },
      {
        to: '/header-mappings',
        icon: mdiSwapHorizontal,
        label: 'Header Mappings',
        visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
      },
      {
        to: '/call-id',
        icon: mdiPhone,
        label: 'Call ID Management',
        visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
      },
      {
        to: '/project-database',
        icon: mdiNumeric,
        label: 'Project Database',
        visible: hasRole([
          roles.Admin,
          roles.Executive,
          roles.Manager,
          roles.Programmer,
        ]),
      },
      {
        to: '/data-processing',
        icon: mdiDatabaseCogOutline,
        label: 'Data Processing',
        visible: hasRole([
          roles.Admin,
          roles.Executive,
          roles.Programmer,
          roles.DataProcessor,
        ]),
      },
      {
        to: '/ai-prompting',
        icon: mdiRobot,
        label: 'AI Prompting',
        visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
      },
      {
        to: '/user-management',
        icon: mdiAccountGroup,
        label: 'User Management',
        visible: hasRole([roles.Admin, roles.Executive]),
      },
      { to: '/github', icon: mdiGithub, label: 'Feedback', visible: true },
    ],
    [roles, userRoles],
  );

  // Memoize visible items filter
  const visibleItems = useMemo(
    () => navItems.filter((item) => item.visible),
    [navItems],
  );

  const toggleNav = useCallback(() => {
    setIsNavVisible((prev) => {
      const newVisibility = !prev;
      onToggleNav(newVisibility);
      return newVisibility;
    });
  }, [onToggleNav]);

  const closeNav = useCallback(() => {
    setIsNavVisible(false);
    onToggleNav(false);
  }, [onToggleNav]);

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

  // Hover handlers for desktop (memoized)
  const handleMouseEnter = useCallback(() => {
    if (window.innerWidth >= 769) {
      setIsNavVisible(true);
      onToggleNav(true);
    }
  }, [onToggleNav]);

  const handleMouseLeave = useCallback(() => {
    if (window.innerWidth >= 769) {
      setIsNavVisible(false);
      onToggleNav(false);
    }
  }, [onToggleNav]);

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
          aria-label='Toggle navigation menu'
          role='button'
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
        <ul role='menubar' aria-label='Main navigation'>
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <li key={item.to} role='none'>
                <Link
                  to={item.to}
                  onClick={closeNav}
                  className={isActive ? 'active' : ''}
                  role='menuitem'
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon path={item.icon} size={0.9} aria-hidden='true' />
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
