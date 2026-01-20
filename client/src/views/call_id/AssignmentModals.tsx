// client/src/views/callid_management/AssignmentModals.tsx
import React, { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import {
  mdiClose,
  mdiSwapHorizontal,
  mdiAlert,
  mdiInformationOutline,
  mdiPhone,
  mdiPhoneOff,
} from '@mdi/js';
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
  onSwap: (
    newPhoneNumberId: number
  ) => Promise<{ success: boolean; error?: string }>;
  assignment: any;
  isLoading: boolean;
  availableCallIDs: any[];
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
// Note: This modal now only displays assignment info since dates are managed in the Projects table

export const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({
  isOpen,
  onClose,
  assignment,
  isLoading,
}) => {
  const startDate = assignment?.StartDate ? assignment.StartDate.split('T')[0] : '';
  const endDate = assignment?.EndDate ? assignment.EndDate.split('T')[0] : '';

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onMouseDown={onClose}>
      <div className='modal-content' onMouseDown={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h2>Assignment Details</h2>
          <button onClick={onClose} className='modal-close'>
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <div className='modal-form'>
          <div className='assignment-info'>
            <p>
              <strong>Project:</strong> {assignment?.ProjectID}
            </p>
            <p>
              <strong>Phone:</strong> {assignment?.PhoneNumber}
            </p>
            <p>
              <strong>Caller Name:</strong> {assignment?.CallerName}
            </p>
          </div>

          <div className='form-row'>
            <div className='form-group'>
              <label>Start Date</label>
              <input
                type='date'
                value={startDate}
                disabled
                readOnly
                className='form-input'
              />
            </div>

            <div className='form-group'>
              <label>End Date</label>
              <input
                type='date'
                value={endDate}
                disabled
                readOnly
                className='form-input'
              />
            </div>
          </div>

          <div className='alert alert-info' style={{ marginTop: '15px' }}>
            <Icon path={mdiInformationOutline} size={0.9} />
            <span>
              Dates are managed in the Projects table. To change dates, edit the project in Project Management.
            </span>
          </div>

          <div className='modal-actions'>
            <button
              type='button'
              onClick={onClose}
              className='btn-secondary'
              disabled={isLoading}
            >
              Close
            </button>
          </div>
        </div>
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
  availableCallIDs,
}) => {
  const [newPhoneNumberId, setNewPhoneNumberId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNewPhoneNumberId('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPhoneNumberId) {
      setError('Please select a new phone number');
      return;
    }

    if (parseInt(newPhoneNumberId) === assignment?.PhoneNumberID) {
      setError('New phone number must be different from current number');
      return;
    }

    const result = await onSwap(parseInt(newPhoneNumberId));

    if (!result.success) {
      setError(result.error || 'Failed to reassign phone number');
    }
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onMouseDown={onClose}>
      <div className='modal-content' onMouseDown={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <div className='header-with-icon'>
            <Icon path={mdiSwapHorizontal} size={1} />
            <h2>Change Phone Number</h2>
          </div>
          <button onClick={onClose} className='modal-close'>
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='modal-form'>
          {error && (
            <div className='error-message'>
              <Icon path={mdiAlert} size={0.8} />
              {error}
            </div>
          )}

          <div className='assignment-info'>
            <p>
              <strong>Project:</strong> {assignment?.ProjectID}
            </p>
            <p>
              <strong>Current Phone:</strong> {assignment?.PhoneNumber}
            </p>
            <p>
              <strong>Caller Name:</strong> {assignment?.CallerName}
            </p>
            <p>
              <strong>State:</strong> {assignment?.StateAbbr}
            </p>
          </div>

          <div className='form-group'>
            <label>New Phone Number *</label>
            <select
              value={newPhoneNumberId}
              onChange={(e) => setNewPhoneNumberId(e.target.value)}
              required
              className='form-select'
            >
              <option value=''>-- Select a phone number --</option>
              {availableCallIDs?.map((callID: any) => (
                <option key={callID.PhoneNumberID} value={callID.PhoneNumberID}>
                  {callID.PhoneNumber} - {callID.CallerName} ({callID.StateAbbr}
                  )
                </option>
              ))}
            </select>
            {availableCallIDs?.length === 0 && (
              <small className='text-muted'>No available phone numbers</small>
            )}
          </div>

          <div className='alert alert-info'>
            <Icon path={mdiInformationOutline} size={0.9} />
            <span>
              The current assignment will end immediately and the new phone
              number will be assigned starting now.
            </span>
          </div>

          <div className='modal-actions'>
            <button
              type='button'
              onClick={onClose}
              className='btn-secondary'
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type='submit'
              className='btn-primary'
              disabled={isLoading || !newPhoneNumberId}
            >
              {isLoading ? 'Changing...' : 'Change Phone Number'}
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
  const [callIdSlot, setCallIdSlot] = useState<string>('1'); // Default to slot 1
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedCallID('');
      setCallIdSlot('1');
      setError('');
    }
  }, [isOpen]);

  const slotOptions = [
    { value: '1', label: 'CALLIDL1 (Landline 1)' },
    { value: '2', label: 'CALLIDL2 (Landline 2)' },
    { value: '3', label: 'CALLIDC1 (Cell 1)' },
    { value: '4', label: 'CALLIDC2 (Cell 2)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCallID) {
      setError('Please select a call ID');
      return;
    }

    if (!callIdSlot) {
      setError('Please select a slot');
      return;
    }

    // Dates are now retrieved from the Projects table
    const result = await onAssign({
      projectId,
      phoneNumberId: parseInt(selectedCallID),
      callIdSlot: parseInt(callIdSlot),
    });

    if (!result.success) {
      setError(result.error || 'Failed to assign call ID');
    }
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onMouseDown={onClose}>
      <div className='modal-content' onMouseDown={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h2>Assign Call ID to Project</h2>
          <button onClick={onClose} className='modal-close'>
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='modal-form'>
          {error && (
            <div className='error-message'>
              <Icon path={mdiAlert} size={0.8} />
              {error}
            </div>
          )}

          <div className='project-info'>
            <p>
              <strong>Project:</strong> {projectId}
            </p>
            <p className='text-muted'>
              <small>Assignment dates will use the project's start and end dates</small>
            </p>
          </div>

          <div className='form-group'>
            <label>Slot *</label>
            <select
              value={callIdSlot}
              onChange={(e) => setCallIdSlot(e.target.value)}
              required
              className='form-select'
            >
              {slotOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <small>Select which CALLID column this number will occupy</small>
          </div>

          <div className='form-group'>
            <label>Select Call ID *</label>
            <select
              value={selectedCallID}
              onChange={(e) => setSelectedCallID(e.target.value)}
              required
              className='form-select'
            >
              <option value=''>-- Select a phone number --</option>
              {availableCallIDs?.map((callID) => (
                <option key={callID.PhoneNumberID} value={callID.PhoneNumberID}>
                  {callID.PhoneNumber} - {callID.CallerName} ({callID.StateAbbr}
                  )
                </option>
              ))}
            </select>
            {availableCallIDs?.length === 0 && (
              <small className='text-muted'>No available call IDs</small>
            )}
          </div>

          <div className='modal-actions'>
            <button
              type='button'
              onClick={onClose}
              className='btn-secondary'
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type='submit'
              className='btn-primary'
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

interface ProjectSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentAssignments: any; // Single row with CallIDL1, CallIDL2, CallIDC1, CallIDC2
  assignmentDetails: any[]; // Array of full assignment objects with dates from Projects table
  availableCallIDs: any[];
  onUpdateSlot: (
    projectId: string,
    slotName: string,
    phoneNumberId: number | null
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateDates: (
    projectId: string,
    phoneNumberId: number,
    startDate: string,
    endDate: string
  ) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

export const ProjectSlotsModal: React.FC<ProjectSlotsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  currentAssignments,
  assignmentDetails,
  availableCallIDs,
  onUpdateSlot,
  // onUpdateDates is no longer used - dates come from Projects table
  isLoading,
}) => {
  const [slots, setSlots] = useState<{ [key: string]: number | null }>({
    CallIDL1: null,
    CallIDL2: null,
    CallIDC1: null,
    CallIDC2: null,
  });
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && currentAssignments) {
      setSlots({
        CallIDL1: currentAssignments.CallIDL1 || null,
        CallIDL2: currentAssignments.CallIDL2 || null,
        CallIDC1: currentAssignments.CallIDC1 || null,
        CallIDC2: currentAssignments.CallIDC2 || null,
      });

      // Display project dates from the first assignment (read-only, from Projects table)
      if (assignmentDetails && assignmentDetails.length > 0) {
        const firstAssignment = assignmentDetails[0];
        setProjectStartDate(firstAssignment.StartDate ? firstAssignment.StartDate.split('T')[0] : '');
        setProjectEndDate(firstAssignment.EndDate ? firstAssignment.EndDate.split('T')[0] : '');
      } else {
        setProjectStartDate('');
        setProjectEndDate('');
      }
    }
  }, [isOpen, currentAssignments, assignmentDetails]);

  const slotInfo: {
    [key: string]: { label: string; type: string; color: number };
  } = {
    CallIDL1: { label: 'CALLIDL1', type: 'Landline 1', color: 1 },
    CallIDL2: { label: 'CALLIDL2', type: 'Landline 2', color: 2 },
    CallIDC1: { label: 'CALLIDC1', type: 'Cell 1', color: 3 },
    CallIDC2: { label: 'CALLIDC2', type: 'Cell 2', color: 4 },
  };

  const getPhoneDetails = (phoneNumberId: number | null) => {
    if (!phoneNumberId) return null;
    // First check assignmentDetails for currently assigned phones
    const assignedPhone = assignmentDetails?.find((a) => a.PhoneNumberID === phoneNumberId);
    if (assignedPhone) {
      return {
        PhoneNumberID: assignedPhone.PhoneNumberID,
        PhoneNumber: assignedPhone.PhoneNumber,
        CallerName: assignedPhone.CallerName,
        StateAbbr: assignedPhone.StateAbbr,
      };
    }
    // Fall back to availableCallIDs for unassigned phones
    return availableCallIDs.find((c) => c.PhoneNumberID === phoneNumberId);
  };

  const handleSlotChange = (slotName: string, phoneNumberId: string) => {
    setSlots((prev) => ({
      ...prev,
      [slotName]: phoneNumberId ? parseInt(phoneNumberId) : null,
    }));
  };

  const handleSaveSlot = async (slotName: string) => {
    const newPhoneNumberId = slots[slotName];
    const currentPhoneNumberId = currentAssignments?.[slotName];

    if (newPhoneNumberId === currentPhoneNumberId) {
      setError('No changes to save');
      return;
    }

    // Dates are now retrieved from the Projects table automatically
    const result = await onUpdateSlot(projectId, slotName, newPhoneNumberId);

    if (!result.success) {
      setError(result.error || 'Failed to update slot');
    } else {
      setError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onMouseDown={onClose}>
      <div className='modal-content modal-large' onMouseDown={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h2>Manage Call ID Slots - {projectId}</h2>
          <button onClick={onClose} className='modal-close'>
            <Icon path={mdiClose} size={1} />
          </button>
        </div>

        <div className='modal-body'>
          {error && (
            <div className='error-message'>
              <Icon path={mdiAlert} size={0.8} />
              {error}
            </div>
          )}

          <div className='slots-grid'>
            {Object.keys(slotInfo).map((slotName) => {
              const info = slotInfo[slotName];
              const currentPhoneId = currentAssignments?.[slotName];
              const currentPhone = getPhoneDetails(currentPhoneId);
              const isAssigned = !!currentPhoneId;

              return (
                <div key={slotName} className={`slot-card slot-${info.color}`}>
                  <div className='slot-header'>
                    <div className='slot-title'>
                      <span className={`slot-badge slot-${info.color}`}>
                        {info.label}
                      </span>
                      <span className='slot-type'>{info.type}</span>
                    </div>
                  </div>

                  {isAssigned && currentPhone ? (
                    <div className='slot-current'>
                      <div className='current-number'>
                        <Icon path={mdiPhone} size={0.8} />
                        <span>{currentPhone.PhoneNumber}</span>
                      </div>
                      <div className='current-details'>
                        <span>{currentPhone.CallerName}</span>
                        <span>•</span>
                        <span>{currentPhone.StateAbbr}</span>
                      </div>
                    </div>
                  ) : (
                    <div className='slot-empty'>
                      <Icon path={mdiPhoneOff} size={1.5} color='#ccc' />
                      <p>No number assigned</p>
                    </div>
                  )}

                  <div className='slot-assign'>
                    <select
                      value={slots[slotName] || ''}
                      onChange={(e) =>
                        handleSlotChange(slotName, e.target.value)
                      }
                      className='form-select'
                      disabled={isLoading}
                    >
                      <option value=''>-- Select to assign/change --</option>
                      {availableCallIDs?.map((callID: any) => (
                        <option
                          key={callID.PhoneNumberID}
                          value={callID.PhoneNumberID}
                        >
                          {callID.PhoneNumber} - {callID.CallerName} (
                          {callID.StateAbbr})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSaveSlot(slotName)}
                      className='btn-primary btn-small'
                      disabled={isLoading || slots[slotName] === currentPhoneId}
                    >
                      {isAssigned ? 'Change' : 'Assign'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project dates display (read-only - dates come from Projects table) */}
          <div className='project-dates-section'>
            <h3>Project Dates</h3>
            <p className='section-description'>
              These dates are managed in Project Management and apply to all call IDs assigned to this project.
            </p>
            <div className='date-inputs-row'>
              <div className='date-field'>
                <label>Start Date</label>
                <input
                  type='date'
                  value={projectStartDate}
                  className='form-input'
                  disabled
                  readOnly
                />
              </div>
              <div className='date-field'>
                <label>End Date</label>
                <input
                  type='date'
                  value={projectEndDate}
                  className='form-input'
                  disabled
                  readOnly
                />
              </div>
            </div>
            <p className='text-muted' style={{ marginTop: '10px', fontSize: '0.9em' }}>
              To change project dates, please edit the project in Project Management.
            </p>
          </div>
        </div>

        <div className='modal-footer'>
          <button
            onClick={onClose}
            className='btn-secondary'
            disabled={isLoading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
