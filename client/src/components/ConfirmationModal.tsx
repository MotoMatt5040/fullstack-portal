import React from 'react';
import { Modal } from './Modal';
import './css/ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  isConfirming = false,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="confirmation-modal">
        <h2 className="confirmation-modal__title">{title}</h2>
        <div className="confirmation-modal__message">{message}</div>
        <div className="confirmation-modal__actions">
          <button onClick={onClose} className="button button--secondary" disabled={isConfirming}>
            {cancelButtonText}
          </button>
          <button onClick={onConfirm} className="button button--danger" disabled={isConfirming}>
            {isConfirming ? 'Deleting...' : confirmButtonText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;