// src/components/Modal.jsx
import React, { useEffect } from 'react';
import styles from '../components/modal.module.css'; // Import CSS for the modal itself

const Modal = ({ children, onClose }) => {
    // Close modal on Escape key press
    useEffect(() => {
        const handleEsc = (event) => {
           if (event.key === 'Escape') {
              onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);

        // Cleanup listener
        return () => {
           window.removeEventListener('keydown', handleEsc);
        };
     }, [onClose]); // Dependency array includes onClose

    // Close modal if overlay is clicked
    const handleOverlayClick = (e) => {
        // Check if the click is directly on the overlay, not the content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        // Overlay fills the screen
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            {/* Content container prevents click propagation */}
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                {/* Render whatever content is passed in */}
                {children}
            </div>
        </div>
    );
};

export default Modal; // Export as default