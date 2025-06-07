import React, { useEffect, useState, useCallback } from 'react';
import pageStyles from '../styles/coachSchedule.module.css';
import modalStyles from '../components/confirmationmodal.module.css';
import { useAuth } from '../context/AuthContext';
import {
  format, parse, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, formatISO, parseISO,
  getDay
} from 'date-fns';
import ConfirmationModal from '../components/ConfirmationModal';
import { FaExclamationTriangle, FaUndoAlt, FaChevronDown } from 'react-icons/fa';
import DBZGreeting from '../components/DBZGreeting';

const YOUR_DBZ_GIF_URL = "https://media1.tenor.com/m/bWkE0Y8JaBgAAAAC/dragon-ball-super-saiyan.gif";
const GREETING_DISPLAY_DURATION = 4000;

const CoachSchedulePage = () => {
  const { user, isAuthLoading } = useAuth();

  // Schedule and UI states
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ message: '', type: '' });
  const [expandedInstanceId, setExpandedInstanceId] = useState(null);
  const [instanceActionLoading, setInstanceActionLoading] = useState(null);
  const [bulkActionLoadingDate, setBulkActionLoadingDate] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Admin specific states
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [coachesLoading, setCoachesLoading] = useState(false);
  const [viewedCoachName, setViewedCoachName] = useState('');

  // DBZ Greeting state
  const [showDbzGreeting, setShowDbzGreeting] = useState(false);

  // Confirmation Modal state
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: "Confirm Action", message: "Are you sure?", onConfirm: () => {},
    confirmText: "Confirm", icon: <FaExclamationTriangle className={modalStyles.modalTitleIcon} />
  });

  // DBZ Greeting Effect
  useEffect(() => {
    if (user && user.role === 'coach' && !sessionStorage.getItem('dbzGreetingShown')) {
      setShowDbzGreeting(true);
      sessionStorage.setItem('dbzGreetingShown', 'true');
      const timer = setTimeout(() => setShowDbzGreeting(false), GREETING_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [user, isAuthLoading]);

  // Fetch Available Coaches (for Admin)
  useEffect(() => {
    const fetchCoaches = async () => {
        if (user && user.role === 'admin' && !isAuthLoading) {
            setCoachesLoading(true);
            setAvailableCoaches([]);
            const token = localStorage.getItem("token");
            if (!token) { setError("Auth token missing for fetching coaches."); setCoachesLoading(false); return; }
            try {
                const response = await fetch('http://localhost:5001/api/user/coaches', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || 'Failed to fetch coaches list');
                }
                const data = await response.json();
                setAvailableCoaches(data);
                if (data.length > 0 && !selectedCoachId) {
                    setSelectedCoachId(data[0]._id);
                    setViewedCoachName(data[0].name);
                } else if (data.length === 0) {
                    setError("No coaches found in the system.");
                    setWeeklySchedule([]);
                }
            } catch (err) {
                console.error("Error fetching coaches:", err);
                setError(`Failed to load coaches: ${err.message}`);
                setAvailableCoaches([]);
            } finally {
                setCoachesLoading(false);
            }
        } else if (user && user.role === 'coach') {
            setAvailableCoaches([]);
            setSelectedCoachId('');
            setViewedCoachName(user.name || "Coach");
        }
    };
    if (!isAuthLoading) {
        fetchCoaches();
    }
  }, [user, isAuthLoading]);

  // Fetch Coach's Weekly Schedule
  const fetchCoachWeeklySchedule = useCallback(async (weekStartDate, coachIdToFetch = null) => {
    if (!user) {
      setError("User not authenticated.");
      setIsLoading(false);
      return;
    }
    if (user.role !== 'coach' && user.role !== 'admin') {
      setError("Access Denied.");
      setIsLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required.");
      setIsLoading(false);
      return;
    }

    if (user.role === 'admin' && !coachIdToFetch) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setActionFeedback({ message: '', type: '' });

    const startDateParam = formatISO(weekStartDate, { representation: 'date' });
    let fetchUrl = `http://localhost:5001/api/user/coaching-schedule?startDate=${startDateParam}&view=week`;

    if (user.role === 'admin' && coachIdToFetch) {
      fetchUrl += `&coachId=${coachIdToFetch}`;
    }

    try {
      const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Fetch failed: ${res.status}`);
      }
      setWeeklySchedule(data.schedule || []);
      setViewedCoachName(data.viewedCoach?.name || (user.role === 'coach' ? (user.name || "My") : "Coach"));
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err.message || "Could not load schedule.");
      setViewedCoachName(user.role === 'coach' ? (user.name || '') : '');
      // Only clear schedule if it's the first load or a hard error
      if (!hasLoadedOnce) setWeeklySchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, hasLoadedOnce]);

  // Effect to fetch schedule data when relevant state changes
  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (user.role === 'coach') {
        fetchCoachWeeklySchedule(currentWeekStart, null);
    } else if (user.role === 'admin' && selectedCoachId) {
        fetchCoachWeeklySchedule(currentWeekStart, selectedCoachId);
    } else if (user.role === 'admin' && !selectedCoachId) {
        setWeeklySchedule([]);
    }
  }, [user, currentWeekStart, fetchCoachWeeklySchedule, isAuthLoading, selectedCoachId, availableCoaches, coachesLoading]);

  useEffect(() => { setExpandedDay(null); }, [currentWeekStart]);

  // Helper to refresh current schedule view
  const refreshCurrentSchedule = useCallback(() => {
    if (user) {
        if (user.role === 'coach') {
            fetchCoachWeeklySchedule(currentWeekStart, null);
        } else if (user.role === 'admin' && selectedCoachId) {
            fetchCoachWeeklySchedule(currentWeekStart, selectedCoachId);
        }
    }
  }, [user, currentWeekStart, selectedCoachId, fetchCoachWeeklySchedule]);

  // Optimistic update for bulk actions
  const optimisticBulkUpdate = (dateToModifyISO, allAreCurrentlyClosed) => {
    setWeeklySchedule(prev =>
      prev.map(cls =>
        cls.specificDate === dateToModifyISO
          ? { ...cls, isEffectivelyActive: allAreCurrentlyClosed }
          : cls
      )
    );
  };

  const handleToggleInstanceCancellation = async (classId, specificDate, currentIsCancelledStatus) => {
    const token = localStorage.getItem("token");
    if (!token) { setActionFeedback({ message: "Authentication session missing.", type: 'error' }); return; }
    setInstanceActionLoading({ classId, specificDate }); setActionFeedback({ message: '', type: '' });
    const payload = { classId, date: specificDate, cancel: !currentIsCancelledStatus };
    try {
        const res = await fetch("http://localhost:5001/api/classes/instance/toggle-cancellation", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || `Failed to update status: ${res.status}`);
        setActionFeedback({ message: result.message || "Class status updated!", type: 'success' });
        refreshCurrentSchedule();
    } catch (err) { setActionFeedback({ message: err.message || "Could not update class status.", type: 'error' }); }
    finally { setInstanceActionLoading(null); }
  };

  const handleBulkDayAction = (dateToModifyISO, allAreCurrentlyClosed) => {
    const actionVerb = allAreCurrentlyClosed ? "reactivate" : "cancel";
    const titleAction = allAreCurrentlyClosed ? "Reopen All Classes" : "Close All Classes";
    const messageAction = allAreCurrentlyClosed
      ? `Are you sure you want to reactivate ALL sessions for ${viewedCoachName || 'this coach'} on ${format(parseISO(dateToModifyISO), 'EEEE, MMM d')}?`
      : `Are you sure you want to cancel ALL active classes for ${viewedCoachName || 'this coach'} on ${format(parseISO(dateToModifyISO), 'EEEE, MMM d')}?`;
    const confirmBtnText = allAreCurrentlyClosed ? "Yes, Reopen All" : "Yes, Close All";
    const confirmBtnClass = allAreCurrentlyClosed ? modalStyles.btnConfirmSuccess : modalStyles.btnConfirmDanger;
    const modalIcon = allAreCurrentlyClosed
        ? <FaUndoAlt className={modalStyles.modalTitleIcon} style={{ color: '#5cb85c' }}/>
        : <FaExclamationTriangle className={modalStyles.modalTitleIcon} style={{ color: '#d9534f' }} />;

    setConfirmModalProps({
      title: `Confirm: ${titleAction}`, message: messageAction, confirmText: confirmBtnText,
      confirmButtonClass: confirmBtnClass, icon: modalIcon,
      onConfirm: async () => {
        setIsConfirmModalOpen(false);
        const token = localStorage.getItem("token");
        if (!token) { setActionFeedback({ message: "Auth session missing.", type: 'error' }); return; }
        setBulkActionLoadingDate(dateToModifyISO);
        setActionFeedback({ message: `Processing action for ${format(parseISO(dateToModifyISO), 'MMM d')}...`, type: 'info', id: 'bulk_processing_info' });

        const coachIdForAction = user.role === 'admin' ? selectedCoachId : null;
        const bodyPayload = coachIdForAction ? { date: dateToModifyISO, coachId: coachIdForAction } : { date: dateToModifyISO };

        const endpoint = allAreCurrentlyClosed
          ? "http://localhost:5001/api/classes/bulk-reactivate-day"
          : "http://localhost:5001/api/classes/bulk-cancel-day";
        try {
          const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(bodyPayload) });
          const result = await res.json();
          if (!res.ok) throw new Error(result.message || `Failed to ${actionVerb} classes: ${res.status}`);
          setActionFeedback({ message: result.message || `All classes for the day ${actionVerb}d!`, type: 'success' });
          optimisticBulkUpdate(dateToModifyISO, allAreCurrentlyClosed);
          // Optionally, re-fetch in the background for consistency:
          setTimeout(refreshCurrentSchedule, 1000);
        } catch (err) { setActionFeedback({ message: err.message || `Could not ${actionVerb} classes.`, type: 'error' }); }
        finally { setBulkActionLoadingDate(null); }
      },
      onClose: () => setIsConfirmModalOpen(false)
    });
    setIsConfirmModalOpen(true);
  };

  const handlePreviousWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const toggleAttendeeList = (instanceUniqueId) => setExpandedInstanceId(prev => prev === instanceUniqueId ? null : instanceUniqueId);
  const handleToggleDayExpansion = (dayString) => {
    setExpandedDay(prevExpandedDay => (prevExpandedDay === dayString ? null : dayString));
  };

  // --- Render Guards ---
  if (isAuthLoading && !user) {
    return <div className={pageStyles.container}><p className={pageStyles.loadingText}>Loading Session...</p></div>;
  }
  if (!user && !isAuthLoading) {
    return (<div className={`${pageStyles.container} ${pageStyles.coachSchedulePageContainer}`}>
      <h1 className={pageStyles.pageTitle}>Schedule Viewer</h1>
      <p className={pageStyles.errorText}>Please log in to view schedules.</p>
    </div>);
  }
  if (user.role !== 'coach' && user.role !== 'admin') {
     return (<div className={`${pageStyles.container} ${pageStyles.coachSchedulePageContainer}`}>
      <h1 className={pageStyles.pageTitle}>Access Denied</h1>
      <p className={pageStyles.errorText}>You do not have permission to view this page.</p>
    </div>);
  }

  let pageDisplayTitle = "My Weekly Schedule";
  if (user) {
      if (user.role === 'coach') {
          pageDisplayTitle = `${user.name || 'My'} Weekly Schedule`;
      } else if (user.role === 'admin') {
          if (viewedCoachName && selectedCoachId) {
              pageDisplayTitle = `${viewedCoachName}'s Weekly Schedule`;
          } else if (availableCoaches.length > 0 && !selectedCoachId && !coachesLoading) {
              pageDisplayTitle = "Select a Coach to View Schedule";
          } else if (availableCoaches.length === 0 && !coachesLoading) {
              pageDisplayTitle = "No Coaches Available";
          } else {
              pageDisplayTitle = "Coach Schedule Overview";
          }
      }
  }

  const allWeekDays = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) });
  const weekDaysForDisplay = allWeekDays.filter(day => { const dOW = getDay(day); return dOW >= 1 && dOW <= 5; });

  return (
    <div className={pageStyles.container}>
      {user && user.role === 'admin' && (
        <div className={pageStyles.coachSelectorContainer}>
          <label htmlFor="coachSelect">View Schedule For: </label>
          <select
            id="coachSelect"
            value={selectedCoachId}
            onChange={(e) => {
                const newCoachId = e.target.value;
                setSelectedCoachId(newCoachId);
                const coach = availableCoaches.find(c => c._id === newCoachId);
                setViewedCoachName(coach ? coach.name : '');
            }}
            className={pageStyles.coachSelect}
            disabled={coachesLoading || isLoading}
          >
            <option value="">-- Select a Coach --</option>
            {availableCoaches.map(coach => (
              <option key={coach._id} value={coach._id}>
                {coach.name}
              </option>
            ))}
          </select>
          {coachesLoading && <p className={pageStyles.loadingTextSmall}>Loading coaches...</p>}
        </div>
      )}

      <h1 className={pageStyles.pageTitle}>{pageDisplayTitle}</h1>
      <p className={pageStyles.pageSubtitle}>Manage upcoming classes (Monday - Friday).</p>

      <div className={pageStyles.weekNavigation}>
        <button type="button" onClick={handlePreviousWeek} className={pageStyles.btnNav} disabled={isLoading || !!instanceActionLoading || !!bulkActionLoadingDate || (user.role === 'admin' && !selectedCoachId)}> Prev</button>
        <h3 className={pageStyles.weekDisplay}>{format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 4), 'MMM d, yyyy')}</h3>
        <button type="button" onClick={handleNextWeek} className={pageStyles.btnNav} disabled={isLoading || !!instanceActionLoading || !!bulkActionLoadingDate || (user.role === 'admin' && !selectedCoachId)}>Next </button>
      </div>

      {actionFeedback.message && (
        <div className={`${pageStyles.feedbackContainer} ${
            actionFeedback.type === 'error' ? pageStyles.errorText :
            (actionFeedback.type === 'success' ? pageStyles.successText : pageStyles.infoText)}`}>
          <p>{actionFeedback.message}</p>
        </div>
      )}

      {/* Only show loading message if we have never loaded data */}
      {isLoading && !hasLoadedOnce && <p className={pageStyles.loadingText}>Loading schedule...</p>}
      {error && !isLoading && <p className={`${pageStyles.errorText} ${pageStyles.feedbackContainer}`}>{error}</p>}

      {!isLoading && !error && weeklySchedule.length === 0 && user &&
        ( (user.role === 'coach') || (user.role === 'admin' && selectedCoachId) ) && (
        <p className={pageStyles.noReservations}>
            No classes found for {viewedCoachName || (user.role === 'coach' ? "you" : "the selected coach")} in this week.
        </p>
      )}
      {!isLoading && !error && user.role === 'admin' && !selectedCoachId && availableCoaches.length > 0 && !coachesLoading && (
        <p className={pageStyles.noReservations}>Please select a coach to view their schedule.</p>
      )}
       {!isLoading && !error && user.role === 'admin' && availableCoaches.length === 0 && !coachesLoading && (
        <p className={pageStyles.noReservations}>There are no coaches in the system to display schedules for.</p>
      )}

      {weeklySchedule.length > 0 && !error && (
        <div className={pageStyles.weeklyScheduleContainer}>
          {weekDaysForDisplay.map(day => {
            const formattedDayString = formatISO(day, { representation: 'date' });
            const classesForThisDay = weeklySchedule.filter(cls => cls.specificDate === formattedDayString);
            const allPotentiallyRunnableClassesAreClosed = classesForThisDay.length > 0 && classesForThisDay.every(cls => !cls.isEffectivelyActive);
            const isDayCurrentlyExpanded = expandedDay === formattedDayString;

            return (
              <div key={formattedDayString} className={`${pageStyles.dayColumn} ${isDayCurrentlyExpanded ? pageStyles.dayExpandedMobile : ''}`}>
                <div className={pageStyles.dayHeaderContainer} onClick={(e) => { if (e.target.closest('button')) return; handleToggleDayExpansion(formattedDayString);}} role="button" aria-expanded={isDayCurrentlyExpanded} aria-controls={`day-content-${formattedDayString}`} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleDayExpansion(formattedDayString);}}>
                  <h4 className={pageStyles.dayHeader}>{format(day, 'EEEE, MMM d')}</h4>
                  {classesForThisDay.length > 0 && (
                    <div className={pageStyles.dayActionContainer}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleBulkDayAction(formattedDayString, allPotentiallyRunnableClassesAreClosed);}} className={allPotentiallyRunnableClassesAreClosed ? pageStyles.btnOpenDay : pageStyles.btnCloseDay} disabled={isLoading || !!instanceActionLoading || bulkActionLoadingDate === formattedDayString} title={allPotentiallyRunnableClassesAreClosed ? `Reactivate all sessions for ${format(day, 'MMM d')}` : `Cancel all active sessions for ${format(day, 'MMM d')}`}>
                            {bulkActionLoadingDate === formattedDayString ? 'Processing...' : (allPotentiallyRunnableClassesAreClosed ? 'Reopen All' : 'Close All')}
                        </button>
                    </div>
                  )}
                  <FaChevronDown className={pageStyles.dayExpansionIcon} />
                </div>
                <div id={`day-content-${formattedDayString}`} className={pageStyles.dayClassesContainer} aria-hidden={!isDayCurrentlyExpanded}>
                  {classesForThisDay.length > 0 ? (
                    classesForThisDay.map(item => {
                      let timeString = `${item.startTime} - ${item.endTime}`; try { const s = parse(item.startTime, "H:mm", new Date()), e = parse(item.endTime, "H:mm", new Date()); if (!isNaN(s) && !isNaN(e)) timeString = `${format(s, 'h:mm a')} - ${format(e, 'h:mm a')}`; } catch (_) {}
                      const itemClassId = item.classId || item._id;
                      const instanceUniqueId = `${itemClassId}-${item.specificDate}`;
                      const isInstanceContentExpanded = expandedInstanceId === instanceUniqueId;
                      const isThisInstanceLoading = instanceActionLoading?.classId === itemClassId && instanceActionLoading?.specificDate === item.specificDate;
                      const coachNameForDisplay = item.coach?.name;

                      return (
                        <div key={instanceUniqueId} className={`${pageStyles.coachCardInstance} ${!item.isEffectivelyActive ? pageStyles.cancelledInstance : ''}`}>
                          <h5>{item.title || 'Class'}</h5>
                          {coachNameForDisplay && user.role === 'admin' && <p className={pageStyles.coachNameSmall}>Coach: {coachNameForDisplay}</p>}
                          <p>{timeString}</p>
                          <p className={pageStyles.attendeeCount}>Attendees: {item.attendees?.length ?? 0}/{item.max_capacity}</p>
                          {!item.isActive && <p className={pageStyles.seriesInactive}>(Recurring series is Inactive)</p>}
                          <div className={pageStyles.instanceActions}>
                            <button type="button" className={pageStyles.btnViewAttendees} onClick={() => toggleAttendeeList(instanceUniqueId)} disabled={isLoading || isThisInstanceLoading || !!bulkActionLoadingDate}>
                                {isInstanceContentExpanded ? 'Hide' : 'View'} Attendees
                            </button>
                            {item.isActive && (
                              <button type="button" className={item.isCancelledThisInstance ? pageStyles.btnReactivate : pageStyles.btnCancelInstance} onClick={() => handleToggleInstanceCancellation(itemClassId, item.specificDate, item.isCancelledThisInstance)} disabled={isLoading || isThisInstanceLoading || !!bulkActionLoadingDate}>
                                  {isThisInstanceLoading ? 'Processing...' : (item.isCancelledThisInstance ? 'Reactivate' : 'Cancel Session')}
                              </button>
                            )}
                          </div>
                          {isInstanceContentExpanded && (
                            <div className={pageStyles.attendeeList}>
                              {(item.attendees && item.attendees.length > 0) ? (
                                <ul>{item.attendees.map(att => ( <li key={att._id || att.user_id || att.email}> {att.name} {att.email && <span className={pageStyles.attendeeEmail}>({att.email})</span>} </li> ))}</ul>
                              ) : ( <p className={pageStyles.noAttendeesMessage}>No attendees for this session.</p> )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : ( <p className={pageStyles.noClassesForDay}>No classes scheduled for this day.</p> )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        {...confirmModalProps}
      />
      <DBZGreeting isOpen={showDbzGreeting} onClose={() => setShowDbzGreeting(false)} gifUrl={YOUR_DBZ_GIF_URL} />
    </div>
  );
};

export default CoachSchedulePage;