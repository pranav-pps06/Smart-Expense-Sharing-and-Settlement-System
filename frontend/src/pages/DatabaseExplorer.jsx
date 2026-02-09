import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaDatabase, FaTable, FaPlay, FaArrowLeft, FaSync, 
  FaServer, FaLeaf, FaChartBar, FaCode, FaSearch
} from 'react-icons/fa';

export default function DatabaseExplorer() {
  const navigate = useNavigate();
  const [activeDb, setActiveDb] = useState('mysql'); // 'mysql' | 'mongodb'
  const [tables, setTables] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQueryPanel, setShowQueryPanel] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchTables();
    fetchCollections();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/database/stats', { withCredentials: true });
      if (res.data.success) setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await axios.get('/api/database/tables', { withCredentials: true });
      if (res.data.success) setTables(res.data.tables);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await axios.get('/api/database/mongodb/collections', { withCredentials: true });
      if (res.data.success) setCollections(res.data.collections);
    } catch (err) {
      console.error('Failed to fetch collections:', err);
    }
  };

  const fetchTableData = async (tableName) => {
    setLoading(true);
    setSelectedTable(tableName);
    try {
      const url = activeDb === 'mysql' 
        ? `/api/database/table/${tableName}`
        : `/api/database/mongodb/collection/${tableName}`;
      const res = await axios.get(url, { withCredentials: true });
      if (res.data.success) setTableData(res.data);
    } catch (err) {
      console.error('Failed to fetch table data:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setQueryError('');
    setQueryResult(null);

    try {
      const url = activeDb === 'mysql' ? '/api/database/query' : '/api/database/mongodb/query';
      const body = activeDb === 'mysql' 
        ? { query } 
        : { collection: selectedTable || collections[0], filter: query };
      
      const res = await axios.post(url, body, { withCredentials: true });
      if (res.data.success) {
        setQueryResult(res.data);
      } else {
        setQueryError(res.data.message);
      }
    } catch (err) {
      setQueryError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = {
    mysql: [
      { label: 'All Users', query: 'SELECT id, name, email, created_at FROM users' },
      { label: 'Groups with Members', query: 'SELECT g.id, g.name, COUNT(gm.user_id) as member_count FROM groups_made g LEFT JOIN group_members gm ON g.id = gm.group_id GROUP BY g.id' },
      { label: 'Recent Expenses', query: 'SELECT e.id, e.amount, e.description, g.name as group_name, u.name as paid_by FROM expenses e JOIN groups_made g ON g.id = e.group_id JOIN users u ON u.id = e.paid_by ORDER BY e.created_at DESC LIMIT 10' },
      { label: 'Top Spenders', query: 'SELECT u.name, SUM(e.amount) as total_spent FROM users u JOIN expenses e ON e.paid_by = u.id GROUP BY u.id ORDER BY total_spent DESC' },
      { label: 'Sub-groups', query: 'SELECT c.id, c.name as sub_group, p.name as parent_group FROM groups_made c JOIN groups_made p ON c.parent_id = p.id' }
    ],
    mongodb: [
      { label: 'All Activity', filter: '{}' },
      { label: 'Expense Actions', filter: '{"action_type": "expense_added"}' },
      { label: 'Recent 10', filter: '{}' }
    ]
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-[#111] border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-lg text-[#C8FF01]"
            >
              <FaArrowLeft />
            </button>
            <div className="flex items-center gap-3">
              <FaDatabase className="text-2xl text-[#C8FF01]" />
              <div>
                <h1 className="text-xl font-bold text-[#C8FF01]">Database Explorer</h1>
                <p className="text-xs text-gray-500">Visualize and query your databases</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQueryPanel(!showQueryPanel)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition ${
                showQueryPanel ? 'bg-[#C8FF01] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FaCode /> Query Editor
            </button>
            <button
              onClick={() => { fetchStats(); fetchTables(); fetchCollections(); }}
              className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300"
            >
              <FaSync />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <FaServer className="text-blue-400" /> MySQL
              </div>
              <p className="text-2xl font-bold text-white">{stats.mysql?.users || 0}</p>
              <p className="text-xs text-gray-500">Users</p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{stats.mysql?.groups || 0}</p>
              <p className="text-xs text-gray-500">Groups</p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <p className="text-2xl font-bold text-[#C8FF01]">{stats.mysql?.expenses || 0}</p>
              <p className="text-xs text-gray-500">Expenses</p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <FaLeaf className="text-green-400" /> MongoDB
              </div>
              <p className="text-2xl font-bold text-white">{stats.mongodb?.activityLogs || 0}</p>
              <p className="text-xs text-gray-500">Activity Logs</p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{stats.mongodb?.notifications || 0}</p>
              <p className="text-xs text-gray-500">Notifications</p>
            </div>
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{stats.mongodb?.receiptCache || 0}</p>
              <p className="text-xs text-gray-500">Cached Receipts</p>
            </div>
          </div>
        )}

        {/* Database Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setActiveDb('mysql'); setSelectedTable(null); setTableData(null); }}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition ${
              activeDb === 'mysql' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <FaServer /> MySQL
          </button>
          <button
            onClick={() => { setActiveDb('mongodb'); setSelectedTable(null); setTableData(null); }}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition ${
              activeDb === 'mongodb' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <FaLeaf /> MongoDB
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar - Tables/Collections */}
          <div className="lg:col-span-1">
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <FaTable className="text-[#C8FF01]" />
                {activeDb === 'mysql' ? 'Tables' : 'Collections'}
              </h3>
              <div className="space-y-1">
                {(activeDb === 'mysql' ? tables : collections).map(item => (
                  <button
                    key={item}
                    onClick={() => fetchTableData(item)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedTable === item 
                        ? 'bg-[#C8FF01]/20 text-[#C8FF01] border border-[#C8FF01]/30' 
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Query Panel */}
            {showQueryPanel && (
              <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <FaCode className="text-[#C8FF01]" /> 
                    {activeDb === 'mysql' ? 'SQL Query' : 'MongoDB Filter'}
                  </h3>
                  <div className="flex gap-2">
                    {sampleQueries[activeDb].map((sq, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(activeDb === 'mysql' ? sq.query : sq.filter)}
                        className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white"
                      >
                        {sq.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={activeDb === 'mysql' ? 'SELECT * FROM users LIMIT 10' : '{"action_type": "expense_added"}'}
                  className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white font-mono text-sm h-24 focus:outline-none focus:border-[#C8FF01]"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {activeDb === 'mysql' ? 'Only SELECT queries allowed' : 'Enter MongoDB filter JSON'}
                  </p>
                  <button
                    onClick={executeQuery}
                    disabled={loading}
                    className="px-4 py-2 bg-[#C8FF01] text-black rounded-lg hover:bg-[#d4ff33] font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <FaPlay /> Execute
                  </button>
                </div>
                {queryError && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {queryError}
                  </div>
                )}
                {queryResult && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">
                        {queryResult.rowCount || queryResult.documentCount} rows in {queryResult.executionTime}
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-800 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-900 sticky top-0">
                          <tr>
                            {queryResult.columns?.map(col => (
                              <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium">{col}</th>
                            )) || (queryResult.data?.[0] && Object.keys(queryResult.data[0]).map(col => (
                              <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium">{col}</th>
                            )))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.data?.map((row, idx) => (
                            <tr key={idx} className="border-t border-gray-800 hover:bg-white/5">
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-3 py-2 text-gray-300">
                                  {typeof val === 'object' ? JSON.stringify(val).substring(0, 50) : String(val ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table Data */}
            {loading ? (
              <div className="bg-[#111] border border-gray-800 rounded-lg p-12 flex items-center justify-center">
                <div className="text-center">
                  <FaSync className="text-3xl text-[#C8FF01] animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Loading data...</p>
                </div>
              </div>
            ) : tableData ? (
              <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{tableData.table || tableData.collection}</h3>
                    <p className="text-xs text-gray-500">
                      {tableData.rowCount || tableData.documentCount} records
                    </p>
                  </div>
                </div>
                
                {/* Structure (MySQL only) */}
                {tableData.structure && (
                  <div className="p-4 border-b border-gray-800">
                    <h4 className="text-xs text-gray-500 mb-2">STRUCTURE</h4>
                    <div className="flex flex-wrap gap-2">
                      {tableData.structure.map(col => (
                        <span key={col.Field} className="text-xs bg-gray-800 px-2 py-1 rounded">
                          <span className="text-[#C8FF01]">{col.Field}</span>
                          <span className="text-gray-500 ml-1">{col.Type}</span>
                          {col.Key === 'PRI' && <span className="text-yellow-500 ml-1">PK</span>}
                          {col.Key === 'MUL' && <span className="text-blue-400 ml-1">FK</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Table */}
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 sticky top-0">
                      <tr>
                        {tableData.data?.[0] && Object.keys(tableData.data[0]).map(col => (
                          <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.data?.map((row, idx) => (
                        <tr key={idx} className="border-t border-gray-800 hover:bg-white/5">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-xs truncate">
                              {typeof val === 'object' ? JSON.stringify(val).substring(0, 100) : String(val ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-[#111] border border-gray-800 rounded-lg p-12 flex items-center justify-center">
                <div className="text-center">
                  <FaSearch className="text-4xl text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">Select a table or collection to view data</p>
                  <p className="text-xs text-gray-600 mt-1">Or use the Query Editor to run custom queries</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
