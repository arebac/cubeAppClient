import React, { useEffect, useState, useCallback, useRef } from "react";
import styles from "../styles/dashboard.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { format, parse, getDay, nextDay, formatISO } from "date-fns";

const Dashboard = () => {
  const { user, logout, isAuthLoading, fetchAndUpdateUser } = useAuth();
  const navigate = useNavigate();

  // --- Refs ---
  const cardRef = useRef(null);
  const frontFaceRef = useRef(null);
  const backFaceRef = useRef(null);
  const pageContainerRef = useRef(null); // For scrolling the main container if needed

  // --- State ---
  const [cardMinHeight, setCardMinHeight] = useState("auto");
  const [scheduleData, setScheduleData] = useState([]);
  const [showScheduleView, setShowScheduleView] = useState(false); // false = front, true = back
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [userDropLoading, setUserDropLoading] = useState(null);
  const [expandedClassId, setExpandedClassId] = useState(null); // For coach viewing attendees (uses class _id)

  const dashboardUserData = !isAuthLoading && user ? user : null;
  const userRole = dashboardUserData?.role || "user";

  // --- Logging Effect ---
  useEffect(() => {
    console.log(
      `Dashboard Mount/Update. AuthLoading: ${isAuthLoading}, UserID: ${dashboardUserData?._id}, Role: ${userRole}, ShowSchedule: ${showScheduleView}, CardMinHeight: ${cardMinHeight}`
    );
  }, [
    isAuthLoading,
    dashboardUserData,
    userRole,
    showScheduleView,
    cardMinHeight,
  ]);

  // --- Dynamic Height Calculation ---
  useEffect(() => {
    const calculateAndSetHeight = () => {
      setTimeout(() => {
        if (frontFaceRef.current && backFaceRef.current) {
          const frontHeight = frontFaceRef.current.scrollHeight;
          const backHeight = backFaceRef.current.scrollHeight;
          const newMinHeight = Math.max(frontHeight, backHeight, 150);
          setCardMinHeight(newMinHeight);
        }
      }, 100);
    };
    if (dashboardUserData) calculateAndSetHeight();
    window.addEventListener("resize", calculateAndSetHeight);
    return () => window.removeEventListener("resize", calculateAndSetHeight);
  }, [
    dashboardUserData,
    scheduleData,
    showScheduleView,
    expandedClassId,
    userRole,
  ]);

  // --- Data Fetching Logic (Simplified for Coach Today's View) ---
  const fetchScheduleData = useCallback(
    async (isExplicitRefresh = false) => {
      if (
        !dashboardUserData ||
        !(dashboardUserData._id || dashboardUserData.id)
      ) {
        setScheduleData([]);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        setScheduleError("Auth token missing.");
        setScheduleData([]);
        return;
      }

      setScheduleLoading(true);
      setScheduleError(null);
      if (isExplicitRefresh) {
        setActionError(null);
        setActionSuccessMessage(null);
      }

      let fetchUrl;
      if (userRole === "coach") {
        const todayDateString = formatISO(new Date(), {
          representation: "date",
        });
        fetchUrl = `http://localhost:5001/api/user/coaching-schedule?date=${todayDateString}&view=day`; // Always today for coach dashboard
      } else {
        // User
        fetchUrl = `http://localhost:5001/api/user/my-reservations`;
      }
      console.log(`Fetching schedule from: ${fetchUrl}`);

      try {
        const res = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let e = `Failed: ${res.status}`;
          try {
            const d = await res.json();
            e = d.message || e;
          } catch (_) {}
          throw new Error(e);
        }
        const data = await res.json();
        console.log("Fetched schedule data:", data.length, "items");
        setScheduleData(data);
      } catch (error) {
        console.error(`❌ Error fetching ${userRole} schedule:`, error);
        setScheduleError(error.message || `Could not load schedule.`);
        setScheduleData([]);
      } finally {
        setScheduleLoading(false);
      }
    },
    [dashboardUserData, userRole]
  );

  // Effect to fetch data
  useEffect(() => {
    if (dashboardUserData && showScheduleView) {
      fetchScheduleData(false); // isExplicitRefresh = false for view-driven fetch
    } else if (!dashboardUserData && showScheduleView) {
      setScheduleData([]);
    }
  }, [dashboardUserData, showScheduleView, fetchScheduleData]);

  // --- Event Handlers ---
  const handleToggleScheduleView = () => {
    const currentIsShowingSchedule = showScheduleView;
    const newShowScheduleView = !currentIsShowingSchedule;
    setShowScheduleView(newShowScheduleView);
    setActionError(null);
    setActionSuccessMessage(null);

    if (currentIsShowingSchedule && !newShowScheduleView) {
      // Flipping from BACK to FRONT
      console.log("[ToggleView] Flipping to front face, scrolling to top.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      // if (pageContainerRef.current) {
      //   pageContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      // }
    }
    // useEffect handles fetching if newShowScheduleView is true
  };

  const handleDropClass = async (classId) => {
    if (
      !dashboardUserData ||
      !(dashboardUserData.id || dashboardUserData._id)
    ) {
      setActionError("Auth err");
      return;
    }
    if (!classId) {
      setActionError("Invalid class");
      return;
    }
    const tkn = localStorage.getItem("token");
    if (!tkn) {
      setActionError("No token");
      return;
    }
    setUserDropLoading(classId);
    setActionError(null);
    setActionSuccessMessage(null);
    try {
      const r = await fetch("http://localhost:5001/api/user/drop-reservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tkn}`,
        },
        body: JSON.stringify({ classId }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.message || `Fail ${r.status}`);
      setActionSuccessMessage(res.message || "Dropped!");
      if (typeof fetchAndUpdateUser === "function") await fetchAndUpdateUser();
      await fetchScheduleData(true);
    } catch (e) {
      setActionError(e.message || "Could not drop");
    } finally {
      setUserDropLoading(null);
    }
  };

  const handleToggleCoachAttendees = (classId) => {
    if (userRole !== "coach") return;
    setExpandedClassId((prevId) => (prevId === classId ? null : classId));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  const getNextDateForDay = (dayOfWeek) => {
    if (dayOfWeek === undefined || dayOfWeek === null) return null;
    const t = new Date(),
      cD = getDay(t);
    try {
      const d = Number(dayOfWeek);
      if (isNaN(d) || d < 0 || d > 6)
        throw new Error(`Invalid day: ${dayOfWeek}`);
      return cD === d ? t : nextDay(t, d);
    } catch (e) {
      console.error("Date calc error:", e, "Input:", dayOfWeek);
      return null;
    }
  };

  // --- Render Guards ---
  if (isAuthLoading && !user) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>Loading Session...</p>
      </div>
    );
  }
  if (!dashboardUserData) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>Please log in to view dashboard.</p>
      </div>
    );
  }

  const scheduleButtonText =
    userRole === "coach" ? "Today's Classes" : "My Reservations";
  const scheduleTitleText =
    userRole === "coach" ? "Your Classes Today" : "My Upcoming Classes";

  return (
    <div className={styles.container} ref={pageContainerRef}>
      {" "}
      {/* Assign ref here if .container scrolls */}
      <div
        ref={cardRef}
        className={`${styles.card} ${
          showScheduleView ? styles.cardFlipped : ""
        }`}
        style={{
          minHeight:
            typeof cardMinHeight === "number"
              ? `${cardMinHeight}px`
              : cardMinHeight,
        }}
      >
        {/* ===== FRONT FACE ===== */}
        <div
          ref={frontFaceRef}
          className={`${styles.cardFace} ${styles.cardFaceFront}`}
        >
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome, {dashboardUserData.name}!</h1>
          </div>
          <div className={styles.section}>
            <h2>User Info</h2>
            <p>
              <strong>Email:</strong> {dashboardUserData.email}
            </p>
            <p>
              <strong>Phone:</strong> {dashboardUserData.phone || "N/A"}
            </p>
            <p>
              <strong>Fitness Level:</strong>{" "}
              {dashboardUserData.fitnessLevel || "N/A"}
            </p>
          </div>
          {userRole === "user" && (
            <div className={styles.section}>
              <h2>Subscription</h2>
              <p>
                <strong>Status:</strong>{" "}
                {dashboardUserData.currentSubscriptionStatus === "active"
                  ? "Active"
                  : dashboardUserData.currentSubscriptionStatus || "N/A"}
              </p>
         <p><strong>Plan:</strong> {dashboardUserData.currentPlanName || "No active subscription"}</p> {/* <<< USE NEW FIELD */}
          <p><strong>Tokens:</strong> {typeof dashboardUserData.tokens === "number" ? dashboardUserData.tokens : "N/A"}</p>
          <p><strong>Expires:</strong> {dashboardUserData.currentSubscriptionEndDate ? format(new Date(dashboardUserData.currentSubscriptionEndDate), "PPP") : "N/A"}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btn}
              onClick={handleToggleScheduleView}
              disabled={
                showScheduleView && scheduleLoading && scheduleData.length === 0
              }
            >
              {showScheduleView ? "View Dashboard" : scheduleButtonText}
            </button>
            <button type="button" onClick={handleLogout} className={styles.btn}>
              Log Out
            </button>
          </div>
        </div>

        {/* ===== BACK FACE (Simplified Coach View) ===== */}
        <div
          ref={backFaceRef}
          className={`${styles.cardFace} ${styles.cardFaceBack}`}
        >
          <div className={styles.reservationsContainer}>
            <h2>{scheduleTitleText}</h2>
            {/* Removed Week Navigation for coach from this simplified view */}
            <div className={styles.feedbackContainer}>
              {actionError && <p className={styles.errorText}>{actionError}</p>}
              {actionSuccessMessage && (
                <p className={styles.successText}>{actionSuccessMessage}</p>
              )}
            </div>

            {scheduleLoading && scheduleData.length === 0 && (
              <p className={styles.loadingText}>Loading schedule...</p>
            )}
            {scheduleError && (
              <p className={styles.errorText}>Error: {scheduleError}</p>
            )}

            {!scheduleError &&
              (scheduleData.length > 0 ||
                (scheduleLoading && scheduleData.length > 0)) && (
                <div className={styles.reservationsGrid}>
                  {scheduleData.map((item) => {
                    // For coach, item is a class for today. For user, it's a reservation.
                    let timeString = `${item.startTime} - ${item.endTime}`;
                    try {
                      const s = parse(item.startTime, "H:mm", new Date()),
                        e = parse(item.endTime, "H:mm", new Date());
                      if (!isNaN(s) && !isNaN(e))
                        timeString = `${format(s, "h:mm a")} - ${format(
                          e,
                          "h:mm a"
                        )}`;
                    } catch (_) {}

                    if (userRole === "coach") {
                      const isCurrentlyExpanded = expandedClassId === item._id; // Expand based on class _id
                      return (
                        <div
                          key={item._id}
                          className={`${styles.reservationCard} ${styles.coachCard}`}
                        >
                          <h3>{item.title}</h3>
                          <p>{timeString}</p>
                          <p className={styles.attendeeCount}>
                            Attendees: {item.attendees?.length ?? 0}/
                            {item.max_capacity}
                          </p>
                          <button
                            type="button"
                            className={styles.btnToggleAttendees}
                            onClick={() => handleToggleCoachAttendees(item._id)}
                          >
                            {isCurrentlyExpanded
                              ? "Hide Attendees"
                              : "View Attendees"}
                          </button>
                          {/* Removed instance cancellation buttons */}
                          {!item.isActive && (
                            <p className={styles.seriesInactive}>
                              (Series Inactive)
                            </p>
                          )}
                          {isCurrentlyExpanded && (
                            <div className={styles.attendeeList}>
                              {item.attendees && item.attendees.length > 0 ? (
                                <ul>
                                  {item.attendees.map((att) => (
                                    <li key={att._id || att.id || att.email}>
                                      {att.name}{" "}
                                      {att.email && (
                                        <span className={styles.attendeeEmail}>
                                          ({att.email})
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className={styles.noAttendeesMessage}>
                                  No attendees registered.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // User View
                      const nextOccurrenceDate = getNextDateForDay(
                        item.dayOfWeek
                      );
                      const isLoadingUserAction = userDropLoading === item._id;
                      return (
                        <div key={item._id} className={styles.reservationCard}>
                          <h3>
                            {nextOccurrenceDate
                              ? format(nextOccurrenceDate, "EEEE, MMM d")
                              : item.dayOfWeek !== undefined
                              ? `Day ${item.dayOfWeek}`
                              : "Date Error"}
                          </h3>
                          <p>
                            {item.title}
                            <br />
                            {timeString}
                          </p>
                          <button
                            type="button"
                            className={styles.btnDrop}
                            onClick={() => handleDropClass(item._id)}
                            disabled={isLoadingUserAction}
                          >
                            {isLoadingUserAction ? "Dropping..." : "Drop"}
                          </button>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            {!scheduleLoading &&
              !scheduleError &&
              scheduleData.length === 0 && (
                <p className={styles.noReservations}>
                  No{" "}
                  {userRole === "coach"
                    ? "classes scheduled for today"
                    : "upcoming reservations"}
                  .
                </p>
              )}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btn}
                onClick={handleToggleScheduleView}
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
