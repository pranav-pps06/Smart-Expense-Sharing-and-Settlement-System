import React, { useEffect, useState } from "react";
import axios from "axios";
import { socket } from "../lib/socket";
import { FiArrowLeft } from "react-icons/fi";

const AddExpenseModal = ({ isOpen, onClose, members, group, currentUser, onSubmit }) => {
  const [tab, setTab] = useState('speech'); // 'write' | 'speech'
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState([]);
  const [speechText, setSpeechText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [recAvailable, setRecAvailable] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recognizer, setRecognizer] = useState(null);

  if (!isOpen) return null;

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = (e) => {
    e.preventDefault();
    const total = Number(amount);
    if (!Number.isFinite(total) || total <= 0) return;
    onSubmit({ total, participantIds: selected, description: description.trim() });
    setAmount("");
    setDescription("");
    setSelected([]);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-30 bg-[#111] border border-gray-700 rounded-xl p-6 w-full max-w-lg text-white"
      >
        <h3 className="text-xl font-semibold mb-4">Add Expense</h3>

        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setTab('speech')} className={`px-3 py-1 rounded border ${tab==='speech' ? 'border-[#C8FF01] text-[#C8FF01]' : 'border-gray-600 text-gray-200'} `}>Speech</button>
          <button type="button" onClick={() => setTab('write')} className={`px-3 py-1 rounded border ${tab==='write' ? 'border-[#C8FF01] text-[#C8FF01]' : 'border-gray-600 text-gray-200'} `}>Write</button>
        </div>

        {tab === 'write' && (
        <>
        <label className="block mb-4">
          <span className="text-gray-300">Total Cost</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 w-full px-3 py-2 rounded bg-[#212121] text-white border border-gray-700 focus:outline-none focus:border-[#C8FF01]"
            placeholder="e.g., 1200"
          />
        </label>

        <label className="block mb-4">
          <span className="text-gray-300">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-2 w-full px-3 py-2 rounded bg-[#212121] text-white border border-gray-700 focus:outline-none focus:border-[#C8FF01] resize-none"
            placeholder="e.g., Lunch at cafe"
          />
        </label>

        <div className="mb-4">
          <p className="text-gray-300 mb-2">Split with</p>
          <div className="max-h-48 overflow-auto border border-gray-700 rounded divide-y divide-gray-800">
            {(members || []).length === 0 ? (
              <p className="text-gray-500 p-3 text-sm">No members found.</p>
            ) : (
              members.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-3 text-white">
                  <input
                    type="checkbox"
                    checked={selected.includes(m.id)}
                    onChange={() => toggle(m.id)}
                  />
                  <span>
                    {m.name || m.username || m.email}
                    {m.email ? <span className="text-gray-400"> ({m.email})</span> : null}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
        </>
        )}

        {tab === 'speech' && (
          <div className="mb-4">
            <span className="text-gray-300">Speak or paste transcript</span>
            <textarea
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              rows={4}
              className="mt-2 w-full px-3 py-2 rounded bg-[#212121] text-white border border-gray-700 focus:outline-none focus:border-[#C8FF01] resize-none"
              placeholder="e.g., Add expense 1200 for lunch with Alice and Bob"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  // Feature detect Web Speech API
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SR) {
                    alert('Speech recognition not supported in this browser. Try Chrome.');
                    return;
                  }
                  if (recording) return;
                  try {
                    const r = new SR();
                    r.lang = 'en-US';
                    r.interimResults = true;
                    r.maxAlternatives = 1;
                    r.onstart = () => {
                      setRecording(true);
                      setRecAvailable(true);
                    };
                    r.onresult = (event) => {
                      let interim = '';
                      for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                          setSpeechText((prev) => (prev ? prev + ' ' + transcript : transcript));
                        } else {
                          interim += transcript;
                        }
                      }
                    };
                    r.onerror = (e) => {
                      console.error('Speech error', e);
                      alert('Speech error: ' + (e.message || 'unknown'));
                      setRecording(false);
                    };
                    r.onend = () => {
                      setRecording(false);
                    };
                    setRecognizer(r);
                    r.start();
                  } catch (e) {
                    console.error('Failed to start speech', e);
                    alert('Failed to start microphone.');
                  }
                }}
                className={`px-3 py-1 rounded border ${recording ? 'border-red-400 text-red-400' : 'border-gray-600 text-gray-200'} hover:bg-white/10`}
              >
                {recording ? 'Listening…' : 'Start Mic'}
              </button>
              <button
                type="button"
                disabled={!recording}
                onClick={() => {
                  try {
                    if (recognizer && recording) {
                      recognizer.stop();
                    }
                  } catch {}
                }}
                className="px-3 py-1 rounded border border-gray-600 text-gray-200 hover:bg-white/10"
              >
                Stop
              </button>
              <button
                type="button"
                disabled={parsing || !speechText.trim()}
                onClick={async () => {
                  try {
                    setParsing(true);
                    const res = await axios.post('http://localhost:3000/api/expenses/parse', { transcript: speechText, groupId: group?.id, currentUserId: currentUser?.id }, { withCredentials: true });
                    const data = res.data || {};
                    if (data.total) setAmount(String(data.total));
                    if (data.description) setDescription(data.description);
                    if (Array.isArray(data.participantIds) && data.participantIds.length) {
                      setSelected(data.participantIds);
                    } else if (Array.isArray(data.names) && data.names.length && Array.isArray(members)) {
                      // Fallback: match names locally against members
                      const lowerNames = data.names.map(n => String(n).toLowerCase());
                      const matched = members
                        .filter(m => {
                          const fields = [m.name, m.username, m.email].filter(Boolean).map(x => String(x).toLowerCase());
                          return lowerNames.some(n => fields.some(f => f.includes(n)));
                        })
                        .map(m => m.id);
                      if (matched.length) setSelected(matched);
                    }
                    // Include current user only when transcript indicates sharing "with me" or "between me",
                    // not for phrases like "I paid user-2 ..." which imply the other person only.
                    const lowerText = String(speechText).toLowerCase();
                    const includeSelf = /(with\s+me|between\s+me|me\s+and\s+)/i.test(lowerText);
                    if (currentUser && includeSelf) {
                      setSelected((prev) => Array.isArray(prev) ? (prev.includes(currentUser.id) ? prev : [...prev, currentUser.id]) : [currentUser.id]);
                    }
                    setTab('write');
                  } catch (e) {
                    console.error('Failed to parse speech', e);
                    alert(e?.response?.data?.message || 'Could not parse. Please edit manually.');
                  } finally {
                    setParsing(false);
                  }
                }}
                className="px-3 py-1 rounded border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black"
              >
                {parsing ? 'Parsing…' : 'Parse and Prefill'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-600 text-gray-200 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black"
          >
            Save Expense
          </button>
        </div>
      </form>
    </div>
  );
};

const GroupChat = ({ group, members, currentUser, onBack, onAddExpense }) => {
  const [showModal, setShowModal] = useState(false);
  const [activity, setActivity] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [settleScope, setSettleScope] = useState('mine'); // 'mine' or 'all'

  useEffect(() => {
    const gid = group?.id;
    if (!gid) return;
    // Join this group's room for realtime updates
    socket.emit('join:groups', [gid]);
    (async () => {
      try {
        const res = await axios.get(
          `http://localhost:3000/api/activity`,
          { params: { groupId: gid, limit: 50 }, withCredentials: true }
        );
        setActivity(res.data?.activity || []);
      } catch (e) {
        console.error("Failed to load activity", e);
      }
    })();
    const onExpenseAdded = (evt) => {
      if (evt?.groupId !== gid) return;
      setActivity((prev) => [
        {
          _id: `${evt.expenseId}-rt`,
          group_id: gid,
          user_id: evt.payerId,
          action_type: 'EXPENSE_ADDED',
          expense_id: evt.expenseId,
          meta: { amount: evt.amount, description: evt.description },
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    };
    socket.on('EXPENSE_ADDED', onExpenseAdded);
    return () => {
      socket.off('EXPENSE_ADDED', onExpenseAdded);
      socket.emit('leave:groups', [gid]);
    };
  }, [group?.id]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded hover:bg-white/10 text-[#C8FF01]"
          aria-label="Back"
          title="Back"
        >
          <FiArrowLeft className="text-2xl" />
        </button>
        <div>
          <h2 className="text-xl font-semibold">{group?.name}</h2>
          {group?.created_by_name ? (
            <p className="text-sm text-gray-400">Created by {group.created_by_name}</p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black text-sm"
              onClick={async () => {
                try {
                  const res = await axios.get(`http://localhost:3000/api/settlements/${group.id}`, { withCredentials: true });
                  setSettlements(res.data.settlements || []);
                  setSettleScope('mine');
                  setSettleOpen(true);
                } catch (e) {
                  console.error('Failed to load settlements', e);
                }
              }}
            >
              Settle Up
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded border border-gray-600 text-gray-200 hover:bg-white/10 text-sm"
              onClick={async () => {
                try {
                  const res = await axios.get(`http://localhost:3000/api/settlements/${group.id}/full`, { withCredentials: true });
                  setSettlements(res.data.settlements || []);
                  setSettleScope('all');
                  setSettleOpen(true);
                } catch (e) {
                  console.error('Failed to load all settlements', e);
                }
              }}
            >
              View All Settlements
            </button>
          </div>
        </div>
      </div>

      {/* Chat area placeholder */}
      <div className="flex-1 bg-black/40 border border-gray-700 rounded-lg p-4 overflow-y-auto space-y-3">
        {activity.length === 0 ? (
          <p className="text-gray-400">No activity yet.</p>
        ) : (
          activity.map((log) => (
            <button
              type="button"
              key={log._id}
              className="w-full text-left p-3 rounded border border-gray-700 hover:border-[#C8FF01] hover:bg-white/5"
              onClick={async () => {
                if (!log.expense_id) return;
                try {
                  const res = await axios.get(`http://localhost:3000/api/expenses/${log.expense_id}`, {
                    withCredentials: true,
                  });
                  setDetail(res.data);
                  setDetailOpen(true);
                } catch (e) {
                  console.error('Failed to load expense detail', e);
                }
              }}
            >
              <div className="text-sm text-gray-400">
                {new Date(log.timestamp).toLocaleString()}
              </div>
              <div className="text-white">
                {log.action_type === "EXPENSE_ADDED" ? (
                  <span>
                    Expense ₹{log.meta?.amount} {log.meta?.description ? `- ${log.meta.description}` : ""}
                  </span>
                ) : (
                  <span>{log.action_type}</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Bottom add expense button */}
      <div className="mt-4 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-5 py-2 rounded border border-[#C8FF01] text-[#C8FF01] hover:bg-[#C8FF01] hover:text-black"
        >
          Add Expense
        </button>
      </div>

      <AddExpenseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        members={members}
        group={group}
        currentUser={currentUser}
        onSubmit={(payload) => onAddExpense?.(group, payload)}
      />

      {/* Expense Detail Modal */}
      {detailOpen && detail && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailOpen(false)} />
          <div className="relative z-40 bg-[#111] border border-gray-700 rounded-xl p-6 w-full max-w-xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="p-2 rounded hover:bg-white/10 text-[#C8FF01]"
                aria-label="Back"
                title="Back"
              >
                <FiArrowLeft className="text-2xl" />
              </button>
              <h3 className="text-xl font-semibold">Expense Details</h3>
            </div>

            <div className="space-y-2">
              <p>
                <span className="text-gray-400">Amount:</span> ₹{detail.expense?.amount}
              </p>
              {detail.expense?.description ? (
                <p>
                  <span className="text-gray-400">Description:</span> {detail.expense.description}
                </p>
              ) : null}
              <p>
                <span className="text-gray-400">Paid by:</span> {detail.expense?.payer_name}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-gray-300 mb-2">Split with</p>
              <div className="border border-gray-700 rounded divide-y divide-gray-800">
                {(detail.splits || []).map((s) => (
                  <div key={s.user_id} className="flex items-center justify-between p-3">
                    <span className="text-white">{s.user_name || s.email}</span>
                    <span className="text-[#C8FF01]">₹{s.owed_amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Close removed; use back arrow in header */}
          </div>
        </div>
      )}

      {/* Settlements Modal */}
      {settleOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSettleOpen(false)} />
          <div className="relative z-40 bg-[#111] border border-gray-700 rounded-xl p-6 w-full max-w-xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setSettleOpen(false)}
                className="p-2 rounded hover:bg-white/10 text-[#C8FF01]"
                aria-label="Back"
                title="Back"
              >
                <FiArrowLeft className="text-2xl" />
              </button>
              <h3 className="text-xl font-semibold">Settlements</h3>
            </div>
            {settlements.length === 0 ? (
              <p className="text-gray-400">No payments needed right now.</p>
            ) : (
              <div className="space-y-2">
                {settlements.map((s, idx) => {
                  const amount = `₹${s.amount}`;
                  if (settleScope === 'all') {
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-700 rounded">
                        <span className="text-white">{s.from_name || `User ${s.from}`} → {s.to_name || `User ${s.to}`}</span>
                        <span className="text-[#C8FF01]">{amount}</span>
                      </div>
                    );
                  }
                  const youReceive = currentUser && s.to === currentUser.id;
                  const youPay = currentUser && s.from === currentUser.id;
                  const actorName = youReceive ? (s.from_name || `User ${s.from}`) : (youPay ? (s.to_name || `User ${s.to}`) : (s.from_name || `User ${s.from}`));
                  const text = youReceive
                    ? `${actorName} should give you ${amount}`
                    : youPay
                    ? `Pay ${amount} to ${actorName}`
                    : `${s.from_name || `User ${s.from}`} → ${s.to_name || `User ${s.to}`}: ${amount}`;
                  const colorClass = youReceive ? "text-green-400" : youPay ? "text-red-400" : "text-[#C8FF01]";
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border border-gray-700 rounded">
                      <span className="text-white">{text}</span>
                      <span className={colorClass}>{amount}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChat;
