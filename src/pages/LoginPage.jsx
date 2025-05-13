import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Ensure Link is imported
import { useAuth } from '../context/AuthContext';
import styles from '../styles/loginpage.module.css'; // Ensure CSS path is correct

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Get context functions and state
    // IMPORTANT: The 'login' function in AuthContext now only expects 'token'.
    // The role is derived from the token inside AuthContext.
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
            console.log(`LoginPage: Attempting login for ${email}`);
            const res = await fetch("http://localhost:5001/api/auth/login", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `Login failed (${res.status})`);
            }

            console.log("LoginPage: Backend login successful, response data:", data);
            if (data.token) { // Only check for 'token' now, as 'role' is handled by AuthContext
                // --- FIX: Pass ONLY the token to the context login function ---
                await login(data.token);
                // --- END FIX ---

                console.log("LoginPage: Login successful, navigating to dashboard.");
                navigate('/dashboard', { replace: true });

            } else {
                throw new Error("Login succeeded but session token is missing from response.");
            }

        } catch (err) {
            console.error("LoginPage Error:", err);
            setError(err.message || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    // --- Render Logic ---
    if (isAuthLoading) {
        return <div className={styles.container}><p className={styles.loadingText}>Loading...</p></div>; // Use styles.loadingText if defined
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
                    <br /> {/* Add a line break for spacing */}
                    {/* --- ADDED: Forgot Password Link --- */}
                    <Link to="/forgot-password">Forgot Password?</Link>
                    {/* --- END ADDED --- */}
                </p>
            </div>
        </div>
    );
};

export default LoginPage;