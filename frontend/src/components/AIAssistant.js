import React, { useState, useRef, useEffect } from 'react';
import { Modal, Form, Button, Badge } from 'react-bootstrap';
import axios from 'axios';
import './AIAssistant.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AIAssistant({ show, onHide }) {
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      text: "👋 Hi! I'm your intelligent AI assistant. I can:\n\n🔍 Search companies globally\n📞 Find contact information\n🌐 Scrape websites\n📍 Filter by location\n📊 Compare companies\n💬 Have natural conversations\n🎯 Control the app for you\n\nJust tell me what you need!",
      suggestions: [
        "Search for Tesla",
        "Find companies in London", 
        "Get contact info for Apple",
        "What can you do?"
      ],
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || loading) return;

    const userMessage = {
      type: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/assistant/chat`, {
        message: currentInput,
        sessionId: 'user_session_' + (localStorage.getItem('sessionId') || Date.now()),
        context: {
          currentPage: window.location.pathname,
          timestamp: Date.now()
        }
      });

      const data = response.data;
      const assistantMessage = {
        type: 'assistant',
        text: data.response || data.message || 'I received your message.',
        data: data.data,
        suggestions: data.suggestions || [],
        action: data.action,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle actions if provided
      if (data.action) {
        handleAction(data.action);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = {
        type: 'error',
        text: error.response?.data?.response || 'Sorry, I encountered an error. Please try again.',
        suggestions: error.response?.data?.suggestions || ['Try again', 'Get help'],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    console.log('AI Action:', action);
    
    switch (action.type) {
      case 'display_companies':
        // Could trigger parent component to display results
        console.log('Displaying companies:', action.payload);
        break;
      case 'set_location_filter':
        // Could update location filter in parent
        console.log('Setting location filter:', action.payload);
        break;
      case 'navigate':
        // Could navigate to different page
        console.log('Navigating to:', action.payload);
        break;
      default:
        break;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          🤖 AI Assistant
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
        {/* Messages Container */}
        <div className="flex-grow-1 overflow-auto p-3" style={{ backgroundColor: '#f8f9fa' }}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-3 ${msg.type === 'user' ? 'text-end' : ''}`}>
              <div className={`d-inline-block p-3 rounded ${
                msg.type === 'user' 
                  ? 'bg-primary text-white' 
                  : msg.type === 'error'
                  ? 'bg-danger text-white'
                  : 'bg-white border'
              }`} style={{ maxWidth: '80%', textAlign: 'left' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                
                {/* Display data if available */}
                {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                  <div className="mt-2 pt-2 border-top">
                    {msg.data.slice(0, 3).map((item, i) => (
                      <div key={i} className="mb-2">
                        <strong>{item.name || item.title}</strong>
                        {item.registrationNumber && (
                          <div className="small text-muted">
                            Reg: {item.registrationNumber}
                          </div>
                        )}
                        {item.address && (
                          <div className="small">{item.address}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Display contact data */}
                {msg.data && !Array.isArray(msg.data) && (
                  <div className="mt-2 pt-2 border-top small">
                    {msg.data.website && (
                      <div>🌐 <a href={msg.data.website} target="_blank" rel="noopener noreferrer">{msg.data.website}</a></div>
                    )}
                    {msg.data.phone && (
                      <div>📱 {msg.data.phone}</div>
                    )}
                    {msg.data.emails && msg.data.emails.length > 0 && (
                      <div>📧 {msg.data.emails.slice(0, 3).join(', ')}</div>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 pt-2 border-top">
                    <div className="small text-muted mb-1">Try asking:</div>
                    <div className="d-flex flex-wrap gap-1">
                      {msg.suggestions.map((suggestion, i) => (
                        <Badge 
                          key={i}
                          bg="light" 
                          text="dark"
                          className="cursor-pointer"
                          onClick={() => handleSuggestionClick(suggestion)}
                          style={{ cursor: 'pointer' }}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="small text-muted mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="text-center">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-top p-3 bg-white">
          <Form onSubmit={sendMessage}>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Ask me to search for companies, get contact info, or scrape websites..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                Send
              </Button>
            </div>
          </Form>
          <div className="small text-muted mt-2">
            💡 Try: "Search for Tesla", "Get contact info for Apple", "Scrape https://example.com"
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default AIAssistant;
