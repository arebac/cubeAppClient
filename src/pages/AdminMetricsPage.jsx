import React, { useState } from "react";
import { format, subDays, formatISO } from "date-fns";
import styles from "../styles/adminMetricsPage.module.css";
import UserMembershipMetrics from "../components/UserMembershipMetrics";
import ClassReservationMetrics from '../components/ClassReservationMetrics';
import RevenueSalesMetrics from '../components/RevenueSalesMetrics';

const AdminMetricsPage = () => {
  const [dateRange, setDateRange] = useState({
    startDate: formatISO(subDays(new Date(), 29), { representation: "date" }),
    endDate: formatISO(new Date(), { representation: "date" }),
  });
  const [activeView, setActiveView] = useState("user"); // 'user', 'class', 'revenue'

  // Chart options (can be moved to a separate file if reused)
  const newSignupsChartOptions = {
    /* ...same as before... */
  };
  const activeMembersChartOptions = {
    /* ...same as before... */
  };
  const renewalsChurnChartOptions = {
    /* ...same as before... */
  };
  const reservationFrequencyChartOptions = {
    /* ...same as before... */
  };

  const handleDateChange = (e) => {
    setDateRange((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Admin Metrics Dashboard</h1>
      <div className={styles.dateRangePickerContainer}>
        <label htmlFor="startDate">Start Date: </label>
        <input
          type="date"
          id="startDate"
          name="startDate"
          value={dateRange.startDate}
          onChange={handleDateChange}
          className={styles.dateInput}
        />
        <label htmlFor="endDate">End Date: </label>
        <input
          type="date"
          id="endDate"
          name="endDate"
          value={dateRange.endDate}
          onChange={handleDateChange}
          className={styles.dateInput}
        />
      </div>

      {/* View Switcher */}
      <div className={styles.viewSwitcher}>
        <button
          className={activeView === "user" ? styles.activeTab : ""}
          onClick={() => setActiveView("user")}
        >
          User & Membership Metrics
        </button>
        <button
          className={activeView === "class" ? styles.activeTab : ""}
          onClick={() => setActiveView("class")}
        >
          Class & Reservation Metrics
        </button>
        <button
          className={activeView === "revenue" ? styles.activeTab : ""}
          onClick={() => setActiveView("revenue")}
        >
          Revenue & Sales Metrics
        </button>
      </div>

      {/* Render the selected metrics view */}
      {activeView === "user" && (
        <UserMembershipMetrics
          dateRange={dateRange}
          newSignupsChartOptions={newSignupsChartOptions}
          activeMembersChartOptions={activeMembersChartOptions}
          renewalsChurnChartOptions={renewalsChurnChartOptions}
          reservationFrequencyChartOptions={reservationFrequencyChartOptions}
        />
      )}
      {activeView === "class" && (
        <ClassReservationMetrics dateRange={dateRange} />
      )}
      {activeView === "revenue" && (
        <RevenueSalesMetrics dateRange={dateRange} />
      )}
    </div>
  );
};

export default AdminMetricsPage;
