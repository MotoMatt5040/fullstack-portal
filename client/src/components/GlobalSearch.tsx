import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Icon from '@mdi/react';
import {
  mdiMagnify,
  mdiFileDocumentOutline,
  mdiChartBoxOutline,
  mdiAccountGroupOutline,
  mdiCogOutline,
  mdiHomeOutline,
  mdiDatabaseOutline,
  mdiPhoneOutline,
  mdiRobotOutline,
  mdiEmailOutline,
  mdiFileChartOutline,
  mdiAlertCircleOutline,
} from '@mdi/js';
import { selectRoles } from '../features/roles/rolesSlice';
import { selectCurrentToken } from '../features/auth/authSlice';
import { jwtDecode } from 'jwt-decode';
import './css/GlobalSearch.css';

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  path: string;
  category: 'pages' | 'reports' | 'tools' | 'admin';
  keywords: string[];
  roles?: number[];
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const roles = useSelector(selectRoles);
  const token = useSelector(selectCurrentToken);

  // Get current user's roles
  const userRoles = useMemo(() => {
    if (!token) return [];
    try {
      const decoded: any = jwtDecode(token);
      return decoded?.UserInfo?.roles || [];
    } catch {
      return [];
    }
  }, [token]);

  // Define all searchable items
  const allItems: SearchItem[] = useMemo(
    () => [
      // Pages
      {
        id: 'welcome',
        title: 'Welcome',
        subtitle: 'Dashboard home page',
        icon: mdiHomeOutline,
        path: '/welcome',
        category: 'pages',
        keywords: ['home', 'dashboard', 'start'],
      },
      {
        id: 'quota-management',
        title: 'Quota Management',
        subtitle: 'Manage project quotas',
        icon: mdiChartBoxOutline,
        path: '/quota-management',
        category: 'pages',
        keywords: ['quota', 'quotas', 'management', 'targets'],
      },
      {
        id: 'project-numbering',
        title: 'Project Database',
        subtitle: 'Manage project numbers and details',
        icon: mdiDatabaseOutline,
        path: '/project-numbering',
        category: 'pages',
        keywords: ['project', 'database', 'numbering', 'projects'],
        roles: [roles.Admin, roles.Executive, roles.Manager, roles.Programmer],
      },
      {
        id: 'call-id',
        title: 'Call ID Management',
        subtitle: 'Manage caller IDs and assignments',
        icon: mdiPhoneOutline,
        path: '/call-id',
        category: 'tools',
        keywords: ['call', 'caller', 'id', 'phone', 'numbers'],
        roles: [roles.Admin, roles.Executive, roles.Programmer],
      },
      {
        id: 'sample-automation',
        title: 'Sample Automation',
        subtitle: 'Automate sample processing',
        icon: mdiCogOutline,
        path: '/sample-automation',
        category: 'tools',
        keywords: ['sample', 'automation', 'auto', 'process'],
        roles: [roles.Admin, roles.Executive, roles.Programmer],
      },
      // Reports
      {
        id: 'summary-report',
        title: 'Summary Report',
        subtitle: 'View summary statistics',
        icon: mdiFileDocumentOutline,
        path: '/summary-report',
        category: 'reports',
        keywords: ['summary', 'report', 'statistics', 'stats'],
        roles: [roles.Admin, roles.Executive, roles.Manager, roles.Programmer],
      },
      {
        id: 'project-report',
        title: 'Project Report',
        subtitle: 'Detailed project reports',
        icon: mdiFileChartOutline,
        path: '/project-report',
        category: 'reports',
        keywords: ['project', 'report', 'details'],
        roles: [roles.Admin, roles.Executive, roles.Manager, roles.Programmer],
      },
      {
        id: 'production-report',
        title: 'Production Report',
        subtitle: 'Production statistics and metrics',
        icon: mdiChartBoxOutline,
        path: '/production-report',
        category: 'reports',
        keywords: ['production', 'report', 'metrics', 'output'],
        roles: [roles.Admin, roles.Executive, roles.Manager, roles.Programmer],
      },
      {
        id: 'topline-report',
        title: 'Topline Report',
        subtitle: 'Topline survey results',
        icon: mdiFileDocumentOutline,
        path: '/topline-report',
        category: 'reports',
        keywords: ['topline', 'report', 'results', 'survey'],
      },
      {
        id: 'disposition-report',
        title: 'Disposition Report',
        subtitle: 'Call disposition statistics',
        icon: mdiFileDocumentOutline,
        path: '/disposition-report',
        category: 'reports',
        keywords: ['disposition', 'report', 'calls', 'outcomes'],
      },
      // Tools
      {
        id: 'ai-prompting',
        title: 'AI Prompting',
        subtitle: 'AI-assisted prompting tools',
        icon: mdiRobotOutline,
        path: '/ai-prompting',
        category: 'tools',
        keywords: ['ai', 'prompting', 'artificial', 'intelligence', 'gpt'],
        roles: [roles.Admin, roles.Executive, roles.Programmer],
      },
      {
        id: 'project-publishing',
        title: 'Project Publishing',
        subtitle: 'Publish project data',
        icon: mdiFileDocumentOutline,
        path: '/project-publishing',
        category: 'tools',
        keywords: ['publish', 'publishing', 'project'],
        roles: [roles.Admin, roles.Executive, roles.Programmer],
      },
      {
        id: 'github',
        title: 'Report Issue',
        subtitle: 'Submit a bug report or feature request',
        icon: mdiAlertCircleOutline,
        path: '/github',
        category: 'tools',
        keywords: ['github', 'issue', 'bug', 'report', 'feature', 'request'],
      },
      {
        id: 'contact-support',
        title: 'Contact Support',
        subtitle: 'Get help and support',
        icon: mdiEmailOutline,
        path: '/contact-support',
        category: 'tools',
        keywords: ['contact', 'support', 'help', 'email'],
      },
      // Admin
      {
        id: 'user-management',
        title: 'User Management',
        subtitle: 'Manage user accounts',
        icon: mdiAccountGroupOutline,
        path: '/user-management',
        category: 'admin',
        keywords: ['user', 'users', 'management', 'accounts', 'admin'],
        roles: [roles.Admin, roles.Executive],
      },
      {
        id: 'add-user',
        title: 'Add User',
        subtitle: 'Create a new user account',
        icon: mdiAccountGroupOutline,
        path: '/adduser',
        category: 'admin',
        keywords: ['add', 'user', 'new', 'create', 'account'],
        roles: [roles.Admin, roles.Executive],
      },
    ],
    [roles]
  );

  // Filter items based on user roles and search query
  const filteredItems = useMemo(() => {
    // First filter by roles
    const roleFilteredItems = allItems.filter((item) => {
      if (!item.roles) return true; // No role restriction
      return item.roles.some((role) => userRoles.includes(role));
    });

    // Then filter by search query
    if (!query.trim()) {
      return roleFilteredItems;
    }

    const lowerQuery = query.toLowerCase();
    return roleFilteredItems.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.subtitle?.toLowerCase().includes(lowerQuery) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))
    );
  }, [allItems, userRoles, query]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {
      pages: [],
      reports: [],
      tools: [],
      admin: [],
    };

    filteredItems.forEach((item) => {
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => {
    return [
      ...groupedItems.pages,
      ...groupedItems.reports,
      ...groupedItems.tools,
      ...groupedItems.admin,
    ];
  }, [groupedItems]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setIsClosing(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 100);
  }, [onClose]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      handleClose();
      navigate(item.path);
    },
    [navigate, handleClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            handleSelect(flatItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [flatItems, selectedIndex, handleSelect, handleClose]
  );

  if (!isOpen) return null;

  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return null;

  const categoryLabels: Record<string, string> = {
    pages: 'Pages',
    reports: 'Reports',
    tools: 'Tools',
    admin: 'Administration',
  };

  let currentFlatIndex = 0;

  return ReactDOM.createPortal(
    <div
      className={`global-search-overlay ${isClosing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className="global-search-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="global-search-input-wrapper">
          <Icon path={mdiMagnify} size={1} className="global-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="Search pages, reports, tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="global-search-shortcut">
            <kbd>Esc</kbd>
            <span>to close</span>
          </div>
        </div>

        <div className="global-search-results">
          {flatItems.length === 0 ? (
            <div className="global-search-empty">
              <Icon
                path={mdiMagnify}
                size={2}
                className="global-search-empty-icon"
              />
              <p className="global-search-empty-text">
                No results found for "{query}"
              </p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([category, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={category} className="global-search-section">
                  <div className="global-search-section-title">
                    {categoryLabels[category]}
                  </div>
                  {items.map((item) => {
                    const itemIndex = currentFlatIndex++;
                    return (
                      <div
                        key={item.id}
                        className={`global-search-item ${
                          selectedIndex === itemIndex ? 'selected' : ''
                        }`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                      >
                        <Icon
                          path={item.icon}
                          size={0.9}
                          className="global-search-item-icon"
                        />
                        <div className="global-search-item-content">
                          <div className="global-search-item-title">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="global-search-item-subtitle">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="global-search-footer">
          <div className="global-search-footer-hint">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> to navigate
            </span>
            <span>
              <kbd>↵</kbd> to select
            </span>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
};

export default GlobalSearch;
