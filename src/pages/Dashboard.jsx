import React, { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css"; // Adjust path if using styles folder
import { useNavigate } from "react-router-dom";
// Ensure useAuth exports user, logout, isAuthLoading, and fetchAndUpdateUser
import { useAuth } from "../context/AuthContext";
import { format, parse, getDay, nextDay, formatISO } from 'date-fns';

const Dashboard = () => {
  // Destructure what's needed from AuthContext
  const { user, logout, isAuthLoading, fetchAndUpdateUser } = useAuth();
  const navigate = useNavigate();

  // State for the dashboard's specific data (schedule)
  const [scheduleData, setScheduleData] = useState([]);
  const [showScheduleView, setShowScheduleView] = useState(false); // Controls card flip
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null); // Error for fetching schedule
  const [actionError, setActionError] = useState(null); // Error for actions like dropping
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null); // Success message for actions

  // State for UI feedback during actions
  const [dropOrToggleLoading, setDropOrToggleLoading] = useState(null); // ID of class being acted upon
  const [expandedClassId, setExpandedClassId] = useState(null); // For coach view

  // Derive user role from the user object in context
  // The 'user' object here will re-render this component when it changes in AuthContext
  const dashboardUserData = (!isAuthLoading && user) ? user : null;
  const userRole = dashboardUserData?.role || 'user';

  console.log("Dashboard rendered. AuthLoading:", isAuthLoading, "User from context:", dashboardUserData);

  // Fetch Schedule Data (My Reservations or Coached Classes)
  const fetchScheduleData = async () => {
    if (!dashboardUserData || !(dashboardUserData.id || dashboardUserData._id)) {
         console.log("fetchScheduleData: No user or user ID to fetch schedule.");
         // Don't set an error here, just don't fetch if no user
         return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setScheduleError("Authentication token missing for schedule fetch.");
      return;
    }

    console.log(`[Dashboard Fetch Schedule] Token from localStorage: `, token ? "Exists" : "Missing");
    setScheduleLoading(true);
    setScheduleError(null); // Clear previous schedule errors
    setActionError(null); // Clear previous action errors
    setActionSuccessMessage(null); // Clear previous success messages
    // setScheduleData([]); // Optionally clear old data, or let it persist until new data arrives

    const endpoint = userRole === 'coach'
      ? `http://localhost:5001/api/user/coaching-schedule` // Ensure correct endpoint
      : `http://localhost:5001/api/user/my-reservations`;  // Ensure correct endpoint

    let fetchUrl = endpoint;
    if (userRole === 'coach') {
      const todayDateString = formatISO(new Date(), { representation: 'date' });
      fetchUrl = `${endpoint}?date=${todayDateString}`;
    }
    console.log(`Fetching schedule from: ${fetchUrl}`);

    try {
      const res = await fetch(fetchUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let errorMsg = `Failed to fetch schedule: ${res.status}`;
        try { const errorData = await res.json(); errorMsg = errorData.message || errorMsg; } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await res.json();
      console.log("Fetched schedule data:", data);
      setScheduleData(data);
    } catch (error) {
      console.error(`❌ Error fetching ${userRole} schedule:`, error);
      setScheduleError(error.message || `Could not load ${userRole} schedule.`);
      setScheduleData([]); // Clear data on error
    } finally {
      setScheduleLoading(false);
    }
  };

  // --- Effect to fetch schedule data when the user is available or role changes ---
  // This is important if the component loads before user data is fully ready,
  // or if the user data (like role) might change.
  useEffect(() => {
    if (dashboardUserData && (dashboardUserData.id || dashboardUserData._id) && showScheduleView) {
        console.log("useEffect [dashboardUserData, showScheduleView]: Fetching schedule data because user is available and schedule view is active.");
        fetchScheduleData();
    } else if (!dashboardUserData && showScheduleView) {
        console.log("useEffect [dashboardUserData, showScheduleView]: Schedule view active but no user data, clearing schedule.");
        setScheduleData([]); // Clear schedule if user logs out while view is active
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardUserData, showScheduleView]); // Re-run if user data changes or view toggles
  // Note: Added eslint-disable for fetchScheduleData as it's stable if not memoized,
  // but for strictness, you could wrap fetchScheduleData in useCallback.

  // Toggle Flip View
  const handleToggleScheduleView = () => {
    const willShow = !showScheduleView;
    setShowScheduleView(willShow);
    setActionError(null); // Clear errors when flipping
    setActionSuccessMessage(null);
    // If flipping to schedule view and data hasn't been loaded yet
    if (willShow && scheduleData.length === 0 && !scheduleLoading && dashboardUserData) {
      console.log("Flipping to schedule view, fetching initial schedule data.");
      fetchScheduleData();
    }
  };

  // Handle Dropping a Class (User only)
  const handleDropClass = async (classId) => {
    if (!dashboardUserData || !(dashboardUserData.id || dashboardUserData._id)) {
        setActionError("Authentication error. Please log in to drop a class.");
        return;
    }
    if (!classId) {
        setActionError("Invalid class information for dropping.");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        setActionError("Authentication session missing. Please log in again.");
        return;
    }

    setDropOrToggleLoading(classId); // Show loading on the specific button
    setActionError(null); // Clear previous action errors
    setActionSuccessMessage(null); // Clear previous success messages

    console.log(`[Dashboard Drop Class] User: ${dashboardUserData.id || dashboardUserData._id} attempting to drop Class: ${classId}`);

    try {
        const res = await fetch("http://localhost:5001/api/user/drop-reservation", { // Verify this endpoint
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ classId: classId }),
        });

        const result = await res.json(); // Always try to parse JSON

        if (!res.ok) {
            // Use message from backend response if available
            throw new Error(result.message || `Failed to drop class: ${res.status}`);
        }

        console.log("✅ Class dropped successfully (backend response):", result);
        setActionSuccessMessage(result.message || "Class dropped successfully and token refunded!"); // Set success message

        // --- REFRESH DATA ---
        // 1. Refresh the list of reservations displayed on the dashboard
        fetchScheduleData();

        // 2. Refresh the global user state (to update token count displayed on THIS page)
        if (typeof fetchAndUpdateUser === 'function') {
            console.log("[Dashboard Drop Class] Calling fetchAndUpdateUser to refresh global user data.");
            await fetchAndUpdateUser(); // Await to ensure context is updated before potential re-renders
            console.log("[Dashboard Drop Class] Global user data refresh complete.");
        } else {
            console.warn("[Dashboard Drop Class] fetchAndUpdateUser not available in AuthContext. Token count might be stale until next full refresh/login.");
        }
        // --- --- --- --- --- ---

    } catch (error) {
        console.error("❌ Error dropping class:", error);
        setActionError(error.message || "Could not drop the class.");
    } finally {
        setDropOrToggleLoading(null); // Hide loading state for button
    }
  };

  // Handle Toggling Attendee List (Coach only)
  const handleToggleAttendees = (classId) => {
    if (userRole !== 'coach') return;
    setExpandedClassId(prevId => (prevId === classId ? null : prevId));
  };

  // Handle Logout
  const handleLogout = () => {
    logout(); // From AuthContext
    navigate("/"); // Redirect to home or login page
  };

  // Date Helper (Keep as is)
  const getNextDateForDay = (dayOfWeek) => { /* ... your existing logic ... */
    const today = new Date(); const currentDay = getDay(today); try { const targetDay = Number(dayOfWeek); if (isNaN(targetDay) || targetDay < 0 || targetDay > 6) throw new Error(`Invalid day: ${dayOfWeek}`); return (currentDay === targetDay) ? today : nextDay(today, targetDay); } catch (e) { console.error("Date calc error:", e); return null; }
  };


  // --- Render Logic ---
  if (isAuthLoading) {
    // Show a full-page loader if initial auth check is happening
    return <div className={styles.container}><p className={styles.loadingText}>Loading Dashboard...</p></div>;
  }
  if (!dashboardUserData) {
    // If not loading and no user, prompt to log in
    return <div className={styles.container}><p className={styles.errorText}>Please log in to view your dashboard.</p></div>;
  }

  const scheduleButtonText = userRole === 'coach' ? 'My Classes' : 'My Reservations';
  const scheduleTitleText = userRole === 'coach' ? 'My Coached Classes (Today)' : 'My Upcoming Classes';

  return (
    <div className={styles.container}>
      {/* Main Card with Flip Animation */}
      <div className={`${styles.card} ${showScheduleView ? styles.cardFlipped : ''}`}>

        {/* ===== FRONT FACE (User Info & Subscription) ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceFront}`}>
          <div className={styles.header}>
            {/* Display user's name from AuthContext user object */}
            <h1 className={styles.title}>Welcome, {dashboardUserData.name}!</h1>
          </div>
          <div className={styles.section}>
            <h2>User Info</h2>
            <p><strong>Email:</strong> {dashboardUserData.email}</p>
            <p><strong>Phone:</strong> {dashboardUserData.phone || 'N/A'}</p>
            <p><strong>Fitness Level:</strong> {dashboardUserData.fitnessLevel || 'N/A'}</p>
          </div>
          {userRole === 'user' && (
            <div className={styles.section}>
              <h2>Subscription</h2>
              {/* Display subscription details from AuthContext user object */}
              <p><strong>Plan:</strong> {dashboardUserData.subscriptionPlan || "No active subscription"}</p>
              <p><strong>Tokens:</strong> {typeof dashboardUserData.tokens === 'number' ? dashboardUserData.tokens : 'N/A'}</p>
              <p><strong>Expires:</strong> {dashboardUserData.subscriptionExpiresAt ? format(new Date(dashboardUserData.subscriptionExpiresAt), 'PPP') : 'N/A'}</p>
            </div>
          )}
          <div className={styles.actions}>
            <button
              type="button" // Good practice
              className={styles.btn}
              onClick={handleToggleScheduleView}
              disabled={scheduleLoading && !showScheduleView} // Disable if schedule is loading for the back face
            >
              {showScheduleView ? "View Dashboard" : scheduleButtonText}
            </button>
            <button type="button" onClick={handleLogout} className={styles.btn}>Log Out</button>
          </div>
        </div>
        {/* ===== END FRONT FACE ===== */}

        {/* ===== BACK FACE (Reservations / Coached Classes) ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceBack}`}>
          <div className={styles.reservationsContainer}>
            <h2>{scheduleTitleText}</h2>

            {/* Display feedback for actions on this face */}
            {actionError && <p className={styles.errorText}>{actionError}</p>}
            {actionSuccessMessage && <p className={styles.successText}>{actionSuccessMessage}</p>}

            {scheduleLoading && <p className={styles.loadingText}>Loading schedule...</p>}
            {scheduleError && !scheduleLoading && <p className={styles.errorText}>Error: {scheduleError}</p>}

            {!scheduleLoading && !scheduleError && (
              scheduleData.length > 0 ? (
                <div className={styles.reservationsGrid}>
                  {scheduleData.map(item => {
                    // ... (your existing map logic for displaying each reservation/class item) ...
                    // Ensure the "Drop" button calls handleDropClass(item._id) for user reservations
                    let timeString = `${item.startTime} - ${item.endTime}`;
                    try { const start = parse(item.startTime, "H:mm", new Date()); const end = parse(item.endTime, "H:mm", new Date()); if (!isNaN(start) && !isNaN(end)) timeString = `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`; } catch (e) {}
                    const nextOccurrenceDate = getNextDateForDay(item.dayOfWeek);
                    const isLoadingAction = dropOrToggleLoading === item._id;
                    const isExpanded = expandedClassId === item._id;

                    return userRole === 'coach' ? (
                      <div key={item._id} className={`${styles.reservationCard} ${styles.coachCard}`}>
                        <h3>{item.title}</h3> <p>{timeString}</p>
                        <p className={styles.attendeeCount}>Attendees: {item.attendees?.length ?? 0} / {item.max_capacity}</p>
                        <button className={styles.btnToggleAttendees} onClick={() => handleToggleAttendees(item._id)} disabled={isLoadingAction}>
                          {isExpanded ? 'Hide List' : 'View Attendees'}
                        </button>
                        {isExpanded && ( <div className={styles.attendeeList}> {/* ... attendee list ... */} </div> )}
                      </div>
                    ) : (
                      <div key={item._id} className={styles.reservationCard}>
                        <h3>{nextOccurrenceDate ? format(nextOccurrenceDate, 'EEEE, MMM d') : `Day ${item.dayOfWeek}`}</h3>
                        <p> {item.title}<br />{timeString} </p>
                        <button
                          type="button" // Good practice
                          className={styles.btnDrop}
                          onClick={() => handleDropClass(item._id)} // Calls the updated handler
                          disabled={isLoadingAction} >
                          {isLoadingAction ? 'Dropping...' : 'Drop'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.noReservations}>No {userRole === 'coach' ? 'classes found for today' : 'upcoming reservations'}.</p>
              )
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={handleToggleScheduleView}>View Dashboard</button>
            </div>
          </div>
        </div>
        {/* ===== END BACK FACE ===== */}
      </div>
    </div>
  );
};

export default Dashboard;