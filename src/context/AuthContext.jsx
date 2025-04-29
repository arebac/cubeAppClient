// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // Ensure installed: npm install jwt-decode

// Define initial context structure
const initialContext = {
  user: null,
  login: async (token, role) => {}, // Async placeholder
  logout: () => {},
  isAuthLoading: true, // Start as true until initial check completes
};

export const AuthContext = createContext(initialContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Tracks initial load AND post-login fetch

  // --- Verify User on Initial Load ---
  useEffect(() => {
    const verifyUserOnLoad = async () => {
      console.log("AuthProvider (Load): Checking for token...");
      setIsAuthLoading(true); // Start loading check
      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        setIsAuthLoading(false);
        console.log("AuthProvider (Load): No token found.");
        return;
      }

      // Decode locally first to determine role and basic validation
      let decodedToken;
      try {
        decodedToken = jwtDecode(token);
        // Optional: Check expiry locally (jwtDecode doesn't verify signature/expiry)
        // const now = Date.now().valueOf() / 1000;
        // if (typeof decodedToken.exp !== 'undefined' && decodedToken.exp < now) {
        //     console.log("AuthProvider (Load): Token expired locally.");
        //     throw new Error('Token expired');
        // }
        if (!decodedToken.id || !decodedToken.role) {
             throw new Error('Token missing required fields (id, role)');
        }
      } catch (decodeError) {
          console.error("AuthProvider (Load): Invalid token found in storage.", decodeError);
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          setUser(null);
          setIsAuthLoading(false);
          return;
      }

      console.log("AuthProvider (Load): Token seems valid locally, verifying with backend...");
      const roleToUse = decodedToken.role; // Use role from token

      try {
        const endpoint = roleToUse === 'admin'
            ? `http://localhost:5001/api/user/admin`
            : `http://localhost:5001/api/user/user`;

        console.log(`AuthProvider (Load): Verifying with role '${roleToUse}' at ${endpoint}`);

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          console.warn(`AuthProvider (Load): Backend token verification failed - ${response.status}`);
          throw new Error(`Token verification failed`); // Backend rejected token
        }

        const userData = await response.json();

        // Ensure backend response includes critical info
        if (userData && (userData.id || userData._id) && userData.role) {
          console.log("AuthProvider (Load): User verified successfully via backend.", userData);
          setUser(userData); // Set full user data
        } else {
          console.warn("AuthProvider (Load): Verification OK but invalid/incomplete user data.", userData);
          throw new Error("Invalid user data received");
        }
      } catch (error) {
        console.error("AuthProvider (Load): Auth verification error:", error.message);
        // Clear storage if backend verification fails
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setUser(null);
      } finally {
        setIsAuthLoading(false); // Auth check finished (success or fail)
        console.log("AuthProvider (Load): Initial auth check complete.");
      }
    };

    verifyUserOnLoad();
  }, []); // Run only once on mount


  // --- Login Function ---
  // Receives token & role confirmed by the backend /login route
  const login = async (token, role) => {
    console.log(`AuthProvider (Login): Login called. Role: ${role}`);
    console.log(`AuthProvider (Login): Received Token: ${token ? token.substring(0, 20) + '...' : 'null'}`);

    // 1. Store Token and Role immediately
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);

    // 2. Immediately set basic user state from decoded token
    // This provides instant feedback and allows protected routes to work
    let basicUserData = null;
    setIsAuthLoading(true); // Indicate we are processing login state
    try {
        const decoded = jwtDecode(token);
        if (decoded && decoded.id && decoded.role) {
             basicUserData = {
                id: decoded.id, // Use ID from token payload
                // Use role from token payload primarily (should match 'role' arg)
                role: decoded.role,
                name: 'Authenticated User' // Placeholder until full data loads
             };
            console.log("AuthProvider (Login): Setting initial basic user state:", basicUserData);
            setUser(basicUserData);
        } else {
            console.error("AuthProvider (Login): Failed to decode token or token missing required fields.");
            throw new Error("Invalid token structure received after login.");
        }
    } catch(decodeError){
         console.error("AuthProvider (Login): Error decoding received token:", decodeError);
         logout(); // Call logout to clear everything if token is bad
         setIsAuthLoading(false);
         // Re-throw the error so the calling component (LoginPage) knows it failed
         throw new Error("Failed to process session token.");
    }

    // 3. Attempt to Fetch Full User Details (Background Update)
    // This updates the basic state with name, email, subscription etc.
    try {
        const endpoint = role === 'admin'
            ? `http://localhost:5001/api/user/admin`
            : `http://localhost:5001/api/user/user`;

        console.log(`AuthProvider (Login): Fetching full user details from ${endpoint}...`);
        const response = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` }, // Use the new token
        });
        const fullUserData = await response.json();

        if (!response.ok) {
            // Log the error but DON'T clear the basic user state/token here
            // unless it's specifically a 401/403 suggesting the token IS invalid.
            console.error(`AuthProvider (Login): Failed to fetch full user details - ${response.status}`, fullUserData.message || '(No error message)');
            if (response.status === 401 || response.status === 403) {
                // If backend explicitly rejects token fetching full details, then logout
                 console.error("AuthProvider (Login): Backend rejected token when fetching full details. Logging out.");
                 logout();
                 // Optionally throw an error back to LoginPage
                 // throw new Error("Session validation failed after login.");
            }
            // For other errors (e.g., 500), we keep the basic logged-in state.
        } else if (fullUserData && (fullUserData.id || fullUserData._id)) {
            console.log("AuthProvider (Login): Full user details fetched successfully.", fullUserData);
            setUser(fullUserData); // Update state with full details
        } else {
             console.warn("AuthProvider (Login): Fetched full user data seems invalid (missing id?).", fullUserData);
             // Keep basic user data? Or logout? Let's keep basic for now.
        }
    } catch (fetchError) {
         console.error("AuthProvider (Login): Network/fetch error getting full user details:", fetchError);
         // Keep basic user data, don't log out on network errors
    } finally {
        setIsAuthLoading(false); // Finished all login processing attempts
        console.log("AuthProvider (Login): Post-login process complete.");
    }
  };

  // --- Logout Function ---
  const logout = () => {
    console.log("AuthProvider: Logging out.");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setIsAuthLoading(false); // Ensure loading is false after logout
  };

  // --- Context Value ---
  const value = {
    user,
    login,
    logout,
    isAuthLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook ---
export const useAuth = () => useContext(AuthContext);