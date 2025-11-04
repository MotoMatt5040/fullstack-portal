// client/src/views/callid_management/CallIDModals.tsx
import React, { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import { mdiClose } from '@mdi/js';
import './CallIDModals.css';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<{ success: boolean; error?: string }>;
  statusOptions: Array<{ value: number; label: string }>;
  stateOptions: Array<{ value: string; label: string }>;
  isLoading: boolean;
}

export const CreateCallIDModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  statusOptions,
  stateOptions,
  isLoading,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState(1);
  const [callerName, setCallerName] = useState('Survey Research');
  const [stateFIPS, setStateFIPS] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPhoneNumber('');
      setStatus(1);
      setCallerName('Survey Research');
      setStateFIPS('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneNumber.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!stateFIPS) {
      setError('Please select a state');
      return;
    }

    const result = await onCreate({
      phoneNumber,
      status,
      callerName,
      stateFIPS,
    });

    if (!result.success) {
      setError(result.error || 'Failed to create call ID');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Call ID</h2>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="5125551234"
              maxLength={10}
              required
              className="form-input"
            />
            <small>{phoneNumber.length}/10 digits</small>
          </div>

          <div className="form-group">
            <label>Caller Name *</label>
            <input
              type="text"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value.slice(0, 25))}
              maxLength={25}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
              className="form-select"
              required
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>State *</label>
            <select
              value={stateFIPS}
              onChange={(e) => setStateFIPS(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Select a state...</option>
              {stateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Call ID'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
  callID: any;
  statusOptions: Array<{ value: number; label: string }>;
  stateOptions: Array<{ value: string; label: string }>;
  isLoading: boolean;
}

export const EditCallIDModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  callID,
  statusOptions,
  stateOptions,
  isLoading,
}) => {
  const [status, setStatus] = useState(callID?.Status || 1);
  const [callerName, setCallerName] = useState(callID?.CallerName || '');
  const [stateFIPS, setStateFIPS] = useState(callID?.StateFIPS || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (callID) {
      setStatus(callID.Status);
      setCallerName(callID.CallerName);
      setStateFIPS(callID.StateFIPS);
      setError('');
    }
  }, [callID]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await onUpdate(callID.PhoneNumberID, {
      Status: status,
      CallerName: callerName,
      StateFIPS: stateFIPS,
    });

    if (!result.success) {
      setError(result.error || 'Failed to update call ID');
    }
  };

  if (!isOpen || !callID) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Call ID</h2>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              value={callID.PhoneNumber}
              disabled
              className="form-input disabled"
            />
            <small>Phone number cannot be changed</small>
          </div>

          <div className="form-group">
            <label>Caller Name *</label>
            <input
              type="text"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value.slice(0, 25))}
              maxLength={25}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
              className="form-select"
              required
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>State *</label>
            <select
              value={stateFIPS}
              onChange={(e) => setStateFIPS(e.target.value)}
              className="form-select"
              required
            >
              {stateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Call ID'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: number) => Promise<{ success: boolean; error?: string }>;
  callID: any;
  isLoading: boolean;
}

export const DeleteCallIDModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  callID,
  isLoading,
}) => {
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    const result = await onDelete(callID.PhoneNumberID);
    if (!result.success) {
      setError(result.error || 'Failed to delete call ID');
    }
  };

  if (!isOpen || !callID) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Call ID</h2>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <div className="modal-body">
          <p>Are you sure you want to delete this call ID?</p>
          <div className="delete-details">
            <strong>Phone:</strong> {callID.PhoneNumber}<br />
            <strong>Name:</strong> {callID.CallerName}<br />
            <strong>State:</strong> {callID.StateAbbr}
          </div>
          <p className="warning-text">This action cannot be undone.</p>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary" disabled={isLoading}>
            Cancel
          </button>
          <button onClick={handleDelete} className="btn-danger" disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: any) => Promise<{ success: boolean; error?: string }>;
  callID: any;
  isLoading: boolean;
}

export const AssignCallIDModal: React.FC<AssignModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  callID,
  isLoading,
}) => {
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setProjectId('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectId.trim()) {
      setError('Project ID is required');
      return;
    }

    const result = await onAssign({
      projectId: projectId.trim(),
      phoneNumberId: callID.PhoneNumberID,
      startDate,
      endDate: endDate || undefined,
    });

    if (!result.success) {
      setError(result.error || 'Failed to assign call ID');
    }
  };

  if (!isOpen || !callID) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign to Project</h2>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              value={callID.PhoneNumber}
              disabled
              className="form-input disabled"
            />
          </div>

          <div className="form-group">
            <label>Project ID *</label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value.slice(0, 20))}
              placeholder="e.g., PRJ001"
              maxLength={20}
              required
              className="form-input"
            />
          </div>

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
            <small>Leave empty for indefinite assignment</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Assigning...' : 'Assign to Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwap: (newPhoneNumberId: number) => Promise<{ success: boolean; error?: string }>;
  assignment: any;
  availableNumbers: any[];
  isLoading: boolean;
}

export const SwapCallIDModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  onSwap,
  assignment,
  availableNumbers,
  isLoading,
}) => {
  const [selectedPhoneId, setSelectedPhoneId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedPhoneId('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPhoneId) {
      setError('Please select a phone number');
      return;
    }

    const result = await onSwap(Number(selectedPhoneId));
    if (!result.success) {
      setError(result.error || 'Failed to swap number');
    }
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Swap Phone Number</h2>
          <button onClick={onClose} className="modal-close">
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Project ID</label>
            <input
              type="text"
              value={assignment.ProjectID}
              disabled
              className="form-input disabled"
            />
          </div>

          <div className="form-group">
            <label>Current Phone Number</label>
            <input
              type="text"
              value={assignment.PhoneNumber}
              disabled
              className="form-input disabled"
            />
            <small>This number will be released at today's date</small>
          </div>

          <div className="form-group">
            <label>New Phone Number *</label>
            <select
              value={selectedPhoneId}
              onChange={(e) => setSelectedPhoneId(e.target.value)}
              className="form-select"
              required
            >
              <option value="">Select a phone number...</option>
              {availableNumbers.map((num: any) => (
                <option key={num.PhoneNumberID} value={num.PhoneNumberID}>
                  {num.PhoneNumber} - {num.CallerName} ({num.StateAbbr})
                </option>
              ))}
            </select>
            {availableNumbers.length === 0 && (
              <small className="warning-text">No available numbers in the same state</small>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || availableNumbers.length === 0}
            >
              {isLoading ? 'Swapping...' : 'Swap Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};