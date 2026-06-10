import React, { useEffect, useState } from 'react';
import { escalationsApi } from '../services/api';
import { Escalation } from '../types';
import './Escalations.css';

const Escalations: React.FC = () => {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [counts, setCounts] = useState({ urgent: 0, high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await escalationsApi.getAll(params);
      setEscalations(res.data.data.escalations);
      setCounts(res.data.data.counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, [priorityFilter, statusFilter]);

  const handleAcknowledge = async (id: string) => {
    await escalationsApi.acknowledge(id);
    setEscalations((prev) =>
      prev.map((e) => e._id === id ? { ...e, status: 'acknowledged' } : e)
    );
  };

  const handleResolve = async (id: string) => {
    const notes = prompt('Resolution notes (optional):') || undefined;
    await escalationsApi.resolve(id, notes);
    setEscalations((prev) => prev.filter((e) => e._id !== id));
  };

  const priorityGroups = [
    { key: 'urgent', label: 'Urgent', icon: '🔴', color: '#dc2626' },
    { key: 'high', label: 'High', icon: '🟠', color: '#ef4444' },
    { key: 'medium', label: 'Medium', icon: '🟡', color: '#f59e0b' },
    { key: 'low', label: 'Low', icon: '🟢', color: '#10b981' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🚨 Escalation Dashboard</h1>
        <p className="page-subtitle">Monitor and resolve high-priority customer issues</p>
      </div>

      {/* Priority Cards */}
      <div className="escalation-priority-grid">
        {priorityGroups.map((group) => (
          <div
            key={group.key}
            className={`escalation-priority-card glass-card ${priorityFilter === group.key ? 'active' : ''}`}
            onClick={() => setPriorityFilter(priorityFilter === group.key ? '' : group.key)}
            style={{ borderTopColor: group.color + '80', cursor: 'pointer' }}
          >
            <div className="escalation-priority-icon">{group.icon}</div>
            <div className="escalation-priority-count" style={{ color: group.color }}>
              {counts[group.key as keyof typeof counts]}
            </div>
            <div className="escalation-priority-label">{group.label}</div>
          </div>
        ))}
      </div>

      {/* Status Filter */}
      <div className="escalation-filters glass-card">
        <div className="flex gap-2">
          {['pending', 'acknowledged', 'resolved', ''].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Escalations List */}
      {loading ? (
        <div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton glass-card" style={{ height: 100, marginBottom: 12 }} />
          ))}
        </div>
      ) : escalations.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No pending escalations</h3>
            <p>All escalations have been handled. Great work!</p>
          </div>
        </div>
      ) : (
        <div className="escalations-list">
          {escalations.map((esc) => (
            <div key={esc._id} className={`escalation-card glass-card escalation-${esc.priority}`}>
              <div className="escalation-card-header">
                <div className="escalation-card-left">
                  <span className={`badge badge-${esc.priority}`}>{esc.priority}</span>
                  <span className={`badge badge-${esc.status === 'pending' ? 'open' : esc.status}`}>
                    {esc.status}
                  </span>
                </div>
                <div className="escalation-card-time">
                  {new Date(esc.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="escalation-card-body">
                <div className="escalation-customer">
                  <div className="escalation-customer-avatar">
                    {esc.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="escalation-customer-name">{esc.customerName}</div>
                    <div className="escalation-customer-email">{esc.customerEmail}</div>
                  </div>
                </div>
                <div className="escalation-reason">
                  <span className="escalation-reason-label">Reason:</span>
                  <span className="escalation-reason-text">{esc.reason}</span>
                </div>
              </div>

              <div className="escalation-card-actions">
                {esc.status === 'pending' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAcknowledge(esc._id)}
                  >
                    👁️ Acknowledge
                  </button>
                )}
                {esc.status !== 'resolved' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleResolve(esc._id)}
                  >
                    ✅ Resolve
                  </button>
                )}
                {esc.ticketId && typeof esc.ticketId === 'object' && (
                  <span className="escalation-ticket-ref">
                    🎫 Ticket #{(esc.ticketId as { ticketNumber?: string }).ticketNumber}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Escalations;
