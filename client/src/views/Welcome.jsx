import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../features/auth/authSlice';
import { selectRoles } from '../features/roles/rolesSlice';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom';
import Icon from '@mdi/react';
import {
  mdiChartLine,
  mdiFileDocumentOutline,
  mdiAccountGroup,
  mdiRobot,
  mdiPhone,
  mdiNumeric,
  mdiCog,
  mdiGithub,
} from '@mdi/js';

import '../views/Welcome.css';

const Welcome = () => {
  const token = useSelector(selectCurrentToken);
  const roles = useSelector(selectRoles);

  const userInfo = useMemo(() => {
    if (!token) return { userRoles: [], username: '' };

    try {
      const decoded = jwtDecode(token);
      const userRoles = decoded?.UserInfo?.roles ?? [];
      const username = decoded?.UserInfo?.username ?? '';

      return { userRoles, username };
    } catch (error) {
      console.error('Error decoding token:', error);
      return { userRoles: [], username: '' };
    }
  }, [token]);

  const hasRole = (allowedRoles) => {
    return allowedRoles.some((role) => userInfo.userRoles.includes(role));
  };

  const firstName = userInfo.username?.split('@')[0]?.split('.')[0] || 'User';
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const navItems = useMemo(() => [
    {
      to: '/quota-management',
      icon: mdiChartLine,
      label: 'Quota Report',
      color: '#3b82f6',
      visible: true,
    },
    {
      to: '/summary-report',
      icon: mdiFileDocumentOutline,
      label: 'Summary Report',
      color: '#8b5cf6',
      visible: hasRole([roles.Admin, roles.Executive, roles.Manager, roles.Programmer]),
    },
    {
      to: '/disposition-report',
      icon: mdiFileDocumentOutline,
      label: 'Disposition Report',
      color: '#06b6d4',
      visible: true,
    },
    {
      to: '/sample-automation',
      icon: mdiCog,
      label: 'Sample Automation',
      color: '#f59e0b',
      visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
    },
    {
      to: '/call-id',
      icon: mdiPhone,
      label: 'Call ID',
      color: '#10b981',
      visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
    },
    {
      to: '/project-numbering',
      icon: mdiNumeric,
      label: 'Project Numbering',
      color: '#ec4899',
      visible: hasRole([roles.Admin, roles.Executive, roles.Manager, roles.Programmer]),
    },
    {
      to: '/ai-prompting',
      icon: mdiRobot,
      label: 'AI Prompting',
      color: '#6366f1',
      visible: hasRole([roles.Admin, roles.Executive, roles.Programmer]),
    },
    {
      to: '/user-management',
      icon: mdiAccountGroup,
      label: 'User Management',
      color: '#14b8a6',
      visible: hasRole([roles.Admin, roles.Executive]),
    },
    {
      to: '/github',
      icon: mdiGithub,
      label: 'Feedback',
      color: '#64748b',
      visible: true,
    },
  ], [roles, userInfo.userRoles]);

  const visibleItems = navItems.filter(item => item.visible);

  return (
    <section className='welcome-container'>
      <div className='welcome-greeting'>
        <span className='greeting-text'>Hello, {capitalizedName}</span>
      </div>

      <nav className='welcome-grid'>
        {visibleItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className='welcome-tile'
            style={{ '--tile-color': item.color }}
          >
            <div className='tile-icon'>
              <Icon path={item.icon} size={1.5} />
            </div>
            <span className='tile-label'>{item.label}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
};

export default Welcome;
