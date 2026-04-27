import React from 'react';
import { LayoutDashboard, Users, Database, ShieldCheck, ShieldAlert, ClipboardList, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ currentView, setCurrentView }) => {
  const { role, user, setRole, permissions, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Monitor Dashboard', icon: LayoutDashboard, show: true },
    { id: 'team', label: 'Team Governance', icon: Users, show: role?.toLowerCase() === 'admin' },
    { id: 'review', label: 'Review Queue', icon: ShieldAlert, show: permissions.canReviewTransactions },
    { id: 'intelligence', label: 'Fraud Intelligence', icon: ShieldCheck, show: true },
    { id: 'models', label: 'Model Governance', icon: Database, show: permissions.canManageModels },
    { id: 'audit', label: 'Monitoring Logs', icon: ClipboardList, show: permissions.canViewAuditLogs },
  ];

  return (
    <div className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-8">
        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">
          FRAUD RISK
        </h1>
        <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">Intelligence Platform</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.filter(item => item.show).map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
              currentView === item.id 
                ? 'bg-blue-600 text-white shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">

        <button 
          onClick={logout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 hover:text-red-400 transition-all font-bold text-sm"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
