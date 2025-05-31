import React, { useEffect, useState, useMemo } from 'react';
import styles from '../styles/adminMetricsPage.module.css';
import MetricChart from './MetricChart';

const API = 'http://localhost:5001/api/admin/metrics';
const dayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ClassReservationMetrics = ({ dateRange }) => {
  // --- State for each metric ---
  const [totalReservations, setTotalReservations] = useState({ total: 0, trend: [] });
  const [popularClasses, setPopularClasses] = useState({ classes: [] });
  const [popularByDay, setPopularByDay] = useState({ data: [] });
  const [popularByTime, setPopularByTime] = useState({ data: [] });
  const [attendanceRate, setAttendanceRate] = useState({ data: [] });
  const [leastPopular, setLeastPopular] = useState({ classes: [] });
  const [peakTimes, setPeakTimes] = useState({ data: [] });
  const [fillRate, setFillRate] = useState({ averageFillRate: 0, details: [] });

  // Loading & error states
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  // --- Fetch all metrics ---
  useEffect(() => {
    const fetchMetric = async (endpoint, setter, key) => {
      setLoading(l => ({ ...l, [key]: true }));
      setError(e => ({ ...e, [key]: null }));
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API}/${endpoint}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error((await res.json()).message || 'Error');
        const data = await res.json();
        setter(data);
      } catch (err) {
        setError(e => ({ ...e, [key]: err.message }));
      } finally {
        setLoading(l => ({ ...l, [key]: false }));
      }
    };

    fetchMetric('total-reservations', setTotalReservations, 'totalReservations');
    fetchMetric('most-popular-classes', setPopularClasses, 'popularClasses');
    fetchMetric('popular-classes-by-day', setPopularByDay, 'popularByDay');
    fetchMetric('popular-classes-by-time', setPopularByTime, 'popularByTime');
    fetchMetric('attendance-rate-per-class', setAttendanceRate, 'attendanceRate');
    fetchMetric('least-popular-classes', setLeastPopular, 'leastPopular');
    fetchMetric('peak-times', setPeakTimes, 'peakTimes');
    fetchMetric('average-class-fill-rate', setFillRate, 'fillRate');
  }, [dateRange]);

  // --- Prepare chart/table data ---

  // Total Reservations Trend
  const totalReservationsTrendData = useMemo(() => ({
    labels: totalReservations.trend?.map(item => item.date) || [],
    datasets: [{
      label: 'Reservations',
      data: totalReservations.trend?.map(item => item.count) || [],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      fill: true,
      tension: 0.3,
    }]
  }), [totalReservations.trend]);

  // Most Popular Classes (Bar)
  const popularClassesBarData = useMemo(() => ({
    labels: popularClasses.classes?.map(c => c.className) || [],
    datasets: [{
      label: 'Reservations',
      data: popularClasses.classes?.map(c => c.count) || [],
      backgroundColor: 'rgba(255, 205, 86, 0.7)',
      borderColor: 'rgba(224, 169, 0, 1)',
      borderWidth: 1,
    }]
  }), [popularClasses.classes]);

  // Most Popular Classes by Day (Grouped Bar)
  const popularByDayData = useMemo(() => {
    const classes = [...new Set(popularByDay.data?.map(d => d.className))];
    const days = dayOrder;
    const datasets = classes.map(className => ({
      label: className,
      data: days.map(day =>
        (popularByDay.data?.find(d => d.className === className && d.dayOfWeek === day)?.count) || 0
      ),
      backgroundColor: `rgba(${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},0.7)`,
    }));
    return {
      labels: days,
      datasets,
    };
  }, [popularByDay.data]);

  // Most Popular Classes by Time Slot (Grouped Bar)
  const popularByTimeData = useMemo(() => {
    const classNames = [...new Set(popularByTime.data?.map(d => d.className))];
    const times = [...new Set(popularByTime.data?.map(d => d.classStartTime))].sort();
    const datasets = classNames.map(className => ({
      label: className,
      data: times.map(time =>
        (popularByTime.data?.find(d => d.className === className && d.classStartTime === time)?.count) || 0
      ),
      backgroundColor: `rgba(${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},0.7)`,
    }));
    return {
      labels: times,
      datasets,
    };
  }, [popularByTime.data]);

  // Peak Times/Days (Grouped Bar)
  const peakTimesData = useMemo(() => {
    const hours = [...new Set(peakTimes.data?.map(d => d.hour))].sort((a, b) => a - b);
    const days = dayOrder;
    const datasets = days.map(day => ({
      label: day,
      data: hours.map(hour =>
        (peakTimes.data?.find(d => d.dayOfWeek === day && d.hour === hour)?.count) || 0
      ),
      backgroundColor: `rgba(${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},${Math.floor(Math.random()*200)},0.7)`,
    }));
    return {
      labels: hours.map(h => `${h}:00`),
      datasets,
    };
  }, [peakTimes.data]);

  // --- Render ---
  return (
    <>
      {/* 1. Total Reservations */}
      <div className={styles.metricGroup}>
        <h2>Total Reservations</h2>
        {error.totalReservations && <p className={styles.errorText}>{error.totalReservations}</p>}
        <section className={styles.kpiSection}>
          <div className={styles.kpiCard}>
            <h4>Total Reservations</h4>
            <p className={styles.kpiValue}>{loading.totalReservations ? '...' : totalReservations.total}</p>
          </div>
        </section>
        <div className={styles.chartsGrid}>
          <MetricChart
            key="total-reservations-trend"
            title="Reservations Trend"
            data={totalReservationsTrendData}
            options={{ responsive: true }}
            isLoading={loading.totalReservations}
            error={error.totalReservations}
          />
        </div>
      </div>

      {/* 2. Most Popular Classes - Overall */}
      <div className={styles.metricGroup}>
        <h2>Most Popular Classes (Overall)</h2>
        {error.popularClasses && <p className={styles.errorText}>{error.popularClasses}</p>}
        <div className={styles.chartsGrid}>
          <MetricChart
            key="popular-classes"
            title="Most Popular Classes"
            data={popularClassesBarData}
            options={{ responsive: true, indexAxis: 'y' }}
            isLoading={loading.popularClasses}
            error={error.popularClasses}
            type="bar"
          />
        </div>
      </div>

      {/* 3. Most Popular Classes by Day of Week */}
      <div className={styles.metricGroup}>
        <h2>Most Popular Classes by Day of Week</h2>
        {error.popularByDay && <p className={styles.errorText}>{error.popularByDay}</p>}
        <div className={styles.chartsGrid}>
          <MetricChart
            key="popular-by-day"
            title="Popular Classes by Day"
            data={popularByDayData}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } }}
            isLoading={loading.popularByDay}
            error={error.popularByDay}
            type="bar"
          />
        </div>
      </div>

      {/* 4. Most Popular Classes by Time Slot */}
      <div className={styles.metricGroup}>
        <h2>Most Popular Classes by Time Slot</h2>
        {error.popularByTime && <p className={styles.errorText}>{error.popularByTime}</p>}
        <div className={styles.chartsGrid}>
          <MetricChart
            key="popular-by-time"
            title="Popular Classes by Time Slot"
            data={popularByTimeData}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
            isLoading={loading.popularByTime}
            error={error.popularByTime}
            type="bar"
          />
        </div>
      </div>

      {/* 5. Attendance Rate per Class */}
      <div className={styles.metricGroup}>
        <h2>Attendance Rate per Class</h2>
        {error.attendanceRate && <p className={styles.errorText}>{error.attendanceRate}</p>}
        <div className={styles.tableContainer}>
          <table className={styles.metricsTable}>
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Attendance Rate</th>
                <th>Attended</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRate.data && attendanceRate.data.length > 0 ? (
                attendanceRate.data.map((row, idx) => (
                  <tr key={row.className || idx}>
                    <td>{row.className}</td>
                    <td>{(row.attendanceRate * 100).toFixed(1)}%</td>
                    <td>{row.attended}</td>
                    <td>{row.total}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Least Popular Classes */}
      <div className={styles.metricGroup}>
        <h2>Least Popular Classes</h2>
        {error.leastPopular && <p className={styles.errorText}>{error.leastPopular}</p>}
        <div className={styles.tableContainer}>
          <table className={styles.metricsTable}>
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Reservations</th>
              </tr>
            </thead>
            <tbody>
              {leastPopular.classes && leastPopular.classes.length > 0 ? (
                leastPopular.classes.map((row, idx) => (
                  <tr key={row.className || idx}>
                    <td>{row.className}</td>
                    <td>{row.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center' }}>No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Peak Times/Days - Reservation Density */}
      <div className={styles.metricGroup}>
        <h2>Peak Times/Days - Reservation Density</h2>
        {error.peakTimes && <p className={styles.errorText}>{error.peakTimes}</p>}
        <div className={styles.chartsGrid}>
          <MetricChart
            key="peak-times"
            title="Peak Times/Days"
            data={peakTimesData}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } }}
            isLoading={loading.peakTimes}
            error={error.peakTimes}
            type="bar"
          />
        </div>
      </div>

      {/* 8. Average Class Fill Rate */}
      <div className={styles.metricGroup}>
        <h2>Average Class Fill Rate</h2>
        {error.fillRate && <p className={styles.errorText}>{error.fillRate}</p>}
        <section className={styles.kpiSection}>
          <div className={styles.kpiCard}>
            <h4>Average Fill Rate</h4>
            <p className={styles.kpiValue}>
              {loading.fillRate ? '...' : (fillRate.averageFillRate * 100).toFixed(1) + '%'}
            </p>
          </div>
        </section>
        <div className={styles.tableContainer}>
          <table className={styles.metricsTable}>
            <thead>
              <tr>
                <th>Class ID</th>
                <th>Date</th>
                <th>Reservations</th>
                <th>Max Capacity</th>
                <th>Fill Rate</th>
              </tr>
            </thead>
            <tbody>
              {fillRate.details && fillRate.details.length > 0 ? (
                fillRate.details.map((row, idx) => (
                  <tr key={row.classId + '-' + row.classDate || idx}>
                    <td>{row.classId}</td>
                    <td>{row.classDate ? row.classDate.slice(0, 10) : ''}</td>
                    <td>{row.reservations}</td>
                    <td>{row.maxCapacity}</td>
                    <td>{(row.fillRate * 100).toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ClassReservationMetrics;