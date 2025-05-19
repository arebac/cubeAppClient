import React, { useEffect, useState } from "react";
import styles from "../styles/dropin.module.css"; // Adjust path
import { useNavigate, Link } from "react-router-dom"; // Added Link for login prompt
import { useAuth } from "../context/AuthContext"; // Ensure this path is correct
import { format, parse, getDay, addDays, startOfWeek, formatISO } from 'date-fns';

const DropIn = () => {
  const { user, isAuthLoading, fetchAndUpdateUser } = useAuth(); // Get refresh function
  const navigate = useNavigate();

  // State
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [isFetchingClasses, setIsFetchingClasses] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState({});
  const [isReserving, setIsReserving] = useState(false);
  const [reservationError, setReservationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  console.log(`DropIn rendered. AuthLoading: ${isAuthLoading}, User:`, user ? user._id || user.id : 'null');

  // Fetch Classes (Keep as is)
  const fetchClassesForDate = async (date) => {
    const isoDateString = formatISO(date, { representation: 'date' });
    console.log("Fetching classes for date:", isoDateString);
    setAvailableClasses([]); setFetchError(null); setIsFetchingClasses(true);
    try {
      const apiUrl = `http://localhost:5001/api/classes?date=${isoDateString}`;
      const res = await fetch(apiUrl);
      if (!res.ok) { let errorMsg = `HTTP error! status: ${res.status}`; try { const e = await res.json(); errorMsg = e.message||e.error||errorMsg; } catch(p){} throw new Error(errorMsg); }
      const data = await res.json();
      console.log("Fetched classes:", data);
      setAvailableClasses(data);
    } catch (err) { console.error("❌ Could not fetch classes:", err); setFetchError(`Failed to load classes: ${err.message}`); setAvailableClasses([]); }
    finally { setIsFetchingClasses(false); }
  };w

  // Select Date (Keep as is)
  const handleSelectDate = (date) => {
    setFetchError(null); setSuccessMessage(null); setReservationError(null);
    const clickedDateISO = formatISO(date, { representation: 'date' });
    const currentSelectedISO = selectedDate ? formatISO(selectedDate, { representation: 'date' }) : null;
    if (currentSelectedISO === clickedDateISO) { setSelectedDate(null); setAvailableClasses([]); console.log("Date deselected"); }
    else { setSelectedDate(date); fetchClassesForDate(date); console.log("Date selected:", clickedDateISO); }
  };

  // Toggle Class Selection (Keep as is)
  const toggleClassSelection = (dateKey, classId) => {
    setSuccessMessage(null); setReservationError(null);
    setSelectedClasses((prev) => {
      const current = prev[dateKey] || []; const updated = current.includes(classId) ? [] : [classId];
      const newState = { ...prev }; if (updated.length > 0) newState[dateKey] = updated; else delete newState[dateKey];
      console.log("Selected classes state updated:", newState); return newState;
    });
  };

  // --- Week Schedule Calculation (Keep as is) ---
  const today = new Date(); const weekStartsOn = 1; const currentDay = getDay(today) === 0 ? 7 : getDay(today);
  const weekSchedule = []; let startDay = startOfWeek(today, { weekStartsOn });
  if (currentDay === 6 || currentDay === 7) { startDay = addDays(startDay, 7); console.log("Weekend. Showing next Mon-Fri."); for (let i=0; i<5; i++) { const d=addDays(startDay, i); weekSchedule.push({ id: formatISO(d, {representation: 'date'}), date: d });}}
  else { console.log(`Weekday (Day ${currentDay}). Showing today-Fri.`); const fridayIndex = 5; for (let i=0; (currentDay+i)<=fridayIndex; i++) { const d=addDays(today, i); weekSchedule.push({ id: formatISO(d, {representation: 'date'}), date: d });}}
  // --- End Week Schedule ---

  // --- MODIFIED Handle Reserve Button Click ---
  const handleReserve = async (event) => { // <-- Accept event object
    if (event) event.preventDefault(); // <-- PREVENT DEFAULT BROWSER ACTION (MOST IMPORTANT FIX)

    setReservationError(null); setSuccessMessage(null); // Clear previous feedback

    if (isAuthLoading) { console.warn("Reserve clicked while auth loading."); return; }
    console.log("[DropIn Reserve] Checking user state:", user);
    if (!user || !(user.id || user._id)) { setReservationError("Authentication details missing. Please log in again."); return; }
    const hasSelection = Object.values(selectedClasses).some(arr => arr.length > 0);
    if (!hasSelection) { setReservationError("Please select at least one class time to reserve."); return; }

    const token = localStorage.getItem("token");
    console.log(`[DropIn Reserve] Token: `, token ? 'Exists' : 'null');
    if (!token) { setReservationError("Authentication error. Please log in again."); return; }

    setIsReserving(true);
    console.log("Sending reservation data to backend:", { reservations: selectedClasses });

    try {
      const apiUrl = "http://localhost:5001/api/classes/reserve";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ reservations: selectedClasses }),
      });

      // Specific check for auth errors first
      if (res.status === 401 || res.status === 403) {
          let errorMsg = `Not authorized (${res.status}). Session may have expired.`;
          try { const errData = await res.json(); errorMsg = errData.message || errorMsg; } catch(e){}
          throw new Error(errorMsg);
      }

      // Await parsing for all other responses
      const result = await res.json();

      if (!res.ok) { // Handle other non-success statuses
         throw new Error(result.message || result.error || `Reservation failed: ${res.status}`);
      }

      // --- Success ---
      console.log("✅ Reservations successful:", result);
      setSuccessMessage(result.message || "Class(es) reserved successfully!"); // Set state
      setSelectedClasses({}); // Clear selections
      setSelectedDate(null); // Collapse date card
      setAvailableClasses([]); // Clear displayed classes

       // Refresh user data (fire and forget is okay here)
       if (typeof fetchAndUpdateUser === 'function') {
           console.log("[DropIn Reserve] Refreshing user data...");
           fetchAndUpdateUser();
       } else { console.warn("[DropIn Reserve] fetchAndUpdateUser missing."); }

    } catch (error) {
      console.error("❌ Reservation error:", error);
      setReservationError(error.message || "An unknown error occurred.");
    } finally {
      setIsReserving(false);
    }
  }; // --- End handleReserve ---

  // --- Render Logic ---
  if (isAuthLoading) { return <div className={styles.container}><p className={styles.loadingText}>Loading...</p></div>; }
  if (!user && !isAuthLoading) { return (<div className={styles.container}><h1 className={styles.title}>Drop In</h1><p className={styles.errorText}>Please <Link to="/login" className={styles.inlineLink}>log in</Link> to reserve classes.</p></div>); }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Drop In</h1>

      {/* Date Card Container */}
      <div className={styles.classes}>
        {weekSchedule.map(({ id, date }) => {
          const hasSelectedForThisDate = selectedClasses[id]?.length > 0;
          const isExpanded = selectedDate ? formatISO(selectedDate, { representation: 'date' }) === id : false;
          return (
            <React.Fragment key={id}>
              <div /* Date Card */
                className={`${styles.classCard} ${isExpanded ? styles.selected : ""}`}
                onClick={() => handleSelectDate(date)}
                role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && handleSelectDate(date)}
              >
                {format(date, "EEEE, MMMM do")} {hasSelectedForThisDate && " ✅"}
              </div>
              {isExpanded && ( /* Class List */
                <div className={styles.classList}>
                  {isFetchingClasses ? <p className={styles.loadingText}>Loading...</p>
                   : fetchError ? <p className={styles.errorText}>{fetchError}</p>
                   : availableClasses.length > 0 ? ( availableClasses.map((classInfo) => {
                      let timeString = `${classInfo.startTime} - ${classInfo.endTime}`;
                      try { const start = parse(classInfo.startTime, "H:mm", new Date()); const end = parse(classInfo.endTime, "H:mm", new Date()); if (!isNaN(start) && !isNaN(end)) { timeString = `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`; }} catch(e) { console.warn("Time parse err",e); }
                      const isSelected = selectedClasses[id]?.includes(classInfo._id);
                      return (
                        <div /* Time Slot Card */
                          key={classInfo._id}
                          className={`${styles.classCard} ${styles.timeSlot} ${isSelected ? styles.selected : ""}`}
                          onClick={() => toggleClassSelection(id, classInfo._id)}
                           role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && toggleClassSelection(id, classInfo._id)}
                        > {timeString} {isSelected && " ✔"} </div> );
                    })
                  ) : (<p className={styles.noClasses}>No classes available.</p>) }
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Feedback Area */}
      <div className={styles.feedbackContainer}>
          {successMessage && <p className={styles.successText}>{successMessage}</p>}
          {reservationError && <p className={styles.errorText}>{reservationError}</p>}
      </div>

      {/* Reserve Button Container */}
      <div className={styles.reserveButtonContainer}>
          {/* --- Ensure onClick passes the event --- */}
          <button
              type="button" // Keep this!
              className={styles.reserveBtn}
              onClick={(e) => handleReserve(e)} // <-- Pass the event object 'e'
              disabled={isAuthLoading || isReserving || !Object.values(selectedClasses).some(arr => arr.length > 0)}
          >
            {isReserving ? "Reserving..." : "Reserve Selected Spaces"}
          </button>
          {/* --- --- --- --- --- --- --- --- --- --- --- */}
      </div>
    </div>
  );
};

export default DropIn;