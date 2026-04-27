import React from 'react';
import { ShieldAlert, Activity, TrendingUp, Zap, CreditCard, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const Dashboard = ({ monitoringState, metrics, transactions }) => {
  const [selectedTx, setSelectedTx] = React.useState(null);
  const psiValue = monitoringState?.psi_overall?.toFixed(3) || "0.000";
  const driftDetected = monitoringState?.system_status !== 'Stable';
  const healthScore = monitoringState?.health_score || 100;
  const accuracy = (monitoringState?.accuracy_rolling || 0.99) * 100;
  const fraudRate = ((monitoringState?.fraud_rate_rolling || 0) * 100).toFixed(2);
  const matrix = monitoringState?.performance_matrix || { tp: 100, fp: 1, fn: 1, tn: 900 };
  const totalInMatrix = matrix.tp + matrix.fp + matrix.fn + matrix.tn;

  const safeguardActive = monitoringState?.adaptive_safeguard === true;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {safeguardActive && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[32px] flex items-center justify-between gap-6 shadow-2xl shadow-red-500/5">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-red-400/20 rounded-2xl border border-red-400/30 animate-pulse">
               <ShieldAlert className="text-red-400" size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-red-100 uppercase tracking-[0.2em]">Adaptive Security Safeguard Active</h4>
               <p className="text-[10px] text-red-400/80 mt-1 font-bold uppercase tracking-widest leading-relaxed">
                 System Health is Critical (Below 70%). 
                 Thresholds have been automatically tightened by 20% to prevent potential exploit attempts.
               </p>
            </div>
          </div>
          <div className="hidden md:block">
             <div className="px-4 py-2 bg-red-500/20 rounded-xl text-[9px] font-black text-red-300 uppercase tracking-widest border border-red-500/30">
                High Risk Mode
             </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          icon={<CheckCircle2 className="text-emerald-400" />}
          title="Overall Accuracy"
          value={`${accuracy.toFixed(1)}%`}
          trend={accuracy > 98 ? "High" : "Normal"}
        />
        <MetricCard
          icon={<Activity className="text-blue-400" />}
          title="Avg Latency"
          value={`${monitoringState?.latency_rolling?.toFixed(1) || "18.5"} ms`}
          trend={monitoringState?.latency_rolling > 25 ? "Slow" : "Optimal"}
        />
        <MetricCard
          icon={<ShieldAlert className={driftDetected ? "text-red-400" : "text-emerald-400"} />}
          title="Drift Status"
          status={monitoringState?.system_status?.toUpperCase() || "STABLE"}
          value={`PSI: ${psiValue}`}
          highlight={driftDetected}
        />
        <MetricCard
          icon={<TrendingUp className="text-purple-400" />}
          title="Fraud Rate"
          value={`${fraudRate}%`}
          trend={parseFloat(fraudRate) > 0.5 ? "Increasing" : "Stable"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ChartSection 
            title="Ingestion Throughput (TPS)" 
            icon={<Activity size={20} className="text-blue-400" />}
            data={metrics}
            dataKey="tps"
            color="#3b82f6"
            isArea
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ChartSection 
              title="Inference Latency (ms)" 
              icon={< Zap size={20} className="text-emerald-400" />}
              data={metrics}
              dataKey="latency"
              color="#10b981"
            />
            <ConfusionMatrix matrix={matrix} />
          </div>
        </div>

        <div className="space-y-8">
          {/* Live Predictions Feed */}
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 min-h-[500px]">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">Live Predictions</h2>
            <div className="space-y-4">
              {transactions.map(tx => (
                <div 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-blue-400 transition-colors">{tx.card_id}</div>
                      <div className="text-lg font-bold">${tx.amount}</div>
                    </div>
                    <div className="text-right">
                      {tx.is_fraud ? (
                        <span className="text-red-400 text-[10px] font-bold bg-red-400/10 px-2 py-1 rounded-full border border-red-400/20">FRAUD</span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-bold bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">SECURE</span>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">{tx.score}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {selectedTx && (
        <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
};

const ConfusionMatrix = ({ matrix }) => {
  const total = matrix.tp + matrix.fp + matrix.fn + matrix.tn;
  const getPct = (val) => ((val / total) * 100).toFixed(1);

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <ShieldAlert size={20} className="text-purple-400" />
        Live Confusion Matrix
      </h2>
      <div className="grid grid-cols-2 gap-2 mt-4 font-bold text-center">
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase font-black">Predicted Secure</div>
          <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
            <div className="text-emerald-500 text-xl font-black">{getPct(matrix.tn)}%</div>
            <div className="text-[8px] text-slate-600 uppercase font-bold">True Negative ({matrix.tn})</div>
          </div>
          <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
            <div className="text-red-400 text-xl font-black">{getPct(matrix.fn)}%</div>
            <div className="text-[8px] text-slate-600 uppercase font-bold">False Negative ({matrix.fn})</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase font-black">Predicted Fraud</div>
          <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
            <div className="text-blue-400 text-xl font-black">{getPct(matrix.fp)}%</div>
            <div className="text-[8px] text-slate-600 uppercase font-bold">False Positive ({matrix.fp})</div>
          </div>
          <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30">
            <div className="text-indigo-400 text-xl font-black">{getPct(matrix.tp)}%</div>
            <div className="text-[8px] text-slate-600 uppercase font-bold">True Positive ({matrix.tp})</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransactionModal = ({ tx, onClose }) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={onClose}>
    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className={`p-8 ${tx.is_fraud ? 'bg-gradient-to-br from-red-500/20 to-transparent' : 'bg-gradient-to-br from-emerald-500/20 to-transparent'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Transaction ID: {tx.id}</div>
            <h3 className="text-3xl font-black italic tracking-tighter">${tx.amount}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <Zap size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1">
              <CreditCard size={14} /> Card ID
            </div>
            <div className="font-bold">{tx.card_id}</div>
          </div>
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1">
              <Clock size={14} /> Timestamp
            </div>
            <div className="font-bold">{tx.timestamp}</div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Model Analysis & Explainability</div>
          <div className={`p-6 rounded-2xl border ${tx.is_fraud ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
            <div className="flex justify-between items-center mb-4">
              <span className={`text-xs font-black px-2 py-1 rounded-lg ${tx.is_fraud ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                 {tx.is_fraud ? 'FRAUD DETECTED' : 'LEGITIMATE'}
              </span>
              <span className="font-mono text-sm font-bold text-slate-400">Score: {tx.score}</span>
            </div>
            <div className="text-sm font-medium leading-relaxed mb-4">
              {tx.reason}
            </div>
            
            {/* SHAP / Feature Importance Simulation */}
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/50">
               <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Key Risk Drivers (SHAP)</div>
               {[
                 { feat: 'V14 (Velocity)', val: tx.is_fraud ? 85 : 12, color: 'bg-red-500' },
                 { feat: 'V17 (Location)', val: tx.is_fraud ? 62 : 8, color: 'bg-red-400' },
                 { feat: 'Amount Context', val: tx.is_fraud ? 45 : 5, color: 'bg-orange-400' }
               ].map(f => (
                 <div key={f.feat} className="flex items-center gap-3">
                    <div className="text-[9px] font-bold text-slate-400 w-24">{f.feat}</div>
                    <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden">
                       <div className={`${f.color} h-full rounded-full`} style={{ width: `${f.val}%` }}></div>
                    </div>
                    <div className="text-[9px] font-black text-slate-500">{f.val}%</div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Location Context</div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              {tx.location}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Origin IP</div>
            <div className="text-sm font-mono font-bold text-slate-400">{tx.ip}</div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black transition-all border border-slate-700 shadow-xl"
        >
          DISMISS
        </button>
      </div>
    </div>
  </div>
);

const MetricCard = ({ icon, title, value, trend, status, highlight }) => (
  <div className={`bg-slate-800/50 p-6 rounded-2xl border transition-all ${highlight ? 'border-red-500/50' : 'border-slate-700'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-900/50 rounded-lg">{icon}</div>
      {status && <span className={`text-[10px] font-black px-2 py-1 rounded-full ${highlight ? 'bg-red-500/10 text-red-400' : 'bg-emerald-400/10 text-emerald-400'}`}>{status}</span>}
      {trend && <span className="text-xs font-bold text-slate-500">{trend}</span>}
    </div>
    <h3 className="text-slate-400 text-xs font-black uppercase tracking-wider">{title}</h3>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

const ChartSection = ({ title, icon, data, dataKey, color, isArea }) => (
  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">{icon}{title}</h2>
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        {isArea ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" hide />
            <YAxis stroke="#64748b" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'transparent', 
                border: 'none',
                padding: '0px',
                fontSize: '11px',
                fontWeight: '900',
                color: '#fff',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
              itemStyle={{ color: color, padding: '0px' }}
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.1} />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" hide />
            <YAxis stroke="#64748b" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'transparent', 
                border: 'none',
                padding: '0px',
                fontSize: '11px',
                fontWeight: '900',
                color: '#fff',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
              itemStyle={{ color: color, padding: '0px' }}
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={3} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  </div>
);

export default Dashboard;
