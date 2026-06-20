// src/components/ChatbotWidget.js
import React, { useState, useEffect, useRef } from 'react';
import API from '../api';

const WELCOME_MESSAGE = {
  role: 'bot',
  text: "Hello! I'm your FitFuel AI Coach & Support Assistant. Ask me fitness questions, supplement advice, or query your order status by typing your order number (e.g. 'order #5')."
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto scroll chat to bottom when messages load or change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = { role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      // Map history to backend expected structure
      const history = messages
        .filter(m => m !== WELCOME_MESSAGE)
        .map(m => ({ role: m.role, text: m.text }));

      const { data } = await API.post('/ai/chat', {
        message: userMessage.text,
        history
      });

      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || "Sorry, I'm having trouble connecting right now.";
      setMessages(prev => [...prev, { role: 'bot', text: `⚠️ Error: ${errMsg}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="chat-widget-btn" onClick={() => setIsOpen(!isOpen)} title="AI Support Chat">
        {isOpen ? '❌' : '💬'}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-title">
              <span>🤖</span>
              <span>FitFuel AI Assistant</span>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="chat-messages">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`chat-msg ${m.role === 'user' ? 'chat-msg-user' : 'chat-msg-bot'}`}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="chat-msg chat-msg-bot" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                Typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask support or type order number..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="chat-send-btn" disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
