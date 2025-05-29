import React from 'react';
import styles from '../styles/adminMetricsPage.module.css';

const RevenueSalesMetrics = ({ dateRange }) => {
  return (
    <div className={styles.metricGroup}>
      <h2>Revenue & Sales Metrics</h2>
      <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>
        <p>Revenue & Sales metrics will appear here.</p>
        <p>
          <strong>Selected Date Range:</strong><br />
          {dateRange.startDate} to {dateRange.endDate}
        </p>
      </div>
    </div>
  );
};

export default RevenueSalesMetrics;