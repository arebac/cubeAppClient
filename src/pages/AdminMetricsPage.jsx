import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/adminMetricsPage.module.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { format, subDays, formatISO, parseISO } from 'date-fns';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
);

const MetricChart = ({ title, data, options, isLoading, error }) => {
  if (isLoading) return <div className={styles.chartPlaceholder}><h3>{title}</h3><p>Loading chart data...</p></div>;
  if (error) return <div className={styles.chartPlaceholder}><h3>{title}</h3><p className={styles.errorTextSmall}>Error: {error}</p></div>;
  const isDataValid = data &&
    data.labels && Array.isArray(data.labels) &&
    data.datasets && Array.isArray(data.datasets) &&
    data.datasets.length > 0 &&
    data.datasets.every(ds => ds.data && Array.isArray(ds.data));
  if (!isDataValid) {
    return <div className={styles.chartPlaceholder}><h3>{title}</h3><p>No data available or data is malformed.</p></div>;
  }
  return (
    <div className={styles.chartContainer}>
      <h3>{title}</h3>
      <Line options={options || { responsive: true, maintainAspectRatio: false }} data={data} />
    </div>
  );
};

const AdminMetricsPage = () => {
  const { user, isAuthLoading } = useAuth();

  const [dateRange, setDateRange] = useState({
    startDate: formatISO(subDays(new Date(), 29), { representation: 'date' }),
    endDate: formatISO(new Date(), { representation: 'date' }),
  });

  const [newSignupsData, setNewSignupsData] = useState({ totalNewInPeriod: 0, trend: [] });
  const [isLoadingNewSignups, setIsLoadingNewSignups] = useState(false);
  const [errorNewSignups, setErrorNewSignups] = useState(null);

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
          } catch {
            // ignore
          }
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

  // Chart options for new signups trend
  const newSignupsChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Sign-ups' }, beginAtZero: true }
    }
  };

  // Prepare chart data
  const newSignupsChartDataPrepared = React.useMemo(() => {
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

  const handleDateChange = (e) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isAuthLoading && !user) {
    return <div className={styles.loading}>Loading...</div>;
  }
  if (!user || user.role !== 'admin') {
    return <div className={styles.errorText}>Access denied. Admins only.</div>;
  }

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
          disabled={isLoadingNewSignups}
        />
        <label htmlFor="endDate">End Date: </label>
        <input
          type="date"
          id="endDate"
          name="endDate"
          value={dateRange.endDate}
          onChange={handleDateChange}
          className={styles.dateInput}
          disabled={isLoadingNewSignups}
        />
      </div>
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
    </div>
  );
};

export default AdminMetricsPage;