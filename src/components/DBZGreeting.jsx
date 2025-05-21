// src/components/DbzGreetingModal.js
import React from 'react';
import styles from '../components/dbzgreeting.module.css';

const DbzGreetingModal = ({ isOpen, onClose, gifUrl }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}> {/* Prevents closing when clicking content */}
        <img src={gifUrl} alt="DBZ Greeting" className={styles.gifImage} />
      </div>
    </div>
  );
};

export default DbzGreetingModal;