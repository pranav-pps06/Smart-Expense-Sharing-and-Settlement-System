import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaTimes, FaRobot, FaLightbulb } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AIChatbot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your expense assistant. Ask me anything about your expenses, balances, or groups!',
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
    // Check AI status
    if (isOpen) {
      checkAIStatus();
    }
  }, [isOpen]);

  const checkAIStatus = async () => {
    try {
      const response = await axios.get('/api/ai/status', {
        withCredentials: true
      });
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

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await axios.post(
        '/api/ai/chat',
        { message: userMessage },
        { withCredentials: true }
      );

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

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaRobot className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">AI Expense Assistant</h2>
              <p className="text-sm opacity-90">Ask me anything about your expenses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-white border border-gray-200 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length <= 2 && (
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
              <FaLightbulb className="text-yellow-500" />
              <span>Quick questions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(q)}
                  className="text-xs bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-500 px-3 py-1.5 rounded-full transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={aiEnabled ? "Ask me anything..." : "AI is not configured"}
              disabled={isLoading || !aiEnabled}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !aiEnabled}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <FaPaperPlane />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
