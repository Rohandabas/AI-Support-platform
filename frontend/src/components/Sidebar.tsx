import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: '📚' },
  { path: '/ai-config', label: 'AI Configuration', icon: '🤖' },
  { path: '/tickets', label: 'Tickets', icon: '🎫' },
  { path: '/escalations', label: 'Escalations', icon: '🚨' },
  { path: '/conversations', label: 'Conversations', icon: '💬' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
];

const Sidebar: React.FC = () => {
  const { user, business, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        {!isCollapsed && (
          <div>
            <span className="sidebar-logo-text">SupportAI</span>
            <span className="sidebar-logo-badge">PRO</span>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Business Info */}
      {!isCollapsed && business && (
        <div className="sidebar-business">
          <div className="sidebar-business-avatar">
            {business.name.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-business-info">
            <div className="sidebar-business-name">{business.name}</div>
            <div className="sidebar-business-plan">{business.plan} plan</div>
          </div>
        </div>
      )}

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="sidebar-nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* Widget Snippet Button */}
      {!isCollapsed && (
        <div className="sidebar-widget-snippet">
          <div className="sidebar-snippet-label">Embed Widget</div>
          <code className="sidebar-snippet-code">
            {`<script src="..."></script>`}
          </code>
        </div>
      )}

      <div className="sidebar-divider" />

      {/* User */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        {!isCollapsed && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        )}
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title="Logout"
        >
          🚪
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
