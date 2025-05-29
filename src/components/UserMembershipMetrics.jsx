import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/adminMetricsPage.module.css';
import { format, parseISO } from 'date-fns';
import MetricChart from './MetricChart';

const UserMembershipMetrics = ({
  dateRange,
  newSignupsChartOptions,
  activeMembersChartOptions,
  renewalsChurnChartOptions,
  reservationFrequencyChartOptions,
}) => {
  const { user, isAuthLoading } = useAuth();

  // --- New Signups State ---
  const [newSignupsData, setNewSignupsData] = useState({ totalNewInPeriod: 0, trend: [] });
  const [isLoadingNewSignups, setIsLoadingNewSignups] = useState(false);
  const [errorNewSignups, setErrorNewSignups] = useState(null);

  // --- Active Members State ---
  const [activeMembersData, setActiveMembersData] = useState({ totalActive: 0, trend: [] });
  const [isLoadingActiveMembers, setIsLoadingActiveMembers] = useState(false);
  const [errorActiveMembers, setErrorActiveMembers] = useState(null);

  // --- Renewals vs Churn State ---
  const [renewalsChurnData, setRenewalsChurnData] = useState({ totalRenewals: 0, totalChurn: 0, trend: [] });
  const [isLoadingRenewalsChurn, setIsLoadingRenewalsChurn] = useState(false);
  const [errorRenewalsChurn, setErrorRenewalsChurn] = useState(null);

  // --- Reservation Frequency State ---
  const [reservationFrequencyData, setReservationFrequencyData] = useState({ histogram: [] });
  const [isLoadingReservationFrequency, setIsLoadingReservationFrequency] = useState(false);
  const [errorReservationFrequency, setErrorReservationFrequency] = useState(null);

  // --- User Last Activity State ---
  const [userLastActivityData, setUserLastActivityData] = useState({ users: [] });
  const [isLoadingUserLastActivity, setIsLoadingUserLastActivity] = useState(false);
  const [errorUserLastActivity, setErrorUserLastActivity] = useState(null);

  // --- Fetch New Signups ---
  useEffect(() => {
    let isCancelled = false;
    const performFetchNewSignups = async () => {
      if (!user || user.role !== 'admin' || isAuthLoading) {
        if (!isAuthLoading && !user) setErrorNewSignups("User not authenticated.");
        else if (!isAuthLoading && user && user.role !== 'admin') setErrorNewSignups("Access denied for metrics.");
        setIsLoadingNewSignups(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorNewSignups("Authentication token not found.");
        setIsLoadingNewSignups(false);
        return;
      }
      setIsLoadingNewSignups(true);
      setErrorNewSignups(null);
      try {
        const url = `http://localhost:5001/api/admin/metrics/new-signups?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          let errorResponseMessage = `Request failed with status ${response.status}`;
          try {
            const errData = await response.json();
            errorResponseMessage = errData.message || errorResponseMessage;
          } catch {}
          throw new Error(errorResponseMessage);
        }
        const data = await response.json();
        if (!isCancelled) setNewSignupsData(data);
      } catch (err) {
        if (!isCancelled) {
          setErrorNewSignups(err.message);
          setNewSignupsData({ totalNewInPeriod: 0, trend: [] });
        }
      } finally {
        if (!isCancelled) setIsLoadingNewSignups(false);
      }
    };
    performFetchNewSignups();
    return () => { isCancelled = true; };
  }, [user, isAuthLoading, dateRange.startDate, dateRange.endDate]);

  // --- Fetch Active Members ---
  useEffect(() => {
    let isCancelled = false;
    const performFetchActiveMembers = async () => {
      if (!user || user.role !== 'admin' || isAuthLoading) {
        if (!isAuthLoading && !user) setErrorActiveMembers("User not authenticated.");
        else if (!isAuthLoading && user && user.role !== 'admin') setErrorActiveMembers("Access denied for metrics.");
        setIsLoadingActiveMembers(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorActiveMembers("Authentication token not found.");
        setIsLoadingActiveMembers(false);
        return;
      }
      setIsLoadingActiveMembers(true);
      setErrorActiveMembers(null);
      try {
        const url = `http://localhost:5001/api/admin/metrics/active-members?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          let errorResponseMessage = `Request failed with status ${response.status}`;
          try {
            const errData = await response.json();
            errorResponseMessage = errData.message || errorResponseMessage;
          } catch {}
          throw new Error(errorResponseMessage);
        }
        const data = await response.json();
        if (!isCancelled) setActiveMembersData(data);
      } catch (err) {
        if (!isCancelled) {
          setErrorActiveMembers(err.message);
          setActiveMembersData({ totalActive: 0, trend: [] });
        }
      } finally {
        if (!isCancelled) setIsLoadingActiveMembers(false);
      }
    };
    performFetchActiveMembers();
    return () => { isCancelled = true; };
  }, [user, isAuthLoading, dateRange.startDate, dateRange.endDate]);

  // --- Fetch Subscription Renewals vs Churn ---
  useEffect(() => {
    let isCancelled = false;
    const performFetchRenewalsChurn = async () => {
      if (!user || user.role !== 'admin' || isAuthLoading) {
        if (!isAuthLoading && !user) setErrorRenewalsChurn("User not authenticated.");
        else if (!isAuthLoading && user && user.role !== 'admin') setErrorRenewalsChurn("Access denied for metrics.");
        setIsLoadingRenewalsChurn(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorRenewalsChurn("Authentication token not found.");
        setIsLoadingRenewalsChurn(false);
        return;
      }
      setIsLoadingRenewalsChurn(true);
      setErrorRenewalsChurn(null);
      try {
        const url = `http://localhost:5001/api/admin/metrics/subscription-renewals-churn?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          let errorResponseMessage = `Request failed with status ${response.status}`;
          try {
            const errData = await response.json();
            errorResponseMessage = errData.message || errorResponseMessage;
          } catch {}
          throw new Error(errorResponseMessage);
        }
        const data = await response.json();
        if (!isCancelled) setRenewalsChurnData(data);
      } catch (err) {
        if (!isCancelled) {
          setErrorRenewalsChurn(err.message);
          setRenewalsChurnData({ totalRenewals: 0, totalChurn: 0, trend: [] });
        }
      } finally {
        if (!isCancelled) setIsLoadingRenewalsChurn(false);
      }
    };
    performFetchRenewalsChurn();
    return () => { isCancelled = true; };
  }, [user, isAuthLoading, dateRange.startDate, dateRange.endDate]);

  // --- Fetch Reservation Frequency ---
  useEffect(() => {
    let isCancelled = false;
    const fetchReservationFrequency = async () => {
      if (!user || user.role !== 'admin' || isAuthLoading) {
        setIsLoadingReservationFrequency(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorReservationFrequency("Authentication token not found.");
        setIsLoadingReservationFrequency(false);
        return;
      }
      setIsLoadingReservationFrequency(true);
      setErrorReservationFrequency(null);
      try {
        const url = `http://localhost:5001/api/admin/metrics/reservation-frequency?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          let errorResponseMessage = `Request failed with status ${response.status}`;
          try {
            const errData = await response.json();
            errorResponseMessage = errData.message || errorResponseMessage;
          } catch {}
          throw new Error(errorResponseMessage);
        }
        const data = await response.json();
        if (!isCancelled) setReservationFrequencyData(data);
      } catch (err) {
        if (!isCancelled) {
          setErrorReservationFrequency(err.message);
          setReservationFrequencyData({ histogram: [] });
        }
      } finally {
        if (!isCancelled) setIsLoadingReservationFrequency(false);
      }
    };
    fetchReservationFrequency();
    return () => { isCancelled = true; };
  }, [user, isAuthLoading, dateRange.startDate, dateRange.endDate]);

  // --- Fetch User Last Activity ---
  useEffect(() => {
    let isCancelled = false;
    const fetchUserLastActivity = async () => {
      if (!user || user.role !== 'admin' || isAuthLoading) {
        setIsLoadingUserLastActivity(false);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorUserLastActivity("Authentication token not found.");
        setIsLoadingUserLastActivity(false);
        return;
      }
      setIsLoadingUserLastActivity(true);
      setErrorUserLastActivity(null);
      try {
        const url = `http://localhost:5001/api/admin/metrics/user-last-activity?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          let errorResponseMessage = `Request failed with status ${response.status}`;
          try {
            const errData = await response.json();
            errorResponseMessage = errData.message || errorResponseMessage;
          } catch {}
          throw new Error(errorResponseMessage);
        }
        const data = await response.json();
        if (!isCancelled) setUserLastActivityData(data);
      } catch (err) {
        if (!isCancelled) {
          setErrorUserLastActivity(err.message);
          setUserLastActivityData({ users: [] });
        }
      } finally {
        if (!isCancelled) setIsLoadingUserLastActivity(false);
      }
    };
    fetchUserLastActivity();
    return () => { isCancelled = true; };
  }, [user, isAuthLoading, dateRange.startDate, dateRange.endDate]);

  // --- Prepare chart data ---
  const newSignupsChartDataPrepared = useMemo(() => {
    const trendArray = Array.isArray(newSignupsData.trend) ? newSignupsData.trend : [];
    const labels = trendArray.map(item =>
      item.date ? format(parseISO(item.date), 'MMM d') : ''
    );
    const dataPoints = trendArray.map(item =>
      typeof item.count === 'number' ? item.count : 0
    );
    return {
      labels,
      datasets: [
        {
          label: 'New Sign-ups',
          data: dataPoints,
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderColor: 'rgba(54, 162, 235, 1)',
          tension: 0.3,
          pointRadius: 3,
        }
      ]
    };
  }, [newSignupsData.trend]);

  const activeMembersChartDataPrepared = useMemo(() => {
    const trendArray = Array.isArray(activeMembersData.trend) ? activeMembersData.trend : [];
    const labels = trendArray.map(item =>
      item.date ? format(parseISO(item.date), 'MMM d') : ''
    );
    const dataPoints = trendArray.map(item =>
      typeof item.count === 'number' ? item.count : 0
    );
    return {
      labels,
      datasets: [
        {
          label: 'Active Members',
          data: dataPoints,
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.3,
          pointRadius: 3,
        }
      ]
    };
  }, [activeMembersData.trend]);

  const renewalsChurnChartDataPrepared = useMemo(() => {
    const trendArray = Array.isArray(renewalsChurnData.trend) ? renewalsChurnData.trend : [];
    const labels = trendArray.map(item =>
      item.date ? format(parseISO(item.date), 'MMM d') : ''
    );
    const renewals = trendArray.map(item =>
      typeof item.renewals === 'number' ? item.renewals : 0
    );
    const churn = trendArray.map(item =>
      typeof item.churn === 'number' ? item.churn : 0
    );
    return {
      labels,
      datasets: [
        {
          label: 'Renewals',
          data: renewals,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Churn',
          data: churn,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [renewalsChurnData.trend]);

  const reservationFrequencyChartDataPrepared = useMemo(() => {
    const histogram = Array.isArray(reservationFrequencyData.histogram) ? reservationFrequencyData.histogram : [];
    return {
      labels: histogram.map(item => item.bin),
      datasets: [
        {
          label: 'Users',
          data: histogram.map(item => item.count),
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        }
      ]
    };
  }, [reservationFrequencyData.histogram]);

  if (isAuthLoading && !user) {
    return <div className={styles.loading}>Loading...</div>;
  }
  if (!user || user.role !== 'admin') {
    return <div className={styles.errorText}>Access denied. Admins only.</div>;
  }

  return (
    <>
      {/* Active Members Section */}
      <div className={styles.metricGroup}>
        <h2>Total Active Members</h2>
        {errorActiveMembers && !isLoadingActiveMembers && (
          <p className={styles.errorText}>Error: {errorActiveMembers}</p>
        )}
        <section className={styles.kpiSection} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.kpiCard}>
            <h4>Active Members (Current)</h4>
            <p className={styles.kpiValue}>
              {isLoadingActiveMembers ? '...' : activeMembersData.totalActive}
            </p>
          </div>
        </section>
        <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <MetricChart
            title="Active Members Trend"
            data={activeMembersChartDataPrepared}
            options={activeMembersChartOptions}
            isLoading={isLoadingActiveMembers}
            error={errorActiveMembers}
          />
        </div>
      </div>

      {/* New Signups Section */}
      <div className={styles.metricGroup}>
        <h2>New Member Sign-ups</h2>
        {errorNewSignups && !isLoadingNewSignups && (
          <p className={styles.errorText}>Error: {errorNewSignups}</p>
        )}
        <section className={styles.kpiSection} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.kpiCard}>
            <h4>New Sign-ups (Period)</h4>
            <p className={styles.kpiValue}>
              {isLoadingNewSignups ? '...' : newSignupsData.totalNewInPeriod}
            </p>
          </div>
        </section>
        <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <MetricChart
            title="New Sign-ups Trend"
            data={newSignupsChartDataPrepared}
            options={newSignupsChartOptions}
            isLoading={isLoadingNewSignups}
            error={errorNewSignups}
          />
        </div>
      </div>

      {/* Subscription Renewals vs. Churn Section */}
      <div className={styles.metricGroup}>
        <h2>Subscription Renewals vs. Churn</h2>
        {errorRenewalsChurn && !isLoadingRenewalsChurn && (
          <p className={styles.errorText}>Error: {errorRenewalsChurn}</p>
        )}
        <section className={styles.kpiSection} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className={styles.kpiCard}>
            <h4>Total Renewals</h4>
            <p className={styles.kpiValue}>
              {isLoadingRenewalsChurn ? '...' : renewalsChurnData.totalRenewals}
            </p>
          </div>
          <div className={styles.kpiCard}>
            <h4>Total Churn</h4>
            <p className={styles.kpiValue}>
              {isLoadingRenewalsChurn ? '...' : renewalsChurnData.totalChurn}
            </p>
          </div>
        </section>
        <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <MetricChart
            title="Renewals vs. Churn Trend"
            data={renewalsChurnChartDataPrepared}
            options={renewalsChurnChartOptions}
            isLoading={isLoadingRenewalsChurn}
            error={errorRenewalsChurn}
            type="bar"
          />
        </div>
      </div>

      {/* Reservation Frequency Section */}
      <div className={styles.metricGroup}>
        <h2>User Reservation Frequency</h2>
        {errorReservationFrequency && !isLoadingReservationFrequency && (
          <p className={styles.errorText}>Error: {errorReservationFrequency}</p>
        )}
        <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <MetricChart
            title="Reservation Frequency Histogram"
            data={reservationFrequencyChartDataPrepared}
            options={reservationFrequencyChartOptions}
            isLoading={isLoadingReservationFrequency}
            error={errorReservationFrequency}
            type="bar"
          />
        </div>
      </div>

      {/* User Last Login/Activity Section */}
      <div className={styles.metricGroup}>
        <h2>User Last Login / Activity</h2>
        {errorUserLastActivity && !isLoadingUserLastActivity && (
          <p className={styles.errorText}>Error: {errorUserLastActivity}</p>
        )}
        <div className={styles.tableContainer}>
          {isLoadingUserLastActivity ? (
            <div className={styles.chartPlaceholder}><p>Loading table...</p></div>
          ) : (
            <table className={styles.metricsTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Last Login</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {userLastActivityData.users && userLastActivityData.users.length > 0 ? (
                  userLastActivityData.users.map((user, idx) => (
                    <tr key={user.email || idx}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.lastLogin ? format(parseISO(user.lastLogin), 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                      <td>{user.lastActivity ? format(parseISO(user.lastActivity), 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center' }}>No data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default UserMembershipMetrics;