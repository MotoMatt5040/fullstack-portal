import React, { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import {
  mdiClose,
  mdiIdentifier,
  mdiCalendarRange,
  mdiAccountOutline,
  mdiCogOutline,
  mdiPhone,
  mdiCellphone,
  mdiWeb,
  mdiMessageTextOutline,
  mdiEmailOutline,
  mdiMailboxOutline
} from '@mdi/js';
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
    multiCallID: 0,
    modes: {
      landline: false,
      cell: false,
      webPanel: false,
      text: false,
      email: false,
      postalMail: false,
    },
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && mode === 'create') {
      refetch();
    }
  }, [isOpen, mode, refetch]);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      const modes = {
        landline: initialData.modes?.includes(1) || false,
        cell: initialData.modes?.includes(2) || false,
        webPanel: initialData.modes?.includes(3) || false,
        text: initialData.modes?.includes(4) || false,
        email: initialData.modes?.includes(5) || false,
        postalMail: initialData.modes?.includes(6) || false,
      };

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
        multiCallID: initialData.multiCallID ? 1 : 0,
        modes,
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

  const handleModeChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      modes: {
        ...prev.modes,
        [name]: checked,
      },
    }));
  };

  const getModesArray = () => {
    const { modes } = formData;
    const result = [];

    if (modes.landline) result.push(1);
    if (modes.cell) result.push(2);
    if (modes.webPanel) result.push(3);
    if (modes.text) result.push(4);
    if (modes.email) result.push(5);
    if (modes.postalMail) result.push(6);

    return result;
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

    const modesArray = getModesArray();

    const dataToSubmit = {
      projectID: nextProjectNumber,
      clientProjectID: formData.clientProjectID,
      projectName: formData.projectName,
      NSize: formData.NSize,
      clientTime: formData.clientTime,
      promarkTime: formData.promarkTime,
      openends: formData.openends,
      startDate: formData.startDate,
      endDate: formData.endDate,
      client: formData.client,
      contactName: formData.contactName,
      contactNumber: formData.contactNumber,
      dataProcessing: formData.dataProcessing,
      multiCallID: formData.multiCallID,
      modes: modesArray,
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
          multiCallID: 0,
          modes: {
            landline: false,
            cell: false,
            webPanel: false,
            text: false,
            email: false,
            postalMail: false,
          },
        });
      }
    }
  };

  if (!isOpen) return null;

  const nextProjectNumber = mode === 'create' ? nextNumberData?.nextNumber : initialData?.projectID;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content modal-large" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Icon path={mdiIdentifier} size={0.9} />
            {mode === 'create' ? 'Add New Project' : 'Edit Project'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <Icon path={mdiClose} size={0.9} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            {/* Project Identification Section */}
            <div className="form-section">
              <div className="form-section-title">
                <Icon path={mdiIdentifier} size={0.7} />
                Project Identification
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Project ID</label>
                  <input
                    type="text"
                    value={nextProjectNumber || 'Loading...'}
                    disabled
                    className="input-disabled"
                    name="projectID"
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
                  <label htmlFor="client">Client Code</label>
                  <input
                    type="text"
                    id="client"
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="e.g., ABC"
                  />
                </div>
              </div>
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
            </div>

            {/* Project Settings Section */}
            <div className="form-section">
              <div className="form-section-title">
                <Icon path={mdiCogOutline} size={0.7} />
                Project Settings
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="NSize">N= (Sample Size)</label>
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
                <div className="form-group">
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
                <div className="form-group">
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

              {/* Options Row */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
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
                  <label htmlFor="multiCallID">
                    <input
                      type="checkbox"
                      id="multiCallID"
                      name="multiCallID"
                      checked={formData.multiCallID === 1}
                      onChange={handleChange}
                    />
                    Multi Call ID
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

              {/* Modes */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--label-text-color)', marginBottom: '0.5rem', display: 'block' }}>
                  Survey Modes
                </label>
                <div className="checkbox-grid">
                  <div className="checkbox-field">
                    <label htmlFor="landline">
                      <input
                        type="checkbox"
                        id="landline"
                        name="landline"
                        checked={formData.modes.landline}
                        onChange={handleModeChange}
                      />
                      <Icon path={mdiPhone} size={0.6} style={{ marginRight: '4px' }} />
                      Landline
                    </label>
                  </div>
                  <div className="checkbox-field">
                    <label htmlFor="cell">
                      <input
                        type="checkbox"
                        id="cell"
                        name="cell"
                        checked={formData.modes.cell}
                        onChange={handleModeChange}
                      />
                      <Icon path={mdiCellphone} size={0.6} style={{ marginRight: '4px' }} />
                      Cell
                    </label>
                  </div>
                  <div className="checkbox-field">
                    <label htmlFor="webPanel">
                      <input
                        type="checkbox"
                        id="webPanel"
                        name="webPanel"
                        checked={formData.modes.webPanel}
                        onChange={handleModeChange}
                      />
                      <Icon path={mdiWeb} size={0.6} style={{ marginRight: '4px' }} />
                      Web Panel
                    </label>
                  </div>
                  <div className="checkbox-field">
                    <label htmlFor="text">
                      <input
                        type="checkbox"
                        id="text"
                        name="text"
                        checked={formData.modes.text}
                        onChange={handleModeChange}
                      />
                      <Icon path={mdiMessageTextOutline} size={0.6} style={{ marginRight: '4px' }} />
                      Text
                    </label>
                  </div>
                  <div className="checkbox-field">
                    <label htmlFor="email">
                      <input
                        type="checkbox"
                        id="email"
                        name="email"
                        checked={formData.modes.email}
                        onChange={handleModeChange}
                      />
                      <Icon path={mdiEmailOutline} size={0.6} style={{ marginRight: '4px' }} />
                      Email
                    </label>
                  </div>
                  <div className="checkbox-field">
                    <label htmlFor="postalMail">
                      <input
                        type="checkbox"
                        id="postalMail"
                        name="postalMail"
                        checked={formData.modes.postalMail}
                        onChange={handleModeChange}
                      />
                      <Icon path={mdiMailboxOutline} size={0.6} style={{ marginRight: '4px' }} />
                      Postal Mail
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule & Contact Section */}
            <div className="form-section">
              <div className="form-section-title">
                <Icon path={mdiCalendarRange} size={0.7} />
                Schedule & Contact
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
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
              <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="contactName">
                    <Icon path={mdiAccountOutline} size={0.6} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Contact Name
                  </label>
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
