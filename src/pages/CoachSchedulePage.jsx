// src/pages/CoachSchedulePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import styles from '../styles/coachSchedule.module.css'; // Or your chosen CSS module
import { useAuth } from '../context/AuthContext';
import {
  format, parse, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, formatISO
} from 'date-fns';
// import { useNavigate } from 'react-router-dom'; // Only if needed for redirects, e.g. on auth error

const CoachSchedulePage = () => {
  const { user, isAuthLoading } = useAuth();
  // const navigate = useNavigate();

  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ message: '', type: '' });
  const [expandedInstanceId, setExpandedInstanceId] = useState(null); // Stores "classId-specificDate" for attendee list
  const [instanceActionLoading, setInstanceActionLoading] = useState(null); // { classId, specificDate } for button loading

  // Fetch Coach's Weekly Schedule
  const fetchCoachWeeklySchedule = useCallback(async (weekStartDate) => {
    if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
      setError("Access Denied. Only coaches or admins can view this page.");
      setWeeklySchedule([]);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required to fetch schedule.");
      setWeeklySchedule([]);
      return;
    }

    console.log(`[CoachSchedulePage] Fetching schedule for week starting with: ${formatISO(weekStartDate, { representation: 'date' })}`);
    setIsLoading(true);
    setError(null);
    // Don't clear actionFeedback here to allow it to persist briefly after an action. It's cleared on week change.

    const startDateParam = formatISO(weekStartDate, { representation: 'date' });
    const fetchUrl = `http://localhost:5001/api/user/coaching-schedule?startDate=${startDateParam}&view=week`;

    try {
      const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        let eMsg = `Failed to fetch schedule: ${res.status}`;
        try { const eD = await res.json(); eMsg = eD.message || eD.error || eMsg; } catch (_) {}
        throw new Error(eMsg);
      }
      const data = await res.json();
      console.log("[CoachSchedulePage] Fetched weekly schedule data (count):", data.length);
      if (data.length > 0) {
          console.log("[CoachSchedulePage] Sample of fetched data [0]:", data[0]);
      }
      setWeeklySchedule(data);
    } catch (err) {
      console.error("❌ Error fetching coach's weekly schedule:", err);
      setError(err.message || "Could not load schedule.");
      setWeeklySchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]); // user contains role, token is from localStorage

  // Initial fetch and fetch on week change or user change
  useEffect(() => {
    console.log("[CoachSchedulePage Effect] User or currentWeekStart changed. User:", !!user, "Role:", user?.role);
    if (user && (user.role === 'coach' || user.role === 'admin')) {
      fetchCoachWeeklySchedule(currentWeekStart);
    } else if (!user && !isAuthLoading) {
        setError("Please log in as a coach or admin to view this page.");
        setWeeklySchedule([]);
    }
    setActionFeedback({ message: '', type: '' }); // Clear action feedback on week/user change
  }, [user, currentWeekStart, fetchCoachWeeklySchedule, isAuthLoading]);

  // Handler to toggle instance cancellation
  const handleToggleInstanceCancellation = async (classId, specificDate, currentIsCancelledStatus) => {
    const token = localStorage.getItem("token");
    if (!token) { setActionFeedback({ message: "Authentication session missing.", type: 'error' }); return; }

    setInstanceActionLoading({ classId, specificDate });
    setActionFeedback({ message: '', type: '' });

    const payload = { classId, date: specificDate, cancel: !currentIsCancelledStatus };
    console.log("[CoachSchedulePage] Toggling cancellation, payload:", payload);

    try {
      const res = await fetch("http://localhost:5001/api/classes/instance/toggle-cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Failed to update status: ${res.status}`);

      setActionFeedback({ message: result.message || "Class status updated successfully!", type: 'success' });
      await fetchCoachWeeklySchedule(currentWeekStart); // Refresh after action
    } catch (err) {
      console.error("❌ Error toggling instance cancellation:", err);
      setActionFeedback({ message: err.message || "Could not update class status.", type: 'error' });
    } finally {
      setInstanceActionLoading(null);
    }
  };

  const handlePreviousWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const toggleAttendeeList = (instanceUniqueId) => setExpandedInstanceId(prev => prev === instanceUniqueId ? null : instanceUniqueId);


  // --- Render Logic ---
  if (isAuthLoading && !user) {
    return <div className={styles.container}><p className={styles.loadingText}>Loading Authentication...</p></div>;
  }
  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    return (
      <div className={`${styles.container} ${styles.coachSchedulePageContainer}`}>
        <h1 className={styles.pageTitle}>My Weekly Schedule</h1>
        <p className={styles.errorText}>{error || "Access Denied. This page is for coaches and admins."}</p>
      </div>
    );
  }

  const weekDaysForDisplay = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  });

  return (
    <div className={`${styles.container} ${styles.coachSchedulePageContainer}`}>
      <h1 className={styles.pageTitle}>My Weekly Schedule</h1>
      <p className={styles.pageSubtitle}>Manage your upcoming classes and their active status for specific dates.</p>

      <div className={styles.weekNavigation}>
        <button type="button" onClick={handlePreviousWeek} className={styles.btnNav} disabled={isLoading}> Prev Week</button>
        <h3 className={styles.weekDisplay}>
          {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </h3>
        <button type="button" onClick={handleNextWeek} className={styles.btnNav} disabled={isLoading}>Next Week </button>
      </div>

      {actionFeedback.message && (
        <div className={`${styles.feedbackContainer} ${actionFeedback.type === 'error' ? styles.errorText : styles.successText}`}>
          <p>{actionFeedback.message}</p>
        </div>
      )}

      {/* Show loading only if there's no data AND no error yet */}
      {isLoading && weeklySchedule.length === 0 && !error && <p className={styles.loadingText}>Loading schedule for the week...</p>}
      {/* Show error if an error occurred during fetching */}
      {error && <p className={styles.errorText}>Error loading schedule: {error}</p>}

      {/* Show "No classes" only if not loading, no error, and schedule is confirmed empty */}
      {!isLoading && !error && weeklySchedule.length === 0 && (
        <p className={styles.noReservations}>No classes found for this coach in this week.</p>
      )}

      {/* Render the grid if there is data (even if also loading a refresh) */}
      {weeklySchedule.length > 0 && (
        <div className={styles.weeklyScheduleGrid}>
          {console.log("[Render Grid] weeklySchedule sample to check specificDate format:", weeklySchedule.length > 0 ? weeklySchedule[0].specificDate : "empty")}
          {weekDaysForDisplay.map(day => {
            const formattedDayString = formatISO(day, { representation: 'date' });
            // Log for debugging the filter itself
            // console.log(`\n[Filtering for Day] Day object: ${day.toISOString()}, formattedDayString: "${formattedDayString}"`);

            const classesForThisDay = weeklySchedule.filter(cls => {
              // if (formattedDayString === '2025-05-26') { // Example specific day log
              //   console.log(`  [Filter Check] cls.specificDate: "${cls.specificDate}" === formattedDayString: "${formattedDayString}" -> ${cls.specificDate === formattedDayString}`);
              // }
              return cls.specificDate === formattedDayString;
            });
            // if (classesForThisDay.length > 0) console.log(`  Found ${classesForThisDay.length} classes for "${formattedDayString}"`);

            return (
              <div key={formattedDayString} className={styles.dayColumn}>
                <h4 className={styles.dayHeader}>{format(day, 'EEEE, MMM d')}</h4>
                {classesForThisDay.length > 0 ? (
                  classesForThisDay.map(item => { // item is a class instance
                    let timeString = `${item.startTime} - ${item.endTime}`;
                    try {
                      const s = parse(item.startTime, "H:mm", new Date());
                      const e = parse(item.endTime, "H:mm", new Date());
                      if (!isNaN(s) && !isNaN(e)) timeString = `${format(s, 'h:mm a')} - ${format(e, 'h:mm a')}`;
                    } catch (_) {}

                    const instanceUniqueId = item._id + item.specificDate;
                    const isExpanded = expandedInstanceId === instanceUniqueId;
                    const isThisInstanceLoading = instanceActionLoading?.classId === item._id && instanceActionLoading?.specificDate === item.specificDate;

                    return (
                      <div
                        key={instanceUniqueId}
                        className={`${styles.reservationCard} ${styles.coachCardInstance} ${!item.isEffectivelyActive ? styles.cancelledInstance : ''}`}
                      >
                        <h5>{item.title}</h5>
                        <p>{timeString}</p>
                        <p className={styles.attendeeCount}>
                          Attendees: {item.attendees?.length ?? 0} / {item.max_capacity}
                        </p>
                        <div className={styles.instanceActions}>
                          <button
                            type="button"
                            className={styles.btnViewAttendees}
                            onClick={() => toggleAttendeeList(instanceUniqueId)}
                            disabled={isLoading || isThisInstanceLoading} // Disable if main schedule is loading or this instance action
                          >
                            {isExpanded ? 'Hide Attendees' : 'View Attendees'}
                          </button>
                          <button
                            type="button"
                            className={item.isCancelledThisInstance ? styles.btnReactivate : styles.btnCancelInstance}
                            onClick={() => handleToggleInstanceCancellation(item._id, item.specificDate, item.isCancelledThisInstance)}
                            disabled={isLoading || isThisInstanceLoading || !item.isActive}
                          >
                            {isThisInstanceLoading ? 'Updating...' : (item.isCancelledThisInstance ? 'Reactivate Session' : 'Cancel Session')}
                          </button>
                        </div>
                        {!item.isActive && <p className={styles.seriesInactive}>(This recurring class series is Inactive)</p>}

                        {isExpanded && (
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
                            ) : (<p className={styles.noAttendeesMessage}>No attendees for this session.</p>)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.noClassesForDay}>No classes scheduled.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoachSchedulePage;