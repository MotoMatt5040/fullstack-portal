import React from 'react';
import Icon from '@mdi/react';
import {
  mdiAccountCircle,
  mdiMapMarker,
  mdiClock,
  mdiRefresh,
  mdiCircle,
} from '@mdi/js';
import { useGetOnlineUsersQuery } from '../../features/notificationsApiSlice';
import './OnlineUsers.css';

// Map routes to friendly page names
const getPageName = (path: string): string => {
  const pageMap: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/sample-automation': 'Sample Automation',
    '/sample-automation/defaults': 'Extraction Defaults',
    '/user-management': 'User Management',
    '/project-numbering': 'Project Numbering',
    '/quota-management': 'Quota Management',
    '/callid': 'Call ID',
    '/reports': 'Reports',
    '/disposition-report': 'Disposition Report',
    '/project-info': 'Project Info',
    '/project-publishing': 'Project Publishing',
    '/settings': 'Settings',
  };

  // Check for exact match first
  if (pageMap[path]) return pageMap[path];

  // Check for partial matches (for dynamic routes)
  for (const [route, name] of Object.entries(pageMap)) {
    if (path.startsWith(route) && route !== '/') {
      return name;
    }
  }

  return path;
};

// Format time ago
const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

const OnlineUsers: React.FC = () => {
  const { data, isLoading, refetch } = useGetOnlineUsersQuery(undefined, {
    pollingInterval: 10000, // Poll every 10 seconds
  });

  const users = data?.users || [];

  return (
    <div className="online-users">
      <div className="online-users-header">
        <h2 className="online-users-title">
          <Icon path={mdiCircle} size={0.5} className="online-indicator" />
          Online Now
          <span className="online-users-count">{users.length}</span>
        </h2>
        <button
          onClick={() => refetch()}
          className="online-users-refresh"
          title="Refresh"
        >
          <Icon path={mdiRefresh} size={0.75} />
        </button>
      </div>

      <div className="online-users-content">
        {isLoading ? (
          <div className="online-users-loading">Loading...</div>
        ) : users.length === 0 ? (
          <div className="online-users-empty">No users currently online</div>
        ) : (
          <div className="online-users-list">
            {users.map((user) => (
              <div key={user.clientId} className="online-user-card">
                <div className="online-user-avatar">
                  <Icon path={mdiAccountCircle} size={1.25} />
                  <span className="online-user-status" />
                </div>
                <div className="online-user-info">
                  <div className="online-user-name">{user.username}</div>
                  <div className="online-user-details">
                    <span className="online-user-page">
                      <Icon path={mdiMapMarker} size={0.5} />
                      {getPageName(user.currentPage)}
                    </span>
                    <span className="online-user-time">
                      <Icon path={mdiClock} size={0.5} />
                      {getTimeAgo(user.connectedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineUsers;
