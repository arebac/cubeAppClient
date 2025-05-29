import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import styles from '../styles/adminMetricsPage.module.css';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MetricChart = ({ title, data, options, isLoading, error, type = 'line' }) => {
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
      {type === 'bar' ? (
        <Bar
          key={title} // <-- Add this line
          options={options || { responsive: true, maintainAspectRatio: false }}
          data={data}
        />
      ) : (
        <Line
          key={title} // <-- Add this line
          options={options || { responsive: true, maintainAspectRatio: false }}
          data={data}
        />
      )}
    </div>
  );
};

export default MetricChart;