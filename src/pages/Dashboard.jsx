import React, { useEffect, useState, useCallback } from "react";
import styles from "../styles/dashboard.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { format, parse, getDay, nextDay, formatISO } from "date-fns"; // formatISO for fetching today's coach schedule

const Dashboard = () => {
  const { user, logout, isAuthLoading, fetchAndUpdateUser } = useAuth();
  const navigate = useNavigate();

  // State
  const [scheduleData, setScheduleData] = useState([]); // Holds classes for coach (today), or reservations for user
  const [showScheduleView, setShowScheduleView] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [actionError, setActionError] = useState(null); // For user drop errors
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null); // For user drop success
  const [userDropLoading, setUserDropLoading] = useState(null);
  const [expandedClassId, setExpandedClassId] = useState(null); // For coach viewing attendees (uses class _id)

  const dashboardUserData = !isAuthLoading && user ? user : null;
  const userRole = dashboardUserData?.role || "user";

  console.log(`Dashboard rendered. AuthLoading: ${isAuthLoading}, User: ${dashboardUserData?._id}, Role: ${userRole}`);

  // --- Data Fetching Logic ---
  const fetchScheduleData = useCallback(async () => {
    if (!dashboardUserData || !(dashboardUserData._id || dashboardUserData.id)) {
      setScheduleData([]); return;
    }
    const token = localStorage.getItem("token");
    if (!token) { setScheduleError("Auth token missing."); setScheduleData([]); return; }

    setScheduleLoading(true);
    setScheduleError(null);
    setActionError(null); // Clear previous action messages
    setActionSuccessMessage(null);

    let fetchUrl;
    if (userRole === 'coach') {
      const todayDateString = formatISO(new Date(), { representation: 'date' });
      // Fetch only today's schedule for the coach, view=day
      fetchUrl = `http://localhost:5001/api/user/coaching-schedule?date=${todayDateString}&view=day`;
    } else { // User
      fetchUrl = `http://localhost:5001/api/user/my-reservations`;
    }
    console.log(`Fetching schedule from: ${fetchUrl}`);

    try {
      const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        let eMsg = `Failed to fetch schedule: ${res.status}`;
        try { const eD = await res.json(); eMsg = eD.message || eMsg; } catch (_) {}
        throw new Error(eMsg);
      }
      const data = await res.json();
      console.log("Fetched schedule data:", data);
      setScheduleData(data);
    } catch (error) {
      console.error(`❌ Error fetching ${userRole} schedule:`, error);
      setScheduleError(error.message || `Could not load schedule.`);
      setScheduleData([]);
    } finally {
      setScheduleLoading(false);
    }
  }, [dashboardUserData, userRole]); // Depends only on these for endpoint construction

  // Effect to fetch data when view is shown OR user data changes
  useEffect(() => {
    if (dashboardUserData && showScheduleView) {
      fetchScheduleData(); // fetchScheduleData internally knows the role and if date is needed
    } else if (!dashboardUserData && showScheduleView) {
      setScheduleData([]);
    }
  }, [dashboardUserData, showScheduleView, fetchScheduleData]); // userRole is a dep of fetchScheduleData


  // --- Event Handlers ---
  const handleToggleScheduleView = () => {
    const willShow = !showScheduleView;
    setShowScheduleView(willShow);
    setActionError(null); setActionSuccessMessage(null);
    if (willShow && scheduleData.length === 0 && !scheduleLoading && dashboardUserData) {
      // If flipping to view and no data yet, fetch.
      // useEffect will also catch this if dashboardUserData was initially null.
      fetchScheduleData();
    }
  };

  const handleDropClass = async (classId) => {
    if (!dashboardUserData || !(dashboardUserData.id || dashboardUserData._id)) { setActionError("Auth error."); return; }
    if (!classId) { setActionError("Invalid class info."); return; }
    const token = localStorage.getItem("token");
    if (!token) { setActionError("Auth session missing."); return; }

    setUserDropLoading(classId); setActionError(null); setActionSuccessMessage(null);
    try {
      const res = await fetch("http://localhost:5001/api/user/drop-reservation", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`}, body: JSON.stringify({ classId }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Drop failed: ${res.status}`);
      setActionSuccessMessage(result.message || "Class dropped & token refunded!");
      if (typeof fetchAndUpdateUser === "function") await fetchAndUpdateUser();
      await fetchScheduleData(); // Refresh user's reservation list
    } catch (error) {
        console.error("❌ Error dropping class:", error);
        setActionError(error.message || "Could not drop class.");
    } finally {
        setUserDropLoading(null);
    }
  };

  // For Coach to view attendees of a class
  const handleToggleCoachAttendees = (classId) => {
    if (userRole !== "coach") return;
    console.log("[Toggle Attendees] Clicked for classId:", classId);
    setExpandedClassId((prevId) => (prevId === classId ? null : classId));
  };

  const handleLogout = () => { logout(); navigate("/"); };

  // For user's "My Reservations" view
  const getNextDateForDay = (dayOfWeek) => {
    if (dayOfWeek === undefined || dayOfWeek === null) {
        console.error("getNextDateForDay: Received invalid dayOfWeek", dayOfWeek);
        return null;
    }
    const t=new Date(),cD=getDay(t);
    try{
        const d=Number(dayOfWeek);
        if(isNaN(d)||d<0||d>6) throw new Error(`Invalid day: ${dayOfWeek}`);
        return cD===d?t:nextDay(t,d);
    } catch(e) {
        console.error("Date calc error in getNextDateForDay:", e, "Input:", dayOfWeek);
        return null;
    }
  };

  // --- Render Logic ---
  if (isAuthLoading) return <div className={styles.container}><p className={styles.loadingText}>Loading Dashboard...</p></div>;
  if (!dashboardUserData) return <div className={styles.container}><p className={styles.errorText}>Please log in to view your dashboard.</p></div>;

  const scheduleButtonText = userRole === "coach" ? "Today's Classes" : "My Reservations";
  const scheduleTitleText = userRole === "coach" ? "Your Classes Today" : "My Upcoming Classes";

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${showScheduleView ? styles.cardFlipped : ""}`}>
        {/* ===== FRONT FACE (User Info & Subscription) ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceFront}`}>
          <div className={styles.header}><h1 className={styles.title}>Welcome, {dashboardUserData.name}!</h1></div>
          <div className={styles.section}><h2>User Info</h2><p><strong>Email:</strong> {dashboardUserData.email}</p><p><strong>Phone:</strong> {dashboardUserData.phone || "N/A"}</p><p><strong>Fitness Level:</strong> {dashboardUserData.fitnessLevel || "N/A"}</p></div>
          {userRole === "user" && (
            <div className={styles.section}>
              <h2>Subscription</h2>
              <p><strong>Plan:</strong> {dashboardUserData.subscriptionPlan || "No active subscription"}</p>
              <p><strong>Tokens:</strong> {typeof dashboardUserData.tokens === "number" ? dashboardUserData.tokens : "N/A"}</p>
              <p><strong>Expires:</strong> {dashboardUserData.subscriptionExpiresAt ? format(new Date(dashboardUserData.subscriptionExpiresAt), "PPP") : "N/A"}</p>
            </div>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={handleToggleScheduleView} disabled={scheduleLoading && !showScheduleView}>
              {showScheduleView ? "View Dashboard" : scheduleButtonText}
            </button>
            <button type="button" onClick={handleLogout} className={styles.btn}>Log Out</button>
          </div>
        </div>

        {/* ===== BACK FACE (Reservations / Coached Classes) ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceBack}`}>
          <div className={styles.reservationsContainer}>
            <h2>{scheduleTitleText}</h2>
            {/* No week navigation buttons in this simplified view */}
            <div className={styles.feedbackContainer}>
                {actionError && <p className={styles.errorText}>{actionError}</p>}
                {actionSuccessMessage && <p className={styles.successText}>{actionSuccessMessage}</p>}
            </div>
            {scheduleLoading && <p className={styles.loadingText}>Loading schedule...</p>}
            {scheduleError && !scheduleLoading && <p className={styles.errorText}>Error: {scheduleError}</p>}

            {!scheduleLoading && !scheduleError && (
              scheduleData.length > 0 ? (
                <div className={styles.reservationsGrid}> {/* Using reservationsGrid for both for simplicity */}
                  {scheduleData.map((item) => { // For coach, 'item' is a class for today. For user, it's a reservation.
                    let timeString = `${item.startTime} - ${item.endTime}`;
                    try {
                      const s = parse(item.startTime, "H:mm", new Date());
                      const e = parse(item.endTime, "H:mm", new Date());
                      if (!isNaN(s) && !isNaN(e)) timeString = `${format(s, 'h:mm a')} - ${format(e, 'h:mm a')}`;
                    } catch (_) {}

                    if (userRole === "coach") {
                      // Coach View: List of today's classes with attendee toggle
                      const isCurrentlyExpanded = expandedClassId === item._id; // Expand based on class _id
                      return (
                        <div key={item._id} className={`${styles.reservationCard} ${styles.coachCard}`}>
                          <h3>{item.title}</h3>
                          <p>{timeString}</p>
                          <p className={styles.attendeeCount}>
                            Attendees: {item.attendees?.length ?? 0} / {item.max_capacity}
                          </p>
                          <button
                            type="button"
                            className={styles.btnToggleAttendees} // Use the style you created for this
                            onClick={() => handleToggleCoachAttendees(item._id)}
                          >
                            {isCurrentlyExpanded ? 'Hide Attendees' : 'View Attendees'}
                          </button>
                          {!item.isActive && <p className={styles.seriesInactive}>(Series Inactive)</p>}
                          {isCurrentlyExpanded && (
                            <div className={styles.attendeeList}>
                              {(item.attendees && item.attendees.length > 0) ? (
                                <ul>
                                  {item.attendees.map(att => (
                                    <li key={att._id || att.id || att.email}>
                                      {att.name}
                                      {att.email && <span className={styles.attendeeEmail}> ({att.email})</span>}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className={styles.noAttendeesMessage}>No attendees registered.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // User View: List of their upcoming reservations
                      const nextOccurrenceDate = getNextDateForDay(item.dayOfWeek);
                      const isLoadingUserAction = userDropLoading === item._id;
                      return (
                        <div key={item._id} className={styles.reservationCard}>
                          <h3>
                            {nextOccurrenceDate ? format(nextOccurrenceDate, 'EEEE, MMM d')
                              : (item.dayOfWeek !== undefined ? `Day ${item.dayOfWeek}` : 'Date Error')}
                          </h3>
                          <p>{item.title}<br/>{timeString}</p>
                          <button
                            type="button"
                            className={styles.btnDrop}
                            onClick={() => handleDropClass(item._id)}
                            disabled={isLoadingUserAction}
                          >
                            {isLoadingUserAction ? 'Dropping...' : 'Drop'}
                          </button>
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <p className={styles.noReservations}>
                  No {userRole === "coach" ? "classes scheduled for today" : "upcoming reservations"}.
                </p>
              )
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={handleToggleScheduleView}>View Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;