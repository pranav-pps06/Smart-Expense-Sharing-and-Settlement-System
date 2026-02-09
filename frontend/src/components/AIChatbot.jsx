import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaTimes, FaRobot, FaLightbulb } from 'react-icons/fa';
import axios from 'axios';

// Simple markdown renderer for chat messages
function renderMarkdown(text) {
  if (!text) return '';
  
  // Split into lines
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null;
  
  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside space-y-1 my-2">
            {currentList.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
      } else {
        elements.push(
          <ol key={elements.length} className="list-decimal list-inside space-y-1 my-2">
            {currentList.map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };
  
  lines.forEach((line, idx) => {
    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={idx} className="font-bold text-base mt-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={idx} className="font-bold text-lg mt-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(<h1 key={idx} className="font-bold text-xl mt-2">{line.slice(2)}</h1>);
    }
    // Bullet points
    else if (line.match(/^[\s]*[-*]\s+/)) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      currentList.push(formatInline(line.replace(/^[\s]*[-*]\s+/, '')));
    }
    // Numbered lists
    else if (line.match(/^[\s]*\d+[.)]\s+/)) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      currentList.push(formatInline(line.replace(/^[\s]*\d+[.)]\s+/, '')));
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
      elements.push(<br key={idx} />);
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(<p key={idx} className="my-1">{formatInline(line)}</p>);
    }
  });
  
  flushList();
  return elements;
}

// Format inline elements (bold, italic, code)
function formatInline(text) {
  if (!text) return text;
  
  // Split by code blocks first
  const parts = text.split(/(`[^`]+`)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-gray-800 px-1 rounded text-[#C8FF01]">{part.slice(1, -1)}</code>;
    }
    
    // Handle bold and italic
    let formatted = part;
    // Bold **text**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    // Italic *text*
    formatted = formatted.replace(/\*([^*]+)\*/g, '<i>$1</i>');
    // Bold __text__
    formatted = formatted.replace(/__([^_]+)__/g, '<b>$1</b>');
    // Italic _text_
    formatted = formatted.replace(/_([^_]+)_/g, '<i>$1</i>');
    
    if (formatted !== part) {
      return <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
    }
    return part;
  });
}

export default function AIChatbot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your expense assistant. Ask me anything about your expenses, balances, or groups!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      checkAIStatus();
    }
  }, [isOpen]);

  const checkAIStatus = async () => {
    try {
      const response = await axios.get('/api/ai/status', { withCredentials: true });
      setAiEnabled(response.data.aiEnabled);
      if (!response.data.aiEnabled) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const quickQuestions = [
    "How much do I owe?",
    "Show my recent expenses",
    "Who owes me money?",
    "What's my total spending?"
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', { message: userMessage }, { withCredentials: true });

      if (response.data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date()
        }]);
      } else {
        throw new Error(response.data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: (error.response?.data?.message || 'Sorry, I encountered an error. Please try again.'),
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-black border-b border-gray-800 text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C8FF01]/20 flex items-center justify-center">
              <FaRobot className="text-xl text-[#C8FF01]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#C8FF01]">AI Expense Assistant</h2>
              <p className="text-xs text-gray-500">Powered by Gemini 3</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition text-gray-400 hover:text-white">
            <FaTimes />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-[#C8FF01] text-black rounded-br-none'
                  : 'bg-[#1a1a1a] border border-gray-800 text-gray-200 rounded-bl-none'
              }`}>
              <div className="text-sm">
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-black/50' : 'text-gray-600'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#1a1a1a] border border-gray-800 p-3 rounded-lg rounded-bl-none">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-[#C8FF01] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#C8FF01] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#C8FF01] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length <= 2 && (
          <div className="p-3 bg-[#111] border-t border-gray-800">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
              <FaLightbulb className="text-[#C8FF01]" />
              <span>Quick questions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(q)}
                  className="text-xs bg-black border border-gray-800 hover:border-[#C8FF01] hover:text-[#C8FF01] text-gray-400 px-3 py-1.5 rounded-full transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-800 bg-black rounded-b-xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={aiEnabled ? "Ask me anything..." : "AI is not configured"}
              disabled={isLoading || !aiEnabled}
              className="flex-1 bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#C8FF01] disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !aiEnabled}
              className="bg-[#C8FF01] text-black px-6 py-2 rounded-lg hover:bg-[#d4ff33] disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition flex items-center gap-2 font-semibold"
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
