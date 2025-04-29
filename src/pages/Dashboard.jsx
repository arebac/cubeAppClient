import React, { useEffect, useState } from "react";
import styles from "../styles/dashboard.module.css"; // Adjust path if using styles folder
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { format, parse, getDay, nextDay, formatISO } from 'date-fns';

const Dashboard = () => {
  const { user, logout, isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // Use user from context directly after loading check
  const dashboardUserData = (!isAuthLoading && user) ? user : null;
  const userRole = dashboardUserData?.role || 'user'; // Determine role ('user' or 'coach')

  // State for back face data (reservations or coached classes)
  const [scheduleData, setScheduleData] = useState([]);
  const [showScheduleView, setShowScheduleView] = useState(false); // Controls flip
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [dropOrToggleLoading, setDropOrToggleLoading] = useState(null); // ID for dropping/toggling
  const [expandedClassId, setExpandedClassId] = useState(null); // For coach view attendee list

  // Fetch Data for the Back Face (depends on role)
  const fetchScheduleData = async () => {
    if (!user) return;
    const token = localStorage.getItem("token");
    // --- ADD THIS LOG ---
    console.log(`[Dashboard Fetch Schedule] Token from localStorage: `, token);
    // --- END LOG ---
    if (!token) { setScheduleError("Token missing."); return; }

    setScheduleLoading(true);
    setScheduleError(null);
    setScheduleData([]);
    setExpandedClassId(null);

    const endpoint = userRole === 'coach'
      ? "http://localhost:5001/api/user/coaching-schedule"
      : "http://localhost:5001/api/user/my-reservations";

    let fetchUrl = endpoint;
    if (userRole === 'coach') {
      // Fetch today's schedule for coach by default
      const todayDateString = formatISO(new Date(), { representation: 'date' });
      fetchUrl = `${endpoint}?date=${todayDateString}`;
      console.log(`Fetching coach schedule for today: ${fetchUrl}`);
    } else {
      console.log(`Fetching user reservations: ${fetchUrl}`);
    }

    try {
      const res = await fetch(fetchUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let errorMsg = `Failed: ${res.status}`;
        try { const errorData = await res.json(); errorMsg = errorData.message || errorMsg; } catch (e) { }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      setScheduleData(data);
    } catch (error) {
      console.error(`❌ Error fetching ${userRole} schedule:`, error);
      setScheduleError(error.message || `Could not load ${userRole} schedule.`);
      setScheduleData([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Toggle Flip View
  const handleToggleScheduleView = () => {
    const willShow = !showScheduleView;
    setShowScheduleView(willShow);
    if (willShow && scheduleData.length === 0 && !scheduleLoading) {
      fetchScheduleData();
    }
  };

  // Handle Dropping a Class (User only)
  const handleDropClass = async (classId) => {
    if (!classId || !user || userRole !== 'user') return;
    const token = localStorage.getItem("token");
    // --- ADD THIS LOG ---
    console.log(`[Dashboard Drop Class] Token from localStorage: `, token);
    // --- END LOG ---
    if (!token) { setScheduleError("Token missing."); return; }

    setDropOrToggleLoading(classId);
    setScheduleError(null);
    try {
      const res = await fetch("http://localhost:5001/api/user/drop-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId }),
      });
      const result = await res.json();
      if (!res.ok) { throw new Error(result.message || `Failed: ${res.status}`); }
      fetchScheduleData(); // Refresh list
    } catch (error) {
      console.error("❌ Error dropping class:", error);
      setScheduleError(error.message || "Could not drop class.");
    } finally {
      setDropOrToggleLoading(null);
    }
  };

  // Handle Toggling Attendee List (Coach only)
  const handleToggleAttendees = (classId) => {
    if (userRole !== 'coach') return;
    setExpandedClassId(prevId => (prevId === classId ? null : classId));
  };

  // Handle Logout
  const handleLogout = () => { logout(); navigate("/"); };

  // Date Helper
  const getNextDateForDay = (dayOfWeek) => {
    const today = new Date();
    const currentDay = getDay(today);
    try {
      const targetDay = Number(dayOfWeek);
      if (isNaN(targetDay) || targetDay < 0 || targetDay > 6) { throw new Error(`Invalid day: ${dayOfWeek}`); }
      return (currentDay === targetDay) ? today : nextDay(today, targetDay);
    } catch (e) { console.error("Date calc error:", e); return null; }
  };

  // --- Render Logic ---
  if (isAuthLoading) {
    return <div className={styles.container}><p className={styles.loadingText}>Loading...</p></div>;
  }
  if (!dashboardUserData) {
    return <div className={styles.container}><p className={styles.errorText}>Please log in.</p></div>;
  }

  const scheduleButtonText = userRole === 'coach' ? 'My Classes' : 'My Reservations';
  const scheduleTitleText = userRole === 'coach' ? 'My Coached Classes (Today)' : 'My Upcoming Classes';

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${showScheduleView ? styles.cardFlipped : ''}`}>

        {/* ===== FRONT FACE ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceFront}`}>
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome, {dashboardUserData.name}!</h1>
          </div>
          <div className={styles.section}>
            <h2>User Info</h2>
            <p><strong>Email:</strong> {dashboardUserData.email}</p>
            <p><strong>Phone:</strong> {dashboardUserData?.phone || 'N/A'}</p>
            <p><strong>Fitness Level:</strong> {dashboardUserData?.fitnessLevel || 'N/A'}</p>
          </div>
          {userRole === 'user' && (
            <div className={styles.section}>
              <h2>Subscription</h2>
              <p><strong>Plan:</strong> {dashboardUserData?.subscription || "No active subscription"}</p>
              <p><strong>Tokens:</strong> {dashboardUserData?.tokens ?? 'N/A'}</p>
              <p><strong>Expires:</strong> {dashboardUserData?.subscriptionExpiresAt ? format(new Date(dashboardUserData.subscriptionExpiresAt), 'PPP') : 'N/A'}</p>
            </div>
          )}
          <div className={styles.actions}>
            <button
              className={styles.btn}
              onClick={handleToggleScheduleView}
              disabled={scheduleLoading && !showScheduleView}
            >
              {showScheduleView ? "View Dashboard" : scheduleButtonText}
            </button>
            <button onClick={handleLogout} className={styles.btn}>Log Out</button>
          </div>
        </div>
        {/* ===== END FRONT FACE ===== */}

        {/* ===== BACK FACE ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceBack}`}>
          <div className={styles.reservationsContainer}>
            <h2>{scheduleTitleText}</h2>
            {scheduleLoading && <p className={styles.loadingText}>Loading...</p>}
            {scheduleError && <p className={styles.errorText}>Error: {scheduleError}</p>}
            {!scheduleLoading && !scheduleError && (
              scheduleData.length > 0 ? (
                <div className={styles.reservationsGrid}>
                  {scheduleData.map(item => {
                    let timeString = `${item.startTime} - ${item.endTime}`;
                    try {
                      const start = parse(item.startTime, "H:mm", new Date());
                      const end = parse(item.endTime, "H:mm", new Date());
                      if (!isNaN(start) && !isNaN(end)) {
                        timeString = `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
                      }
                    } catch (e) { /* Ignore */ }
                    const nextOccurrenceDate = getNextDateForDay(item.dayOfWeek);
                    const isLoadingAction = dropOrToggleLoading === item._id;
                    const isExpanded = expandedClassId === item._id;

                    // --- CONDITIONAL RENDERING PER ROLE ---
                    return userRole === 'coach' ? (
                      // --- COACH CARD ---
                      <div key={item._id} className={`${styles.reservationCard} ${styles.coachCard}`}>
                        <h3>{item.title}</h3>
                        <p>{timeString}</p>
                        <p className={styles.attendeeCount}>
                          Attendees: {item.attendees?.length ?? 0} / {item.max_capacity}
                        </p>
                        <button
                          className={styles.btnToggleAttendees}
                          onClick={() => handleToggleAttendees(item._id)}
                          disabled={isLoadingAction}
                        >
                          {isExpanded ? 'Hide List' : 'View Attendees'}
                        </button>
                        {isExpanded && (
                          <div className={styles.attendeeList}>
                            {item.attendees && item.attendees.length > 0 ? (
                              <ul>
                                {item.attendees.map(attendee => (
                                  <li key={attendee.id || attendee._id}>
                                    {attendee.name} <span className={styles.attendeeEmail}>({attendee.email})</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (<p>No users registered.</p>)}
                          </div>
                        )}
                      </div>
                    ) : (
                      // --- USER CARD (My Reservations) ---
                      <div key={item._id} className={styles.reservationCard}>
                        <h3>
                          {nextOccurrenceDate ? format(nextOccurrenceDate, 'EEEE, MMM d') : `Day ${item.dayOfWeek}`}
                        </h3>
                        <p> {item.title}<br />{timeString} </p>
                        <button
                          className={styles.btnDrop}
                          onClick={() => handleDropClass(item._id)}
                          disabled={isLoadingAction} >
                          {isLoadingAction ? 'Dropping...' : 'Drop'}
                        </button>
                      </div>
                    );
                    // --- END CONDITIONAL RENDERING ---
                  })}
                </div>
              ) : (
                <p>No {userRole === 'coach' ? 'classes found for today' : 'upcoming reservations'}.</p>
              )
            )}
            <div className={styles.actions}>
              <button className={styles.btn} onClick={handleToggleScheduleView}>View Dashboard</button>
            </div>
          </div>
        </div>
        {/* ===== END BACK FACE ===== */}
      </div>
    </div>
  );
};

export default Dashboard;