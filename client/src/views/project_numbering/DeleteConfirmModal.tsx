import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  projectName,
  projectID,
}) => {
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-danger">
          <h2>
            <FaExclamationTriangle /> Confirm Delete
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
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