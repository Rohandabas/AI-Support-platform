import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { analyticsApi } from '../services/api';
import { AnalyticsData } from '../types';
import StatCard from '../components/StatCard';
import './Analytics.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 12, family: 'Inter' } } },
    tooltip: {
      backgroundColor: 'rgba(10,10,20,0.9)',
      borderColor: 'rgba(99,102,241,0.3)',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
    y: {
      ticks: { color: '#64748b', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
  },
};

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    analyticsApi.get(period).then((res) => {
      setData(res.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton glass-card" style={{ height: 100 }} />
          ))}
        </div>
        <div className="analytics-charts-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton glass-card" style={{ height: 280 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overview, charts, knowledgeBase } = data;

  // Line chart: Daily Conversations
  const dailyLabels = charts.dailyConversations.map((d) => {
    const date = new Date(d._id);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const conversationsChartData = {
    labels: dailyLabels,
    datasets: [
      {
        label: 'Total',
        data: charts.dailyConversations.map((d) => d.count),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1',
        pointRadius: 4,
      },
      {
        label: 'Resolved',
        data: charts.dailyConversations.map((d) => d.resolved),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointRadius: 4,
      },
      {
        label: 'Escalated',
        data: charts.dailyConversations.map((d) => d.escalated),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ef4444',
        pointRadius: 4,
      },
    ],
  };

  // Doughnut: Ticket Priority
  const priorityLabels = ['Urgent', 'High', 'Medium', 'Low'];
  const priorityData = [
    charts.ticketsByPriority.urgent || 0,
    charts.ticketsByPriority.high || 0,
    charts.ticketsByPriority.medium || 0,
    charts.ticketsByPriority.low || 0,
  ];

  const priorityChartData = {
    labels: priorityLabels,
    datasets: [{
      data: priorityData,
      backgroundColor: ['#dc2626', '#ef4444', '#f59e0b', '#10b981'],
      borderColor: 'rgba(0,0,0,0.3)',
      borderWidth: 2,
    }],
  };

  // Bar: Escalation Priority
  const escalationChartData = {
    labels: ['Urgent', 'High', 'Medium', 'Low'],
    datasets: [{
      label: 'Escalations',
      data: [
        charts.escalationsByPriority.urgent || 0,
        charts.escalationsByPriority.high || 0,
        charts.escalationsByPriority.medium || 0,
        charts.escalationsByPriority.low || 0,
      ],
      backgroundColor: ['rgba(220,38,38,0.7)', 'rgba(239,68,68,0.7)', 'rgba(245,158,11,0.7)', 'rgba(16,185,129,0.7)'],
      borderRadius: 6,
    }],
  };

  return (
    <div className="page-container">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">📈 Analytics Dashboard</h1>
          <p className="page-subtitle">Performance metrics for the last {period} days</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p)}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <StatCard title="Total Conversations" value={overview.totalConversations} icon="💬" color="primary" />
        <StatCard title="Resolution Rate" value={`${overview.resolutionRate}%`} icon="✅" color="success" />
        <StatCard title="Escalation Rate" value={`${overview.escalationRate}%`} icon="🚨" color="danger" />
        <StatCard
          title="Avg Response Time"
          value={`${(overview.avgResponseTime / 1000).toFixed(1)}s`}
          icon="⚡"
          color="info"
        />
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Line Chart */}
        <div className="glass-card analytics-chart-card analytics-chart-wide">
          <h3 className="analytics-chart-title">📊 Daily Conversations</h3>
          <div className="analytics-chart-container">
            <Line
              data={conversationsChartData}
              options={chartDefaults as never}
            />
          </div>
        </div>

        {/* Doughnut: Priority */}
        <div className="glass-card analytics-chart-card">
          <h3 className="analytics-chart-title">🎫 Tickets by Priority</h3>
          <div className="analytics-chart-container" style={{ height: 220 }}>
            <Doughnut
              data={priorityChartData}
              options={{
                ...chartDefaults,
                plugins: {
                  ...chartDefaults.plugins,
                  legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 12 } } },
                },
              } as never}
            />
          </div>
        </div>

        {/* Bar: Escalations */}
        <div className="glass-card analytics-chart-card">
          <h3 className="analytics-chart-title">🚨 Escalations by Priority</h3>
          <div className="analytics-chart-container" style={{ height: 220 }}>
            <Bar
              data={escalationChartData}
              options={{
                ...chartDefaults,
                plugins: { ...chartDefaults.plugins, legend: { display: false } },
              } as never}
            />
          </div>
        </div>
      </div>

      {/* KB Documents Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>📚 Knowledge Base Documents</h3>
        </div>
        {knowledgeBase.documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No indexed documents</h3>
            <p>Upload documents to your knowledge base to see them here</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Chunks</th>
                <th>Indexed</th>
              </tr>
            </thead>
            <tbody>
              {knowledgeBase.documents.map((doc) => (
                <tr key={doc._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.originalName}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ width: 80 }}>
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.min((doc.chunkCount / 100) * 100, 100)}%` }}
                        />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-success)' }}>
                        {doc.chunkCount}
                      </span>
                    </div>
                  </td>
                  <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Analytics;
