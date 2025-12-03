import React from 'react';
import Icon from '@mdi/react';
import { mdiClose, mdiAlertOutline } from '@mdi/js';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  projectName,
  projectID,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content modal-small" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-danger">
          <h2>
            <Icon path={mdiAlertOutline} size={0.9} />
            Confirm Delete
          </h2>
          <button className="modal-close" onClick={onClose}>
            <Icon path={mdiClose} size={0.9} />
          </button>
        </div>

        <div className="modal-body">
          <p className="delete-warning">
            Are you sure you want to delete this project?
          </p>
          <div className="delete-details">
            <p>
              <strong>Project ID:</strong> {projectID}
            </p>
            <p>
              <strong>Project Name:</strong> {projectName}
            </p>
          </div>
          <p className="delete-notice">
            This action cannot be undone. All project data will be permanently removed.
          </p>
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
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
