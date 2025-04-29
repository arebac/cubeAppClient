import React, { useEffect, useState } from "react";
import styles from "../styles/dropin.module.css"; // Adjust path
import { useNavigate } from "react-router-dom"; // Added for potential redirects
import { useAuth } from "../context/AuthContext";
import { format, parse, getDay, addDays, startOfWeek, formatISO } from 'date-fns'; // Added formatISO

const DropIn = () => {
  const { user, isAuthLoading } = useAuth();
  const navigate = useNavigate(); // Initialize navigate

  // State for date card selection and available classes
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [isFetchingClasses, setIsFetchingClasses] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // State for user's selections to be reserved
  const [selectedClasses, setSelectedClasses] = useState({}); // { 'YYYY-MM-DD': [classId] }

  // State for reservation API call
  const [isReserving, setIsReserving] = useState(false);
  const [reservationError, setReservationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  console.log(`DropIn component rendered. isAuthLoading: ${isAuthLoading}, user:`, user);

  // Fetch Classes for a Specific Date
  const fetchClassesForDate = async (date) => {
    const dateString = date.toString();
    console.log("Fetching classes for date:", dateString);
    setAvailableClasses([]);
    setFetchError(null);
    setIsFetchingClasses(true);
    try {
      const res = await fetch(
        `http://localhost:5001/api/classes?date=${encodeURIComponent(dateString)}`
      );
      if (!res.ok) {
          let errorMsg = `HTTP error! status: ${res.status}`;
          try { const errorData = await res.json(); errorMsg = errorData.message || errorData.error || errorMsg; } catch (parseError) {}
          throw new Error(errorMsg);
      }
      const data = await res.json();
      console.log("Fetched classes:", data);
      setAvailableClasses(data);
    } catch (err) {
      console.error("❌ Could not fetch classes:", err);
      setFetchError(`Failed to load classes: ${err.message}`);
      setAvailableClasses([]);
    } finally {
        setIsFetchingClasses(false);
    }
  };

   // Handle Selecting a Date Card
   const handleSelectDate = (date) => {
    setFetchError(null);
    setSuccessMessage(null);
    setReservationError(null); // Clear reservation errors too
    const clickedDateString = date.toDateString();
    const expandedDateString = selectedDate?.toDateString();

    if (expandedDateString === clickedDateString) {
      setSelectedDate(null);
      setAvailableClasses([]);
    } else {
      setSelectedDate(date);
      fetchClassesForDate(date);
    }
  };

   // Handle Toggling Class Selection for Reservation
   const toggleClassSelection = (dateKey, classId) => {
    setFetchError(null);
    setSuccessMessage(null);
    setReservationError(null);
    setSelectedClasses((prev) => {
      const currentSelectionsForDate = prev[dateKey] || [];
      const updatedSelectionsForDate = currentSelectionsForDate.includes(classId) ? [] : [classId];
      const newState = { ...prev };
      if (updatedSelectionsForDate.length > 0) { newState[dateKey] = updatedSelectionsForDate; }
      else { delete newState[dateKey]; }
      console.log("Selected classes state updated:", newState);
      return newState;
    });
  };


  // --- Week Schedule Calculation (Corrected Logic) ---
  const today = new Date();
  const currentDay = getDay(today); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const weekSchedule = [];

  if (currentDay === 0 || currentDay === 6) {
    // Weekend: Show next Mon-Fri
    const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
    const upcomingMonday = addDays(thisMonday, 7);
    for (let i = 0; i < 5; i++) {
      const date = addDays(upcomingMonday, i);
      const id = formatISO(date, { representation: 'date' }); // Use ISO date as key
      weekSchedule.push({ id, date });
    }
    console.log("Weekend detected. Displaying next Mon-Fri.");
  } else {
    // Weekday: Show today through Friday
    const daysRemaining = 5 - currentDay; // Friday is day 5 (when week starts Mon=1)
    for (let i = 0; i <= daysRemaining; i++) {
      const date = addDays(today, i);
      const id = formatISO(date, { representation: 'date' }); // Use ISO date as key
      weekSchedule.push({ id, date });
    }
    console.log(`Weekday detected (Day ${currentDay}). Displaying today through Friday.`);
  }
  // --- End Week Schedule Calculation ---


  // Handle Reserve Button Click
  const handleReserve = async () => {
    setReservationError(null);
    setSuccessMessage(null);
    if (isAuthLoading) return;
    if (!user || !user.id) { setReservationError("You must be logged in."); return; }
    const hasSelection = Object.keys(selectedClasses).length > 0;
    if (!hasSelection) { setReservationError("Please select a class."); return; }

    const userIdToSend = user.id;
    setIsReserving(true);
    console.log("Sending reservation data:", { reservations: selectedClasses, userId: userIdToSend });
    try {
      const res = await fetch("http://localhost:5001/api/classes/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservations: selectedClasses, userId: userIdToSend }),
      });
      const result = await res.json(); // Always try to parse JSON
      if (!res.ok) {
         // Use specific error message from backend if available
         throw new Error(result.message || result.error || `Reservation failed: ${res.status}`);
      }
      console.log("✅ Reservations successful:", result);
      setSuccessMessage(result.message || "Class(es) reserved successfully!");
      setSelectedClasses({});
      setSelectedDate(null); // Collapse expanded date
      setAvailableClasses([]);
      // Maybe redirect or show success longer?
    } catch (error) {
      console.error("❌ Reservation error:", error);
      setReservationError(error.message || "An unknown error occurred.");
    } finally {
      setIsReserving(false);
    }
  };

  // --- Render Logic ---
  if (isAuthLoading) {
      return <div className={styles.container}><p>Loading...</p></div>;
  }
  // Only allow logged-in users (not coaches?) to see this page? Add role check if needed.
  if (!user && !isAuthLoading) {
       return <div className={styles.container}><p>Please log in to reserve classes.</p></div>;
  }


  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Drop In</h1>
      <div className={styles.classes}> {/* Date Card Container */}
        {weekSchedule.map(({ id, date }) => { // id is 'YYYY-MM-DD'
          const hasSelectedForThisDate = selectedClasses[id]?.length > 0;
          const isExpanded = selectedDate?.toISOString().split('T')[0] === id;

          return (
            <React.Fragment key={id}>
              <div
                className={`${styles.classCard} ${isExpanded ? styles.selected : ""}`}
                onClick={() => handleSelectDate(date)}
              >
                {format(date, "EEEE, MMMM do")}
                {hasSelectedForThisDate && " ✅"}
              </div>
              {isExpanded && (
                <div className={styles.classList}>
                  {isFetchingClasses ? (
                    <p>Loading classes...</p>
                  ) : fetchError ? (
                      <p style={{ color: 'red' }}>{fetchError}</p>
                  ): availableClasses.length > 0 ? (
                    availableClasses.map((classInfo) => {
                      let timeString = `${classInfo.startTime} - ${classInfo.endTime}`;
                      try {
                          const start = parse(classInfo.startTime, "H:mm", new Date());
                          const end = parse(classInfo.endTime, "H:mm", new Date());
                          if (!isNaN(start) && !isNaN(end)) {
                              timeString = `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
                          }
                      } catch(e) {/* Ignore */}
                      // Use the 'id' (YYYY-MM-DD) as the key for selection state
                      const isSelected = selectedClasses[id]?.includes(classInfo._id);
                      return (
                        <div
                          key={classInfo._id}
                          className={`${styles.classCard} ${isSelected ? styles.selected : ""}`}
                          onClick={() => toggleClassSelection(id, classInfo._id)} // Pass 'id' as dateKey
                        >
                          {timeString}
                          {isSelected && " ✔"}
                        </div>
                      );
                    })
                  ) : (
                    <p className={styles.noClasses}>
                      No classes available for this day.
                    </p>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Display Reservation Feedback */}
      {reservationError && <p style={{ color: 'red', marginTop: '15px', textAlign: 'center' }}>{reservationError}</p>}
      {successMessage && <p style={{ color: 'green', marginTop: '15px', textAlign: 'center' }}>{successMessage}</p>}

      {/* Reserve Button */}
      <button
          className={styles.reserveBtn}
          onClick={handleReserve}
          disabled={isAuthLoading || isReserving || Object.keys(selectedClasses).length === 0}
      >
        {isReserving ? "Reserving..." : "Reserve Selected Spaces"}
      </button>
    </div>
  );
};

export default DropIn;