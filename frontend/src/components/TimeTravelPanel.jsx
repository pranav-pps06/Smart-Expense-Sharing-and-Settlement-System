import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaClock, FaHistory, FaUndo, FaRedo, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';

export default function TimeTravelPanel({ isOpen, onClose, groupId, groupName }) {
  const [activeTab, setActiveTab] = useState('snapshot');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [balances, setBalances] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && groupId) {
      fetchAuditTrail();
    }
  }, [isOpen, groupId]);

  const fetchBalancesAtDate = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/ai/time-travel/${groupId}?date=${date}`, { withCredentials: true });
      if (res.data.success) {
        setBalances(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      const res = await axios.get(`/api/ai/audit-trail/${groupId}`, { withCredentials: true });
      if (res.data.success) {
        setAuditTrail(res.data.trail || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit trail:', err);
    }
  };

  const handleUndo = async (expenseId) => {
    try {
      const res = await axios.post(`/api/ai/undo-expense/${expenseId}`, {}, { withCredentials: true });
      if (res.data.success) {
        setMessage('Expense undone successfully');
        fetchAuditTrail();
        if (balances) fetchBalancesAtDate();
      } else {
        setMessage((res.data.error || 'Undo failed'));
      }
    } catch (err) {
      setMessage('Undo failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRedo = async (historyId) => {
    try {
      const res = await axios.post(`/api/ai/redo-expense/${historyId}`, {}, { withCredentials: true });
      if (res.data.success) {
        setMessage('Expense restored successfully');
        fetchAuditTrail();
        if (balances) fetchBalancesAtDate();
      } else {
        setMessage((res.data.error || 'Redo failed'));
      }
    } catch (err) {
      setMessage('Redo failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const actionColors = {
    created: 'bg-green-100 text-green-800 border-green-200',
    deleted: 'bg-red-100 text-red-800 border-red-200',
    updated: 'bg-blue-100 text-blue-800 border-blue-200',
    restored: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaClock className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">Time Travel</h2>
              <p className="text-sm opacity-90">{groupName || 'Group'} — View history & undo changes</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition">
            <FaTimes />
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-gray-100 text-sm font-medium text-center">{message}</div>
        )}

        {/* Tabs */}
        <div className="flex border-b mx-6 mt-4">
          {[
            { key: 'snapshot', label: 'Point-in-Time', icon: <FaCalendarAlt /> },
            { key: 'audit', label: 'Audit Trail', icon: <FaHistory /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'snapshot' ? (
            <div className="space-y-4">
              {/* Date picker */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchBalancesAtDate}
                    disabled={isLoading}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {isLoading ? <FaSpinner className="animate-spin" /> : <FaClock />}
                    View
                  </button>
                </div>
              </div>

              {/* Balances */}
              {balances && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">
                    Balances as of {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {balances.expenseCount} expense(s) totalling ₹{balances.totalSpent?.toFixed(2) || '0.00'}
                  </div>
                  {balances.balances && balances.balances.length > 0 ? (
                    <div className="space-y-2">
                      {balances.balances.map((b, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 border">
                          <span className="font-medium text-gray-800">{b.name}</span>
                          <span className={`font-bold ${b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {b.balance > 0 ? '+' : ''}₹{b.balance.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No expenses found before this date</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Audit Trail */
            <div className="space-y-3">
              {auditTrail.length > 0 ? (
                auditTrail.map((entry, i) => {
                  return (
                    <div key={i} className={`rounded-lg p-3 border ${actionColors[entry.action] || 'bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase mr-2">{entry.action}</span>
                          <span className="text-sm font-medium">
                            {entry.current_description || entry.new_description || entry.old_description || `Expense #${entry.expense_id}`}
                          </span>
                          {(entry.new_amount || entry.old_amount) && (
                            <span className="text-sm ml-1">— ₹{entry.new_amount || entry.old_amount}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {(entry.action === 'created' || entry.action === 'restored') && (
                            <button
                              onClick={() => handleUndo(entry.expense_id)}
                              className="text-xs bg-white rounded px-2 py-1 hover:bg-gray-100 border flex items-center gap-1"
                              title="Undo this expense"
                            >
                              <FaUndo /> Undo
                            </button>
                          )}
                          {entry.action === 'deleted' && (
                            <button
                              onClick={() => handleRedo(entry.id)}
                              className="text-xs bg-white rounded px-2 py-1 hover:bg-gray-100 border flex items-center gap-1"
                              title="Redo / restore this expense"
                            >
                              <FaRedo /> Redo
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        by {entry.changed_by_name || 'Unknown'} • {formatDate(entry.changed_at)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 py-8">No audit history yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
