// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode"; // Ensure installed: npm install jwt-decode

// Define initial context structure
const initialContext = {
  user: null,
  token: null,
  login: async (token) => {},
  logout: () => {},
  isAuthLoading: true, // Tracks ONLY the initial authentication check state
  fetchAndUpdateUser: async () => null,
};

export const AuthContext = createContext(initialContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  // isAuthLoading is now primarily for the *initial* determination of auth status
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- Reusable Function to Fetch User Data ---
  // Accepts flag to determine if it should affect the global initial loading state
  const fetchUserData = useCallback(async (currentToken, isInitialLoad = false) => {
    // Reset user state if no token is provided
    if (!currentToken) {
      console.log("fetchUserData: No token provided.");
      setUser(null);
      if (isInitialLoad) setIsAuthLoading(false); // Finish initial loading if no token
      return null;
    }

    // --- Only set global loading true on the very first check ---
    if (isInitialLoad) {
        console.log("fetchUserData: Initial auth check starting...");
        setIsAuthLoading(true);
    } else {
         console.log("fetchUserData: Background refresh or post-login fetch starting...");
         // DO NOT set global loading true for background refreshes
    }

    let decodedToken;
    try {
      // Basic token validation (structure and expiry)
      decodedToken = jwtDecode(currentToken);
      if (!decodedToken.id || !decodedToken.role) throw new Error('Token missing required fields');
      const now = Date.now().valueOf() / 1000;
      if (typeof decodedToken.exp !== 'undefined' && decodedToken.exp < now) throw new Error('Token expired');
    } catch (decodeError) {
      console.error("fetchUserData: Invalid or expired token.", decodeError);
      localStorage.removeItem("token"); // Clean up bad token
      setToken(null); // Update token state (triggers useEffect to confirm logged-out state)
      setUser(null);
      if (isInitialLoad) setIsAuthLoading(false); // Finish initial loading on error
      return null;
    }

    // Determine backend endpoint (ensure this endpoint returns FULL user data)
    const endpoint = `http://localhost:5001/api/user/profile`; // Assuming one profile endpoint
    console.log(`fetchUserData: Fetching profile from ${endpoint}`);

    try {
      // Fetch user data from backend, authenticating with the token
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (!response.ok) {
        const status = response.status;
        console.warn(`fetchUserData: Backend verification failed - ${status} ${response.statusText}`);
        // If backend rejects token (401/403), treat as logout
        if (status === 401 || status === 403) throw new Error(`Backend rejected token (${status})`);
        // For other errors, still treat as failed fetch
        throw new Error(`Failed to fetch user data (${status})`);
      }

      const userData = await response.json();
      console.log("fetchUserData: Received user data:", userData);

      // Validate received data structure (at least an ID)
      if (userData && (userData.id || userData._id)) {
        console.log("fetchUserData: Setting user state.");
        setUser(userData); // Set the full, validated user data
        if (isInitialLoad) setIsAuthLoading(false); // Finish initial loading successfully
        return userData; // Return data
      } else {
        // Backend returned 200 OK but data is invalid/incomplete
        console.warn("fetchUserData: Fetched data invalid (missing id).", userData);
        throw new Error("Invalid user data received from backend");
      }
    } catch (error) {
      // Catch errors from fetch or data validation
      console.error("fetchUserData: Auth verification/fetch error:", error.message);
      localStorage.removeItem("token"); // Clean up storage
      setToken(null); // Update token state (triggers useEffect)
      setUser(null);
      if (isInitialLoad) setIsAuthLoading(false); // Finish initial loading on error
      return null;
    }
    // NOTE: No finally block setting isAuthLoading false here,
    // it's handled within the logic based on isInitialLoad flag.
  }, []); // useCallback dependencies are empty


  // --- Effect for Initial Load / Token Changes ---
  // Runs once on mount and again if the token state changes (e.g., after login/logout)
  useEffect(() => {
    const currentToken = localStorage.getItem("token"); // Check storage directly on load/change
    console.log("AuthProvider Effect: Initial load or token state changed. Token in storage:", currentToken ? "Exists" : "None");
    // Pass 'true' for isInitialLoad ONLY during this initial check phase
    fetchUserData(currentToken, true);
  }, [token, fetchUserData]); // Depend on token state and the memoized fetch function


  // --- Login Function ---
  const login = useCallback(async (newToken) => {
    console.log(`AuthProvider (Login): Login called.`);
    if (!newToken) { console.error("Login Error: No token provided."); return; }
    console.log(`AuthProvider (Login): Storing new token.`);
    localStorage.setItem("token", newToken);
    // Update the token *state*. This will trigger the useEffect above,
    // which will call fetchUserData(newToken, true) <- marking it as the initial load/verification for this session.
    setToken(newToken);
    // No need to call fetchUserData directly here or manage loading state,
    // the useEffect handles the post-login fetch and loading state management.
  }, []); // No dependencies


  // --- Logout Function ---
  const logout = useCallback(() => {
    console.log("AuthProvider: Logging out.");
    setUser(null); // Clear user state first
    localStorage.removeItem("token");
    setToken(null); // Clear token state (this triggers useEffect which confirms logged-out state)
  }, []);


  // --- Refresh Function (Called by SubsPage, DropIn, etc.) ---
  // This performs a background update WITHOUT affecting global loading state
  const fetchAndUpdateUser = useCallback(async () => {
    console.log("AuthProvider: fetchAndUpdateUser (background refresh) called");
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
        console.warn("fetchAndUpdateUser: No token found for refresh.");
        // If user state still exists somehow, log them out properly
        if (user) logout();
        return null;
    }
    // Call fetchUserData but explicitly mark it as NOT the initial load
    return await fetchUserData(currentToken, false); // <-- Pass false here
  }, [fetchUserData, user, logout]); // Dependencies ensure correct functions are used


  // --- Context Value ---
  const value = {
    user,
    token,
    login,
    logout,
    isAuthLoading, // Expose the initial loading state
    fetchAndUpdateUser, // Expose the background refresh function
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Still show loading indicator during the *initial* auth check */}
      {isAuthLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>
                {/* You can replace this with a proper Spinner component */}
                Loading Session...
            </div>
        ) : (
            children // Render the rest of the app once initial check is done
        )}
    </AuthContext.Provider>
  );
};

// --- Custom Hook ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};