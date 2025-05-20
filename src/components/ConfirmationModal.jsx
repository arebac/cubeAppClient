// src/components/ConfirmationModal.jsx
import React from 'react';
// Use the CSS module specific to this confirmation modal's content
import styles from '../components/confirmationmodal.module.css';
import { FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = styles.btnConfirm,
  cancelButtonClass = styles.btnCancelDialog,
  icon,
  // positionStyle prop is removed as this modal will always be centered via CSS
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    // The .modalOverlay class will handle full screen and centering
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent} // This class handles the modal box appearance
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby="confirmation-modal-message"
      >
        <div className={styles.modalHeader}>
          <h3 id="confirmation-modal-title" className={styles.modalTitle}>
            {icon || <FaExclamationTriangle className={styles.modalTitleIcon} />}
            {title}
          </h3>
          <button onClick={onClose} className={styles.modalCloseButton} aria-label="Close dialog">
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p id="confirmation-modal-message">{message}</p>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={`${styles.btnBase} ${cancelButtonClass}`}>
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} className={`${styles.btnBase} ${confirmButtonClass}`}>
            {confirmText.length < 15 && <FaCheck style={{ marginRight: '6px' }} />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;