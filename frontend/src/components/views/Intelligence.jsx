import React, { useState } from 'react';
import { Globe, Users, ShieldCheck, Fingerprint, Activity, Target, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const Intelligence = ({ monitoringState }) => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scannerStep, setScannerStep] = useState(0);

  const handleDeepScan = () => {
    setScanning(true);
    setScanResult(null);
    setScannerStep(1);
    
    // Simulate multi-stage scanning animation
    setTimeout(() => setScannerStep(2), 1000);
    setTimeout(() => setScannerStep(3), 2000);
    setTimeout(() => setScannerStep(4), 3000);
    
    setTimeout(() => {
      setScanning(false);
      setScannerStep(0);
      setScanResult({
        title: "Deep Scan Complete",
        message: "Isolated 4 anomalous clusters in the V14-V17 subspace. Cross-referencing suggests high geometric correlation with known synthetic identity patterns.",
        alertLevel: "High"
      });
    }, 4500);
  };

  const clusters = monitoringState?.intelligence_clusters || [
    { cluster_id: 0, size: 1420, fraud_density: 0.002, outlier_ratio: 0.01, avg_amount: 85.50 },
    { cluster_id: 1, size: 45, fraud_density: 0.85, outlier_ratio: 0.92, avg_amount: 1240.20 },
  ];

  const ipVelocityData = [
    { ip: '192.168.1.1', count: 45, risk: 'High' },
    { ip: '45.78.2.19', count: 128, risk: 'Critical' },
    { ip: '10.0.0.42', count: 12, risk: 'Low' },
    { ip: '88.12.9.4', count: 89, risk: 'High' }
  ];

  const deviceHealth = [
    { name: 'Trusted Devices', value: 90, color: '#10b981' },
    { name: 'Emulators Detected', value: 7, color: '#f59e0b' },
    { name: 'Rooted/Jailbroken', value: 3, color: '#ef4444' }
  ];

  const networkClusters = [
    { id: 'CLUS_ALPHA', type: 'Residential Proxy Hub', size: 124, intensity: 88 },
    { id: 'CLUS_BETA', type: 'Coordinated Botnet', size: 56, intensity: 92 }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Scanning Overlay */}
      {scanning && (
        <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 transition-all">
          <div className="bg-slate-900 border-2 border-blue-500/50 w-full max-w-sm rounded-3xl p-8 text-center space-y-6 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                <Target className="animate-pulse" size={32} />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black italic uppercase text-white">Scanning Packets...</h3>
              <div className="text-[10px] uppercase font-black tracking-widest text-blue-400">
                {scannerStep === 1 && "Initializing Heuristics..."}
                {scannerStep === 2 && "Filtering Noise..."}
                {scannerStep === 3 && "Clustering Vectors..."}
                {scannerStep === 4 && "Finalizing Analysis..."}
              </div>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
               <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(scannerStep / 4) * 100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Result Message Overlay */}
      {scanResult && (
        <div className="fixed top-24 right-8 z-[110] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 border border-emerald-500/50 p-6 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
             <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-400">
                <ShieldCheck size={24} />
             </div>
             <div>
                <h4 className="text-sm font-black uppercase text-white">{scanResult.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">{scanResult.message}</p>
             </div>
             <button onClick={() => setScanResult(null)} className="text-slate-600 hover:text-white transition-colors">
                <X size={16} />
             </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Fraud Risk Intelligence
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Enterprise-Grade Observability • v3.2.0</p>
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

       {/* Risk Clusters Section (Original content preserved/enhanced) */}
       <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[32px] backdrop-blur-xl">
          <h3 className="text-xl font-black italic tracking-tight text-white uppercase mb-6 flex items-center gap-3">
            <Target className="text-blue-400" size={24} />
            Detected Risk Clusters (ML Layer)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {clusters.map((cluster, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border transition-all ${cluster.fraud_density > 0.1 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-950/50 border-slate-800'}`}>
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Segment #{cluster.cluster_id}</div>
                      <div className="text-sm font-black text-white mt-1">{(cluster.fraud_density * 100).toFixed(1)}% Risk</div>
                   </div>
                   <Activity size={18} className={cluster.fraud_density > 0.1 ? 'text-red-400' : 'text-emerald-400'} />
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">Size: {cluster.size} | Outlier: {(cluster.outlier_ratio * 100).toFixed(1)}%</div>
              </div>
            ))}
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
        <button 
          onClick={handleDeepScan}
          disabled={scanning}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {scanning ? "Scan in Progress..." : "Run Deep Scan"}
        </button>
      </div>
    </div>
  );
};

export default Intelligence;
