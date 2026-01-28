import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiHomeOutline, mdiChevronRight } from '@mdi/js';
import './css/Breadcrumbs.css';

// Route label mappings
const routeLabels: Record<string, string> = {
  welcome: 'Home',
  'quota-management': 'Quota Management',
  'project-database': 'Project Database',
  'call-id': 'Call ID Management',
  'sample-automation': 'Sample Automation',
  'summary-report': 'Summary Report',
  'project-report': 'Project Report',
  'production-report': 'Production Report',
  'topline-report': 'Topline Report',
  'disposition-report': 'Disposition Report',
  'ai-prompting': 'AI Prompting',
  'project-publishing': 'Project Publishing',
  'user-management': 'User Management',
  adduser: 'Add User',
  users: 'Users',
  github: 'Report Issue',
  'contact-support': 'Contact Support',
  reports: 'Reports',
  settings: 'Settings',
};

// Routes that should not show breadcrumbs
const hiddenRoutes = ['/login', '/', '/reset-password', '/unauthorized'];

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation();

  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    // Don't show breadcrumbs on hidden routes
    if (hiddenRoutes.includes(location.pathname)) {
      return [];
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);

    // Don't show breadcrumbs if we're at the root protected route
    if (pathSegments.length === 0) {
      return [];
    }

    // Build breadcrumb items
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/welcome', isLast: false },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[segment] || formatSegment(segment);
      const isLast = index === pathSegments.length - 1;

      // Don't add duplicate "Home" if we're on /welcome
      if (segment === 'welcome' && index === 0) {
        items[0].isLast = isLast;
        return;
      }

      items.push({
        label,
        path: currentPath,
        isLast,
      });
    });

    // Mark the last item
    if (items.length > 0) {
      items[items.length - 1].isLast = true;
    }

    return items;
  }, [location.pathname]);

  // Don't render if no breadcrumbs or only home
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((item, index) => (
          <li key={item.path} className="breadcrumbs-item">
            {index > 0 && (
              <Icon
                path={mdiChevronRight}
                size={0.7}
                className="breadcrumbs-separator"
                aria-hidden="true"
              />
            )}
            {item.isLast ? (
              <span className="breadcrumbs-current" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link to={item.path} className="breadcrumbs-link">
                {index === 0 && (
                  <Icon
                    path={mdiHomeOutline}
                    size={0.65}
                    className="breadcrumbs-home-icon"
                  />
                )}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Helper to format segment names (fallback)
const formatSegment = (segment: string): string => {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default Breadcrumbs;
