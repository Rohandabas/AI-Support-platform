/**
 * SupportAI Embeddable Chat Widget
 * Usage: <script src="widget.js" data-tenant-id="YOUR_TENANT_ID"></script>
 */
(function () {
  'use strict';

  const script = document.currentScript || document.querySelector('script[data-tenant-id]');
  const tenantId = script?.getAttribute('data-tenant-id');
  const apiBase = script?.getAttribute('data-api-base') || 'http://localhost:5000';

  if (!tenantId) {
    console.error('[SupportAI] data-tenant-id is required');
    return;
  }

  // Generate session ID
  const sessionId = (() => {
    let id = sessionStorage.getItem('supportai_session');
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('supportai_session', id);
    }
    return id;
  })();

  let config = {
    botName: 'SupportBot',
    welcomeMessage: 'Hello! How can I help you today?',
    primaryColor: '#6366f1',
    suggestedQuestions: [],
  };

  let messages = [];
  let isOpen = false;
  let isTyping = false;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #supportai-widget * { box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
    #supportai-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;
      width: 56px; height: 56px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); transition: transform 0.2s, box-shadow 0.2s;
      border: none; color: white; font-size: 24px;
    }
    #supportai-bubble:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(0,0,0,0.4); }
    #supportai-panel {
      position: fixed; bottom: 90px; right: 24px; z-index: 999998;
      width: 380px; max-height: 600px; background: #0f0f1e;
      border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 20px 60px rgba(0,0,0,0.6); display: flex; flex-direction: column;
      overflow: hidden; transition: opacity 0.3s, transform 0.3s;
    }
    #supportai-panel.hidden { opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none; }
    #supportai-header {
      padding: 16px 18px; display: flex; align-items: center; gap: 12px; color: white;
    }
    #supportai-header-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
    }
    #supportai-header-info { flex: 1; }
    #supportai-header-name { font-size: 15px; font-weight: 700; }
    #supportai-header-status { font-size: 11px; opacity: 0.75; display: flex; align-items: center; gap: 4px; }
    #supportai-header-status::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;
    }
    #supportai-close {
      background: rgba(255,255,255,0.15); border: none; color: white; width: 28px; height: 28px;
      border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    #supportai-close:hover { background: rgba(255,255,255,0.25); }
    #supportai-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
      background: #0a0a14; min-height: 300px; max-height: 380px;
    }
    #supportai-messages::-webkit-scrollbar { width: 4px; }
    #supportai-messages::-webkit-scrollbar-track { background: transparent; }
    #supportai-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .sai-msg { display: flex; flex-direction: column; gap: 4px; animation: sai-fade 0.3s ease; }
    @keyframes sai-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .sai-msg-user { align-items: flex-end; }
    .sai-msg-bot { align-items: flex-start; }
    .sai-msg-bubble {
      max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5;
    }
    .sai-msg-user .sai-msg-bubble {
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
      border-bottom-right-radius: 4px;
    }
    .sai-msg-bot .sai-msg-bubble {
      background: rgba(255,255,255,0.07); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.08);
      border-bottom-left-radius: 4px;
    }
    .sai-msg-time { font-size: 10px; color: rgba(255,255,255,0.3); padding: 0 4px; }
    .sai-typing {
      display: flex; align-items: center; gap: 4px; padding: 10px 14px;
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px 16px 16px 4px; width: fit-content;
    }
    .sai-typing-dot {
      width: 6px; height: 6px; background: #6366f1; border-radius: 50%;
      animation: sai-bounce 1.2s infinite ease-in-out;
    }
    .sai-typing-dot:nth-child(1) { animation-delay: 0s; }
    .sai-typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .sai-typing-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes sai-bounce {
      0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); }
    }
    #supportai-suggestions {
      display: flex; gap: 6px; padding: 8px 12px; flex-wrap: wrap;
      background: #0a0a14; border-top: 1px solid rgba(255,255,255,0.05);
    }
    .sai-suggestion {
      padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.7); font-size: 12px;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .sai-suggestion:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #a5b4fc; }
    #supportai-form {
      display: flex; gap: 8px; padding: 12px 14px; background: #0f0f1e;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    #supportai-input {
      flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px; padding: 10px 16px; color: #f1f5f9; font-size: 14px; outline: none;
      transition: border-color 0.15s;
    }
    #supportai-input:focus { border-color: rgba(99,102,241,0.5); }
    #supportai-input::placeholder { color: rgba(255,255,255,0.3); }
    #supportai-send {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
      cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s, box-shadow 0.15s; flex-shrink: 0;
    }
    #supportai-send:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
    #supportai-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .sai-escalation-notice {
      background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
      border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #fca5a5;
    }
    #supportai-customer-form {
      padding: 16px; background: #0a0a14; border-top: 1px solid rgba(255,255,255,0.06);
    }
    .sai-customer-form-title { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
    .sai-customer-input {
      width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 8px 12px; color: #f1f5f9; font-size: 13px; margin-bottom: 8px; outline: none;
    }
    .sai-customer-submit {
      width: 100%; padding: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    @media (max-width: 420px) {
      #supportai-panel { width: calc(100vw - 24px); right: 12px; bottom: 80px; }
    }
  `;
  document.head.appendChild(style);

  // Create widget HTML
  const widget = document.createElement('div');
  widget.id = 'supportai-widget';
  widget.innerHTML = `
    <button id="supportai-bubble" title="Chat with us"></button>
    <div id="supportai-panel" class="hidden">
      <div id="supportai-header">
        <div id="supportai-header-avatar">⚡</div>
        <div id="supportai-header-info">
          <div id="supportai-header-name">Loading...</div>
          <div id="supportai-header-status">Online</div>
        </div>
        <button id="supportai-close">✕</button>
      </div>
      <div id="supportai-messages"></div>
      <div id="supportai-suggestions"></div>
      <div id="supportai-customer-form" style="display:none">
        <div class="sai-customer-form-title">Your details (optional)</div>
        <input type="text" class="sai-customer-input" id="sai-customer-name" placeholder="Your name" />
        <input type="email" class="sai-customer-input" id="sai-customer-email" placeholder="Your email" />
        <button class="sai-customer-submit" id="sai-customer-submit">Start Chatting →</button>
      </div>
      <form id="supportai-form">
        <input type="text" id="supportai-input" placeholder="Type your message..." autocomplete="off" />
        <button type="submit" id="supportai-send">➤</button>
      </form>
    </div>
  `;
  document.body.appendChild(widget);

  const bubble = document.getElementById('supportai-bubble');
  const panel = document.getElementById('supportai-panel');
  const closeBtn = document.getElementById('supportai-close');
  const messagesEl = document.getElementById('supportai-messages');
  const form = document.getElementById('supportai-form');
  const input = document.getElementById('supportai-input');
  const sendBtn = document.getElementById('supportai-send');
  const suggestionsEl = document.getElementById('supportai-suggestions');
  const customerForm = document.getElementById('supportai-customer-form');
  const customerSubmit = document.getElementById('sai-customer-submit');

  let customerName = '';
  let customerEmail = '';
  let customerInfoCollected = false;

  // Load config
  fetch(`${apiBase}/api/widget/config?tenantId=${tenantId}`)
    .then((r) => r.json())
    .then((res) => {
      if (res.success) {
        config = { ...config, ...res.data };
        document.getElementById('supportai-header-name').textContent = config.botName;
        bubble.style.background = `linear-gradient(135deg, ${config.primaryColor}, ${config.primaryColor}bb)`;
        bubble.textContent = '💬';
        renderSuggestions(config.suggestedQuestions);
        addBotMessage(config.welcomeMessage);
      }
    })
    .catch(() => {
      document.getElementById('supportai-header-name').textContent = 'SupportBot';
      bubble.textContent = '💬';
      bubble.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
      addBotMessage('Hello! How can I help you today?');
    });

  // Load existing session
  fetch(`${apiBase}/api/chat/session/${sessionId}`, {
    headers: { 'x-tenant-id': tenantId },
  }).then((r) => r.json()).then((res) => {
    if (res.success && res.data.messages?.length > 0) {
      messagesEl.innerHTML = '';
      messages = res.data.messages;
      messages.forEach((m) => appendMessage(m.role, m.content));
    }
  }).catch(() => {});

  function renderSuggestions(questions) {
    suggestionsEl.innerHTML = '';
    (questions || []).slice(0, 4).forEach((q) => {
      const btn = document.createElement('button');
      btn.className = 'sai-suggestion';
      btn.textContent = q;
      btn.onclick = () => sendMessage(q);
      suggestionsEl.appendChild(btn);
    });
  }

  function addBotMessage(text) {
    appendMessage('assistant', text);
  }

  function appendMessage(role, content) {
    const div = document.createElement('div');
    div.className = `sai-msg sai-msg-${role === 'user' ? 'user' : 'bot'}`;
    div.innerHTML = `
      <div class="sai-msg-bubble">${escapeHtml(content)}</div>
      <div class="sai-msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.id = 'sai-typing-indicator';
    div.className = 'sai-msg sai-msg-bot';
    div.innerHTML = `
      <div class="sai-typing">
        <div class="sai-typing-dot"></div>
        <div class="sai-typing-dot"></div>
        <div class="sai-typing-dot"></div>
      </div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('sai-typing-indicator')?.remove();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  async function sendMessage(text) {
    if (!text.trim() || isTyping) return;

    if (!customerInfoCollected) {
      customerForm.style.display = 'block';
      input.value = text;
      return;
    }

    appendMessage('user', text);
    suggestionsEl.innerHTML = '';
    if (input.value === text) input.value = '';

    isTyping = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(`${apiBase}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ message: text, sessionId, customerName, customerEmail }),
      });

      const data = await res.json();
      hideTyping();

      if (data.success) {
        addBotMessage(data.data.message);

        if (data.data.escalated) {
          const notice = document.createElement('div');
          notice.className = 'sai-escalation-notice';
          notice.innerHTML = `🎫 A support ticket has been created. Our team will reach out to you shortly.`;
          messagesEl.appendChild(notice);
        }

        if (data.data.suggestedQuestions?.length) {
          renderSuggestions(data.data.suggestedQuestions);
        }
      } else {
        addBotMessage('Sorry, I encountered an error. Please try again.');
      }
    } catch {
      hideTyping();
      addBotMessage('I\'m having trouble connecting. Please check your internet connection.');
    } finally {
      isTyping = false;
      sendBtn.disabled = false;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  // Customer form submit
  customerSubmit?.addEventListener('click', () => {
    customerName = document.getElementById('sai-customer-name').value || 'Guest';
    customerEmail = document.getElementById('sai-customer-email').value || '';
    customerInfoCollected = true;
    customerForm.style.display = 'none';
    const pendingMsg = input.value.trim();
    if (pendingMsg) {
      input.value = '';
      sendMessage(pendingMsg);
    }
  });

  // Toggle widget
  bubble?.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('hidden', !isOpen);
    if (isOpen) {
      input.focus();
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  closeBtn?.addEventListener('click', () => {
    isOpen = false;
    panel.classList.add('hidden');
  });

  // Send message
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
      input.value = '';
      sendMessage(text);
    }
  });

  // Don't collect customer info if not configured
  customerInfoCollected = true; // Set to false to enable customer form

  console.log('[SupportAI] Widget initialized for tenant:', tenantId);
})();
