import React from 'react';
import { Link } from 'react-router-dom';
import './Reports.css'; // Import the new CSS file

const Reports = () => {
  // Array of report links to display on the page
  const reportLinks = [
    {
      to: '/quota-reports',
      text: 'Quota Reports',
      description: 'View and manage project quotas.',
    },
    {
      to: '/topline-report',
      text: 'Topline Report',
      description: 'Get a high-level summary of project performance.',
    },
    {
      to: '/disposition-reports',
      text: 'Disposition Reports',
      description: 'Analyze the final status of all interview attempts.',
    },
  ];

  return (
    <section className='reports-container'>
      <h1 className='reports-header'>Available Reports</h1>
      <p className='reports-intro'>
        Please select a report from the options below to view more details.
      </p>
      <div className='reports-grid'>
        {/* Map over the reportLinks array to create a styled card for each link */}
        {reportLinks.map((link) => (
          <Link key={link.to} to={link.to} className='report-card'>
            <h5 className='report-card-title'>{link.text}</h5>
            <p className='report-card-description'>{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Reports;
