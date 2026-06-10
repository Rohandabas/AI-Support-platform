import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    website: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-container animate-fadeInUp">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <span className="auth-logo-text">SupportAI</span>
        </div>

        <div className="auth-card glass-card">
          <div className="auth-card-header">
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">Start your AI-powered support journey</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form-row">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  className="input-field"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Business Name</label>
                <input
                  id="reg-business"
                  type="text"
                  name="businessName"
                  className="input-field"
                  placeholder="Acme Corp"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                className="input-field"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Website (optional)</label>
              <input
                id="reg-website"
                type="url"
                name="website"
                className="input-field"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                className="input-field"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            <button
              id="reg-submit"
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" /> Creating account...</>
              ) : (
                'Create Account — It\'s Free'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Sign in →</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
