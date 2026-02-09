import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaSitemap, FaPlus, FaChevronRight, FaUsers, FaArrowLeft, FaReceipt } from 'react-icons/fa';
import axios from 'axios';

export default function SubGroupManager({ isOpen, onClose, groupId, groupName, onOpenSubGroup }) {
  const [subGroups, setSubGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedSubGroup, setSelectedSubGroup] = useState(null);
  const [subGroupExpenses, setSubGroupExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  useEffect(() => {
    if (isOpen && groupId) {
      fetchSubGroups();
      setSelectedSubGroup(null);
    }
  }, [isOpen, groupId]);

  const fetchSubGroups = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/ai/subgroups/${groupId}`, { withCredentials: true });
      if (res.data.success) {
        setSubGroups(res.data.subGroups || []);
      }
    } catch (err) {
      console.error('Failed to fetch sub-groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubGroupExpenses = async (subGroupId) => {
    setLoadingExpenses(true);
    try {
      const res = await axios.get(`/api/activity?groupId=${subGroupId}&limit=50`, { withCredentials: true });
      setSubGroupExpenses(res.data.activity || []);
    } catch (err) {
      console.error('Failed to fetch sub-group expenses:', err);
      setSubGroupExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleSelectSubGroup = async (sg) => {
    setSelectedSubGroup(sg);
    await fetchSubGroupExpenses(sg.id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post('/api/ai/subgroup', {
        parentGroupId: groupId,
        name: form.name.trim(),
        description: form.description.trim()
      }, { withCredentials: true });
      if (res.data.success) {
        setMessage('Sub-group created!');
        setForm({ name: '', description: '' });
        setShowCreate(false);
        fetchSubGroups();
      } else {
        setMessage(res.data.error || 'Failed');
      }
    } catch (err) {
      setMessage(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!isOpen) return null;

  // If a sub-group is selected, show its details
  if (selectedSubGroup) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-black border-b border-gray-800 text-white p-4 rounded-t-xl flex items-center justify-between sticky top-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedSubGroup(null)} 
                className="hover:bg-white/10 p-2 rounded-full transition text-[#C8FF01]"
              >
                <FaArrowLeft />
              </button>
              <div>
                <h2 className="text-lg font-bold text-[#C8FF01]">{selectedSubGroup.name}</h2>
                <p className="text-xs text-gray-500">Sub-group of {groupName}</p>
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition text-gray-400 hover:text-white">
              <FaTimes />
            </button>
          </div>

          <div className="p-6">
            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  if (onOpenSubGroup) {
                    onOpenSubGroup(selectedSubGroup);
                    onClose();
                  }
                }}
                className="flex-1 py-2 bg-[#C8FF01] text-black rounded-lg hover:bg-[#d4ff33] font-medium text-sm transition"
              >
                Open Full View
              </button>
            </div>

            {/* Expenses List */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <FaReceipt className="text-[#C8FF01]" /> Recent Activity
              </h3>
              
              {loadingExpenses ? (
                <div className="flex justify-center py-6">
                  <FaSpinner className="text-2xl text-[#C8FF01] animate-spin" />
                </div>
              ) : subGroupExpenses.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {subGroupExpenses.map((exp) => (
                    <div key={exp._id} className="bg-black rounded-lg p-3 border border-gray-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white text-sm">{exp.meta?.description || exp.action_type?.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">{new Date(exp.timestamp).toLocaleDateString()}</p>
                        </div>
                        {exp.meta?.amount && (
                          <span className="text-[#C8FF01] font-medium">Rs.{exp.meta.amount}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-gray-500 text-sm">No expenses in this sub-group yet</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black rounded-lg p-3 border border-gray-800 text-center">
                <p className="text-2xl font-bold text-[#C8FF01]">{selectedSubGroup.member_count || 0}</p>
                <p className="text-xs text-gray-500">Members</p>
              </div>
              <div className="bg-black rounded-lg p-3 border border-gray-800 text-center">
                <p className="text-2xl font-bold text-white">{subGroupExpenses.length}</p>
                <p className="text-xs text-gray-500">Activities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-black border-b border-gray-800 text-white p-4 rounded-t-xl flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C8FF01]/20 flex items-center justify-center">
              <FaSitemap className="text-xl text-[#C8FF01]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#C8FF01]">Sub-Groups</h2>
              <p className="text-xs text-gray-500">{groupName || 'Group'} - Hierarchy</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition text-gray-400 hover:text-white">
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-[#C8FF01]/20 text-[#C8FF01] text-sm font-medium text-center border border-[#C8FF01]/30">{message}</div>
          )}

          {/* Create button */}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full mb-4 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-[#C8FF01] hover:text-[#C8FF01] transition font-medium"
          >
            <FaPlus /> Create Sub-Group
          </button>

          {/* Create form */}
          {showCreate && (
            <form onSubmit={handleCreate} className="mb-6 bg-black rounded-lg p-4 border border-gray-800 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sub-Group Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hotel Expenses"
                  className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#C8FF01]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description..."
                  className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#C8FF01]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-500 hover:text-white rounded-lg text-sm transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-4 py-2 bg-[#C8FF01] text-black rounded-lg hover:bg-[#d4ff33] text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition">
                  {creating ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Sub-group list */}
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <FaSpinner className="text-3xl text-[#C8FF01] animate-spin mb-3" />
              <p className="text-gray-500 text-sm">Loading sub-groups...</p>
            </div>
          ) : subGroups.length > 0 ? (
            <div className="space-y-2">
              {/* Parent */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <FaSitemap className="text-[#C8FF01]" /> <span className="font-medium text-gray-300">{groupName}</span>
              </div>
              {subGroups.map((sg) => (
                <button
                  key={sg.id}
                  onClick={() => handleSelectSubGroup(sg)}
                  className="w-full flex items-center gap-3 bg-black rounded-lg p-3 border border-gray-800 hover:border-[#C8FF01] hover:bg-[#C8FF01]/5 transition text-left"
                >
                  <FaChevronRight className="text-[#C8FF01] text-xs ml-4" />
                  <div className="flex-1">
                    <div className="font-medium text-white">{sg.name || sg.group_name}</div>
                    {sg.description && <div className="text-xs text-gray-500">{sg.description}</div>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FaUsers /> {sg.member_count || 0}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaSitemap className="text-4xl text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No sub-groups yet</p>
              <p className="text-gray-600 text-xs mt-1">Create one to organize expenses hierarchically</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
