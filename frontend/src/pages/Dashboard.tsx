import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StatCard from '../components/StatCard';
import { dashboardApi } from '../services/api';
import { DashboardStats, Conversation, Ticket } from '../types';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, business } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, convRes, ticketsRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentConversations(),
          dashboardApi.getRecentTickets(),
        ]);
        setStats(statsRes.data.data);
        setRecentConversations(convRes.data.data);
        setRecentTickets(ticketsRes.data.data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      urgent: 'badge badge-urgent',
      high: 'badge badge-high',
      medium: 'badge badge-medium',
      low: 'badge badge-low',
    };
    return map[priority] || 'badge badge-low';
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">
            {greeting()}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="page-subtitle">
            {business?.name} — Here's what's happening with your support today
          </p>
        </div>
        <div className="dashboard-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Conversations"
          value={stats?.totalConversations ?? 0}
          icon="💬"
          trend={stats?.weeklyTrend}
          trendLabel="vs last week"
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Open Tickets"
          value={stats?.openTickets ?? 0}
          icon="🎫"
          color="warning"
          loading={loading}
        />
        <StatCard
          title="Resolved Tickets"
          value={stats?.resolvedTickets ?? 0}
          icon="✅"
          color="success"
          loading={loading}
        />
        <StatCard
          title="Pending Escalations"
          value={stats?.pendingEscalations ?? 0}
          icon="🚨"
          color="danger"
          loading={loading}
        />
        <StatCard
          title="AI Resolution Rate"
          value={`${stats?.aiResolutionRate ?? 0}%`}
          icon="🤖"
          color="info"
          loading={loading}
        />
        <StatCard
          title="Indexed Documents"
          value={stats?.documents ?? 0}
          icon="📚"
          color="primary"
          loading={loading}
        />
      </div>

      {/* Two Column Grid */}
      <div className="dashboard-grid">
        {/* Recent Conversations */}
        <div className="glass-card dashboard-card">
          <div className="dashboard-card-header">
            <h3>💬 Recent Conversations</h3>
            <a href="/conversations" className="dashboard-card-link">View all →</a>
          </div>
          {loading ? (
            <div style={{ padding: 16 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />
              ))}
            </div>
          ) : recentConversations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <h3>No conversations yet</h3>
              <p>Conversations will appear here once customers start chatting</p>
            </div>
          ) : (
            <div className="dashboard-list">
              {recentConversations.map((conv) => (
                <div key={conv._id} className="dashboard-list-item">
                  <div className="dashboard-list-avatar">
                    {(conv.customerName || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div className="dashboard-list-content">
                    <div className="dashboard-list-name">
                      {conv.customerName || 'Guest User'}
                    </div>
                    <div className="dashboard-list-sub">
                      {conv.messages[conv.messages.length - 1]?.content?.substring(0, 60) || 'No messages'}...
                    </div>
                  </div>
                  <div className="dashboard-list-right">
                    <span className={`badge badge-${conv.status}`}>{conv.status}</span>
                    <div className="dashboard-list-time">{formatTime(conv.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        <div className="glass-card dashboard-card">
          <div className="dashboard-card-header">
            <h3>🎫 Recent Tickets</h3>
            <a href="/tickets" className="dashboard-card-link">View all →</a>
          </div>
          {loading ? (
            <div style={{ padding: 16 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎫</div>
              <h3>No tickets yet</h3>
              <p>Tickets will be created automatically when AI escalates</p>
            </div>
          ) : (
            <div className="dashboard-list">
              {recentTickets.map((ticket) => (
                <div key={ticket._id} className="dashboard-list-item">
                  <div className="dashboard-list-ticket-num">{ticket.ticketNumber}</div>
                  <div className="dashboard-list-content">
                    <div className="dashboard-list-name">{ticket.customerName}</div>
                    <div className="dashboard-list-sub">{ticket.subject?.substring(0, 50)}...</div>
                  </div>
                  <div className="dashboard-list-right">
                    <span className={priorityBadge(ticket.priority)}>{ticket.priority}</span>
                    <div className="dashboard-list-time">{formatTime(ticket.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Widget Embed Code */}
      <div className="glass-card dashboard-embed animate-fadeInUp">
        <div className="dashboard-embed-header">
          <div>
            <h3>🔗 Embed Your Chat Widget</h3>
            <p>Add this snippet to your website to enable the AI chat widget</p>
          </div>
        </div>
        <div className="dashboard-embed-code">
          <code>
            {`<!-- SupportAI Chat Widget -->\n<script\n  src="${import.meta.env.VITE_API_URL || window.location.origin}/widget/widget.js"\n  data-tenant-id="${business?.tenantId || 'YOUR_TENANT_ID'}"\n></script>`}
          </code>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
