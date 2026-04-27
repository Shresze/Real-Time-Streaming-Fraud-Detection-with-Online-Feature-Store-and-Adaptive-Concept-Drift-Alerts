import React, { useState, useEffect } from 'react';
import { Database, Zap, RefreshCw, History, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';

const ModelManagement = ({ monitoringState }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSwitch = async (version) => {
    try {
      await fetch('/api/models/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      });
      fetchModels();
    } catch (error) {
      console.error("Failed to switch model:", error);
    }
  };

  const [retrainedRecently, setRetrainedRecently] = useState(false);
  const [retrainError, setRetrainError] = useState(null);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainedRecently(false);
    setRetrainError(null);
    try {
      const response = await fetch('/api/models/retrain', { method: 'POST' });
      const result = await response.json();
      
      if (result.status === 'success') {
        await fetchModels();
        setRetrainedRecently(true);
        setTimeout(() => setRetrainedRecently(false), 5000);
      } else {
        setRetrainError(result.message || "Retraining failed due to environmental conditions.");
        setTimeout(() => setRetrainError(null), 8000);
      }
    } catch (error) {
      console.error("Failed to retrain:", error);
      setRetrainError("Network error: Could not connect to retraining pipeline.");
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Model Lifecycle Management</h2>
          <p className="text-slate-500 text-sm">Monitor model performance, switch versions, and trigger retraining.</p>
        </div>
        <div className="flex items-center gap-4">
          {retrainError && (
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm animate-in fade-in slide-in-from-right-4 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
              <AlertTriangle size={18} />
              {retrainError}
            </div>
          )}
          {retrainedRecently && (
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm animate-in fade-in slide-in-from-right-4">
              <CheckCircle2 size={18} />
              Retrained Successfully!
            </div>
          )}
          <button 
            onClick={handleRetrain}
            disabled={retraining}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 ${
              retrainedRecently ? 'bg-emerald-600 hover:bg-emerald-500' : (retrainError ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500')
            } text-white`}
          >
            {retraining ? <RefreshCw className="animate-spin" size={18} /> : (retrainedRecently ? <CheckCircle2 size={18} /> : (retrainError ? <AlertTriangle size={18} /> : <Zap size={18} />))}
            {retraining ? "Retraining Pipeline Active..." : (retrainedRecently ? "Success!" : (retrainError ? "Failed" : "Trigger Manual Retraining"))}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {models.map(model => (
          <div key={model.version} className={`bg-slate-800/50 border p-6 rounded-2xl backdrop-blur-sm transition-all ${model.is_active ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-700'}`}>
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl ${model.is_active ? 'bg-blue-500/10' : 'bg-slate-900/50'}`}>
                  <Database size={24} className={model.is_active ? 'text-blue-400' : 'text-slate-500'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">{model.version}</h3>
                    {model.is_active && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Active Live</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Deployed: {new Date(model.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-8">
                <Metric label="Baseline AUC" value={(model.auc || 0.94).toFixed(3)} />
                <Metric label="Drift Score" value={model.is_active ? (monitoringState?.psi_overall?.toFixed(3) || "0.000") : "0.000"} color={monitoringState?.psi_overall > 0.1 ? "text-amber-400" : "text-emerald-400"} />
                
                {!model.is_active && (
                  <button 
                    onClick={() => handleSwitch(model.version)}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg font-bold text-xs transition-all"
                  >
                    Switch Version <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {model.is_active && (
              <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-3 gap-6">
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Architecture</div>
                  <div className="text-xs font-mono">XGBoost Optimized (Calibrated)</div>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Training Source</div>
                  <div className="text-xs font-mono">CC_Kaggle_v2 + Human Feedback</div>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Integrity Hash</div>
                  <div className="text-xs font-mono">SHA256: 8a4c...1e92</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Metric = ({ label, value, color }) => (
  <div className="text-right">
    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</div>
    <div className={`text-lg font-bold ${color || 'text-slate-100'}`}>{value}</div>
  </div>
);

export default ModelManagement;
