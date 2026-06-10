import React from 'react';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: number;
  trendLabel?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'primary',
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="stat-card glass-card">
        <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 36, width: '40%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '50%' }} />
      </div>
    );
  }

  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <div className={`stat-card glass-card stat-card--${color} animate-fadeInUp`}>
      <div className="stat-card-header">
        <div className="stat-card-title">{title}</div>
        <div className={`stat-card-icon stat-card-icon--${color}`}>{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
      {trend !== undefined && (
        <div className={`stat-card-trend ${trendPositive ? 'trend-up' : 'trend-down'}`}>
          <span className="trend-arrow">{trendPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="trend-label">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
