import React, { useState, useEffect } from 'react';
import { Terminal, Cpu, Database, Wifi } from 'lucide-react';

const MonitoringLogs = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const generateLog = () => {
      const services = ['REDIS_CACHE', 'POSTGRES_DB', 'FLINK_STREAM', 'KAFKA_BROKER', 'MODEL_ENGINE'];
      const actions = ['FETCH_FEATURES', 'COMMITTED_OFFSET', 'HEARTBEAT_SENT', 'FLUSH_LOGS', 'INFERENCE_BATCH_COMPLETE'];
      const service = services[Math.floor(Math.random() * services.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        service,
        action,
        status: Math.random() > 0.95 ? 'WARNING' : 'OK',
        latency: (Math.random() * 50).toFixed(2) + 'ms'
      };
      setLogs(prev => [newLog, ...prev].slice(0, 15));
    };

    const interval = setInterval(generateLog, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Terminal size={20} className="text-blue-400" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white italic">Live Monitoring Journal</h2>
        </div>
        <div className="flex gap-4">
           <StatusIndicator icon={<Cpu size={12}/>} label="CPU" val="12%" />
           <StatusIndicator icon={<Database size={12}/>} label="DB" val="Online" />
           <StatusIndicator icon={<Wifi size={12}/>} label="Kafka" val="Connected" />
        </div>
      </div>
      <div className="p-4 font-mono text-[10px] space-y-2 max-h-[400px] overflow-y-auto">
        {logs.length === 0 && <div className="p-10 text-center text-slate-700 uppercase italic">Initializing system stream...</div>}
        {logs.map(log => (
          <div key={log.id} className="grid grid-cols-5 gap-4 py-2 border-b border-white/[0.03] animate-in slide-in-from-left-2 transition-all">
            <span className="text-slate-600">[{log.timestamp}]</span>
            <span className="font-bold text-blue-400">{log.service}</span>
            <span className="text-slate-300">{log.action}</span>
            <span className={log.status === 'WARNING' ? 'text-red-400' : 'text-emerald-500'}>
              {log.status === 'WARNING' ? '!! WARNING !!' : '✔ OK'}
            </span>
            <span className="text-right text-slate-600">{log.latency}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusIndicator = ({ icon, label, val }) => (
  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
    <span className="text-slate-500">{icon}</span>
    <span className="text-[8px] font-black text-slate-400 uppercase">{label}:</span>
    <span className="text-[8px] font-black text-emerald-400 uppercase">{val}</span>
  </div>
);

export default MonitoringLogs;
