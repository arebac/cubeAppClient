import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link for registration
import { useAuth } from '../context/AuthContext';
import styles from '../styles/loginpage.module.css'; // We'll create this CSS file

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, user, isAuthLoading } = useAuth(); // Get login function and user state
    const navigate = useNavigate();

    // Redirect if user is already logged in
    useEffect(() => {
        if (!isAuthLoading && user) {
            navigate('/dashboard'); // Redirect to dashboard if already logged in
        }
    }, [user, isAuthLoading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        setLoading(true);

        if (!email || !password) {
            setError('Please enter both email and password.');
            setLoading(false);
            return;
        }

        try {
            // The login function in AuthContext handles the API call & state update
            await login(email, password);
            // Navigation should ideally happen based on user state change,
            // but navigating here after successful promise resolution is common.
            // The useEffect above handles redirection if already logged in on load.
            // If login succeeds here, the user state will update triggering potential redirects
            // in App.jsx or the useEffect above on next render. Let's navigate explicitly:
            navigate('/dashboard'); // Navigate after successful login call

        } catch (err) {
            // If the login function in context throws specific errors or returns failure info
            console.error("Login Page Error:", err);
            // Use a generic message unless the context provides a specific one
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    // Prevent rendering form if auth is still loading initially
    if (isAuthLoading) {
         // You might want a more styled loading indicator matching the theme
        return <div className={styles.container}><p>Loading...</p></div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <h1>Login</h1>
                <form onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <button type="submit" className={styles.btn} disabled={loading}>
                        {loading ? 'Logging In...' : 'Login'}
                    </button>
                </form>
                 <p className={styles.switchPageLink}>
                    Don't have an account? <Link to="/register">Register here</Link>
                 </p>
            </div>
        </div>
    );
};

export default LoginPage;