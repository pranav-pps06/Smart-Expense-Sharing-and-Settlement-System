import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaSpinner, FaProjectDiagram, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';

export default function DebtGraph({ isOpen, onClose, groupId, groupName }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen && groupId) {
      fetchDebtGraph();
    }
  }, [isOpen, groupId]);

  useEffect(() => {
    if (data && canvasRef.current) {
      drawGraph();
    }
  }, [data]);

  const fetchDebtGraph = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/ai/debt-graph/${groupId}`, { withCredentials: true });
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch debt graph:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = 500;
    const H = canvas.height = 400;

    ctx.clearRect(0, 0, W, H);

    const nodes = data.nodes || [];
    const edges = data.edges || [];
    if (nodes.length === 0) return;

    // Position nodes in a circle
    const cx = W / 2, cy = H / 2, radius = 140;
    const positions = {};
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      positions[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    // Draw edges (arrows)
    edges.forEach(edge => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return;

      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(1, Math.min(edge.amount / 100, 4));
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const arrowLen = 10;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      ctx.beginPath();
      ctx.fillStyle = '#ef4444';
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX - arrowLen * Math.cos(angle - 0.4), midY - arrowLen * Math.sin(angle - 0.4));
      ctx.lineTo(midX - arrowLen * Math.cos(angle + 0.4), midY - arrowLen * Math.sin(angle + 0.4));
      ctx.fill();

      // Amount label
      ctx.fillStyle = '#374151';
      ctx.font = '11px sans-serif';
      ctx.fillText(`₹${edge.amount}`, midX + 5, midY - 5);
    });

    // Draw nodes
    nodes.forEach(node => {
      const pos = positions[node.id];
      const balance = data.netBalances?.find(b => b.id === node.id)?.balance || 0;
      const color = balance > 0 ? '#22c55e' : balance < 0 ? '#ef4444' : '#6b7280';

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 22, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name?.substring(0, 6) || '?', pos.x, pos.y + 3);
      
      // Balance below
      ctx.fillStyle = '#374151';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${balance >= 0 ? '+' : ''}₹${balance.toFixed(0)}`, pos.x, pos.y + 38);
    });

    ctx.textAlign = 'start';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaProjectDiagram className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">Debt Flow Graph</h2>
              <p className="text-sm opacity-90">{groupName || 'Group'} — Optimized Settlements</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition">
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center py-12">
              <FaSpinner className="text-4xl text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">Building debt graph...</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                  <p className="text-2xl font-bold text-blue-700">{data.stats?.totalMembers || 0}</p>
                  <p className="text-xs text-blue-600">Members</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{data.stats?.optimizedTransactions || 0}</p>
                  <p className="text-xs text-green-600">Min Transactions</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                  <p className="text-2xl font-bold text-orange-700">{data.stats?.savingsPercent || 0}%</p>
                  <p className="text-xs text-orange-600">Reduction</p>
                </div>
              </div>

              {/* Canvas Graph */}
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 flex justify-center">
                <canvas ref={canvasRef} className="max-w-full" />
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs text-gray-600 justify-center">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Gets money</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Owes money</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-500 inline-block"></span> Settled</span>
              </div>

              {/* Circular Debts */}
              {data.circularDebts && data.circularDebts.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                    <FaExclamationTriangle /> Circular Debts Detected
                  </h3>
                  <p className="text-sm text-amber-700 mb-2">These can be auto-cancelled to simplify:</p>
                  {data.circularDebts.map((c, i) => (
                    <div key={i} className="text-sm text-amber-800 bg-amber-100 rounded p-2 mb-1">
                      Cycle: {c.participants?.join(' → ')} — Can cancel ₹{c.cancelAmount}
                    </div>
                  ))}
                </div>
              )}

              {/* Optimized Settlements */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
                  <FaCheckCircle /> Optimized Settlement Plan
                </h3>
                {data.optimizedSettlements && data.optimizedSettlements.length > 0 ? (
                  <div className="space-y-2">
                    {data.optimizedSettlements.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-100">
                        <span className="text-sm">
                          <span className="font-semibold text-red-600">{s.from_name}</span>
                          <span className="text-gray-500"> pays </span>
                          <span className="font-semibold text-green-600">{s.to_name}</span>
                        </span>
                        <span className="font-bold text-green-700">₹{s.amount}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-700">Everyone is settled up!</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
