import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/views/Dashboard';
import ReviewQueue from './components/views/ReviewQueue';
import ModelManagement from './components/views/ModelManagement';
import Intelligence from './components/views/Intelligence';
import AuditLogs from './components/views/AuditLogs';
import MonitoringLogs from './components/views/MonitoringLogs';
import TeamManagement from './components/views/TeamManagement';
import LoginPage from './components/views/LoginPage';
import { useAuth } from './context/AuthContext';

const INITIAL_CHART_DATA = [
  { time: '10:00', tps: 850, latency: 12 },
  { time: '10:05', tps: 920, latency: 15 },
  { time: '10:10', tps: 1050, latency: 18 },
  { time: '10:15', tps: 980, latency: 14 },
  { time: '10:20', tps: 1100, latency: 22 },
];

const App = () => {
  const { isAuthenticated, role } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [monitoringState, setMonitoringState] = useState(null);
  const [metrics, setMetrics] = useState(INITIAL_CHART_DATA);
  const [transactions, setTransactions] = useState([]);

  // Unified Monitoring State Fetcher
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchState = async () => {
      try {
        const response = await fetch('/api/monitoring/state');
        const data = await response.json();
        setMonitoringState(data);

        // Update real-time charts
        setMetrics(prev => {
          const newMetric = {
            time: new Date().toLocaleTimeString().slice(0, 5),
            tps: Math.round(data.latency_rolling > 0 ? 1000 / (data.latency_rolling / 1000) / 1000 : 800),
            latency: Math.round(data.latency_batch || 15),
          };
          return [...prev.slice(1), newMetric];
        });

        // Simulating live prediction feed with richer metadata for details popup
        const isFraud = Math.random() < (data.fraud_rate_batch || 0.02) * 5;
        const cities = ['New York', 'London', 'Tokyo', 'Berlin', 'Mumbai', 'Paris'];
        const reasons = [
          'High risk location mismatch', 
          'Unusual velocity detected', 
          'Small nominal amount probe', 
          'Known blacklisted card hash'
        ];
        
        const newTx = {
          id: Math.random().toString(36).substr(2, 9),
          card_id: `CARD-${Math.floor(Math.random() * 300) + 1000}`,
          amount: (Math.random() * 5000 + 10).toFixed(2),
          is_fraud: isFraud,
          reason: isFraud ? reasons[Math.floor(Math.random() * reasons.length)] : "Pattern matches customer profile",
          location: cities[Math.floor(Math.random() * cities.length)],
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          timestamp: new Date().toLocaleTimeString(),
          score: (isFraud ? (Math.random() * 0.3 + 0.7) : (Math.random() * 0.2)).toFixed(4)
        };
        setTransactions(prev => [newTx, ...prev].slice(0, 10));

      } catch (error) {
        console.error("Error fetching monitoring state:", error);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // View Switcher
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard monitoringState={monitoringState} metrics={metrics} transactions={transactions} />;
      case 'team':
        return <TeamManagement />;
      case 'review':
        return <ReviewQueue />;
      case 'models':
        return <ModelManagement monitoringState={monitoringState} />;
      case 'intelligence':
        return <Intelligence monitoringState={monitoringState} />;
      case 'audit':
        return (
          <div className="space-y-12">
            <AuditLogs />
            <MonitoringLogs />
          </div>
        );
      default:
        return <Dashboard monitoringState={monitoringState} metrics={metrics} transactions={transactions} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-white font-sans selection:bg-blue-500/30">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="flex-1 p-10 overflow-y-auto">
        <Header monitoringState={monitoringState} />
        
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
