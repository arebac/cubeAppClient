import React, { useEffect, useState, useCallback } from 'react';
import pageStyles from '../styles/coachSchedule.module.css'; // Main styles for this page
import modalStyles from '../components/confirmationmodal.module.css'; // Styles for the confirmation modal
import { useAuth } from '../context/AuthContext';
import {
  format, parse, addDays,
  startOfWeek, endOfWeek, eachDayOfInterval, formatISO, parseISO,
  getDay
} from 'date-fns';
import ConfirmationModal from '../components/ConfirmationModal';
import { FaExclamationTriangle, FaUndoAlt } from 'react-icons/fa'; // Icons for modal

const CoachSchedulePage = () => {
  const { user, isAuthLoading } = useAuth();

  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isLoading, setIsLoading] = useState(false); // For main schedule fetch
  const [error, setError] = useState(null); // For fetching schedule errors
  const [actionFeedback, setActionFeedback] = useState({ message: '', type: '' }); // For general action feedback
  const [expandedInstanceId, setExpandedInstanceId] = useState(null); // "classId-specificDate" for attendee list
  const [instanceActionLoading, setInstanceActionLoading] = useState(null); // { classId, specificDate } for individual cancel/reactivate
  const [bulkActionLoadingDate, setBulkActionLoadingDate] = useState(null); // Date string for "Close/Open All Today" button

  // State for Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: "Confirm Action",
    message: "Are you sure?",
    onConfirm: () => {},
    confirmText: "Confirm",
    icon: <FaExclamationTriangle className={modalStyles.modalTitleIcon} /> // Default icon
  });

  // Fetch Coach's Weekly Schedule
  const fetchCoachWeeklySchedule = useCallback(async (weekStartDate) => {
    if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
      setError("Access Denied. Only coaches or admins can view this page.");
      setWeeklySchedule([]); setIsLoading(false); return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required to fetch schedule.");
      setWeeklySchedule([]); setIsLoading(false); return;
    }

    console.log(`[CoachSchedulePage] Fetching schedule for week starting with: ${formatISO(weekStartDate, { representation: 'date' })}`);
    setIsLoading(true);
    setError(null); // Clear previous fetch error

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
      console.log("[CoachSchedulePage] Fetched weekly schedule data (count):", data.length);
      if (data.length > 0) console.log("[CoachSchedulePage] Sample item [0].specificDate:", data[0]?.specificDate);
      setWeeklySchedule(data);
    } catch (err) {
      console.error("❌ Error fetching coach's weekly schedule:", err);
      setError(err.message || "Could not load schedule.");
      setWeeklySchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Depends on user object for role and auth status

  // Effect to fetch schedule on relevant changes
  useEffect(() => {
    if (user && (user.role === 'coach' || user.role === 'admin')) {
      fetchCoachWeeklySchedule(currentWeekStart);
    } else if (!user && !isAuthLoading) {
        setError("Please log in as a coach or admin to view this page.");
        setWeeklySchedule([]);
    }
    // Clear general (non-processing) action feedback when week/user changes
    if (actionFeedback.type !== 'info' || (actionFeedback.id && actionFeedback.id !== 'bulk_processing_info')) {
        setActionFeedback({ message: '', type: '' });
    }
  }, [user, currentWeekStart, fetchCoachWeeklySchedule, isAuthLoading]);

  // Handler to toggle individual instance cancellation
  const handleToggleInstanceCancellation = async (classId, specificDate, currentIsCancelledStatus) => {
    const token = localStorage.getItem("token");
    if (!token) { setActionFeedback({ message: "Authentication session missing.", type: 'error' }); return; }

    setInstanceActionLoading({ classId, specificDate });
    setActionFeedback({ message: '', type: '' });

    const payload = { classId, date: specificDate, cancel: !currentIsCancelledStatus };
    try {
      const res = await fetch("http://localhost:5001/api/classes/instance/toggle-cancellation", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Failed to update status: ${res.status}`);
      setActionFeedback({ message: result.message || "Class status updated!", type: 'success' });
      await fetchCoachWeeklySchedule(currentWeekStart); // Refresh schedule
    } catch (err) {
      setActionFeedback({ message: err.message || "Could not update class status.", type: 'error' });
    } finally {
      setInstanceActionLoading(null);
    }
  };

  // Handler for Bulk Day Actions (Cancel All / Reactivate All)
  const handleBulkDayAction = (dateToModifyISO, allAreCurrentlyClosed) => {
    const actionVerb = allAreCurrentlyClosed ? "reactivate" : "cancel";
    const titleAction = allAreCurrentlyClosed ? "Reopen All Classes" : "Close All Classes";
    const messageAction = allAreCurrentlyClosed
      ? `Are you sure you want to reactivate ALL your sessions for ${format(parseISO(dateToModifyISO), 'EEEE, MMM d')}? This will make them available to users again.`
      : `Are you sure you want to cancel ALL your active classes for ${format(parseISO(dateToModifyISO), 'EEEE, MMM d')}? This will mark them as unavailable.`;
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

        const endpoint = allAreCurrentlyClosed
          ? "http://localhost:5001/api/classes/bulk-reactivate-day"
          : "http://localhost:5001/api/classes/bulk-cancel-day";
        try {
          const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ date: dateToModifyISO }) });
          const result = await res.json();
          if (!res.ok) throw new Error(result.message || `Failed to ${actionVerb} classes: ${res.status}`);
          setActionFeedback({ message: result.message || `All classes for the day ${actionVerb}d!`, type: 'success' });
          await fetchCoachWeeklySchedule(currentWeekStart);
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

  // --- Render Logic ---
  if (isAuthLoading && !user) {
    return <div className={pageStyles.container}><p className={pageStyles.loadingText}>Loading Authentication...</p></div>;
  }
  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    return (<div className={`${pageStyles.container} ${pageStyles.coachSchedulePageContainer}`}><h1 className={pageStyles.pageTitle}>My Weekly Schedule</h1><p className={pageStyles.errorText}>{error || "Access Denied. This page is for coaches and admins."}</p></div>);
  }

  const allWeekDays = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) });
  const weekDaysForDisplay = allWeekDays.filter(day => { const dOW = getDay(day); return dOW >= 1 && dOW <= 5; }); // Monday to Friday

  return (
    <div className={`${pageStyles.container} ${pageStyles.coachSchedulePageContainer}`}>
      <h1 className={pageStyles.pageTitle}>My Weekly Schedule</h1>
      <p className={pageStyles.pageSubtitle}>Manage upcoming classes (Monday - Friday).</p>

      <div className={pageStyles.weekNavigation}>
        <button type="button" onClick={handlePreviousWeek} className={pageStyles.btnNav} disabled={isLoading || !!instanceActionLoading || !!bulkActionLoadingDate}> Prev</button>
        <h3 className={pageStyles.weekDisplay}>{format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 4), 'MMM d, yyyy')}</h3>
        <button type="button" onClick={handleNextWeek} className={pageStyles.btnNav} disabled={isLoading || !!instanceActionLoading || !!bulkActionLoadingDate}>Next </button>
      </div>

      {actionFeedback.message && (<div className={`${pageStyles.feedbackContainer} ${actionFeedback.type === 'error' ? pageStyles.errorText : (actionFeedback.type === 'success' ? pageStyles.successText : pageStyles.infoText)}`}><p>{actionFeedback.message}</p></div>)}

      {isLoading && weeklySchedule.length === 0 && !error && <p className={pageStyles.loadingText}>Loading schedule...</p>}
      {error && <p className={pageStyles.errorText}>Error: {error}</p>}
      {!isLoading && !error && weeklySchedule.length === 0 && (<p className={pageStyles.noReservations}>No classes found for this coach in this week.</p>)}

      {weeklySchedule.length > 0 && (
        <div className={pageStyles.weeklyScheduleGrid}>
          {weekDaysForDisplay.map(day => {
            const formattedDayString = formatISO(day, { representation: 'date' });
            const classesForThisDay = weeklySchedule.filter(cls => cls.specificDate === formattedDayString);
            const allPotentiallyRunnableClassesAreClosed = classesForThisDay.length > 0 && classesForThisDay.every(cls => !cls.isEffectivelyActive);

            return (
              <div key={formattedDayString} className={pageStyles.dayColumn}>
                <div className={pageStyles.dayHeaderContainer}>
                  <h4 className={pageStyles.dayHeader}>{format(day, 'EEEE, MMM d')}</h4>
                  {classesForThisDay.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleBulkDayAction(formattedDayString, allPotentiallyRunnableClassesAreClosed)}
                      className={allPotentiallyRunnableClassesAreClosed ? pageStyles.btnOpenDay : pageStyles.btnCloseDay}
                      disabled={isLoading || !!instanceActionLoading || bulkActionLoadingDate === formattedDayString}
                      title={allPotentiallyRunnableClassesAreClosed ? `Reactivate all sessions for ${format(day, 'MMM d')}` : `Cancel all active sessions for ${format(day, 'MMM d')}`}
                    >
                      {bulkActionLoadingDate === formattedDayString ? 'Processing...' : (allPotentiallyRunnableClassesAreClosed ? 'Reopen All Today' : 'Close All Today')}
                    </button>
                  )}
                </div>
                {classesForThisDay.length > 0 ? (
                  classesForThisDay.map(item => {
                    let timeString = `${item.startTime} - ${item.endTime}`; try {const s=parse(item.startTime,"H:mm",new Date()),e=parse(item.endTime,"H:mm",new Date()); if(!isNaN(s)&&!isNaN(e))timeString=`${format(s,'h:mm a')} - ${format(e,'h:mm a')}`;}catch(_){}
                    const instanceUniqueId = item._id + item.specificDate;
                    const isExpanded = expandedInstanceId === instanceUniqueId;
                    const isThisInstanceLoading = instanceActionLoading?.classId === item._id && instanceActionLoading?.specificDate === item.specificDate;
                    return (
                      <div key={instanceUniqueId} className={`${pageStyles.reservationCard} ${pageStyles.coachCardInstance} ${!item.isEffectivelyActive ? pageStyles.cancelledInstance : ''}`}>
                        <h5>{item.title}</h5><p>{timeString}</p>
                        <p className={pageStyles.attendeeCount}>Attendees: {item.attendees?.length??0}/{item.max_capacity}</p>
                        <div className={pageStyles.instanceActions}>
                          <button type="button" className={pageStyles.btnViewAttendees} onClick={()=>toggleAttendeeList(instanceUniqueId)} disabled={isLoading||isThisInstanceLoading}>{isExpanded?'Hide':'View'} Attendees</button>
                          {item.isActive && (<button type="button" className={item.isCancelledThisInstance?pageStyles.btnReactivate:pageStyles.btnCancelInstance} onClick={()=>handleToggleInstanceCancellation(item._id, item.specificDate, item.isCancelledThisInstance)} disabled={isLoading||isThisInstanceLoading}>{isThisInstanceLoading?'Processing...':(item.isCancelledThisInstance?'Reactivate':'Cancel Session')}</button>)}
                        </div>
                        {!item.isActive && <p className={pageStyles.seriesInactive}>(Recurring series is Inactive)</p>}
                        {isExpanded && (<div className={pageStyles.attendeeList}>
                            {(item.attendees && item.attendees.length > 0) ? (<ul>{item.attendees.map(att=>(<li key={att._id||att.id||att.email}>{att.name} {att.email && <span className={pageStyles.attendeeEmail}>({att.email})</span>}</li>))}</ul>)
                            : (<p className={pageStyles.noAttendeesMessage}>No attendees for this session.</p>)}
                        </div>)}
                      </div>);
                  })
                ) : ( <p className={pageStyles.noClassesForDay}>No classes scheduled.</p> )}
              </div>);
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={confirmModalProps.onClose}
        onConfirm={confirmModalProps.onConfirm}
        title={confirmModalProps.title}
        message={confirmModalProps.message}
        confirmText={confirmModalProps.confirmText}
        cancelText="No, Go Back" // Customized cancel text
        confirmButtonClass={confirmModalProps.confirmButtonClass}
        icon={confirmModalProps.icon}
        // positionStyle={confirmModalProps.positionStyle} // Removed for default centering
      />
    </div>
  );
};

export default CoachSchedulePage;