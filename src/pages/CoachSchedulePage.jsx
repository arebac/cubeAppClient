// src/pages/CoachSchedulePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import styles from '../styles/coachSchedule.module.css'; // Or your chosen CSS module
import { useAuth } from '../context/AuthContext';
import {
  format, parse, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, formatISO
} from 'date-fns';

const CoachSchedulePage = () => {
  const { user, isAuthLoading } = useAuth();

  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ message: '', type: '' });
  const [expandedInstanceId, setExpandedInstanceId] = useState(null);
  const [instanceActionLoading, setInstanceActionLoading] = useState(null);

  // Fetch Coach's Weekly Schedule
  const fetchCoachWeeklySchedule = useCallback(async (weekStartDate) => {
    // Ensure user is available and has the correct role before fetching
    if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
      console.log("[fetchCoachWeeklySchedule] No user or invalid role. Aborting fetch.");
      setError("Access Denied. Only coaches or admins can view this page.");
      setWeeklySchedule([]); // Clear data if not authorized
      setIsLoading(false); // Ensure loading is off
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("[fetchCoachWeeklySchedule] No token. Aborting fetch.");
      setError("Authentication required to fetch schedule.");
      setWeeklySchedule([]);
      setIsLoading(false);
      return;
    }

    console.log(`[fetchCoachWeeklySchedule] Fetching for week starting: ${formatISO(weekStartDate, { representation: 'date' })}`);
    setIsLoading(true);
    setError(null);
    // Action feedback is cleared on week change by useEffect or by the action handler itself.

    const startDateParam = formatISO(weekStartDate, { representation: 'date' });
    const fetchUrl = `http://localhost:5001/api/user/coaching-schedule?startDate=${startDateParam}&view=week`;

    try {
      const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        let eMsg = `Fetch failed: ${res.status}`;
        try { const eD = await res.json(); eMsg = eD.message || eD.error || eMsg; } catch (_) {}
        throw new Error(eMsg);
      }
      const data = await res.json();
      console.log("[fetchCoachWeeklySchedule] Fetched data count:", data.length);
      if (data.length > 0) console.log("[fetchCoachWeeklySchedule] Sample item [0].specificDate:", data[0]?.specificDate);
      setWeeklySchedule(data);
    } catch (err) {
      console.error("❌ Error in fetchCoachWeeklySchedule:", err);
      setError(err.message || "Could not load schedule.");
      setWeeklySchedule([]); // Clear schedule on error
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Dependency: 'user' (contains role). Token is from localStorage.

  // Effect to fetch schedule on initial load, user change, or week change
  useEffect(() => {
    console.log("[CoachSchedulePage Effect] Triggered. User:", !!user, "Role:", user?.role, "currentWeekStart:", currentWeekStart.toISOString());
    if (user && (user.role === 'coach' || user.role === 'admin')) {
      fetchCoachWeeklySchedule(currentWeekStart);
    } else if (!user && !isAuthLoading) { // If auth check is done and there's no user
      setError("Please log in as a coach or admin to view this schedule.");
      setWeeklySchedule([]); // Ensure schedule is cleared
    }
    // Clear action feedback when the core data dependencies change (user, week)
    setActionFeedback({ message: '', type: '' });
  }, [user, currentWeekStart, fetchCoachWeeklySchedule, isAuthLoading]); // fetchCoachWeeklySchedule is stable due to useCallback

  // Handler to toggle instance cancellation
  const handleToggleInstanceCancellation = async (classId, specificDate, currentIsCancelledStatus) => {
    const token = localStorage.getItem("token");
    if (!token) { setActionFeedback({ message: "Authentication session missing.", type: 'error' }); return; }

    setInstanceActionLoading({ classId, specificDate });
    setActionFeedback({ message: '', type: '' }); // Clear previous feedback before new action

    const payload = { classId, date: specificDate, cancel: !currentIsCancelledStatus };
    try {
      const res = await fetch("http://localhost:5001/api/classes/instance/toggle-cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Failed to update status: ${res.status}`);

      setActionFeedback({ message: result.message || "Class status updated successfully!", type: 'success' });
      // The useEffect will re-trigger fetchCoachWeeklySchedule because fetchCoachWeeklySchedule
      // itself doesn't change often, but we want to ensure it re-fetches after an action.
      // A direct call is more explicit here.
      await fetchCoachWeeklySchedule(currentWeekStart);
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
        <p className={styles.errorText}>{error || "Access Denied. Please log in as Coach or Admin."}</p>
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
        <h3 className={styles.weekDisplay}>{format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}</h3>
        <button type="button" onClick={handleNextWeek} className={styles.btnNav} disabled={isLoading}>Next Week </button>
      </div>

      {actionFeedback.message && (<div className={`${styles.feedbackContainer} ${actionFeedback.type === 'error' ? styles.errorText : styles.successText}`}><p>{actionFeedback.message}</p></div>)}

      {isLoading && weeklySchedule.length === 0 && !error && <p className={styles.loadingText}>Loading schedule...</p>}
      {error && <p className={styles.errorText}>Error: {error}</p>}

      {/* Main condition for rendering the grid or "no classes" message */}
      {!isLoading && !error && weeklySchedule.length === 0 && (
        <p className={styles.noReservations}>No classes found for this coach in this week.</p>
      )}

      {/* Render grid if data exists (even if a refresh is loading) */}
      {weeklySchedule.length > 0 && (
        <div className={styles.weeklyScheduleGrid}>
          {/* Log data being used by the map */}
          {console.log("[Render Grid] Rendering with weeklySchedule (count):", weeklySchedule.length, "Sample specificDate:", weeklySchedule[0]?.specificDate)}

          {weekDaysForDisplay.map(day => {
            const formattedDayString = formatISO(day, { representation: 'date' });
            const classesForThisDay = weeklySchedule.filter(cls => cls.specificDate === formattedDayString);
            // Log for each day column
            // console.log(`  [Render Day Column] For ${formattedDayString}, found ${classesForThisDay.length} classes. weeklySchedule total: ${weeklySchedule.length}`);

            return (
              <div key={formattedDayString} className={styles.dayColumn}>
                <h4 className={styles.dayHeader}>{format(day, 'EEEE, MMM d')}</h4>
                {classesForThisDay.length > 0 ? (
                  classesForThisDay.map(item => {
                    let timeString = `${item.startTime} - ${item.endTime}`;
                    try { const s=parse(item.startTime,"H:mm",new Date()),e=parse(item.endTime,"H:mm",new Date()); if(!isNaN(s)&&!isNaN(e))timeString=`${format(s,'h:mm a')} - ${format(e,'h:mm a')}`;}catch(_){}
                    const instanceUniqueId = item._id + item.specificDate;
                    const isExpanded = expandedInstanceId === instanceUniqueId;
                    const isThisInstanceLoading = instanceActionLoading?.classId === item._id && instanceActionLoading?.specificDate === item.specificDate;
                    return (
                      <div key={instanceUniqueId} className={`${styles.reservationCard} ${styles.coachCardInstance} ${!item.isEffectivelyActive ? styles.cancelledInstance : ''}`}>
                        <h5>{item.title}</h5><p>{timeString}</p>
                        <p className={styles.attendeeCount}>Attendees: {item.attendees?.length??0}/{item.max_capacity}</p>
                        <div className={styles.instanceActions}>
                          <button type="button" className={styles.btnViewAttendees} onClick={()=>toggleAttendeeList(instanceUniqueId)} disabled={isLoading||isThisInstanceLoading}>{isExpanded?'Hide Attendees':'View Attendees'}</button>
                          <button type="button" className={item.isCancelledThisInstance?styles.btnReactivate:styles.btnCancelInstance} onClick={()=>handleToggleInstanceCancellation(item._id, item.specificDate, item.isCancelledThisInstance)} disabled={isLoading||isThisInstanceLoading||!item.isActive}>{isThisInstanceLoading?'Updating...':(item.isCancelledThisInstance?'Reactivate':'Cancel Session')}</button>
                        </div>
                        {!item.isActive && <p className={styles.seriesInactive}>(Series Inactive)</p>}
                        {isExpanded && (<div className={styles.attendeeList}>
                            {(item.attendees && item.attendees.length > 0) ? (<ul>{item.attendees.map(att=>(<li key={att._id||att.id||att.email}>{att.name} {att.email && <span className={styles.attendeeEmail}>({att.email})</span>}</li>))}</ul>)
                            : (<p className={styles.noAttendeesMessage}>No attendees.</p>)}
                        </div>)}
                      </div>);
                  })
                ) : ( <p className={styles.noClassesForDay}>No classes scheduled.</p> )}
              </div>);
          })}
        </div>
      )}
      {/* Fallback if grid wasn't rendered but there's also no error and not loading */}
      {!isLoading && !error && weeklySchedule.length === 0 && ! (weeklySchedule.length > 0) && (
           <p className={styles.noReservations}>No classes found for this coach in this week (fallback).</p>
      )}
    </div>
  );
};

export default CoachSchedulePage;