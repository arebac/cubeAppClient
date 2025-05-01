import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/loginpage.module.css'; // Ensure CSS path is correct

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Get context functions and state
    const { login, user, isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (!isAuthLoading && user) {
            console.log("LoginPage: User already logged in, redirecting to dashboard.");
            navigate('/dashboard', { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Please enter both email and password.');
            setLoading(false);
            return;
        }

        try {
            // --- Step 1: Call Backend API ---
            console.log(`LoginPage: Attempting login for ${email}`);
            const res = await fetch("http://localhost:5001/api/auth/login", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ email, password }), // Send email and password
            });

            const data = await res.json(); // Get the response body

            // --- Step 2: Check API Response ---
            if (!res.ok) {
                // Use error from backend response if available
                throw new Error(data.error || data.message || `Login failed (${res.status})`);
            }

            // --- Step 3: Extract Token and Role ---
            console.log("LoginPage: Backend login successful, response data:", data);
            if (data.token && data.role) {
                // --- Step 4: Call Context Login Function ---
                // Pass the received token and role to the context
                await login(data.token, data.role);

                // --- Step 5: Navigate (Optional - ProtectedRoute often handles this) ---
                // You can navigate here, or let the state update trigger ProtectedRoute
                console.log("LoginPage: Login successful, navigating to dashboard.");
                navigate('/dashboard', { replace: true });

            } else {
                // Backend didn't return expected data
                throw new Error("Login succeeded but session data is missing from response.");
            }

        } catch (err) {
            // Catch errors from fetch or context login
            console.error("LoginPage Error:", err);
            setError(err.message || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false); // Ensure loading is always turned off
        }
    };

    // --- Render Logic ---
    if (isAuthLoading) {
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
                            autoComplete="email"
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
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <button type="submit" className={styles.btn} disabled={loading}>
                        {loading ? 'Logging In...' : 'Login'}
                    </button>
                </form>
                <p className={styles.switchPageLink}>
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;