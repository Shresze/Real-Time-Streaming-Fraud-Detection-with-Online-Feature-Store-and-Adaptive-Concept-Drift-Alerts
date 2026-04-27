import React, { useState, useEffect } from 'react';
import { ClipboardList, Filter, Download, ArrowRight, Trash2, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [securityKey, setSecurityKey] = useState('');
  const [clearError, setClearError] = useState('');

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/audit/logs');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const headers = ['Timestamp', 'Event Type', 'Entity', 'Initiator', 'Previous State', 'New State'];
    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action_type,
        log.transaction_id || log.model_version || 'N/A',
        log.user_role,
        log.previous_state || 'None',
        log.new_state || 'N/A'
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `audit_logs_${new Date().toISOString()}.csv`);
    a.click();
  };

  const handleClear = async () => {
    const username = user?.name?.toLowerCase() || 'unknown';
    const expectedKey = `${username}_end`;

    if (securityKey !== expectedKey) {
      setClearError(`Incorrect security key. Expected: ${username}_end`);
      return;
    }

    try {
      const response = await fetch('/api/audit/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, key: securityKey, role: user.role })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        setLogs([]);
        setIsClearModalOpen(false);
        setSecurityKey('');
        setClearError('');
      } else {
        setClearError(result.detail || "Server error clearing logs.");
      }
    } catch (error) {
      setClearError("Connection failed.");
    }
  };

  const filteredLogs = filterType === 'ALL' 
    ? logs 
    : logs.filter(l => l.action_type === filterType);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Decrypting System Journal...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Governance Logs</h2>
          <p className="text-slate-500 text-sm">Real-time immutable record of all model & policy transitions.</p>
        </div>
        <div className="flex gap-3">
          <select 
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="ALL">All Events</option>
            <option value="MODEL_RETRAIN">Models Only</option>
            <option value="REVIEW_RESOLVED">Reviews Only</option>
            <option value="INFERENCE_COMPLETE">Traffic Only</option>
          </select>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2 rounded-xl text-sm font-bold border border-blue-500/30 transition-all"
          >
            <Download size={16} /> Export CSV
          </button>

          {user?.role === 'Admin' && (
            <button 
              onClick={() => setIsClearModalOpen(true)}
              className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold border border-red-500/30 transition-all font-mono tracking-tighter"
            >
              <Trash2 size={16} /> Clear Journal
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-[32px] border border-slate-700 overflow-hidden backdrop-blur-md">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Timestamp</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Event Type</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Target Email</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Initiator (Name / Role)</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">State Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-20 text-center text-slate-600 font-bold text-xs uppercase italic tracking-widest">No audit trails match the current criteria.</td>
              </tr>
            ) : (
              filteredLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-6 text-[11px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                      log.action_type === 'MODEL_RETRAIN' ? 'bg-blue-600/10 text-blue-400' : 
                      log.action_type === 'MODEL_SWITCH' ? 'bg-purple-600/10 text-purple-400' : 
                      'bg-slate-700/50 text-slate-400'
                    }`}>
                      {log.action_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-6 text-[10px] font-mono text-slate-400">
                    {log.metadata?.target_user || log.metadata?.new_member || '-'}
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white uppercase tracking-tight">{log.metadata?.adjusted_by || log.metadata?.invited_by || 'System'}</span>
                      <span className={`w-fit px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        log.user_role === 'Admin' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30' : 
                        'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}>
                        {log.user_role}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase italic">{log.previous_state || 'None'}</span>
                      <ArrowRight size={14} className="text-slate-700" />
                      <span className="text-[10px] font-black text-emerald-400 uppercase">{log.new_state || 'Completed'}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Clear Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center text-red-400">
              <div className="flex items-center gap-3">
                <ShieldAlert size={28} />
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Wipe System Journal?</h3>
              </div>
              <button onClick={() => setIsClearModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed">
              This action is <span className="text-white font-bold">irreversible</span>. All immutable audit trails, model transitions, and resolution records will be permanently deleted.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Enter Security Key (pattern: {user?.name?.toLowerCase()}_end)
              </label>
              <input 
                type="text"
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                placeholder="........"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-mono text-sm focus:border-red-500/50 outline-none transition-all"
              />
              {clearError && <div className="text-[10px] font-bold text-red-500 mt-1 uppercase italic">{clearError}</div>}
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700"
              >
                ABORT
              </button>
              <button 
                onClick={handleClear}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/40"
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
