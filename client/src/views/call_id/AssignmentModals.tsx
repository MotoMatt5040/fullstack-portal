// client/src/views/callid_management/AssignmentModals.tsx
import React, { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import { mdiClose, mdiSwapHorizontal, mdiAlert } from '@mdi/js';
import './CallIDModals.css';

// ==================== INTERFACES ====================

interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: any) => Promise<{ success: boolean; error?: string }>;
  assignment: any;
  isLoading: boolean;
}

interface SwapAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwap: (data: any) => Promise<{ success: boolean; error?: string }>;
  assignment: any;
  isLoading: boolean;
}

interface AssignToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: any) => Promise<{ success: boolean; error?: string }>;
  projectId: string | null;
  availableCallIDs: any[];
  isLoading: boolean;
}

// ==================== EDIT ASSIGNMENT MODAL ====================

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  assignment,
  isLoading,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (assignment) {
      setStartDate(assignment.StartDate ? assignment.StartDate.split('T')[0] : '');
      setEndDate(assignment.EndDate ? assignment.EndDate.split('T')[0] : '');
      setError('');
    }
  }, [assignment]);

  useEffect(() => {
    if (!isOpen) {
      setStartDate('');
      setEndDate('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Both start and end dates are required');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    const result = await onUpdate({
      projectId: assignment.ProjectID,
      phoneNumberId: assignment.PhoneNumberID,
      startDate,
      endDate,
    });

    if (!result.success) {
      setError(result.error || 'Failed to update assignment');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Assignment Dates</h2>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              <Icon path={mdiAlert} size={0.8} />
              {error}
            </div>
          )}

          <div className="assignment-info">
            <p><strong>Project:</strong> {assignment?.ProjectID}</p>
            <p><strong>Phone:</strong> {assignment?.PhoneNumber}</p>
            <p><strong>Caller Name:</strong> {assignment?.CallerName}</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Dates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== SWAP ASSIGNMENT MODAL ====================

export const SwapAssignmentModal: React.FC<SwapAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSwap,
  assignment,
  isLoading,
}) => {
  const [toProjectId, setToProjectId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setToProjectId('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!toProjectId.trim()) {
      setError('Please enter a destination project ID');
      return;
    }

    if (toProjectId === assignment?.ProjectID) {
      setError('Destination project cannot be the same as source project');
      return;
    }

    const result = await onSwap({
      fromProjectId: assignment.ProjectID,
      toProjectId,
      phoneNumberId: assignment.PhoneNumberID,
      startDate,
      endDate: endDate || '2099-12-31',
    });

    if (!result.success) {
      setError(result.error || 'Failed to swap assignment');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-with-icon">
            <Icon path={mdiSwapHorizontal} size={1} />
            <h2>Swap Call ID to Another Project</h2>
          </div>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              <Icon path={mdiAlert} size={0.8} />
              {error}
            </div>
          )}

          <div className="swap-info">
            <div className="swap-from">
              <h4>From Project</h4>
              <p className="project-id">{assignment?.ProjectID}</p>
            </div>
            <div className="swap-arrow">
              <Icon path={mdiSwapHorizontal} size={1.5} />
            </div>
            <div className="swap-to">
              <h4>To Project</h4>
              <input
                type="text"
                placeholder="Enter project ID"
                value={toProjectId}
                onChange={(e) => setToProjectId(e.target.value)}
                required
                className="project-input"
              />
            </div>
          </div>

          <div className="phone-info">
            <p><strong>Phone Number:</strong> {assignment?.PhoneNumber}</p>
            <p><strong>Caller Name:</strong> {assignment?.CallerName}</p>
            <p><strong>State:</strong> {assignment?.StateAbbr}</p>
          </div>

          <div className="form-group">
            <label>New Assignment Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="form-input"
            />
            <small>The old assignment will end right before this date</small>
          </div>

          <div className="form-group">
            <label>New Assignment End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="form-input"
            />
            <small>Leave blank for no end date</small>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !toProjectId}
            >
              {isLoading ? 'Swapping...' : 'Swap Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== ASSIGN TO PROJECT MODAL ====================

export const AssignToProjectModal: React.FC<AssignToProjectModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  projectId,
  availableCallIDs,
  isLoading,
}) => {
  const [selectedCallID, setSelectedCallID] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedCallID('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCallID) {
      setError('Please select a call ID');
      return;
    }

    const result = await onAssign({
      projectId,
      phoneNumberId: parseInt(selectedCallID),
      startDate,
      endDate: endDate || '2099-12-31',
    });

    if (!result.success) {
      setError(result.error || 'Failed to assign call ID');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Call ID to Project</h2>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message">
              <Icon path={mdiAlert} size={0.8} />
              {error}
            </div>
          )}

          <div className="project-info">
            <p><strong>Project:</strong> {projectId}</p>
          </div>

          <div className="form-group">
            <label>Select Call ID *</label>
            <select
              value={selectedCallID}
              onChange={(e) => setSelectedCallID(e.target.value)}
              required
              className="form-select"
            >
              <option value="">-- Select a phone number --</option>
              {availableCallIDs?.map((callID) => (
                <option key={callID.PhoneNumberID} value={callID.PhoneNumberID}>
                  {callID.PhoneNumber} - {callID.CallerName} ({callID.StateAbbr})
                </option>
              ))}
            </select>
            {availableCallIDs?.length === 0 && (
              <small className="text-muted">No available call IDs</small>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="form-input"
              />
              <small>Leave blank for no end date</small>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !selectedCallID}
            >
              {isLoading ? 'Assigning...' : 'Assign Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};