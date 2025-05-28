// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// --- Import your page/component files ---
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard"; // Your Dashboard page
import DropIn from "./pages/DropIn"; // Your DropIn page
import SubsPage from "./pages/SubsPage";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage"; // Your Home page
import SubscriptionSuccess from "./pages/SubscriptionSuccess"; // Your Subscription Success page
import ForgotPasswordPage from "./components/ForgotPasswordPage"; // Your Forgot Password page
import ResetPasswordPage from "./pages/ResetPasswordPage"; // Your Reset Password page
import CoachSchedulePage from "./pages/CoachSchedulePage"; // Your Coach Schedule page
import AdminMetricsPage from "./pages/AdminMetricsPage"; // Your Admin Metrics page
// --- Protected Route Component ---
// (This component handles the login check)
function ProtectedRoute({
  children,
  allowedRoles = ["user", "coach", "admin"],
}) {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div>Loading...</div>; // Show loading while checking auth
  }

  if (!user) {
    // ***** KEY CHECK: If no user, redirect to login *****
    console.log("ProtectedRoute: No user found, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Optional: Role check (already handled the no-user case)
    console.warn(`ProtectedRoute: Access denied for role '${user.role}'.`);
    return <Navigate to="/dashboard" replace />; // Or redirect to an unauthorized page
  }

  // User is logged in and has allowed role
  return children;
}
// --- End Protected Route Component ---

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/subs" element={<SubsPage />} />{" "}
          {/* Subs page is public */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          {/* --- PROTECTED DASHBOARD ROUTE --- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {" "}
                {/* Wraps Dashboard */}
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* --- END PROTECTED DASHBOARD ROUTE --- */}
          {/* --- PROTECTED DROP-IN ROUTE --- */}
          <Route
            path="/drop-in"
            element={
              <ProtectedRoute allowedRoles={["user", "coach"]}>
                {" "}
                {/* Wraps DropIn, allows user/coach */}
                <DropIn />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-classes" // Or /coach-schedule, /manage-schedule etc.
            element={
              <ProtectedRoute allowedRoles={["coach", "admin"]}>
                {" "}
                {/* Protect for coach/admin */}
                <CoachSchedulePage />
              </ProtectedRoute>
            }
          />
           {/* Admin Only Route */}
           <Route path="/admin/metrics" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminMetricsPage />
          </ProtectedRoute>
        }
      />
          {/* --- END PROTECTED DROP-IN ROUTE --- */}
          <Route
            path="/subscription-success" // This is the PATH part of the URL
            element={
              <ProtectedRoute>
                {" "}
                {/* Protect this page */}
                <SubscriptionSuccess /> {/* Render your component */}
              </ProtectedRoute>
            }
          />
          {/* Catch-all */}
          <Route path="/home" element={<HomePage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
