import React, { useEffect, useState } from 'react';
import { conversationsApi } from '../services/api';
import { Conversation, Pagination } from '../types';
import './Conversations.css';

const Conversations: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  const fetchConversations = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await conversationsApi.getAll(params);
      setConversations(res.data.data.conversations);
      setPagination(res.data.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConversations(); }, [statusFilter]);

  const openConversation = async (id: string) => {
    const res = await conversationsApi.getById(id);
    setSelectedConv(res.data.data);
  };

  const statuses = ['', 'active', 'resolved', 'escalated', 'abandoned'];

  const msgPreview = (conv: Conversation) => {
    const last = conv.messages?.[conv.messages.length - 1];
    return last?.content?.substring(0, 80) || 'No messages';
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">💬 Conversation History</h1>
        <p className="page-subtitle">{pagination.total} total conversations — searchable history</p>
      </div>

      {/* Filters */}
      <div className="glass-card conv-filters">
        <form
          onSubmit={(e) => { e.preventDefault(); fetchConversations(); }}
          className="conv-search"
        >
          <input
            type="text"
            className="input-field"
            placeholder="Search by customer name, email, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <div className="conv-status-filters">
          {statuses.map((s) => (
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

      {/* Conversations List */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 70, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>No conversations found</h3>
            <p>Conversations will appear here as customers interact with your AI</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv._id}
              className="conv-item"
              onClick={() => openConversation(conv._id)}
            >
              <div className="conv-item-avatar">
                {(conv.customerName || 'G').charAt(0).toUpperCase()}
              </div>
              <div className="conv-item-content">
                <div className="conv-item-header">
                  <div className="conv-item-name">
                    {conv.customerName || 'Guest User'}
                    {conv.customerEmail && (
                      <span className="conv-item-email">— {conv.customerEmail}</span>
                    )}
                  </div>
                  <div className="conv-item-time">{formatTime(conv.createdAt)}</div>
                </div>
                <div className="conv-item-preview">{msgPreview(conv)}...</div>
                <div className="conv-item-footer">
                  <span className={`badge badge-${conv.status}`}>{conv.status}</span>
                  {conv.isEscalated && <span className="badge badge-escalated">🚨 Escalated</span>}
                  {conv.agentJoined && <span className="badge badge-active">👤 Agent Joined</span>}
                  <span className="conv-item-msg-count">
                    {conv.messages?.length || 0} messages
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="tickets-pagination" style={{ marginTop: 16 }}>
          {[...Array(pagination.pages)].map((_, i) => (
            <button
              key={i}
              className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`}
              onClick={() => fetchConversations(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Conversation Detail Modal */}
      {selectedConv && (
        <div className="modal-overlay" onClick={() => setSelectedConv(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1rem' }}>
                  {selectedConv.customerName || 'Guest'} — Conversation
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedConv.sessionId}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`badge badge-${selectedConv.status}`}>{selectedConv.status}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedConv(null)}>✕</button>
              </div>
            </div>

            <div className="conv-messages">
              {selectedConv.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`conv-message conv-message-${msg.role}`}
                >
                  <div className="conv-message-role">
                    {msg.role === 'user' ? '👤 Customer' :
                      msg.role === 'agent' ? '🧑‍💼 Agent' : '🤖 AI'}
                  </div>
                  <div className="conv-message-content">
                    {msg.content}
                    {msg.escalationFlag && (
                      <div className="conv-escalation-flag">
                        🚨 Escalation triggered: {msg.escalationReason}
                      </div>
                    )}
                  </div>
                  <div className="conv-message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                    {msg.responseTime && ` · ${msg.responseTime}ms`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversations;
