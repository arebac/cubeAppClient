// src/pages/AdminMetricsPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Assuming you have this
import styles from '../styles/adminMetricsPage.module.css'; // We'll create this CSS file next

// Placeholder for chart components - you'll replace these
const PlaceholderChart = ({ title }) => (
  <div className={styles.chartPlaceholder}>
    <h3>{title}</h3>
    <p>(Chart will be here)</p>
  </div>
);

const AdminMetricsPage = () => {
  const { user, isAuthLoading } = useAuth(); // Get user info

  // Example state for one of the metrics (you'll add more)
  const [newSignupsData, setNewSignupsData] = useState({ total: 0, trend: [] });
  const [isLoadingSignups, setIsLoadingSignups] = useState(false);
  const [errorSignups, setErrorSignups] = useState(null);

  // Example useEffect to fetch data for "New Signups" (you'll expand this)
  useEffect(() => {
    if (user && user.role === 'admin') {
      const fetchSignups = async () => {
        setIsLoadingSignups(true);
        setErrorSignups(null);
        const token = localStorage.getItem('token');
        try {
          // Replace with your actual API endpoint when created
          // const response = await fetch('/api/admin/metrics/new-signups?period=last_30_days', {
          //   headers: { 'Authorization': `Bearer ${token}` }
          // });
          // if (!response.ok) throw new Error('Failed to fetch new signups');
          // const data = await response.json();
          // setNewSignupsData(data);

          // --- MOCK DATA for now until backend is ready ---
          console.log("AdminMetricsPage: Mocking fetch for New Signups");
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
          setNewSignupsData({
            totalNewInPeriod: 78,
            trend: [
              { period: "2023-10-01", count: 5 },
              { period: "2023-10-02", count: 3 },
              { period: "2023-10-03", count: 7 },
              { period: "2023-10-04", count: 4 },
              { period: "2023-10-05", count: 6 },
            ]
          });
          // --- END MOCK DATA ---

        } catch (err) {
          setErrorSignups(err.message);
        } finally {
          setIsLoadingSignups(false);
        }
      };
      fetchSignups();
    }
  }, [user]); // Re-fetch if user changes (e.g., on login)

  if (isAuthLoading) {
    return <div className={styles.loadingPage}>Loading Admin Dashboard...</div>;
  }

  // This check should ideally be handled by a ProtectedRoute component,
  // but we add a fallback here.
  if (!user || user.role !== 'admin') {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Access Denied</h1>
        <p className={styles.errorText}>You do not have permission to view this page.</p>
        {/* Optionally, redirect or show a link to homepage/login */}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Admin Metrics Dashboard</h1>

      {/* Section for KPIs */}
      <section className={styles.kpiSection}>
        <div className={styles.kpiCard}>
          <h4>Total Active Members</h4>
          <p className={styles.kpiValue}>--</p> {/* Replace with actual data */}
        </div>
        <div className={styles.kpiCard}>
          <h4>New Sign-ups (Last 30d)</h4>
          {isLoadingSignups ? <p>Loading...</p> : errorSignups ? <p className={styles.errorTextSmall}>Error</p> : <p className={styles.kpiValue}>{newSignupsData.totalNewInPeriod}</p>}
        </div>
        <div className={styles.kpiCard}>
          <h4>Renewals (Last 30d)</h4>
          <p className={styles.kpiValue}>--</p>
        </div>
        <div className={styles.kpiCard}>
          <h4>Churn (Last 30d)</h4>
          <p className={styles.kpiValue}>--</p>
        </div>
      </section>

      {/* Section for Charts & Tables */}
      <section className={styles.chartsSection}>
        {/* User & Membership Metrics */}
        <div className={styles.metricGroup}>
          <h2>User & Membership</h2>
          <div className={styles.chartsGrid}>
            <PlaceholderChart title="Active Members Trend" />
            {isLoadingSignups ? <p>Loading signups chart...</p> : errorSignups ? <p className={styles.errorTextSmall}>Error loading signups</p> : <PlaceholderChart title={`New Sign-ups Trend (${newSignupsData.trend.length} points)`} />}
            <PlaceholderChart title="Subscription Renewals vs. Churn" />
            <PlaceholderChart title="User Reservation Frequency (Histogram)" />
          </div>
          <div className={styles.tableContainer}>
            <h3>User Last Login/Activity</h3>
            <p>(Table will be here)</p>
          </div>
        </div>

        {/* Add more metric groups later */}
        {/* <div className={styles.metricGroup}>
          <h2>Class & Reservation Metrics</h2>
          ...
        </div> */}
      </section>
    </div>
  );
};

export default AdminMetricsPage;