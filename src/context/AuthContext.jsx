// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"; // Added useMemo
import { jwtDecode } from "jwt-decode";

const initialContext = {
  user: null,
  token: null,
  login: async (token) => {},
  logout: () => {},
  isAuthLoading: true,
  fetchAndUpdateUser: async () => null,
  setUser: () => {}, // Added setUser to initialContext for completeness
};

export const AuthContext = createContext(initialContext);

export const AuthProvider = ({ children }) => {
  const [userState, setUserState] = useState(null); // Renamed to avoid conflict with memoized user
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const fetchUserData = useCallback(async (currentToken, isInitialLoad = false) => {
    if (!currentToken) {
      console.log("fetchUserData: No token provided.");
      setUserState(null); // Use setUserState
      if (isInitialLoad) setIsAuthLoading(false);
      return null;
    }

    if (isInitialLoad) {
        console.log("fetchUserData: Initial auth check starting...");
        setIsAuthLoading(true);
    } else {
         console.log("fetchUserData: Background refresh or post-login fetch starting...");
    }

    let decodedToken;
    try {
      decodedToken = jwtDecode(currentToken);
      if (!decodedToken.id || !decodedToken.role) throw new Error('Token missing required fields');
      const now = Date.now().valueOf() / 1000;
      if (typeof decodedToken.exp !== 'undefined' && decodedToken.exp < now) throw new Error('Token expired');
    } catch (decodeError) {
      console.error("fetchUserData: Invalid or expired token.", decodeError.message);
      localStorage.removeItem("token");
      setToken(null);
      setUserState(null); // Use setUserState
      if (isInitialLoad) setIsAuthLoading(false);
      return null;
    }

    const endpoint = `http://localhost:5001/api/user/profile`;
    console.log(`fetchUserData: Fetching profile from ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text(); // Get error text for better debugging
        console.warn(`fetchUserData: Backend verification failed - ${status} ${response.statusText}. Response: ${errorText.substring(0,100)}`);
        if (status === 401 || status === 403) throw new Error(`Backend rejected token (${status})`);
        throw new Error(`Failed to fetch user data (${status})`);
      }

      const userData = await response.json();
      console.log("fetchUserData: Received user data:", userData);

      if (userData && (userData.id || userData._id)) {
        console.log("fetchUserData: Setting user state.");
        setUserState(userData); // Use setUserState
        if (isInitialLoad) setIsAuthLoading(false);
        return userData;
      } else {
        console.warn("fetchUserData: Fetched data invalid (missing id).", userData);
        throw new Error("Invalid user data received from backend");
      }
    } catch (error) {
      console.error("fetchUserData: Auth verification/fetch error:", error.message);
      localStorage.removeItem("token");
      setToken(null);
      setUserState(null); // Use setUserState
      if (isInitialLoad) setIsAuthLoading(false);
      return null;
    }
  }, []); // Empty dependency array for fetchUserData, it doesn't depend on component state directly

  useEffect(() => {
    const currentTokenInStorage = localStorage.getItem("token");
    console.log("AuthProvider Effect (token change or mount): Token in storage:", currentTokenInStorage ? "Exists" : "None", "Current token state:", token);
    // Fetch user data if token state actually changes or on initial load if token was already in storage
    // This ensures that if token state is set to null by logout, fetchUserData is called with null.
    // And if token is set by login, fetchUserData is called with the new token.
    fetchUserData(token, true); // Pass current token state
  }, [token, fetchUserData]); // Re-run when token state changes or fetchUserData reference changes (should be stable)


  const login = useCallback(async (newToken) => {
    console.log(`AuthProvider (Login): Storing new token.`);
    if (!newToken) { console.error("Login Error: No token provided."); return; }
    localStorage.setItem("token", newToken);
    setToken(newToken); // This will trigger the useEffect above
    // The useEffect will then call fetchUserData with isInitialLoad = true
  }, []);


  const logout = useCallback(() => {
    console.log("AuthProvider: Logging out.");
    setUserState(null); // Use setUserState
    localStorage.removeItem("token");
    setToken(null); // This will trigger the useEffect above
  }, []);


  const fetchAndUpdateUser = useCallback(async () => {
    console.log("AuthProvider: fetchAndUpdateUser (background refresh) called");
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
        console.warn("fetchAndUpdateUser: No token found for refresh.");
        if (userState) logout(); // If user was somehow set, log them out
        return null;
    }
    return await fetchUserData(currentToken, false);
  }, [fetchUserData, userState, logout]); // Added userState and logout as dependencies


  // --- MEMOIZE THE USER OBJECT ---
  const memoizedUser = useMemo(() => userState, [userState]);

  // --- MEMOIZE THE CONTEXT VALUE ---
  const value = useMemo(() => ({
    user: memoizedUser, // Provide the memoized user
    token,
    login,
    logout,
    isAuthLoading,
    fetchAndUpdateUser,
    setUser: setUserState, // Expose the raw setter if needed, though usually through login/logout/fetchAndUpdateUser
  }), [memoizedUser, token, login, logout, isAuthLoading, fetchAndUpdateUser]); // Add memoized functions to deps


  return (
    <AuthContext.Provider value={value}>
      {isAuthLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>
                Loading Session...
            </div>
        ) : (
            children
        )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};