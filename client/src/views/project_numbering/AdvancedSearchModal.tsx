import React, { useState } from 'react';
import { FaTimes, FaSearch } from 'react-icons/fa';

const AdvancedSearchModal = ({ isOpen, onClose, onSearch, isLoading }) => {
  const [criteria, setCriteria] = useState({
    projectID: '',
    clientProjectID: '',
    projectName: '',
    client: '',
    startDateFrom: '',
    startDateTo: '',
    contactName: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCriteria((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Filter out empty values
    const filteredCriteria = Object.entries(criteria).reduce((acc, [key, value]) => {
      if (value && value.trim() !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    onSearch(filteredCriteria);
  };

  const handleReset = () => {
    setCriteria({
      projectID: '',
      clientProjectID: '',
      projectName: '',
      client: '',
      startDateFrom: '',
      startDateTo: '',
      contactName: '',
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content modal-medium" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FaSearch /> Advanced Search
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="projectID">Project ID</label>
              <input
                type="number"
                id="projectID"
                name="projectID"
                value={criteria.projectID}
                onChange={handleChange}
                placeholder="e.g., 12345"
              />
            </div>

            <div className="form-group">
              <label htmlFor="clientProjectID">Client Project ID</label>
              <input
                type="text"
                id="clientProjectID"
                name="clientProjectID"
                value={criteria.clientProjectID}
                onChange={handleChange}
                placeholder="Enter client project ID"
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="projectName">Project Name</label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={criteria.projectName}
                onChange={handleChange}
                placeholder="Enter project name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="client">Client Code</label>
              <input
                type="text"
                id="client"
                name="client"
                value={criteria.client}
                onChange={handleChange}
                placeholder="e.g., XYZ"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactName">Contact Name</label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                value={criteria.contactName}
                onChange={handleChange}
                placeholder="Enter contact name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="startDateFrom">Start Date From</label>
              <input
                type="date"
                id="startDateFrom"
                name="startDateFrom"
                value={criteria.startDateFrom}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="startDateTo">Start Date To</label>
              <input
                type="date"
                id="startDateTo"
                name="startDateTo"
                value={criteria.startDateTo}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;