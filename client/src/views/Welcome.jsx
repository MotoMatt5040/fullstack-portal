import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../features/auth/authSlice';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaChartLine,
  FaUsers,
  FaCog,
  FaGithub,
  FaCodeBranch,
  FaQuestionCircle,
  FaInfoCircle,
} from 'react-icons/fa';

import '../views/Welcome.css';
import './styles/Select.css'

const EXTERNAL_ROLE_ID = 4;

const Welcome = () => {
  const token = useSelector(selectCurrentToken);

  const userInfo = useMemo(() => {
    if (!token) return { roles: [], username: '', isInternalUser: true };

    try {
      const decoded = jwtDecode(token);
      const roles = decoded?.UserInfo?.roles ?? [];
      const username = decoded?.UserInfo?.username ?? '';
      const isInternalUser = !roles.includes(EXTERNAL_ROLE_ID);

      return { roles, username, isInternalUser };
    } catch (error) {
      console.error('Error decoding token:', error);
      return { roles: [], username: '', isInternalUser: true };
    }
  }, [token]);

  const quickActions = (
    <div className='welcome-quick-actions'>
      <h2>Quick Actions</h2>
      <div className='quick-actions-grid'>
        {userInfo.isInternalUser && (
          <Link to='/summary-report' className='quick-action-btn'>
            <div className='quick-action-icon'>
              <FaChartLine />
            </div>
            Summary Report
          </Link>
        )}
        {/* <Link to="/project-report" className="quick-action-btn">
            <div className="quick-action-icon"><FaChartLine /></div>
            Project Report
          </Link> */}
        {/* <Link to="/production-report" className="quick-action-btn">
            <div className="quick-action-icon"><FaChartLine /></div>
            Production Report
          </Link> */}
        <Link to='/quota-management' className='quick-action-btn'>
          <div className='quick-action-icon'>
            <FaChartLine />
          </div>
          Quota Report
        </Link>

        <Link to='/topline-report' className='quick-action-btn'>
          <div className='quick-action-icon'>
            <FaChartLine />
          </div>
          Topline Report (FUTURE)
        </Link>

        <Link to='/disposition-report' className='quick-action-btn'>
          <div className='quick-action-icon'>
            <FaChartLine />
          </div>
          Disposition Report (WEB overview now available)
        </Link>

        <Link to='/settings' className='quick-action-btn'>
          <div className='quick-action-icon'>
            <FaCog />
          </div>
          Settings (FUTURE)
        </Link>
      </div>
    </div>
  );

  const featureCards = (
    <div className='welcome-grid'>
        <div className='welcome-card'>
          <div className='welcome-card-icon'>
            <FaChartLine />
          </div>
          <h3>Comprehensive Reporting</h3>
          <p>
            Access detailed reports to track
            progress and analyze performance metrics.
          </p>
          <Link to='/reports' className='welcome-card-link'>
            View Reports <FaChartLine />
          </Link>
        </div>

      <div className='welcome-card'>
        <div className='welcome-card-icon'>
          <FaGithub />
        </div>
        <h3>Portal Feedback</h3>
        <p>
          Submit feedback and suggestions to help us improve the portal. Your
          input is invaluable in shaping the future of this platform.
        </p>
        <Link to='/github' className='welcome-card-link'>
          Submit Feedback <FaGithub />
        </Link>
      </div>

      {userInfo.isInternalUser && (
        <div className='welcome-card'>
          <div className='welcome-card-icon'>
            <FaCodeBranch />
          </div>
          <h3>Project Publishing</h3>
          <p>
            Publish quota reports to individuals by giving them access to view
            projects.
          </p>
          <Link to='/project-publishing' className='welcome-card-link'>
            Publish Projects <FaCodeBranch />
          </Link>
        </div>
      )}

      {userInfo.isInternalUser && (
        <div className='welcome-card'>
          <div className='welcome-card-icon'>
            <FaUsers />
          </div>
          <h3>User Management</h3>
          <p>
            Administrators can manage user roles, add new users, and update
            passwords for secure access control.
          </p>
          <Link to='/user-management' className='welcome-card-link'>
            Manage Users <FaUsers />
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <section className='welcome-container'>
      {/* Development Notice */}
      <div className='development-notice'>
        <FaInfoCircle /> This portal is currently under active development.
        Features and design may change.
      </div>

      {/* Quick Actions Section */}
      {quickActions}

      {/* Hero Section */}
      {/* <div className="welcome-hero">
        <h1>Welcome to the Fullstack Portal</h1>
        <p>
          Your central hub for managing projects, viewing reports, and accessing
          essential tools. Streamline your workflow and gain insights into your
          development and operations.
        </p>
        <Link to="/project-report" className="hero-button">
          Get Started <FaTachometerAlt />
        </Link>
      </div> */}

      {/* Feature Cards Section */}
      {featureCards}

      {/* Footer Section */}
      <div className='welcome-footer'>
        <h3>Need Help?</h3>
        <p>
          If you encounter any issues or have questions, please reach out to our
          support team. We're here to help!
        </p>
        <Link to='/contact-support' className='support-link'>
          Contact Support <FaQuestionCircle />
        </Link>
      </div>
    </section>
  );
};

export default Welcome;
