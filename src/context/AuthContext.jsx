import React, { createContext, useContext, useState, useEffect } from "react";

// Define initial context structure (optional but good practice)
const initialContext = {
  user: null,
  login: async (token, role) => {}, // Placeholder async function
  logout: () => {},
  isAuthLoading: true, // Default loading state
};

export const AuthContext = createContext(initialContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Holds user data (or null)
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Tracks initial auth check

  // Check local storage for token on initial app load
  useEffect(() => {
    const verifyUserOnLoad = async () => {
      const token = localStorage.getItem("token");
      // Role might not be needed here if token verification returns it,
      // but keep it if your /user or /admin endpoint doesn't return role
      const storedRole = localStorage.getItem("role"); // Get role stored during login

      if (!token) {
        setUser(null);
        setIsAuthLoading(false);
        console.log("AuthProvider: No token found.");
        return;
      }

      console.log("AuthProvider: Token found, verifying...");
      try {
        // Determine which endpoint to hit based on stored role (or token content if preferred)
        // Using storedRole here, but decoding JWT is another option
        const endpoint = storedRole === 'admin'
            ? `http://localhost:5001/api/user/admin` // Your specific admin check endpoint
            : `http://localhost:5001/api/user/user`;   // Your specific user check endpoint

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          // If token is invalid or user deleted, clear storage
          console.warn(`AuthProvider: Token verification failed - ${response.status}`);
          throw new Error(`Token verification failed`); // Trigger catch block
        }

        const userData = await response.json();

        if (userData && (userData.name || userData.email)) { // Check for essential data
            // IMPORTANT: Ensure the backend endpoint returns the 'role'
            console.log("AuthProvider: User verified successfully.", userData);
            setUser(userData); // Set the user data from the response
        } else {
            console.warn("AuthProvider: Verification OK but invalid user data received.");
            throw new Error("Invalid user data");
        }
      } catch (error) {
        console.error("AuthProvider: Auth verification error:", error.message);
        localStorage.removeItem("token");
        localStorage.removeItem("role"); // Clear role if stored
        setUser(null);
      } finally {
        setIsAuthLoading(false); // Auth check finished (success or fail)
        console.log("AuthProvider: Initial auth check complete.");
      }
    };

    verifyUserOnLoad();
  }, []); // Run only once on mount

  // Login Function - receives token and role from backend login response
  const login = async (token, role) => {
    console.log(`AuthProvider: Logging in with role: ${role}`);
    localStorage.setItem("token", token);
    localStorage.setItem("role", role); // Store role if needed for initial check
    setIsAuthLoading(true); // Set loading while fetching user data after login

    try {
        // Fetch user data immediately after successful login to populate context
         const endpoint = role === 'admin'
            ? `http://localhost:5001/api/user/admin`
            : `http://localhost:5001/api/user/user`;

        const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await response.json();

        if (!response.ok) {
            throw new Error(userData.message || 'Failed to fetch user data after login');
        }

        if (userData && (userData.name || userData.email)) {
            console.log("AuthProvider: User data fetched post-login.", userData);
            setUser(userData); // Set user state
        } else {
             throw new Error('Invalid user data received post-login');
        }
    } catch (error) {
        console.error("AuthProvider: Error fetching user data post-login:", error);
        // Clear potentially invalid stored items if fetch fails
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setUser(null);
    } finally {
        setIsAuthLoading(false); // Finished loading post-login data attempt
    }
  };

  // Logout Function
  const logout = () => {
    console.log("AuthProvider: Logging out.");
    setUser(null); // Clear user state
    localStorage.removeItem("token"); // Clear token from storage
    localStorage.removeItem("role"); // Clear role from storage
    // No need to set loading state here
  };

  // Context value provided to consuming components
  const value = {
      user,
      login,
      logout,
      isAuthLoading // Provide loading state
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily consume the context
export const useAuth = () => useContext(AuthContext);