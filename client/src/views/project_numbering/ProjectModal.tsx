import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useGetNextProjectNumberQuery } from '../../features/projectNumberingApiSlice';

const ProjectModal = ({ isOpen, onClose, onSubmit, isLoading, mode, initialData }) => {
  const { data: nextNumberData, refetch } = useGetNextProjectNumberQuery(undefined, {
    skip: mode === 'edit' || !isOpen,
  });

  const [formData, setFormData] = useState({
    clientProjectID: '',
    projectName: '',
    NSize: '',
    clientTime: '',
    promarkTime: '',
    openends: 'n',
    startDate: '',
    endDate: '',
    client: '',
    contactName: '',
    contactNumber: '',
    dataProcessing: 0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && mode === 'create') {
      refetch();
    }
  }, [isOpen, mode, refetch]);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        clientProjectID: initialData.clientProjectID || '',
        projectName: initialData.projectName || '',
        NSize: initialData.NSize || '',
        clientTime: initialData.clientTime || '',
        promarkTime: initialData.promarkTime || '',
        openends: initialData.openends || 'n',
        startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
        endDate: initialData.endDate ? initialData.endDate.split('T')[0] : '',
        client: initialData.client || '',
        contactName: initialData.contactName || '',
        contactNumber: initialData.contactNumber || '',
        dataProcessing: initialData.dataProcessing ? 1 : 0,
      });
    }
  }, [mode, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (formData.NSize && (isNaN(formData.NSize) || formData.NSize < 0)) {
      newErrors.NSize = 'N= must be a positive number';
    }

    if (formData.clientTime && (isNaN(formData.clientTime) || formData.clientTime < 0)) {
      newErrors.clientTime = 'Client time must be a positive number';
    }

    if (formData.promarkTime && (isNaN(formData.promarkTime) || formData.promarkTime < 0)) {
      newErrors.promarkTime = 'Promark time must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const dataToSubmit = {
      ...formData,
      projectID: nextProjectNumber,
    };

    const result = await onSubmit(dataToSubmit);
    
    if (result.success) {
      if (mode === 'create') {
        setFormData({
          clientProjectID: '',
          projectName: '',
          NSize: '',
          clientTime: '',
          promarkTime: '',
          openends: 'n',
          startDate: '',
          endDate: '',
          client: '',
          contactName: '',
          contactNumber: '',
          dataProcessing: 0,
        });
      }
    }
  };

  if (!isOpen) return null;

  const nextProjectNumber = mode === 'create' ? nextNumberData?.nextNumber : initialData?.projectID;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Add New Project' : 'Edit Project'}</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            {/* Row 1: Project ID, Client Project ID, Client */}
            <div className="form-row">
              <div className="form-group">
                <label>Project ID</label>
                <input
                  type="text"
                  value={nextProjectNumber || 'Loading...'}
                  disabled
                  className="input-disabled"
                  name={"projectID"}
                />
              </div>

              <div className="form-group">
                <label htmlFor="clientProjectID">Client Project ID</label>
                <input
                  type="text"
                  id="clientProjectID"
                  name="clientProjectID"
                  value={formData.clientProjectID}
                  onChange={handleChange}
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label htmlFor="client">Client</label>
                <input
                  type="text"
                  id="client"
                  name="client"
                  value={formData.client}
                  onChange={handleChange}
                  maxLength={10}
                  placeholder="XYZ"
                />
              </div>
            </div>

            {/* Project Name */}
            <div className="form-group">
              <label htmlFor="projectName">
                Project Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                maxLength={255}
                className={errors.projectName ? 'input-error' : ''}
                required
              />
              {errors.projectName && <span className="error-text">{errors.projectName}</span>}
            </div>

            {/* Compact grid and dates side by side */}
            <div className="compact-and-dates-row">
              {/* Compact grid for N=, LOI, and toggles */}
              <div className="form-group compact-grid">
                <div className="compact-row">
                  <div className="compact-field nsize-field">
                    <label htmlFor="NSize">N=</label>
                    <input
                      type="number"
                      id="NSize"
                      name="NSize"
                      value={formData.NSize}
                      onChange={handleChange}
                      min="0"
                      className={errors.NSize ? 'input-error' : ''}
                    />
                    {errors.NSize && <span className="error-text">{errors.NSize}</span>}
                  </div>
                  <div className="compact-field">
                    <label htmlFor="clientTime">Client LOI</label>
                    <input
                      type="number"
                      id="clientTime"
                      name="clientTime"
                      value={formData.clientTime}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={errors.clientTime ? 'input-error' : ''}
                    />
                  </div>
                  <div className="compact-field">
                    <label htmlFor="promarkTime">Promark LOI</label>
                    <input
                      type="number"
                      id="promarkTime"
                      name="promarkTime"
                      value={formData.promarkTime}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={errors.promarkTime ? 'input-error' : ''}
                    />
                  </div>
                </div>
                <div className="compact-row">
                  <div className="checkbox-field">
                    <label htmlFor="dataProcessing">
                      <input
                        type="checkbox"
                        id="dataProcessing"
                        name="dataProcessing"
                        checked={formData.dataProcessing === 1}
                        onChange={handleChange}
                      />
                      Promark DP
                    </label>
                  </div>
                  <div className="checkbox-field">
                    <label htmlFor="openends">
                      <input
                        type="checkbox"
                        id="openends"
                        name="openends"
                        checked={formData.openends === 'y'}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            openends: e.target.checked ? 'y' : 'n'
                          }));
                        }}
                      />
                      Open-Ends
                    </label>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="form-group dates-group">
                <div className="date-field">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>
                <div className="date-field">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className={errors.endDate ? 'input-error' : ''}
                  />
                  {errors.endDate && <span className="error-text">{errors.endDate}</span>}
                </div>
              </div>
            </div>

            {/* Row: Contact Name and Contact Number */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contactName">Contact Name</label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactNumber">Contact Number</label>
                <input
                  type="tel"
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  maxLength={20}
                  placeholder="e.g., 512-345-9720"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
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
              {isLoading ? 'Saving...' : mode === 'create' ? 'Add Project' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;