// src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/auth.module.css'; // Use the new shared auth styles

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(''); // For success/info messages
    const [error, setError] = useState('');     // For error messages
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(''); // Clear previous messages
        setError('');   // Clear previous errors

        if (!email) {
            setError('Please enter your email address.');
            setIsLoading(false);
            return;
        }

        try {
            // --- Ensure this URL matches your backend ---
            const response = await fetch('http://localhost:5001/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            // --- --- --- --- --- --- --- --- --- --- ---

            const data = await response.json();

            if (!response.ok) {
                // Use message from backend if available, otherwise a generic one
                throw new Error(data.message || 'Failed to send password reset link.');
            }
            // Display the generic success message from backend
            setMessage(data.message);
            setEmail(''); // Clear email field on success
        } catch (err) {
            console.error("Forgot Password Error:", err);
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.authCard}>
                <h2>Forgot Your Password?</h2>
                <p className={styles.instructions}>
                    No worries! Enter your email address below, and if an account exists, we'll send you a link to reset your password.
                </p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Display messages */}
                    {message && <p className={`${styles.message} ${styles.successMessage}`}>{message}</p>}
                    {error && <p className={`${styles.message} ${styles.errorMessage}`}>{error}</p>}

                    <button type="submit" className={styles.authButton} disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
                <div className={styles.links}>
                    <Link to="/login">Remembered your password? Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;