import React from 'react';
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
} from 'react-icons/fa'; // Ensure you have react-icons installed: npm install react-icons

import '../views/Welcome.css'; // Make sure this import is correct

const Welcome = () => {
  return (
    <section className="welcome-container">
      {/* Hero Section */}
      <div className="welcome-hero">
        <h1>Welcome to the Fullstack Portal</h1>
        <p>
          Your central hub for managing projects, viewing reports, and accessing
          essential tools. Streamline your workflow and gain insights into your
          development and operations.
        </p>
        <Link to="/project-report" className="hero-button">
          Get Started <FaTachometerAlt />
        </Link>
      </div>

      {/* Feature Cards Section */}
      <div className="welcome-grid">
        <div className="welcome-card">
          <div className="welcome-card-icon">
            <FaChartLine />
          </div>
          <h3>Comprehensive Reporting</h3>
          <p>
            Access detailed project, production, and summary reports to track
            progress and analyze performance metrics.
          </p>
          <Link to="/project-report" className="welcome-card-link">
            View Reports <FaChartLine />
          </Link>
        </div>

        <div className="welcome-card">
          <div className="welcome-card-icon">
            <FaGithub />
          </div>
          <h3>Portal Feedback</h3>
          <p>
            Submit feedback and suggestions to help us improve the portal.
            Your input is invaluable in shaping the future of this platform.
          </p>
          <Link to="/github" className="welcome-card-link">
            Submit Feedback <FaGithub />
          </Link>
        </div>

        <div className="welcome-card">
          <div className="welcome-card-icon">
            <FaCodeBranch />
          </div>
          <h3>Live Projects</h3>
          <p>
            Monitor the status of live projects, track quotas, and manage
            campaigns in real-time.
          </p>
          <Link to="/live-projects" className="welcome-card-link">
            Manage Projects <FaCodeBranch />
          </Link>
        </div>

        <div className="welcome-card">
          <div className="welcome-card-icon">
            <FaUsers />
          </div>
          <h3>User Management</h3>
          <p>
            Administrators can manage user roles, add new users, and update
            passwords for secure access control.
          </p>
          <Link to="/user-management" className="welcome-card-link">
            Manage Users <FaUsers />
          </Link>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="welcome-quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/summary-report" className="quick-action-btn">
            <div className="quick-action-icon"><FaChartLine /></div>
            Summary Report
          </Link>
          <Link to="/project-report" className="quick-action-btn">
            <div className="quick-action-icon"><FaChartLine /></div>
            Project Report
          </Link>
          {/* <Link to="/production-report" className="quick-action-btn">
            <div className="quick-action-icon"><FaChartLine /></div>
            Production Report
          </Link> */}
          <Link to="/quota-management" className="quick-action-btn">
            <div className="quick-action-icon"><FaCodeBranch /></div>
            Quota Management
          </Link>
          <Link to="/settings" className="quick-action-btn">
            <div className="quick-action-icon"><FaCog /></div>
            Settings
          </Link>
        </div>
      </div>

      {/* Development Notice */}
      <div className="development-notice">
        <FaInfoCircle /> This portal is currently under active development. Features and design may change.
      </div>

      {/* Footer Section */}
      <div className="welcome-footer">
        <h3>Need Help?</h3>
        <p>
          If you encounter any issues or have questions, please reach out to
          our support team. We're here to help!
        </p>
        <Link to="/contact-support" className="support-link">
          Contact Support <FaQuestionCircle />
        </Link>
      </div>
    </section>
  );
};

export default Welcome;