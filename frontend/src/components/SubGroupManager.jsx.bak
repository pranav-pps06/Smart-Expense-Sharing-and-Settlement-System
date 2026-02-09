import { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaSitemap, FaPlus, FaChevronRight, FaUsers } from 'react-icons/fa';
import axios from 'axios';

export default function SubGroupManager({ isOpen, onClose, groupId, groupName }) {
  const [subGroups, setSubGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (isOpen && groupId) {
      fetchSubGroups();
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
        setMessage((res.data.error || 'Failed'));
      }
    } catch (err) {
      setMessage((err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaSitemap className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">Sub-Groups</h2>
              <p className="text-sm opacity-90">{groupName || 'Group'} — Organize with hierarchy</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition">
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-gray-100 text-sm font-medium text-center">{message}</div>
          )}

          {/* Create button */}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full mb-4 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-teal-300 rounded-lg text-teal-600 hover:bg-teal-50 transition font-medium"
          >
            <FaPlus /> Create Sub-Group
          </button>

          {/* Create form */}
          {showCreate && (
            <form onSubmit={handleCreate} className="mb-6 bg-teal-50 rounded-lg p-4 border border-teal-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Group Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hotel Expenses"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm disabled:opacity-50 flex items-center gap-2">
                  {creating ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Sub-group list */}
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <FaSpinner className="text-3xl text-teal-500 animate-spin mb-3" />
              <p className="text-gray-500 text-sm">Loading sub-groups...</p>
            </div>
          ) : subGroups.length > 0 ? (
            <div className="space-y-2">
              {/* Parent */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <FaSitemap /> <span className="font-medium">{groupName}</span>
              </div>
              {subGroups.map((sg) => (
                <div key={sg.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border hover:bg-gray-100 transition">
                  <FaChevronRight className="text-teal-400 text-xs ml-4" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{sg.group_name}</div>
                    {sg.description && <div className="text-xs text-gray-500">{sg.description}</div>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <FaUsers /> {sg.member_count || 0}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaSitemap className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No sub-groups yet</p>
              <p className="text-gray-400 text-xs mt-1">Create one to organize expenses hierarchically</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
