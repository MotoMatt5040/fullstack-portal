import React from 'react';
import Icon from '@mdi/react';
import { mdiAlertOutline } from '@mdi/js';
import { Modal } from './Modal';

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
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div style={{ padding: '1.5rem', textAlign: 'center' }}>
        <Icon
          path={mdiAlertOutline}
          size={2.5}
          style={{ color: 'var(--toast-warning, #f59e0b)', marginBottom: '1rem' }}
        />
        <h2 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>
          Unsaved Changes
        </h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--label-text-color)' }}>
          You have unsaved changes that will be lost if you leave this page.
          Are you sure you want to continue?
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color-soft)',
              background: 'transparent',
              color: 'var(--text-color)',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Stay on Page
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--toast-error, #ef4444)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Leave Page
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UnsavedChangesModal;
