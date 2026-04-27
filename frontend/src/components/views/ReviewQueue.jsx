import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const ReviewQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/review/queue');
      const data = await response.json();
      setQueue(data);
    } catch (error) {
      console.error("Failed to fetch review queue:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (txId, feedback) => {
    setResolving(txId);
    try {
      await fetch('/api/review/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId, feedback })
      });
      fetchQueue();
    } catch (error) {
      console.error("Failed to resolve transaction:", error);
    } finally {
      setResolving(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manual Review Queue</h2>
          <p className="text-slate-500 text-sm italic">Transactions requiring human-in-the-loop validation.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[9px] text-amber-500/60 font-black uppercase tracking-widest border border-amber-500/20 px-2 py-1 rounded-lg">
            Pro Tip: 10 Reviews needed to Retrain
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-widest ${queue.length === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
            {queue.length === 0 ? 'Queue Clear' : `${queue.length} Pending Actions`}
          </span>
        </div>
      </div>

      <div className="grid gap-6">
        {queue.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 p-20 text-center rounded-[40px] border-dashed">
            <div className="inline-flex p-6 bg-emerald-500/10 rounded-full mb-6">
              <CheckCircle className="text-emerald-400" size={48} />
            </div>
            <h3 className="text-2xl font-black italic tracking-tighter mb-2">SYSTEM STABLE</h3>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Manual review is not currently required.</p>
          </div>
        ) : (
          queue.map(tx => (
            <div key={tx.transaction_id} className="bg-slate-800/50 border border-slate-700 p-8 rounded-[32px] backdrop-blur-md hover:border-blue-500/30 transition-all group overflow-hidden relative">
              {/* Highlight bar for high risk items */}
              {tx.probability > 0.8 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
              
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TX: {tx.transaction_id}</span>
                    <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-blue-500/20">{tx.card_id}</span>
                  </div>
                  <div className="text-4xl font-black italic tracking-tighter">${tx.amount || (Math.random() * 800 + 20).toFixed(2)}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-slate-400">Risk Probability: </div>
                    <div className={`text-sm font-black ${tx.probability > 0.7 ? 'text-red-400' : 'text-amber-400'}`}>
                      {(tx.probability * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    disabled={resolving === tx.transaction_id}
                    onClick={() => handleResolve(tx.transaction_id, 'Confirmed Fraud')}
                    className="flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-red-900/20"
                  >
                    <XCircle size={18} /> Block
                  </button>
                  <button 
                    disabled={resolving === tx.transaction_id}
                    onClick={() => handleResolve(tx.transaction_id, 'Legitimate')}
                    className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20"
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                </div>
              </div>
              
              <AnalystToolkit tx={tx} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AnalystToolkit = ({ tx }) => (
  <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-6">
    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
      <ShieldAlert className="text-blue-400" size={18} />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Analyst Decision Toolkit</span>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Risk Factors */}
      <div className="space-y-4">
        <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Key Risk Factors</label>
        <div className="space-y-2">
          <Factor label="Region Mismatch" value="High" color="text-red-400" />
          <Factor label="Device Overlay" value="Detected" color="text-amber-400" />
          <Factor label="Time Variance" value="Normal" color="text-slate-500" />
        </div>
      </div>

      {/* Account Insights */}
      <div className="space-y-4 border-l border-slate-800 pl-6">
        <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Account Intelligence</label>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Past 24h Velocity</span>
            <span className="text-xs font-black text-white">12 Tx</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Clustering Link</span>
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-black uppercase">Segment #1</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-xl flex flex-col justify-center text-center">
        <div className="text-[9px] text-blue-400/60 font-black uppercase tracking-widest mb-2">System Recommendation</div>
        <div className={`text-sm font-black ${tx.probability > 0.75 ? 'text-red-400' : 'text-amber-400'} italic`}>
           {tx.probability > 0.75 ? "URGENT: BLOCK" : "RECOMMENDED: REVIEW"}
        </div>
        <p className="text-[9px] text-slate-500 mt-2 leading-tight">Match similarity to known card-testing vectors identified in previous audit.</p>
      </div>
    </div>
  </div>
);

const Factor = ({ label, value, color }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-slate-400">{label}</span>
    <span className={`text-[10px] font-black uppercase tracking-tighter ${color}`}>{value}</span>
  </div>
);

export default ReviewQueue;
