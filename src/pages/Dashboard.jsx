import React, { useEffect, useState, useCallback } from "react";
import styles from "../styles/dashboard.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  format,
  parse,
  getDay,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  formatISO,
  isSameDay,
} from "date-fns";

const Dashboard = () => {
  const { user, logout, isAuthLoading, fetchAndUpdateUser } = useAuth();
  const navigate = useNavigate();

  const [scheduleData, setScheduleData] = useState([]);
  const [showScheduleView, setShowScheduleView] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [userDropLoading, setUserDropLoading] = useState(null); // For user dropping class
  const [coachInstanceLoading, setCoachInstanceLoading] = useState(null); // For coach cancelling instance { classId, date }
  const [expandedClassId, setExpandedClassId] = useState(null); // For coach viewing attendees (unique key: classId+specificDate)

  // Coach specific state for week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const dashboardUserData = !isAuthLoading && user ? user : null;
  const userRole = dashboardUserData?.role || "user";

  console.log(
    `Dashboard rendered. AuthLoading: ${isAuthLoading}, User: ${
      dashboardUserData?._id
    }, Role: ${userRole}, WeekStart: ${
      currentWeekStart ? formatISO(currentWeekStart) : "N/A"
    }`
  );

  // --- Data Fetching (Corrected to handle date argument for coach) ---
  const fetchScheduleData = useCallback(
    async (dateForCoachView) => {
      if (
        !dashboardUserData ||
        !(dashboardUserData._id || dashboardUserData.id)
      ) {
        console.log("fetchScheduleData: No user/ID. Clearing schedule.");
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
      // Don't clear action messages here, let action handlers manage them
      // setActionError(null); setActionSuccessMessage(null);

      let fetchUrl;
      if (userRole === "coach") {
        // Ensure dateForCoachView is a valid Date object
        if (
          !dateForCoachView ||
          !(dateForCoachView instanceof Date) ||
          isNaN(dateForCoachView.getTime())
        ) {
          console.error(
            "fetchScheduleData (coach): Invalid or missing dateForCoachView.",
            dateForCoachView
          );
          setScheduleError("Cannot fetch coach schedule: Date is invalid.");
          setScheduleLoading(false);
          setScheduleData([]);
          return;
        }
        const startDateParam = formatISO(dateForCoachView, {
          representation: "date",
        });
        fetchUrl = `http://localhost:5001/api/user/coaching-schedule?startDate=${startDateParam}&view=week`;
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
          let eMsg = `Failed to fetch schedule: ${res.status}`;
          try {
            const eD = await res.json();
            eMsg = eD.message || eMsg;
          } catch (_) {}
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
    },
    [dashboardUserData, userRole]
  ); // Removed currentWeekStart, it's passed as an argument

  // Effect to fetch data when view/user/week changes
  useEffect(() => {
    if (dashboardUserData && showScheduleView) {
      if (userRole === "coach") {
        // currentWeekStart is guaranteed to be a Date by its useState initializer
        console.log(
          "useEffect (coach): Fetching coach schedule for week starting:",
          currentWeekStart
        );
        fetchScheduleData(currentWeekStart);
      } else {
        console.log("useEffect (user): Fetching user reservations.");
        fetchScheduleData(); // No date arg needed for user's 'my-reservations'
      }
    } else if (!dashboardUserData && showScheduleView) {
      console.log("useEffect: No user, clearing schedule data.");
      setScheduleData([]);
    }
  }, [
    dashboardUserData,
    showScheduleView,
    userRole,
    currentWeekStart,
    fetchScheduleData,
  ]);

  // --- Event Handlers ---
  const handleToggleScheduleView = () => {
    const willShow = !showScheduleView;
    setShowScheduleView(willShow);
    setActionError(null);
    setActionSuccessMessage(null);
    if (willShow && !scheduleLoading && dashboardUserData) {
      // Data fetching is now handled by the useEffect when showScheduleView becomes true
      console.log(
        "Toggled schedule view to visible. useEffect will handle fetch if needed."
      );
    }
  };

  const handleDropClass = async (classId) => {
    if (
      !dashboardUserData ||
      !(dashboardUserData.id || dashboardUserData._id)
    ) {
      setActionError("Auth error.");
      return;
    }
    if (!classId) {
      setActionError("Invalid class info.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setActionError("Auth session missing.");
      return;
    }

    setUserDropLoading(classId);
    setActionError(null);
    setActionSuccessMessage(null);
    try {
      const res = await fetch(
        "http://localhost:5001/api/user/drop-reservation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ classId }),
        }
      );
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || `Drop failed: ${res.status}`);
      setActionSuccessMessage(
        result.message || "Class dropped & token refunded!"
      );
      if (typeof fetchAndUpdateUser === "function") await fetchAndUpdateUser();
      await fetchScheduleData(); // For user view, no date arg
    } catch (error) {
      console.error("❌ Error dropping class:", error);
      setActionError(error.message || "Could not drop class.");
    } finally {
      setUserDropLoading(null);
    }
  };

  const handleToggleInstanceCancellation = async (
    classId,
    specificDate,
    currentCancelStatus
  ) => {
    if (userRole !== "coach" && userRole !== "admin") {
      setActionError("Permission denied.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setActionError("Auth session missing.");
      return;
    }

    setCoachInstanceLoading({ classId, date: specificDate });
    setActionError(null);
    setActionSuccessMessage(null);

    const payload = {
      classId,
      date: specificDate,
      cancel: !currentCancelStatus,
    };
    try {
      const res = await fetch(
        "http://localhost:5001/api/classes/instance/toggle-cancellation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || `Failed to update: ${res.status}`);
      setActionSuccessMessage(result.message || "Class status updated!");
      // Pass currentWeekStart to refresh the correct week for the coach
      await fetchScheduleData(currentWeekStart);
    } catch (error) {
      console.error("❌ Error toggling instance cancellation:", error);
      setActionError(error.message || "Could not update class status.");
    } finally {
      setCoachInstanceLoading(null);
    }
  };

  const handlePreviousWeek = () =>
    setCurrentWeekStart((prev) => addDays(prev, -7));
  const handleNextWeek = () => setCurrentWeekStart((prev) => addDays(prev, 7));
  const handleLogout = () => {
    logout();
    navigate("/");
  };
  const getNextDateForDay = (dayOfWeek) => {
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

  const toggleCoachClassDetails = (uniqueInstanceId) => {
    // uniqueInstanceId is classId + specificDate
    if (userRole !== "coach") return;
    console.log("[Toggle Details] Clicked for instance:", uniqueInstanceId);
    console.log("[Toggle Details] Current expandedClassId:", expandedClassId);
    setExpandedClassId((prevId) => {
      const newId = prevId === uniqueInstanceId ? null : uniqueInstanceId;
      console.log("[Toggle Details] New expandedClassId:", newId);
      return newId;
    });
  };

  if (isAuthLoading)
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>Loading Dashboard...</p>
      </div>
    );
  if (!dashboardUserData)
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>
          Please log in to view your dashboard.
        </p>
      </div>
    );

  const weekDaysForDisplay =
    userRole === "coach"
      ? eachDayOfInterval({
          start: currentWeekStart,
          end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
        })
      : [];

  const scheduleButtonText =
    userRole === "coach" ? "My Weekly Schedule" : "My Reservations";
  const scheduleTitleText =
    userRole === "coach"
      ? `Schedule: ${format(currentWeekStart, "MMM d")} - ${format(
          endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
          "MMM d, yyyy"
        )}`
      : "My Upcoming Classes";

  return (
    <div className={styles.container}>
      <div
        className={`${styles.card} ${
          showScheduleView ? styles.cardFlipped : ""
        }`}
      >
        {/* ===== FRONT FACE ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceFront}`}>
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
                <strong>Plan:</strong>{" "}
                {dashboardUserData.subscriptionPlan || "No active subscription"}
              </p>
              <p>
                <strong>Tokens:</strong>{" "}
                {typeof dashboardUserData.tokens === "number"
                  ? dashboardUserData.tokens
                  : "N/A"}
              </p>
              <p>
                <strong>Expires:</strong>{" "}
                {dashboardUserData.subscriptionExpiresAt
                  ? format(
                      new Date(dashboardUserData.subscriptionExpiresAt),
                      "PPP"
                    )
                  : "N/A"}
              </p>
            </div>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btn}
              onClick={handleToggleScheduleView}
              disabled={scheduleLoading && !showScheduleView}
            >
              {showScheduleView ? "View Dashboard" : scheduleButtonText}
            </button>
            <button type="button" onClick={handleLogout} className={styles.btn}>
              Log Out
            </button>
          </div>
        </div>

        {/* ===== BACK FACE ===== */}
        <div className={`${styles.cardFace} ${styles.cardFaceBack}`}>
          <div className={styles.reservationsContainer}>
            <h2>{scheduleTitleText}</h2>
            {userRole === 'coach' && (
      <div className={styles.weekNavigation}>
        <button type="button" onClick={handlePreviousWeek} className={styles.btnNav} disabled={scheduleLoading}> Prev </button>
        <button type="button" onClick={handleNextWeek} className={styles.btnNav} disabled={scheduleLoading}>Next </button> {/* CORRECTED */}
      </div>
    )}
            <div className={styles.feedbackContainer}>
              {actionError && <p className={styles.errorText}>{actionError}</p>}
              {actionSuccessMessage && (
                <p className={styles.successText}>{actionSuccessMessage}</p>
              )}
            </div>
            {scheduleLoading && (
              <p className={styles.loadingText}>Loading schedule...</p>
            )}
            {scheduleError && !scheduleLoading && (
              <p className={styles.errorText}>Error: {scheduleError}</p>
            )}

            {!scheduleLoading &&
              !scheduleError &&
              (scheduleData.length > 0 ? (
                userRole === "coach" ? (
                  // --- COACH WEEKLY VIEW ---
                  <div className={styles.weeklyScheduleGrid}>
                    {weekDaysForDisplay.map((day) => {
                      const classesForThisDay = scheduleData.filter(
                        (cls) =>
                          cls.specificDate ===
                          formatISO(day, { representation: "date" })
                      );
                      return (
                        <div key={formatISO(day)} className={styles.dayColumn}>
                          <h4 className={styles.dayHeader}>
                            {format(day, "EEEE, MMM d")}
                          </h4>
                          {classesForThisDay.length > 0 ? (
                            classesForThisDay.map((item) => {
                              let timeString = `${item.startTime} - ${item.endTime}`;
                              try {
                                const s = parse(
                                    item.startTime,
                                    "H:mm",
                                    new Date()
                                  ),
                                  e = parse(item.endTime, "H:mm", new Date());
                                if (!isNaN(s) && !isNaN(e))
                                  timeString = `${format(
                                    s,
                                    "h:mm a"
                                  )} - ${format(e, "h:mm a")}`;
                              } catch (_) {}
                              const isLoadingThisInstance =
                                coachInstanceLoading?.classId === item._id &&
                                coachInstanceLoading?.date ===
                                  item.specificDate;
                              const uniqueInstanceId =
                                item._id + item.specificDate; // Create a unique ID for expansion state
                              const isCurrentlyExpanded =
                                expandedClassId === uniqueInstanceId;
                              return (
                                <div
                                  key={uniqueInstanceId}
                                  className={`${styles.reservationCard} ${
                                    styles.coachCardInstance
                                  } ${
                                    !item.isEffectivelyActive
                                      ? styles.cancelledInstance
                                      : ""
                                  }`}
                                >
                                  <h5>{item.title}</h5> <p>{timeString}</p>
                                  <p>
                                    Attendees: {item.attendees?.length ?? 0}/
                                    {item.max_capacity}
                                  </p>
                                  {/* "View/Hide Attendees" Button */}
                                  <button
                                    type="button"
                                    className={styles.btnViewAttendees}
                                    onClick={() =>
                                      toggleCoachClassDetails(uniqueInstanceId)
                                    }
                                  >
                                    {isCurrentlyExpanded
                                      ? "Hide Attendees"
                                      : "View Attendees"}
                                  </button>
                                  {/* "Cancel/Reactivate Session" Button */}
                                  <button
                                    type="button"
                                    className={
                                      item.isCancelledThisInstance
                                        ? styles.btnReactivate
                                        : styles.btnCancelInstance
                                    }
                                    onClick={() =>
                                      handleToggleInstanceCancellation(
                                        item._id,
                                        item.specificDate,
                                        item.isCancelledThisInstance
                                      )
                                    }
                                    disabled={
                                      isLoadingThisInstance || !item.isActive
                                    }
                                  >
                                    {isLoadingThisInstance
                                      ? "Updating..."
                                      : item.isCancelledThisInstance
                                      ? "Reactivate"
                                      : "Cancel Session"}
                                  </button>
                                  {!item.isActive && (
                                    <p className={styles.seriesInactive}>
                                      (Series Inactive)
                                    </p>
                                  )}
                                  {/* Attendee List (conditionally rendered) */}
                                  {isCurrentlyExpanded && (
                                    <div className={styles.attendeeList}>
                                      {item.attendees &&
                                      item.attendees.length > 0 ? (
                                        <ul>
                                          {item.attendees.map((att) => (
                                            <li
                                              key={
                                                att._id || att.id || att.email
                                              }
                                            >
                                              {att.name}{" "}
                                              {att.email && (
                                                <span
                                                  className={
                                                    styles.attendeeEmail
                                                  }
                                                >
                                                  ({att.email})
                                                </span>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p
                                          className={styles.noAttendeesMessage}
                                        >
                                          No attendees.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className={styles.noClassesForDay}>
                              No classes.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* User View */
                  <div className={styles.reservationsGrid}>
                    {scheduleData.map((item) => {
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
                    })}
                  </div>
                )
              ) : (
                <p className={styles.noReservations}>
                  No{" "}
                  {userRole === "coach"
                    ? "classes this week"
                    : "upcoming reservations"}
                  .
                </p>
              ))}
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
