import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // <-- IMPORT THIS
// Define initial context structure (optional but good practice)
const initialContext = {
  user: null,
  login: async (token, role) => { }, // Placeholder async function
  logout: () => { },
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
    console.log(`AuthProvider: login called. Role: ${role}`);
    console.log(`AuthProvider: Received Token (length ${token?.length}): ${token ? token.substring(0, 15) + '...' : 'null'}`); // Log safely
    const decoded = jwtDecode(token); // <-- Use jwtDecode() function
    if (decoded && decoded.id) {
        // ... setUser ...
    } else {
        throw new Error("Failed to decode token after login");
    }
    // --- Store Token and Role ---
    localStorage.setItem("token", token);
    localStorage.setItem("role", role); // Store role if needed elsewhere

    // --- TEMPORARY: Set basic user state WITHOUT fetching ---
    console.log("AuthProvider: Bypassing immediate fetch, setting basic user state.");
    try {
        // Decode token locally just to get ID (handle potential errors)
        const decoded = jwt.decode(token); // Use jwt-decode library or similar if needed on client
        if (decoded && decoded.id) {
             // Set a minimal user object - enough for ProtectedRoute to work
            setUser({
                id: decoded.id, // Or use _id if that's what your components expect
                role: role,
                // Add name: 'Loading...' if needed, but main goal is non-null user
            });
            setIsAuthLoading(false); // Indicate we consider auth resolved for now
            console.log("AuthProvider: Minimal user state set:", { id: decoded.id, role: role });
        } else {
            throw new Error("Failed to decode token after login");
        }
    } catch (error) {
         console.error("AuthProvider: Error setting minimal user state after login:", error);
         // If even this fails, clear everything
         localStorage.removeItem("token");
         localStorage.removeItem("role");
         setUser(null);
         setIsAuthLoading(false);
         // Rethrow or handle error appropriately
    }}

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