// src/pages/CoachSchedulePage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import styles from '../styles/coachSchedule.module.css'; // Or your dashboard.module.css
import { useAuth } from '../context/AuthContext';
import {
  format, parse, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, formatISO
} from 'date-fns';
// import { useNavigate } from 'react-router-dom';

const CoachSchedulePage = () => {
  const { user, isAuthLoading } = useAuth();
  // const navigate = useNavigate();

  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isLoading, setIsLoading] = useState(false); // General loading for the schedule fetch
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ message: '', type: '' });
  const [expandedInstanceId, setExpandedInstanceId] = useState(null);
  const [instanceActionLoading, setInstanceActionLoading] = useState(null); // For specific button loading

  // Fetch Coach's Weekly Schedule
  const fetchCoachWeeklySchedule = useCallback(async (weekStartDate) => {
    if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
      // setError("Access Denied."); // Error is handled by top-level guard
      setWeeklySchedule([]); // Clear data if user is not authorized
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required.");
      setWeeklySchedule([]);
      return;
    }

    console.log(`[CoachSchedulePage] Fetching schedule for week starting: ${formatISO(weekStartDate)}`);
    setIsLoading(true);
    setError(null);
    // Don't clear actionFeedback here, allow it to persist until next action or explicit clear
    // setActionFeedback({ message: '', type: '' });

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
      // Log a sample if data exists
      if (data.length > 0) console.log("[CoachSchedulePage] Sample fetched item:", data[0]);
      setWeeklySchedule(data);
    } catch (err) {
      console.error("❌ Error fetching coach's weekly schedule:", err);
      setError(err.message || "Could not load schedule.");
      setWeeklySchedule([]); // Clear schedule on error
    } finally {
      setIsLoading(false);
    }
  }, [user]); // user.role is part of user, token is stable via localStorage

  // Initial fetch and fetch on week change or user change
  useEffect(() => {
    console.log("[CoachSchedulePage Effect] Checking conditions. User:", !!user, "Role:", user?.role, "WeekStart:", currentWeekStart.toISOString());
    if (user && (user.role === 'coach' || user.role === 'admin')) {
      fetchCoachWeeklySchedule(currentWeekStart);
    } else if (!user && !isAuthLoading) {
        setError("Please log in as a coach or admin.");
        setWeeklySchedule([]);
    }
    // Clear action feedback when the week changes or user changes
    setActionFeedback({ message: '', type: '' });
  }, [user, currentWeekStart, fetchCoachWeeklySchedule, isAuthLoading]);

  // Handler to toggle instance cancellation
  const handleToggleInstanceCancellation = async (classId, specificDate, currentIsCancelledStatus) => {
    const token = localStorage.getItem("token");
    if (!token) { setActionFeedback({ message: "Auth session missing.", type: 'error' }); return; }

    setInstanceActionLoading({ classId, specificDate });
    setActionFeedback({ message: '', type: '' }); // Clear previous action feedback

    const payload = { classId, date: specificDate, cancel: !currentIsCancelledStatus };
    try {
      const res = await fetch("http://localhost:5001/api/classes/instance/toggle-cancellation", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Failed to update: ${res.status}`);
      setActionFeedback({ message: result.message || "Class status updated!", type: 'success' });
      await fetchCoachWeeklySchedule(currentWeekStart); // Refresh schedule
    } catch (err) {
      console.error("❌ Error toggling instance cancellation:", err);
      setActionFeedback({ message: err.message || "Could not update class status.", type: 'error' });
    } finally {
      setInstanceActionLoading(null);
    }
  };

  const handlePreviousWeek = () => { setActionFeedback({message:'',type:''}); setCurrentWeekStart(prev => addDays(prev, -7));}
  const handleNextWeek = () => { setActionFeedback({message:'',type:''}); setCurrentWeekStart(prev => addDays(prev, 7));}
  const toggleAttendeeList = (instanceUniqueId) => setExpandedInstanceId(prev => prev === instanceUniqueId ? null : instanceUniqueId);


  // --- Render Logic ---
  if (isAuthLoading && !user) {
    return <div className={styles.container}><p className={styles.loadingText}>Loading Authentication...</p></div>;
  }
  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    return <div className={styles.container}><h1 className={styles.pageTitle}>My Weekly Schedule</h1><p className={styles.errorText}>{error || "Access Denied."}</p></div>;
  }

  const weekDaysForDisplay = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) });

  return (
    <div className={`${styles.container} ${styles.coachSchedulePageContainer}`}>
      <h1 className={styles.pageTitle}>My Weekly Schedule</h1>
      <p className={styles.pageSubtitle}>Manage your upcoming classes for the week.</p>

      <div className={styles.weekNavigation}>
        <button type="button" onClick={handlePreviousWeek} className={styles.btnNav} disabled={isLoading}>Prev Week</button>
        <h3 className={styles.weekDisplay}>{format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, {weekStartsOn:1}), 'MMM d, yyyy')}</h3>
        <button type="button" onClick={handleNextWeek} className={styles.btnNav} disabled={isLoading}>Next Week</button>
      </div>

      {actionFeedback.message && (<div className={`${styles.feedbackContainer} ${actionFeedback.type === 'error' ? styles.errorText : styles.successText}`}><p>{actionFeedback.message}</p></div>)}

      {/* --- MODIFIED Loading and Data Display Logic --- */}
      {isLoading && weeklySchedule.length === 0 && !error && <p className={styles.loadingText}>Loading schedule...</p>}
      {error && <p className={styles.errorText}>Error: {error}</p>}

      {/* Render the grid if there's data OR if it's loading but there was previous data */}
      {(!error && (weeklySchedule.length > 0 || isLoading)) && (
        <div className={styles.weeklyScheduleGrid}>
          {weekDaysForDisplay.map(day => {
            const formattedDayString = formatISO(day, { representation: 'date' });
            // Filter from the current weeklySchedule state
            const classesForThisDay = weeklySchedule.filter(cls => cls.specificDate === formattedDayString);
            return (
              <div key={formattedDayString} className={styles.dayColumn}>
                <h4 className={styles.dayHeader}>{format(day, 'EEEE, MMM d')}</h4>
                {classesForThisDay.length > 0 ? (
                  classesForThisDay.map(item => {
                    let timeString = `${item.startTime} - ${item.endTime}`; try {const s=parse(item.startTime,"H:mm",new Date()),e=parse(item.endTime,"H:mm",new Date());if(!isNaN(s)&&!isNaN(e))timeString=`${format(s,'h:mm a')} - ${format(e,'h:mm a')}`;}catch(_){}
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
                            {(item.attendees && item.attendees.length > 0) ? (<ul>{item.attendees.map(att=>(<li key={att._id||att.id}>{att.name} {att.email && <span className={styles.attendeeEmail}>({att.email})</span>}</li>))}</ul>)
                            : (<p className={styles.noAttendeesMessage}>No attendees.</p>)}
                        </div>)}
                      </div>);
                  })
                ) : ( <p className={styles.noClassesForDay}>No classes scheduled.</p> )}
              </div>);
          })}
        </div>
      )}
      {/* Message for no data when not loading and no error and weeklySchedule is confirmed empty */}
      {!isLoading && !error && weeklySchedule.length === 0 && (
          <p className={styles.noReservations}>No classes found for this coach in this week.</p>
      )}
      {/* --- END MODIFIED --- */}

    </div>
  );
};

export default CoachSchedulePage;