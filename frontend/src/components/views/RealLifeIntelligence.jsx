import React from 'react';
import { Globe, Smartphone, Users, ShieldCheck, AlertTriangle, Fingerprint, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const RealLifeIntelligence = () => {
  const ipVelocityData = [
    { ip: '192.168.1.102', count: 45, risk: 'Critical' },
    { ip: '10.0.0.45', count: 28, risk: 'High' },
    { ip: '172.16.2.14', count: 12, risk: 'Moderate' },
    { ip: '203.0.113.8', count: 8, risk: 'Low' },
  ];

  const deviceHealth = [
    { name: 'Trusted Devices', value: 78, color: '#10b981' },
    { name: 'Emulators Detected', value: 12, color: '#f59e0b' },
    { name: 'Rooted/Jailbroken', value: 10, color: '#ef4444' },
  ];

  const networkClusters = [
    { id: 'C-001', size: 142, type: 'Card Testing', intensity: 88 },
    { id: 'C-002', size: 56, type: 'Account Takeover', intensity: 72 },
    { id: 'C-003', size: 89, type: 'Synthetic Identities', intensity: 45 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Fraud Risk Intelligence
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Enterprise-Grade Observability • v3.2.0</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Engine</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* IP Velocity */}
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[32px] backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <Globe className="text-blue-400" size={24} />
            <h2 className="text-xl font-black italic tracking-tight text-white uppercase">IP Velocity Peaks</h2>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ipVelocityData}>
                <XAxis dataKey="ip" hide />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {ipVelocityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk === 'Critical' ? '#ef4444' : (entry.risk === 'High' ? '#f59e0b' : '#3b82f6')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-3">
            {ipVelocityData.map(item => (
              <div key={item.ip} className="flex justify-between items-center p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-400">{item.ip}</span>
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${item.risk === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {item.count} TX/MIN
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Device Fingerprinting */}
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[32px] backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <Fingerprint className="text-emerald-400" size={24} />
            <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Device Integrity</h2>
          </div>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceHealth}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {deviceHealth.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-white">90%</span>
              <span className="text-[8px] font-black text-slate-500 uppercase">Health</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {deviceHealth.map(item => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs font-bold text-slate-300 flex-1">{item.name}</span>
                <span className="text-xs font-black text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Network Clusters */}
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[32px] backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <Users className="text-purple-400" size={24} />
            <h2 className="text-xl font-black italic tracking-tight text-white uppercase">Active Clusters</h2>
          </div>
          <div className="space-y-4">
            {networkClusters.map(cluster => (
              <div key={cluster.id} className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl group hover:border-purple-500/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cluster.id}</div>
                    <div className="text-sm font-black text-white mt-1 uppercase">{cluster.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-purple-400">{cluster.intensity}%</div>
                    <div className="text-[8px] font-bold text-slate-600 uppercase">Intensity</div>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${cluster.intensity}%` }}></div>
                </div>
                <div className="flex justify-between items-center mt-4">
                   <div className="flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-500">{cluster.size} nodes</span>
                   </div>
                   <button className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300">Analyze →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[32px] flex items-center gap-8">
        <div className="p-4 bg-blue-600/20 rounded-2xl border border-blue-500/30">
          <Activity className="text-blue-400" size={32} />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-black italic text-white uppercase tracking-tight">System Anomaly Detector</h3>
          <p className="text-slate-400 text-sm mt-1">Cross-referencing device fingerprints with network clusters for deep-packet fraud inspection.</p>
        </div>
        <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">
          Run Deep Scan
        </button>
      </div>
    </div>
  );
};

export default RealLifeIntelligence;
