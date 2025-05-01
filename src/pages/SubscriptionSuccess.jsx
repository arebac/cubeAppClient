// src/pages/SubscriptionSuccess.jsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns'; // You're already using date-fns
import { useAuth } from '../context/AuthContext'; // To get user name
import styles from '../styles/SubscriptionSuccess.module.css'; // We'll create this CSS file

const SubscriptionSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth(); // Get user info from context

    // Extract data passed via navigation state
    // Use default empty object {} to prevent errors if state is missing
    const { planName, expiresAt, orderId } = location.state || {};

    // Handle case where someone lands here directly without state
    useEffect(() => {
        if (!location.state) {
            console.warn("SubscriptionSuccess accessed without state. Redirecting.");
            navigate('/dashboard'); // Redirect to dashboard or subs page
        }
    }, [location.state, navigate]);

    // Format the expiry date nicely
    const formattedExpiryDate = expiresAt
        ? format(new Date(expiresAt), 'MMMM d, yyyy') // e.g., "September 15, 2024"
        : 'N/A'; // Fallback if date is missing

    // Don't render if state is missing (redirection will handle it)
    if (!location.state) {
        return <div className={styles.loading}>Loading details...</div>; // Or null
    }

    return (
        <div className={styles.successContainer}>
            <div className={styles.successCard}>
                <div className={styles.icon}>
                    {/* You can use an SVG icon here */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="60px" height="60px">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.06-1.06l-3.094 3.093-1.5-1.5a.75.75 0 0 0-1.06 1.061l2.063 2.063a.75.75 0 0 0 1.06 0l3.625-3.624Z" clipRule="evenodd" />
                    </svg>
                </div>
                <h1 className={styles.title}>
                    Thank You, {user?.name || 'Member'}!
                </h1>
                <p className={styles.message}>
                    Your payment was successful and your subscription is now active.
                </p>
                <div className={styles.details}>
                    <p><strong>Selected Plan:</strong> {planName || 'N/A'}</p>
                    <p><strong>Access Expires On:</strong> {formattedExpiryDate}</p>
                    {orderId && (
                        <p className={styles.reference}>
                            Order Reference: {orderId}
                        </p>
                    )}
                </div>
                <div className={styles.actions}>
                    <Link to="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
                        Go to Dashboard
                    </Link>
                    <Link to="/subscriptions" className={`${styles.btn} ${styles.btnSecondary}`}>
                        View Plans
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionSuccess;