// src/pages/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from '../styles/auth.module.css'; // Use the shared auth styles

const ResetPasswordPage = () => {
    const { token } = useParams(); // Get token from URL parameter (e.g., /reset-password/THIS_TOKEN_PART)
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid password reset link. The token is missing.');
            // Optionally navigate away if token is crucial and missing on load
            // setTimeout(() => navigate('/forgot-password'), 3000);
        }
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!token) {
            setError('Invalid or missing reset token. Please request a new link.');
            return;
        }
        if (!password || !confirmPassword) {
            setError('Both password fields are required.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) { // Basic password strength check
            setError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            // --- Ensure this URL matches your backend, including the token parameter ---
            const response = await fetch(`http://localhost:5001/api/auth/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, confirmPassword }),
            });
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to reset password. The link may have expired or been used.');
            }
            setMessage(data.message + " You will be redirected to login shortly.");
            setPassword(''); // Clear fields
            setConfirmPassword('');
            setTimeout(() => {
                navigate('/login'); // Redirect to login page on success
            }, 3000); // Redirect after 3 seconds
        } catch (err) {
            console.error("Reset Password Error:", err);
            setError(err.message || 'An unexpected error occurred. Please try again or request a new reset link.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.authCard}>
                <h2>Reset Your Password</h2>
                {!token && error ? ( // Show only error if token is missing from URL initially
                    <p className={`${styles.message} ${styles.errorMessage}`}>{error}</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="password">New Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                                disabled={isLoading || !token}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm new password"
                                disabled={isLoading || !token}
                            />
                        </div>

                        {message && <p className={`${styles.message} ${styles.successMessage}`}>{message}</p>}
                        {error && <p className={`${styles.message} ${styles.errorMessage}`}>{error}</p>}

                        <button type="submit" className={styles.authButton} disabled={isLoading || !token}>
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
                <div className={styles.links}>
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;