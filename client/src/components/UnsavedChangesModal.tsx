import React from 'react';
import Icon from '@mdi/react';
import { mdiAlertOutline } from '@mdi/js';
import { Modal } from './Modal';
import './css/UnsavedChangesModal.css';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} ariaLabel="Unsaved changes warning">
      <div className="unsaved-changes-modal">
        <div className="unsaved-changes-modal__icon">
          <Icon path={mdiAlertOutline} size={1.5} />
        </div>

        <h2 className="unsaved-changes-modal__title">Unsaved Changes</h2>

        <p className="unsaved-changes-modal__message">
          You have unsaved changes that will be lost if you leave this page.
          Are you sure you want to continue?
        </p>

        <div className="unsaved-changes-modal__actions">
          <button
            onClick={onCancel}
            className="unsaved-changes-modal__btn unsaved-changes-modal__btn--stay"
          >
            Stay on Page
          </button>
          <button
            onClick={onConfirm}
            className="unsaved-changes-modal__btn unsaved-changes-modal__btn--leave"
          >
            Leave Page
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UnsavedChangesModal;
