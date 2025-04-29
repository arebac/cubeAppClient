import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/register.module.css'; // Create this CSS file

const RegisterPage = () => {
    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState(''); // Optional
    const [fitnessLevel, setFitnessLevel] = useState(''); // Optional

    // UI/Error state
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const { login, user, isAuthLoading } = useAuth(); // Use login after successful registration
    const navigate = useNavigate();

    // Redirect if user is already logged in
    useEffect(() => {
        if (!isAuthLoading && user) {
            navigate('/dashboard'); // Redirect away from register if logged in
        }
    }, [user, isAuthLoading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        // --- Basic Validations ---
        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all required fields (Name, Email, Password, Confirm Password).');
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }
        if (password.length < 6) { // Example: Minimum password length
            setError('Password must be at least 6 characters long.');
            setLoading(false);
            return;
        }
        // Add more validation if needed (email format, etc.)
        // --- End Validations ---

        // Prepare data for backend (only include optional fields if they have value)
        const registrationData = {
            name,
            email,
            password, // Backend will hash this
            ...(phone && { phone }), // Include phone only if provided
            ...(fitnessLevel && { fitnessLevel }) // Include fitnessLevel only if provided
            // Role defaults to 'user' on the backend for this route
        };

        try {
            const res = await fetch("http://localhost:5001/api/auth/register", { // Use the register endpoint
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registrationData),
            });

            const data = await res.json(); // Always try to parse JSON

            if (!res.ok) {
                // Use error message from backend if available
                throw new Error(data.message || `Registration failed: ${res.status}`);
            }

            // Registration was successful on the backend
            console.log("✅ Registration successful:", data);
            setSuccessMessage('Registration successful! Logging you in...');

            // --- Automatically log the user in ---
            // Use the login function from context with the token/role received
            // from the successful registration response
            if (data.token && data.role) {
                await login(data.token, data.role); // This updates context state
                // Navigate after context state likely updates
                navigate('/dashboard');
            } else {
                // Should not happen if backend sends token/role on success
                setError("Registration succeeded but failed to log in automatically. Please log in manually.");
                navigate('/login'); // Send to login page
            }

        } catch (err) {
            console.error("❌ Registration Page Error:", err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Don't render form while initial auth check is running
     if (isAuthLoading) {
         return <div className={styles.container}><p>Loading...</p></div>;
     }

    return (
        <div className={styles.container}>
            {/* Use registerCard style, similar to loginCard */}
            <div className={styles.registerCard}>
                <h1>Register</h1>
                <form onSubmit={handleSubmit}>
                    {/* Name Input */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    {/* Email Input */}
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
                    {/* Password Input */}
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
                    {/* Confirm Password Input */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    {/* Phone Input (Optional) */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="phone">Phone (Optional)</label>
                        <input
                            type="tel" // Use 'tel' type for phone numbers
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    {/* Fitness Level Input (Optional) */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="fitnessLevel">Fitness Level (Optional)</label>
                        <select // Use a select dropdown for predefined levels?
                            id="fitnessLevel"
                            value={fitnessLevel}
                            onChange={(e) => setFitnessLevel(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select Level...</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            {/* Add other levels as needed */}
                        </select>
                    </div>

                    {/* Display Error/Success Messages */}
                    {error && <p className={styles.errorText}>{error}</p>}
                    {successMessage && <p className={styles.successText}>{successMessage}</p>}

                    {/* Submit Button */}
                    <button type="submit" className={styles.btn} disabled={loading}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                 {/* Link to Login Page */}
                 <p className={styles.switchPageLink}>
                    Already have an account? <Link to="/login">Login here</Link>
                 </p>
            </div>
        </div>
    );
};

export default RegisterPage;