import React, { useEffect, useState } from 'react';
import { ticketsApi } from '../services/api';
import { Ticket, Pagination } from '../types';
import './Tickets.css';

const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState({ open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const res = await ticketsApi.getAll(params);
      setTickets(res.data.data.tickets);
      setCounts(res.data.data.counts);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const updateTicket = async (id: string, updates: Record<string, unknown>) => {
    setUpdating(id);
    try {
      await ticketsApi.update(id, updates);
      setTickets((prev) => prev.map((t) => t._id === id ? { ...t, ...updates } : t));
      if (selectedTicket?._id === id) {
        setSelectedTicket((prev) => prev ? { ...prev, ...updates } : null);
      }
    } finally {
      setUpdating(null);
    }
  };

  const priorityBadge = (p: string) => `badge badge-${p}`;
  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      open: 'badge badge-open',
      in_progress: 'badge badge-in-progress',
      resolved: 'badge badge-resolved',
      closed: 'badge badge-closed',
    };
    return map[s] || 'badge badge-open';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🎫 Ticket Management</h1>
        <p className="page-subtitle">Track and resolve customer support tickets</p>
      </div>

      {/* Status Counts */}
      <div className="ticket-counts">
        {[
          { key: '', label: 'All', count: counts.open + counts.inProgress + counts.resolved + counts.closed, icon: '📋' },
          { key: 'open', label: 'Open', count: counts.open, icon: '🔓', color: 'primary' },
          { key: 'in_progress', label: 'In Progress', count: counts.inProgress, icon: '⚙️', color: 'warning' },
          { key: 'resolved', label: 'Resolved', count: counts.resolved, icon: '✅', color: 'success' },
          { key: 'closed', label: 'Closed', count: counts.closed, icon: '🔒', color: 'muted' },
        ].map((item) => (
          <button
            key={item.key}
            className={`ticket-count-btn ${statusFilter === item.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(item.key)}
          >
            <span>{item.icon}</span>
            <span className="ticket-count-label">{item.label}</span>
            <span className="ticket-count-num">{item.count}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card tickets-filters">
        <form onSubmit={handleSearch} className="tickets-search">
          <input
            type="text"
            className="input-field"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <select
          className="input-field"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 150 }}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎫</div>
            <h3>No tickets found</h3>
            <p>Tickets will appear here when customers need support</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--accent-primary)',
                      background: 'rgba(99,102,241,0.1)',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}>
                      {ticket.ticketNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.customerName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ticket.customerEmail}</div>
                  </td>
                  <td style={{ maxWidth: 250 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.subject}
                    </div>
                  </td>
                  <td><span className={priorityBadge(ticket.priority)}>{ticket.priority}</span></td>
                  <td><span className={statusBadge(ticket.status)}>{ticket.status.replace('_', ' ')}</span></td>
                  <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="input-field"
                      style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}
                      value={ticket.status}
                      onChange={(e) => updateTicket(ticket._id, { status: e.target.value })}
                      disabled={updating === ticket._id}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="tickets-pagination">
          {[...Array(pagination.pages)].map((_, i) => (
            <button
              key={i}
              className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`}
              onClick={() => fetchTickets(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.1rem' }}>{selectedTicket.ticketNumber}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Ticket Details</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div className="input-label">Customer</div>
                <div style={{ fontWeight: 600 }}>{selectedTicket.customerName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selectedTicket.customerEmail}</div>
              </div>
              <div>
                <div className="input-label">Subject</div>
                <div style={{ fontWeight: 600 }}>{selectedTicket.subject}</div>
              </div>
              <div>
                <div className="input-label">Description</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                  {selectedTicket.description}
                </div>
              </div>
              <div className="flex gap-3">
                <div>
                  <div className="input-label mb-2">Priority</div>
                  <span className={priorityBadge(selectedTicket.priority)}>{selectedTicket.priority}</span>
                </div>
                <div>
                  <div className="input-label mb-2">Status</div>
                  <span className={statusBadge(selectedTicket.status)}>{selectedTicket.status.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Update Status</label>
                <select
                  className="input-field"
                  value={selectedTicket.status}
                  onChange={(e) => updateTicket(selectedTicket._id, { status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Update Priority</label>
                <select
                  className="input-field"
                  value={selectedTicket.priority}
                  onChange={(e) => updateTicket(selectedTicket._id, { priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
