import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/adminMetricsPage.module.css';
import MetricChart from './MetricChart';

const API = 'http://localhost:5001/api/admin/metrics';

const RevenueSalesMetrics = ({ dateRange }) => {
  const { user, isAuthLoading } = useAuth();

  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const [revenue, setRevenue] = useState({ totalRevenue: 0, trend: [] });
  const [popularTier, setPopularTier] = useState({ tiers: [] });
  const [dropin, setDropin] = useState({ totalRevenue: 0, totalTokens: 0, trend: [] });
  const [arpu, setArpu] = useState({ arpu: 0, totalRevenue: 0, uniqueUsers: 0 });

  // Fetch all metrics
  useEffect(() => {
    let isCancelled = false;
    const fetchMetric = async (endpoint, setter, key) => {
      setLoading(l => ({ ...l, [key]: true }));
      setError(e => ({ ...e, [key]: null }));
      try {
        if (!user || user.role !== 'admin' || isAuthLoading) return;
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication token not found.');
        const params = `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        const res = await fetch(`${API}/${endpoint}${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          let errorMsg = `Request failed with status ${res.status}`;
          try {
            const errData = await res.json();
            errorMsg = errData.message || errorMsg;
          } catch {}
          throw new Error(errorMsg);
        }
        const data = await res.json();
        if (!isCancelled) setter(data);
      } catch (err) {
        if (!isCancelled) setError(e => ({ ...e, [key]: err.message }));
      } finally {
        if (!isCancelled) setLoading(l => ({ ...l, [key]: false }));
      }
    };

    if (user && user.role === 'admin' && !isAuthLoading) {
      fetchMetric('total-subscription-revenue', setRevenue, 'revenue');
      fetchMetric('popular-subscription-tier', setPopularTier, 'popularTier');
      fetchMetric('dropin-token-sales', setDropin, 'dropin');
      fetchMetric('arpu', setArpu, 'arpu');
    }
    return () => { isCancelled = true; };
  }, [user, isAuthLoading, dateRange]);

  // Chart data for trends
  const revenueTrendData = useMemo(() => ({
    labels: revenue.trend?.map(d => d.date) || [],
    datasets: [{
      label: 'Subscription Revenue',
      data: revenue.trend?.map(d => d.revenue) || [],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      fill: true,
      tension: 0.3,
    }]
  }), [revenue.trend]);

  const dropinTrendData = useMemo(() => ({
    labels: dropin.trend?.map(d => d.date) || [],
    datasets: [{
      label: 'Drop-In Revenue',
      data: dropin.trend?.map(d => d.revenue) || [],
      backgroundColor: 'rgba(255, 205, 86, 0.5)',
      borderColor: 'rgba(224, 169, 0, 1)',
      fill: true,
      tension: 0.3,
    }]
  }), [dropin.trend]);

  const popularTierData = useMemo(() => ({
    labels: popularTier.tiers?.map(t => t.tier) || [],
    datasets: [{
      label: 'Subscriptions',
      data: popularTier.tiers?.map(t => t.count) || [],
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 205, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)'
      ]
    }]
  }), [popularTier.tiers]);

  if (isAuthLoading && !user) {
    return <div className={styles.loading}>Loading...</div>;
  }
  if (!user || user.role !== 'admin') {
    return <div className={styles.errorText}>Access denied. Admins only.</div>;
  }

  return (
    <>
      {/* Total Subscription Revenue */}
      <div className={styles.metricGroup}>
        <h2>Total Subscription Revenue</h2>
        {error.revenue && <p className={styles.errorText}>{error.revenue}</p>}
        <section className={styles.kpiSection} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.kpiCard}>
            <h4>Total Subscription Revenue</h4>
            <p className={styles.kpiValue}>
              {loading.revenue ? '...' : `$${revenue.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        </section>
        <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <MetricChart
            title="Subscription Revenue Trend"
            data={revenueTrendData}
            options={{ responsive: true }}
            isLoading={loading.revenue}
            error={error.revenue}
          />
        </div>
      </div>

      {/* Drop-In Revenue & Tokens */}
      <div className={styles.metricGroup}>
        <h2>Drop-In Token Sales & Revenue</h2>
        {error.dropin && <p className={styles.errorText}>{error.dropin}</p>}
        <section className={styles.kpiSection} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className={styles.kpiCard}>
            <h4>Drop-In Revenue</h4>
            <p className={styles.kpiValue}>
              {loading.dropin ? '...' : `$${dropin.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>
          <div className={styles.kpiCard}>
            <h4>Drop-In Tokens Sold</h4>
            <p className={styles.kpiValue}>
              {loading.dropin ? '...' : dropin.totalTokens}
            </p>
          </div>
        </section>
        <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <MetricChart
            title="Drop-In Revenue Trend"
            data={dropinTrendData}
            options={{ responsive: true }}
            isLoading={loading.dropin}
            error={error.dropin}
          />
        </div>
      </div>

      {/* ARPU */}
      <div className={styles.metricGroup}>
        <h2>Average Revenue Per User (ARPU)</h2>
        {error.arpu && <p className={styles.errorText}>{error.arpu}</p>}
        <section className={styles.kpiSection} style={{ gridTemplateColumns: '1fr' }}>
          <div className={styles.kpiCard}>
            <h4>ARPU</h4>
            <p className={styles.kpiValue}>
              {loading.arpu ? '...' : `$${arpu.arpu?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        </section>
      </div>

      {/* Most Popular Subscription Tier */}
      <div className={styles.metricGroup}>
        <h2>Most Popular Subscription Tier</h2>
        {error.popularTier && <p className={styles.errorText}>{error.popularTier}</p>}
        <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
          <MetricChart
            title="Most Popular Subscription Tier"
            data={popularTierData}
            options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } }
            }}
            isLoading={loading.popularTier}
            error={error.popularTier}
            type="pie"
          />
        </div>
      </div>
    </>
  );
};

export default RevenueSalesMetrics;