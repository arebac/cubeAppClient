import React from 'react';
import styles from '../styles/adminMetricsPage.module.css';

const ClassReservationMetrics = ({ dateRange }) => {
  return (
    <div className={styles.metricGroup}>
      <h2>Class & Reservation Metrics</h2>
      <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>
        <p>Class & Reservation metrics will appear here.</p>
        <p>
          <strong>Selected Date Range:</strong><br />
          {dateRange.startDate} to {dateRange.endDate}
        </p>
      </div>
    </div>
  );
};

export default ClassReservationMetrics;