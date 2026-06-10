import React, { useEffect, useState } from 'react';
import { aiConfigApi } from '../services/api';
import { BusinessConfig } from '../types';
import './AIConfig.css';

const defaultConfig: BusinessConfig = {
  botName: 'SupportBot',
  welcomeMessage: 'Hello! How can I help you today?',
  personality: 'professional',
  primaryColor: '#6366f1',
  escalationRules: ['refund requested', 'legal complaint', 'customer angry', 'human requested'],
  suggestedQuestions: ['Track my order', 'Pricing', 'Refund policy', 'Contact support'],
};

const AIConfig: React.FC = () => {
  const [config, setConfig] = useState<BusinessConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newRule, setNewRule] = useState('');
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    aiConfigApi.get().then((res) => {
      setConfig(res.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await aiConfigApi.update(config as unknown as Record<string, unknown>);
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setConfig({ ...config, escalationRules: [...config.escalationRules, newRule.trim()] });
    setNewRule('');
  };

  const removeRule = (index: number) => {
    setConfig({ ...config, escalationRules: config.escalationRules.filter((_, i) => i !== index) });
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setConfig({ ...config, suggestedQuestions: [...config.suggestedQuestions, newQuestion.trim()] });
    setNewQuestion('');
  };

  const removeQuestion = (index: number) => {
    setConfig({ ...config, suggestedQuestions: config.suggestedQuestions.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="stats-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton glass-card" style={{ height: 120 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">🤖 AI Configuration</h1>
          <p className="page-subtitle">Customize your AI assistant's behavior, personality, and escalation rules</p>
        </div>
        <button
          id="save-ai-config"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><div className="spinner" /> Saving...</> : '💾 Save Configuration'}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <div className="ai-config-grid">
        {/* Bot Identity */}
        <div className="glass-card ai-config-card">
          <div className="ai-config-card-title">
            <span>🎭</span> Bot Identity
          </div>
          <div className="ai-config-fields">
            <div className="input-group">
              <label className="input-label">Bot Name</label>
              <input
                id="bot-name"
                type="text"
                className="input-field"
                value={config.botName}
                onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                placeholder="SupportBot"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Welcome Message</label>
              <textarea
                id="welcome-message"
                className="input-field"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                placeholder="Hello! How can I help you today?"
                rows={3}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Brand Color</label>
              <div className="color-picker-row">
                <input
                  type="color"
                  className="color-input"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                />
                <input
                  type="text"
                  className="input-field"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="glass-card ai-config-card">
          <div className="ai-config-card-title">
            <span>✨</span> AI Personality
          </div>
          <div className="personality-options">
            {(['professional', 'friendly', 'technical'] as const).map((p) => (
              <button
                key={p}
                className={`personality-option ${config.personality === p ? 'active' : ''}`}
                onClick={() => setConfig({ ...config, personality: p })}
              >
                <div className="personality-option-icon">
                  {p === 'professional' ? '👔' : p === 'friendly' ? '😊' : '🔧'}
                </div>
                <div className="personality-option-label">{p.charAt(0).toUpperCase() + p.slice(1)}</div>
                <div className="personality-option-desc">
                  {p === 'professional' && 'Concise, formal responses'}
                  {p === 'friendly' && 'Warm, conversational tone'}
                  {p === 'technical' && 'Detailed, precise answers'}
                </div>
              </button>
            ))}
          </div>

          {/* Live Preview */}
          <div className="ai-preview">
            <div className="ai-preview-label">Preview</div>
            <div className="ai-preview-widget" style={{ borderColor: config.primaryColor + '40' }}>
              <div className="ai-preview-header" style={{ background: config.primaryColor }}>
                <span>⚡</span> {config.botName}
              </div>
              <div className="ai-preview-body">
                <div className="ai-preview-message">
                  {config.welcomeMessage}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Escalation Rules */}
        <div className="glass-card ai-config-card">
          <div className="ai-config-card-title">
            <span>🚨</span> Escalation Rules
          </div>
          <p className="ai-config-desc">AI will escalate when these phrases are detected in conversations</p>
          <div className="tag-list">
            {config.escalationRules.map((rule, i) => (
              <div key={i} className="tag-item tag-danger">
                {rule}
                <button onClick={() => removeRule(i)} className="tag-remove">×</button>
              </div>
            ))}
          </div>
          <div className="tag-input-row">
            <input
              type="text"
              className="input-field"
              placeholder="Add escalation trigger..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRule()}
            />
            <button className="btn btn-secondary" onClick={addRule}>Add</button>
          </div>
        </div>

        {/* Suggested Questions */}
        <div className="glass-card ai-config-card">
          <div className="ai-config-card-title">
            <span>💡</span> Suggested Questions
          </div>
          <p className="ai-config-desc">Quick-start questions shown in the chat widget</p>
          <div className="tag-list">
            {config.suggestedQuestions.map((q, i) => (
              <div key={i} className="tag-item tag-primary">
                {q}
                <button onClick={() => removeQuestion(i)} className="tag-remove">×</button>
              </div>
            ))}
          </div>
          <div className="tag-input-row">
            <input
              type="text"
              className="input-field"
              placeholder="Add a suggested question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
            />
            <button className="btn btn-secondary" onClick={addQuestion}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfig;
